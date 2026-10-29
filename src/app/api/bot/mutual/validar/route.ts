import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

// Valida si un paciente está activo en la base de afiliados de MutualSer.
// Lo llama el agente de Dapta (acción API). Se protege con la llave BOT_API_KEY
// en el encabezado x-bot-key; /api/** está fuera del middleware de sesión.
// Devuelve lo mínimo necesario (nombre de pila, régimen, municipio): nada de
// dirección, correo ni teléfono.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Municipios de afiliación que Ebenezer atiende por MutualSer (regla definida por Ebenezer, 13-oct-2026).
const MUNICIPIOS_ATENDIDOS = new Set(["Cartagena", "Arjona", "Mahates", "María la Baja", "San Cristóbal", "San Estanislao", "Santa Rosa", "Soplaviento", "Turbaco", "Turbaná", "Villanueva"]);

function llaveValida(recibida: string | null): boolean {
  const esperada = process.env.BOT_API_KEY;
  if (!esperada || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

function edadDesde(fecha: string | null): number | null {
  if (!fecha) return null;
  const n = new Date(fecha + "T00:00:00Z");
  if (Number.isNaN(n.getTime())) return null;
  const hoy = new Date();
  let e = hoy.getUTCFullYear() - n.getUTCFullYear();
  const m = hoy.getUTCMonth() - n.getUTCMonth();
  if (m < 0 || (m === 0 && hoy.getUTCDate() < n.getUTCDate())) e--;
  return e;
}

function nombrePila(s: string | null): string {
  const p = (s ?? "").trim().toLowerCase();
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

export async function POST(req: NextRequest) {
  if (!llaveValida(req.headers.get("x-bot-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let cuerpo: { documento?: string; canal?: string } = {};
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const documento = String(cuerpo.documento ?? "").replace(/\D/g, "");
  if (documento.length < 4 || documento.length > 15) {
    return NextResponse.json({ error: "Documento inválido", afiliado: false }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("mutualser_afiliados")
    .select("primer_nombre, fecha_nacimiento, regimen, estado, municipio_afiliacion, tipo_doc, fecha_corte")
    .eq("doc_beneficiario", documento)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const activo = data?.estado === "AC";
  await admin.from("mutualser_validaciones").insert({
    documento,
    encontrado: !!data,
    activo: data ? activo : null,
    canal: cuerpo.canal ?? "bot",
  });

  if (!data) {
    return NextResponse.json({
      afiliado: false,
      activo: false,
      mensaje: "El documento no aparece en la base de afiliados activos de MutualSer.",
    });
  }

  return NextResponse.json({
    afiliado: true,
    activo,
    nombre: nombrePila(data.primer_nombre),
    regimen: data.regimen,
    tipo_documento: data.tipo_doc,
    edad: edadDesde(data.fecha_nacimiento),
    municipio_afiliacion: data.municipio_afiliacion,
    en_cobertura: !!data.municipio_afiliacion && MUNICIPIOS_ATENDIDOS.has(data.municipio_afiliacion),
    accion_sugerida: !activo ? "derivar_humano" : data.municipio_afiliacion && MUNICIPIOS_ATENDIDOS.has(data.municipio_afiliacion) ? "continuar" : "no_aplica",
    corte_base: data.fecha_corte,
  });
}
