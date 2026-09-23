// Ingesta del módulo "Frecuencias" — carga (o recarga) un export
// "BASE_CLASIFICADA" hacia la tabla frecuencias_mensual en Supabase.
//
// Uso:
//   node scripts/frecuencias/ingest.mjs [ruta-al-json]
//
// Si no se pasa ruta, usa scripts/frecuencias/data/frecuencias_raw.json.
//
// El JSON esperado es el mismo objeto `RAW` embebido en el dashboard HTML
// de Frecuencias (const RAW = {...}) — extraído tal cual, sin modificar.
// Este script es re-ejecutable: un nuevo export simplemente reemplaza las
// filas existentes (upsert por year+month_num+uf+grupo).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

// --- Carga manual de .env.local (sin dependencias extra) ---
function loadEnv(envPath) {
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}
const env = { ...loadEnv(path.join(repoRoot, ".env.local")), ...process.env };

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const jsonPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "data", "frecuencias_raw.json");

if (!fs.existsSync(jsonPath)) {
  console.error(`No se encontró el archivo de datos: ${jsonPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const MESES = raw.meses; // ['enero', ..., 'diciembre'] — índice + 1 = month_num
const monthNum = (mes) => MESES.indexOf(mes) + 1;

const sourceSnapshot = raw.file ?? "desconocido";
const mtd = raw.mtd_info ?? {};
const isMtd = (year, mes) => String(year) === String(mtd.cur_anio) && mes === mtd.cur_mes;

const habilesFor = (year, mes) => raw.habiles?.[year]?.[mes] ?? {};

const rows = [];

function pushRow({ year, mes, uf, grupo, real, meta, base_prev }) {
  const h = habilesFor(year, mes);
  rows.push({
    year: Number(year),
    month_num: monthNum(mes),
    month_name: mes,
    uf: uf ?? null,
    grupo: grupo ?? null,
    real: real ?? 0,
    meta: meta ?? 0,
    base_prev: base_prev ?? 0,
    dias_calendario: h.f ?? null,
    dias_habiles: h.h ?? null,
    is_mtd: isMtd(year, mes),
    source_snapshot: sourceSnapshot,
  });
}

// 1) Total (todas las UF, todos los grupos) — raw.meta[year][mes]
for (const year of Object.keys(raw.meta ?? {})) {
  for (const [mes, v] of Object.entries(raw.meta[year])) {
    pushRow({ year, mes, uf: null, grupo: null, ...v });
  }
}

// 2) Por UF (todos los grupos) — raw.meta_uf[uf][year][mes]
for (const uf of Object.keys(raw.meta_uf ?? {})) {
  for (const year of Object.keys(raw.meta_uf[uf])) {
    for (const [mes, v] of Object.entries(raw.meta_uf[uf][year])) {
      pushRow({ year, mes, uf, grupo: null, ...v });
    }
  }
}

// 3) Por UF + grupo (detalle) — raw.meta_emp[uf][grupo][year][mes]
//    y, sumando a través de las UF, 4) por grupo solo (todas las UF).
const porGrupoSolo = new Map(); // key `${grupo}|${year}|${mes}` -> {real, meta, base_prev}

for (const uf of Object.keys(raw.meta_emp ?? {})) {
  for (const grupo of Object.keys(raw.meta_emp[uf])) {
    for (const year of Object.keys(raw.meta_emp[uf][grupo])) {
      for (const [mes, v] of Object.entries(raw.meta_emp[uf][grupo][year])) {
        pushRow({ year, mes, uf, grupo, ...v });

        const key = `${grupo}|${year}|${mes}`;
        const acc = porGrupoSolo.get(key) ?? { year, mes, grupo, real: 0, meta: 0, base_prev: 0 };
        acc.real += v.real ?? 0;
        acc.meta += v.meta ?? 0;
        acc.base_prev += v.base_prev ?? 0;
        porGrupoSolo.set(key, acc);
      }
    }
  }
}

for (const { year, mes, grupo, real, meta, base_prev } of porGrupoSolo.values()) {
  pushRow({ year, mes, uf: null, grupo, real, meta, base_prev });
}

console.log(`Filas a cargar: ${rows.length} (fuente: ${sourceSnapshot})`);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const BATCH = 500;
let loaded = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from("frecuencias_mensual")
    .upsert(batch, { onConflict: "year,month_num,uf,grupo" });
  if (error) {
    console.error(`Error en lote ${i}-${i + batch.length}:`, error.message);
    process.exit(1);
  }
  loaded += batch.length;
  console.log(`  ...${loaded}/${rows.length}`);
}

console.log("Listo.");

// ============================================================================
// Fase 2 — matriz completa año/mes/UF/empresa (tabla frecuencias_conteos).
// Alimenta el módulo nativo "Resumen Comparativo". No filtra Mutual aquí:
// eso lo hace la aplicación (excluye grupos cuyo nombre contiene "MUTUAL"),
// igual que el tablero original en el cliente.
// ============================================================================

const conteoRows = [];
const mens = raw.mens_year_uf_grp ?? {};
const valores = raw.valor_year_uf_grp ?? {};

for (const year of Object.keys(mens)) {
  for (const mes of Object.keys(mens[year] ?? {})) {
    const porUf = mens[year][mes] ?? {};
    const valPorUf = (valores[year] ?? {})[mes] ?? {};
    const h = habilesFor(year, mes);
    for (const uf of Object.keys(porUf)) {
      const porGrupo = porUf[uf] ?? {};
      const valPorGrupo = valPorUf[uf] ?? {};
      for (const grupo of Object.keys(porGrupo)) {
        conteoRows.push({
          year: Number(year),
          month_num: monthNum(mes),
          month_name: mes,
          uf,
          grupo,
          cantidad: porGrupo[grupo] ?? 0,
          valor: valPorGrupo[grupo] ?? 0,
          dias_calendario: h.f ?? null,
          dias_habiles: h.h ?? null,
          source_snapshot: sourceSnapshot,
        });
      }
    }
  }
}

console.log(`\nFilas (conteos completos) a cargar: ${conteoRows.length}`);

let loadedConteos = 0;
for (let i = 0; i < conteoRows.length; i += BATCH) {
  const batch = conteoRows.slice(i, i + BATCH);
  const { error } = await supabase
    .from("frecuencias_conteos")
    .upsert(batch, { onConflict: "year,month_num,uf,grupo" });
  if (error) {
    console.error(`Error en lote (conteos) ${i}-${i + batch.length}:`, error.message);
    process.exit(1);
  }
  loadedConteos += batch.length;
  console.log(`  ...${loadedConteos}/${conteoRows.length}`);
}

console.log("Listo (conteos).");

// ============================================================================
// Fase 2 — pestaña "Prepagadas" (parcial): evolución mensual + ranking por
// contrato. No incluye embudo/tarifas/ranking-por-entidad — esos campos
// vienen null en el export automático actual del motor de Pedro.
// ============================================================================
const prepMensRows = [];
const prepMens = raw.prepagadas_mens ?? {};
for (const year of Object.keys(prepMens)) {
  for (const [mes, v] of Object.entries(prepMens[year] ?? {})) {
    prepMensRows.push({
      year: Number(year),
      month_num: monthNum(mes),
      month_name: mes,
      freq: v.freq ?? 0,
      valor: v.valor ?? 0,
      source_snapshot: sourceSnapshot,
    });
  }
}

const prepRankRows = [];
const prepTop = raw.prepagadas_top ?? {};
for (const year of Object.keys(prepTop)) {
  for (const item of prepTop[year] ?? []) {
    prepRankRows.push({
      year: Number(year),
      contrato: item.contrato,
      freq: item.freq ?? 0,
      valor: item.valor ?? 0,
      source_snapshot: sourceSnapshot,
    });
  }
}

if (prepMensRows.length) {
  console.log(`Filas (prepagadas mensual) a cargar: ${prepMensRows.length}`);
  let loadedPrepMens = 0;
  for (let i = 0; i < prepMensRows.length; i += BATCH) {
    const batch = prepMensRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("frecuencias_prepagadas_mensual")
      .upsert(batch, { onConflict: "year,month_num" });
    if (error) {
      console.error(`Error en lote prepagadas_mensual ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    loadedPrepMens += batch.length;
  }
  console.log(`  ...${loadedPrepMens}/${prepMensRows.length}`);
}

