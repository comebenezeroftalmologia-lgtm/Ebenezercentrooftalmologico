import { createServiceClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------------
   EL ARCHIVO DE TRABAJO DE TALENTO HUMANO

   Un solo Excel, guardado en un bucket PRIVADO de Supabase. El tablero se
   alimenta de ahi: nadie tiene que arrastrarlo cada vez.

   Nunca en el repositorio. El repositorio de la plataforma es publico y
   este archivo trae nombres, salarios, incapacidades y evaluaciones.
   --------------------------------------------------------------------- */

export const BUCKET_TH = "talento-humano";

/** Ruta fija: hay un solo archivo vigente y se reemplaza entero. */
export const RUTA_TH = "base/talento-humano.xlsx";

export const TIPOS_EXCEL = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel.sheet.macroEnabled.12",                    // .xlsm
  "application/vnd.ms-excel",                                          // .xls
];

/** 25 MB: de sobra para una base de personal, y un techo por si acaso. */
export const MAX_BYTES = 25 * 1024 * 1024;

export type ArchivoTH = {
  nombreOriginal: string;
  bytes: number;
  subidoAt: string;
  subidoPor: string | null;
};

/** Datos del archivo vigente, o null si todavia no se ha subido ninguno. */
export async function infoArchivoTH(): Promise<ArchivoTH | null> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("talento_humano_archivo")
    .select("nombre_original, bytes, subido_at, subido_por")
    .eq("id", true)
    .maybeSingle();
  if (!data) return null;

  let subidoPor: string | null = null;
  if (data.subido_por) {
    const { data: u } = await admin
      .from("app_users")
      .select("nombre_completo")
      .eq("id", data.subido_por)
      .maybeSingle();
    subidoPor = u?.nombre_completo ?? null;
  }

  return {
    nombreOriginal: data.nombre_original,
    bytes: Number(data.bytes) || 0,
    subidoAt: data.subido_at,
    subidoPor,
  };
}

/** "hace 3 días · 1,2 MB", para decirlo en pantalla sin que nadie calcule. */
export function describirArchivo(a: ArchivoTH): string {
  const mb = a.bytes / (1024 * 1024);
  const tam = mb >= 1 ? `${mb.toFixed(1).replace(".", ",")} MB` : `${Math.round(a.bytes / 1024)} KB`;
  const d = new Date(a.subidoAt);
  const fecha = d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  return `${a.nombreOriginal} · ${tam} · subido el ${fecha}${a.subidoPor ? ` por ${a.subidoPor}` : ""}`;
}
