/**
 * API Citas SISMA — sistema clínico/de agendamiento de la clínica,
 * DISTINTO de Clientify (que es el CRM comercial). Swagger:
 * https://api.centrooftalmologicoebenezer.com/swagger/index.html
 *
 * Limitación importante, confirmada probando contra datos reales
 * (2026-09-13): /api/citas/dia NUNCA refleja el estado final de una
 * cita (Atendida/Cancelada), ni siquiera para fechas ya pasadas —
 * solo trae P (Pendiente) o CC (Confirmada). El único endpoint con el
 * estado real es el histórico por paciente
 * (/api/pacientes/{autoid}/citas), que sí trae A/C/I además de P/CC.
 * No existe un endpoint masivo "todas las citas de un día con su
 * estado final" — por eso Venta del Día cruza el listado del día con
 * una consulta por paciente (ver mapWithConcurrency).
 *
 * Otra limitación: no hay ningún campo que vincule una cita atendida
 * con la cita futura que "resultó" de ella (no hay fecha de creación
 * del registro, solo fecha de la cita). Lo que sí permite el catálogo
 * de "asuntos" (tipos de consulta) es identificar por el NOMBRE si una
 * cita es un control/posquirúrgico/prequirúrgico — ver
 * sismaCategories.ts. Es una categorización por tipo de cita, no un
 * vínculo causal exacto.
 *
 * Tampoco existe ningún endpoint de agendamiento de CIRUGÍA (la
 * reserva de quirófano en sí) — barrido completo del catálogo de
 * ~300 ids de "asunto" sin encontrar nada de ese tipo, solo consultas
 * PRE y POS-quirúrgicas. Esa pieza queda pendiente de un acceso más
 * amplio a SISMA.
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

/** Cita de la agenda de un día — OJO: `estado` aquí NUNCA es el estado
 * final (solo P/CC), y `asunto` es el código numérico como string, no
 * el nombre legible. Para ambos hace falta cruzar con el histórico del
 * paciente (ver fetchPacienteCitas). */
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

/** Cita del histórico de un paciente — este SÍ trae el estado final
 * real (P, CC, A, C, I) y el nombre legible del tipo de consulta. */
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

/** Histórico de un paciente desde una fecha (sin `hasta` — trae la
 * cita del día consultado, si existe, y las citas futuras que ya
 * tenga agendadas). `limite` bajo porque normalmente son pocas. */
export async function fetchPacienteCitas(
  autoid: number,
  { desde, limite = 20 }: { desde: string; limite?: number }
): Promise<SismaCitaHistorica[]> {
  return sismaFetch<SismaCitaHistorica[]>(
    `/api/pacientes/${autoid}/citas?desde=${desde}&limite=${limite}`
  );
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
