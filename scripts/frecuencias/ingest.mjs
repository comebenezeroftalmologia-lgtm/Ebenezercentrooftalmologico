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
