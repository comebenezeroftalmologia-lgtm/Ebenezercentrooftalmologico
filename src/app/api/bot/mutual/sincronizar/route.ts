import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { MUNICIPIO_POR_CODIGO, normalizarDocumento } from "@/lib/mutualser/afiliados";

// Recibe la base de afiliados desde el script de Google Sheets (Apps Script) en lotes.
// Llave propia (MUTUAL_SYNC_KEY), distinta de la del bot: quien edita la hoja puede
// ver el script, así que esta llave solo sirve para escribir esta tabla.
//   1) POST { sync_id, filas: [...] }                 → upsert del lote
//   2) POST { sync_id, finalizar: true, esperadas: N } → borra a quienes ya no están en la hoja
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Fila = Record<string, string | undefined>;
const LOTE_DB = 500;

function llaveValida(recibida: string | null): boolean {
  const esperada = process.env.MUTUAL_SYNC_KEY;
  if (!esperada || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

const limpiar = (v?: string) => (v ?? "").replace(/�/g, "").trim();
const fechaIso = (v?: string) => {
  const s = limpiar(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const hoyBogota = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export async function POST(req: NextRequest) {
  if (!llaveValida(req.headers.get("x-sync-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let cuerpo: { sync_id?: string; filas?: Fila[]; finalizar?: boolean; esperadas?: number; fecha_corte?: string } = {};
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const syncId = String(cuerpo.sync_id ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(syncId)) {
    return NextResponse.json({ error: "sync_id inválido" }, { status: 400 });
  }
  const admin = createServiceClient();

  // --- Cierre: elimina lo que ya no está en la hoja, solo si llegó completo ---
  if (cuerpo.finalizar) {
    const esperadas = Number(cuerpo.esperadas ?? 0);
    if (!Number.isFinite(esperadas) || esperadas < 1000) {
      return NextResponse.json({ error: "esperadas demasiado baja: no se elimina nada" }, { status: 400 });
    }
    const { count, error: errCount } = await admin
      .from("mutualser_afiliados")
      .select("doc_beneficiario", { count: "exact", head: true })
      .eq("sync_id", syncId);
    if (errCount) return NextResponse.json({ error: errCount.message }, { status: 500 });
    if ((count ?? 0) < esperadas) {
      return NextResponse.json(
        { error: `Llegaron ${count ?? 0} de ${esperadas} afiliados: no se elimina nada` },
        { status: 409 },
      );
    }
    const { count: eliminadas, error: errDel } = await admin
      .from("mutualser_afiliados")
      .delete({ count: "exact" })
      .or(`sync_id.is.null,sync_id.neq.${syncId}`);
    if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 });
    await admin.from("mutualser_sincronizaciones").insert({ sync_id: syncId, recibidas: count, eliminadas: eliminadas ?? 0 });
    return NextResponse.json({ ok: true, afiliados: count, eliminados: eliminadas ?? 0 });
  }

  // --- Lote: upsert ---
  const filas = Array.isArray(cuerpo.filas) ? cuerpo.filas : [];
  const fechaCorte = fechaIso(cuerpo.fecha_corte) ?? hoyBogota();
  const registros: Record<string, string | null>[] = [];
  let omitidas = 0;
  for (const f of filas) {
    const doc = normalizarDocumento(f["DOC BENEFICIARIO"]);
    const estado = limpiar(f["ESTADO"]).toUpperCase();
    if (doc.length < 4 || doc.length > 20 || !estado) {
      omitidas++;
      continue;
    }
    const dep = limpiar(f["CODI DEPARTAMENTO DNP"]);
    const mun = limpiar(f["CODI MUNICIPIO DNP"]);
    registros.push({
      doc_beneficiario: doc,
      tipo_doc: limpiar(f["TIPO DOC BENEFICIARIO"]).toUpperCase() || null,
      primer_nombre: limpiar(f["PRIMER NOMBRE"]) || null,
      segundo_nombre: limpiar(f["SEGUNDO NOMBRE"]) || null,
      primer_apellido: limpiar(f["PRIMER APELLIDO"]) || null,
      segundo_apellido: limpiar(f["SEGUNDO APELLIDO"]) || null,
      fecha_nacimiento: fechaIso(f["FECHA NACIMIENTO"]),
      sexo: limpiar(f["SEXO"]) || null,
      regimen: limpiar(f["REGIMEN (por archivo)"]) || limpiar(f["REGIMEN"]) || null,
      estado,
      cod_departamento: dep || null,
      cod_municipio: mun || null,
      municipio_afiliacion: dep === "13" ? (MUNICIPIO_POR_CODIGO[mun] ?? null) : null,
      cod_departamento_atencion: limpiar(f["CODI DEPARTAMENTO ATENCION"]) || null,
      cod_municipio_atencion: limpiar(f["CODI MUNICIPIO ATENCION"]) || null,
      fecha_corte: fechaCorte,
      sync_id: syncId,
    });
  }

  for (let i = 0; i < registros.length; i += LOTE_DB) {
    const { error } = await admin
      .from("mutualser_afiliados")
      .upsert(registros.slice(i, i + LOTE_DB), { onConflict: "doc_beneficiario" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, guardadas: registros.length, omitidas });
}
