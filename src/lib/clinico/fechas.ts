/** Fechas y horas del módulo Clínico. Todo se interpreta en hora de Colombia
 * (UTC−5, sin horario de verano) porque SISMA entrega fecha y hora locales. */

export const TZ = "America/Bogota";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** yyyy-MM-dd en hora de Colombia, desplazado `dias` días. */
export function fechaBogota(dias = 0, base: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(base + dias * 86_400_000),
  );
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Acepta "8:00", "08:00:00" o "2026-11-10T08:00:00" y devuelve "08:00". */
export function hora5(v: unknown): string | null {
  const m = /(\d{1,2}):(\d{2})/.exec(String(v ?? ""));
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Instante UTC de una fecha (yyyy-MM-dd) y hora (HH:mm) de Colombia. */
export function aInstante(fecha: string, hora: string | null): Date | null {
  const h = hora5(hora);
  if (!h || !FECHA_RE.test(fecha)) return null;
  const d = new Date(`${fecha}T${h}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "8:00 a. m." */
export function horaLegible(hora: string | null): string {
  const h = hora5(hora);
  if (!h) return "—";
  const [hh, mm] = h.split(":").map(Number);
  const suf = hh >= 12 ? "p. m." : "a. m.";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suf}`;
}

/** "miércoles 11 de noviembre" */
export function fechaLarga(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** "mié 11 nov" */
export function fechaCorta(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`;
}

/** Minutos desde la medianoche (hora de Colombia) y día de la semana (1 = lunes … 7 = domingo). */
export function relojBogota(instante: Date): { minutos: number; diaSemana: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(instante);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { minutos: Number(get("hour")) * 60 + Number(get("minute")), diaSemana: wd || 1 };
}

/** "07:00" o "07:00:00" → minutos. */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fechaHoraLegible(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

/** "48 horas", "1 día", "2 horas 30 min". */
export function anticipacionLegible(minutos: number): string {
  if (minutos % 1440 === 0) {
    const d = minutos / 1440;
    return `${d} ${d === 1 ? "día" : "días"}`;
  }
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} ${h === 1 ? "hora" : "horas"}` : `${h} h ${m} min`;
}
