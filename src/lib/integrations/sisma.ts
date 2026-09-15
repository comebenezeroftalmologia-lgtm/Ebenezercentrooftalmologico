/**
 * API Citas SISMA — sistema clínico/de agendamiento de la clínica,
 * DISTINTO de Clientify (que es el CRM comercial).
 *
 * Hay DOS superficies de esta misma API:
 *  - La "antigua": https://api.centrooftalmologicoebenezer.com/swagger
 *    (21 endpoints, la que usa SISMA_API_KEY más abajo).
 *  - La "ampliada" (node): https://api.centrooftalmologicoebenezer.com/node/swagger
 *    (54 endpoints, ya desplegada — requiere una llave con permisos
 *    distintos, más granulares, ver SISMA_NODE_API_KEY).
 *
 * Corrección importante (2026-09-14, respuesta del desarrollador a
 * nuestra solicitud de acceso): la conclusión previa de que "SISMA casi
 * nunca marca una cita como Atendida" era incorrecta. El dato de
 * asistencia SÍ existe y es el estado más frecuente (71% de las citas
 * de agosto 2026). Lo que pasaba:
 *  - /api/citas/dia (abajo) filtra a propósito `estado IN ('P','CC')`:
 *    es un endpoint de AGENDA (lo que falta por atenderse), no de
 *    histórico — excluir Atendidas/Canceladas es su comportamiento
 *    correcto, no un defecto.
 *  - Nuestro cruce por-paciente (vía /api/pacientes/{autoid}/citas con
 *    filtros de fecha/estado) tampoco las mostraba, por la misma razón.
 * El API ampliado sí trae asistencia masiva por rango de fechas —
 * ver fetchCitasAtendidas() — así que ya no hace falta ese cruce.
 *
 * Cirugía: confirmado que la reserva de quirófano no se agenda como
 * una "cita" (no hay nada en el catálogo de ~300 "asuntos"), vive en un
 * módulo aparte (`quirofanos_asignados`) — pero SÍ está expuesta en el
 * API ampliado, ver fetchProgramacionQx().
 *
 * Sigue sin existir en SISMA (confirmado por el desarrollador, no es
 * una limitación de la API): fecha de creación del registro de una
 * cita, y cualquier vínculo cita-a-cita ("cita_origen"). La
 * categorización por nombre de "asunto" en sismaCategories.ts sigue
 * siendo la única aproximación disponible para eso.
 */

const BASE_URL = process.env.SISMA_API_BASE_URL ?? "https://api.centrooftalmologicoebenezer.com";
const API_KEY = process.env.SISMA_API_KEY;

