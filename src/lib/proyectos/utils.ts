// Utilidades puras del módulo Proyectos (sirven en servidor y navegador).

const ZONA = "America/Bogota";

/** Bucket privado de Supabase Storage donde viven los adjuntos de las tareas. */
export const BUCKET_ADJUNTOS = "proyectos-adjuntos";
/** Tope por archivo (coincide con el límite del bucket: 25 MB). */
export const MAX_BYTES_ADJUNTO = 26_214_400;

/** Fecha de hoy ("YYYY-MM-DD") en hora de Colombia, igual en servidor y
 * navegador para que no haya diferencias de hidratación. */
export function hoyISO(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  return partes; // en-CA => YYYY-MM-DD
}

function diasEntre(aISO: string, bISO: string): number {
  const a = Date.UTC(+aISO.slice(0, 4), +aISO.slice(5, 7) - 1, +aISO.slice(8, 10));
  const b = Date.UTC(+bISO.slice(0, 4), +bISO.slice(5, 7) - 1, +bISO.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];

/** "Ayer", "Hoy", "Mañana", o "jun. 23" (con año si no es el actual). */
export function etiquetaFecha(iso: string | null, hoy: string = hoyISO()): string {
  if (!iso) return "";
  const d = diasEntre(hoy, iso);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  const mes = MESES[+iso.slice(5, 7) - 1];
  const dia = +iso.slice(8, 10);
  const anio = iso.slice(0, 4);
  return anio === hoy.slice(0, 4) ? `${mes} ${dia}` : `${mes} ${dia}, ${anio}`;
}

export function estaVencida(iso: string | null, cerrada: boolean, hoy: string = hoyISO()): boolean {
  return !!iso && !cerrada && iso < hoy;
}

/** Fecha legible con hora para el historial: "9 oct., 2:25 p. m.". */
export function fechaHora(iso: string): string {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("es-CO", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return f;
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const PALETA_AVATAR = ["#6B5CE7", "#0E9AA7", "#F79009", "#D6409F", "#3B6FF0", "#21814B", "#8E4EC6", "#E5484D"];

/** Color estable por usuario (mismo id => mismo color). */
export function colorAvatar(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETA_AVATAR[h % PALETA_AVATAR.length];
}

export function formatoBytes(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Orden fraccional: un número entre dos vecinos (o al final / al inicio). */
export function ordenEntre(antes: number | null, despues: number | null): number {
  if (antes == null && despues == null) return 1000;
  if (antes == null) return (despues as number) - 1000;
  if (despues == null) return antes + 1000;
  return (antes + despues) / 2;
}

/** Traduce errores de Postgres/RLS a mensajes entendibles. */
export function mensajeError(e: { code?: string; message?: string } | null | undefined): string {
  if (!e) return "Error desconocido.";
  const msg = e.message ?? "";
  if (e.code === "42501" || /row-level security/i.test(msg)) {
    return "No tienes permiso para hacer esto en este espacio.";
  }
  if (e.code === "23505") return "Ya existe un elemento con ese nombre.";
  if (e.code === "23503") return "No se puede completar: hay elementos relacionados.";
  if (e.code === "23514") return "Algún dato no es válido (revisa las fechas y los nombres).";
  if (e.code === "P0001") return msg;
  return msg || "Error desconocido.";
}