if (prepRankRows.length) {
  console.log(`Filas (prepagadas ranking) a cargar: ${prepRankRows.length}`);
  let loadedPrepRank = 0;
  for (let i = 0; i < prepRankRows.length; i += BATCH) {
    const batch = prepRankRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("frecuencias_prepagadas_ranking")
      .upsert(batch, { onConflict: "year,contrato" });
    if (error) {
      console.error(`Error en lote prepagadas_ranking ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    loadedPrepRank += batch.length;
  }
  console.log(`  ...${loadedPrepRank}/${prepRankRows.length}`);
}

console.log("Listo (prepagadas).");

// ============================================================================
// Fase 2 — pestaña "Médicos" (parcial): por_mes.por_uf_sede aplanado a
// año/mes/médico/sede/UF. No incluye tipo_por_mes (Primera vez/Control/
// Otros) ni pend_pm (pendientes) — quedan para una iteración futura.
// ============================================================================
const medicosRows = [];
const medicos = raw.medicos ?? {};
for (const year of Object.keys(medicos)) {
  for (const [medico, x] of Object.entries(medicos[year] ?? {})) {
    for (const [mes, md] of Object.entries(x.por_mes ?? {})) {
      const porUfSede = md.por_uf_sede ?? {};
      const porUfSedeVal = md.por_uf_sede_val ?? {};
      for (const [sede, porUf] of Object.entries(porUfSede)) {
        const porUfVal = porUfSedeVal[sede] ?? {};
        for (const [uf, cantidad] of Object.entries(porUf)) {
          medicosRows.push({
            year: Number(year),
            month_num: monthNum(mes),
            month_name: mes,
            medico,
            sede,
            uf,
            cantidad: cantidad ?? 0,
            valor: porUfVal[uf] ?? 0,
            source_snapshot: sourceSnapshot,
          });
        }
      }
    }
  }
}

if (medicosRows.length) {
  console.log(`Filas (médicos) a cargar: ${medicosRows.length}`);
  let loadedMedicos = 0;
  for (let i = 0; i < medicosRows.length; i += BATCH) {
    const batch = medicosRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("frecuencias_medicos_mensual")
      .upsert(batch, { onConflict: "year,month_num,medico,sede,uf" });
    if (error) {
      console.error(`Error en lote médicos ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    loadedMedicos += batch.length;
  }
  console.log(`  ...${loadedMedicos}/${medicosRows.length}`);
}

console.log("Listo (médicos).");

// ============================================================================
// Fase 2 — pestaña "Cobrable vs No": RAW.cobrable[year][mes] = {si, no,
// valor_si, valor_no}. Una fila uf=null con los totales + valor, y una
// fila por UF con el desglose si/no (sin valor, no viene por UF).
// ============================================================================
const cobrableRows = [];
const cobrable = raw.cobrable ?? {};
for (const year of Object.keys(cobrable)) {
  for (const [mes, d] of Object.entries(cobrable[year] ?? {})) {
    const si = d.si ?? {};
    const no = d.no ?? {};
    const totalSi = Object.values(si).reduce((s, v) => s + (v ?? 0), 0);
    const totalNo = Object.values(no).reduce((s, v) => s + (v ?? 0), 0);
    cobrableRows.push({
      year: Number(year),
      month_num: monthNum(mes),
      month_name: mes,
      uf: null,
      si: totalSi,
      no: totalNo,
      valor_si: d.valor_si ?? 0,
      valor_no: d.valor_no ?? 0,
      source_snapshot: sourceSnapshot,
    });
    const ufs = new Set([...Object.keys(si), ...Object.keys(no)]);
    for (const uf of ufs) {
      cobrableRows.push({
        year: Number(year),
        month_num: monthNum(mes),
        month_name: mes,
        uf,
        si: si[uf] ?? 0,
        no: no[uf] ?? 0,
        valor_si: null,
        valor_no: null,
        source_snapshot: sourceSnapshot,
      });
    }
  }
}

if (cobrableRows.length) {
  console.log(`Filas (cobrable) a cargar: ${cobrableRows.length}`);
  let loadedCobrable = 0;
  for (let i = 0; i < cobrableRows.length; i += BATCH) {
    const batch = cobrableRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("frecuencias_cobrable_mensual")
      .upsert(batch, { onConflict: "year,month_num,uf" });
    if (error) {
      console.error(`Error en lote cobrable ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    loadedCobrable += batch.length;
  }
  console.log(`  ...${loadedCobrable}/${cobrableRows.length}`);
}

console.log("Listo (cobrable).");

// ============================================================================
// Fase 3 — detalle DÍA A DÍA: RAW.dias = { u:[UF...], g:[grupo...],
// d:{ "YYYY-MM-DD": [[iUF, iGrupo, cantidad, valor], ...] } }
//
// Este bloque ya venía en el RAW y se estaba descartando. Sin él no se
// puede cortar "a la fecha" (comparar los años hasta el mismo día), que
// es lo que hacía que la tarjeta Diferencia restara 9 meses contra 12.
// Son ~10.300 filas; el motor ya entrega agregado por día/UF/empresa.
// ============================================================================
const diasRows = [];
const diasRaw = raw.dias ?? {};
const diasUfs = diasRaw.u ?? [];
const diasGrupos = diasRaw.g ?? [];

for (const [fecha, entradas] of Object.entries(diasRaw.d ?? {})) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
  for (const e of entradas ?? []) {
    const uf = diasUfs[e[0]];
    const grupo = diasGrupos[e[1]];
    if (uf == null || grupo == null) continue;
    diasRows.push({
      fecha,
      uf,
      grupo: String(grupo),
      cantidad: Number(e[2]) || 0,
      valor: Number(e[3]) || 0,
      source_snapshot: sourceSnapshot,
    });
  }
}

if (diasRows.length) {
  const fechas = Object.keys(diasRaw.d ?? {}).sort();
  console.log(
    `\nFilas (detalle diario) a cargar: ${diasRows.length} ` +
      `(${fechas.length} días, ${fechas[0]} a ${fechas[fechas.length - 1]})`,
  );
  let loadedDias = 0;
  for (let i = 0; i < diasRows.length; i += BATCH) {
    const batch = diasRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("frecuencias_dias")
      .upsert(batch, { onConflict: "fecha,uf,grupo" });
    if (error) {
      console.error(`Error en lote días ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    loadedDias += batch.length;
  }
  console.log(`  ...${loadedDias}/${diasRows.length}`);
} else {
  console.warn("AVISO: RAW.dias vino vacío — no se cargó el detalle diario.");
}

console.log("Listo (detalle diario).");