async function sismaFetch<T>(path: string): Promise<T> {
  if (!API_KEY) {
    throw new Error("SISMA_API_KEY no configurada — ver .env.example");
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Api-Key": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`SISMA API error ${res.status} en ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// --- API ampliada ("node") ---------------------------------------------
//
// Requiere una llave distinta (permisos más granulares — ver el correo
// al desarrollador). Mientras esa llave no esté configurada,
// SISMA_NODE_API_KEY queda vacía y las funciones de abajo lanzan un
// error claro que la página atrapa por sección, sin tumbar el resto.

const NODE_BASE_URL = `${BASE_URL}/node`;
const NODE_API_KEY = process.env.SISMA_NODE_API_KEY;

async function sismaNodeFetch<T>(path: string): Promise<{ data: T; aviso: string | null }> {
  if (!NODE_API_KEY) {
    throw new Error(
      "SISMA_NODE_API_KEY no configurada — pendiente de que TIC emita la llave del API ampliado (ver .env.example)"
    );
  }
  const res = await fetch(`${NODE_BASE_URL}${path}`, {
    headers: { "X-Api-Key": NODE_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`SISMA node API error ${res.status} en ${path}: ${await res.text()}`);
  }
  const data = (await res.json()) as T;
  return { data, aviso: res.headers.get("X-Aviso") };
}

export interface SismaPacienteResumen {
  autoid: number;
  tipoId: string;
  numId: string;
  nombres: string;
  apellidos: string;
  contrato: number | null;
  contratoNombre: string | null;
}

export interface SismaMedicoResumen {
  codigo: number;
  nombre: string;
  especialidad: string | null;
}

/** Cita de la agenda de un día — por diseño del backend, `estado` aquí
 * SOLO puede ser P (Pendiente) o CC (Confirmada): es lo que falta por
 * atenderse, no el histórico. Para el estado real (Atendida/Cancelada)
 * usar fetchCitasAtendidas(). `asunto` es el código numérico como
 * string, no el nombre legible. */
export interface SismaCitaDia {
  idCita: number;
  fecha: string;
  hora: string | null;
  estado: string | null;
  estadoDescripcion: string | null;
  asunto: string | null;
  idSede: number | null;
  paciente: SismaPacienteResumen;
  medico: SismaMedicoResumen;
}

export async function fetchCitasDia(fecha: string): Promise<SismaCitaDia[]> {
  return sismaFetch<SismaCitaDia[]>(`/api/citas/dia?fecha=${fecha}`);
}

/** Cita del histórico de un paciente — trae el estado final real
 * (P, CC, A, C, I) y el nombre legible del tipo de consulta. Útil para
 * casos puntuales por paciente; para asistencia masiva de un día o
 * rango, usar fetchCitasAtendidas() en vez de recorrer paciente por
 * paciente. */
export interface SismaCitaHistorica {
  idCita: number;
  fecha: string;
  estado: string | null;
  estadoDescripcion: string | null;
  idAsunto: number | null;
  asunto: string | null;
  empresa: string | null;
  empresaNombre: string | null;
  contrato: number | null;
  esAdicional: boolean;
}

export async function fetchPacienteCitas(
  autoid: number,
  { desde, hasta, limite = 20 }: { desde: string; hasta?: string; limite?: number }
): Promise<SismaCitaHistorica[]> {
  const hastaParam = hasta ? `&hasta=${hasta}` : "";
  return sismaFetch<SismaCitaHistorica[]>(
    `/api/pacientes/${autoid}/citas?desde=${desde}${hastaParam}&limite=${limite}`
  );
}

/** Cita con estado real de asistencia, del API ampliado — masivo por
 * rango de fechas (no paciente por paciente). Reemplaza el cruce
 * per-paciente que usábamos antes: ese cruce jamás mostraba estado A
 * porque tanto /api/citas/dia como el histórico con filtros de fecha
 * por defecto excluyen las atendidas (ver comentario del encabezado).
 * Forma de los campos inferida de la descripción del desarrollador
 * (2026-09-14) — confirmar contra /node/swagger si algo no calza al
 * activar la llave nueva. */
export interface SismaCitaAtendida {
  idCita: number;
  fecha: string;
  hora: string | null;
  estado: string;
  estadoDescripcion: string | null;
  idAsunto: number | null;
  asunto: string | null;
  paciente: SismaPacienteResumen;
  medico: SismaMedicoResumen | null;
}

export async function fetchCitasAtendidas(desde: string, hasta: string): Promise<SismaCitaAtendida[]> {
  const { data } = await sismaNodeFetch<SismaCitaAtendida[]>(
    `/api/informes/citas-atendidas?desde=${desde}&hasta=${hasta}`
  );
  return data;
}

/** Programación de cirugía (reserva de quirófano) — vive en un módulo
 * aparte de las citas normales (`quirofanos_asignados`), expuesta en el
 * API ampliado. Dos advertencias del desarrollador:
 *  - El estado "Incumplida" se calcula contra la fecha de HOY, así que
 *    la misma consulta puede dar cifras distintas en días distintos —
 *    el endpoint lo avisa vía la cabecera X-Aviso (ver `aviso` abajo).
 *  - Cada edición de una cirugía deja un registro de cancelación
 *    automática (motivoCancelacion con el texto fijo de
 *    CANCELACION_AUTOMATICA_TEXT) que NO debe contarse como cancelación
 *    real — usar esCancelacionAutomatica() para filtrarlas. */
export interface SismaProgramacionQx {
  idProgramacion: number;
  paciente: SismaPacienteResumen;
  procedimiento: string | null;
  cups: string | null;
  cirujano: string | null;
  anestesiologo: string | null;
  ayudante: string | null;
  quirofano: string | null;
  fechaProgramada: string;
  horaProgramada: string | null;
  estado: string;
  motivoCancelacion: string | null;
  diasOportunidad: number | null;
}

export interface SismaProgramacionQxResult {
  items: SismaProgramacionQx[];
  aviso: string | null;
}

export async function fetchProgramacionQx(desde: string, hasta: string): Promise<SismaProgramacionQxResult> {
  const { data, aviso } = await sismaNodeFetch<SismaProgramacionQx[]>(
    `/api/informes/programacion-qx?desde=${desde}&hasta=${hasta}`
  );
  return { items: data, aviso };
}

/** Misma información que fetchProgramacionQx, con "días de oportunidad"
 * como eje — no usado todavía en Venta del Día, queda disponible para
 * cuando se necesite. */
export async function fetchProgramacionQxOportunidad(
  desde: string,
  hasta: string
): Promise<SismaProgramacionQxResult> {
  const { data, aviso } = await sismaNodeFetch<SismaProgramacionQx[]>(
    `/api/informes/programacion-qx/oportunidad?desde=${desde}&hasta=${hasta}`
  );
  return { items: data, aviso };
}

export const CANCELACION_AUTOMATICA_TEXT = "Cancelado automáticamente por actualización de cirugía";

export function esCancelacionAutomatica(qx: SismaProgramacionQx): boolean {
  return (qx.motivoCancelacion ?? "").includes(CANCELACION_AUTOMATICA_TEXT);
}

/** Ejecuta `fn` sobre `items` con un máximo de `limit` llamadas en
 * vuelo a la vez — SISMA es un sistema clínico real, no pensado para
 * decenas de peticiones simultáneas sin control. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const current = next++;
      results[current] = await fn(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
