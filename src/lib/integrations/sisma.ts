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

/**
 * IMPORTANTE — los informes del API ampliado devuelven CSV, no JSON.
 *
 * Esto se descubrió el 21-09-2026, al activar la llave: las peticiones
 * respondían "Unexpected token 'i', "tipo_docume"... is not valid JSON"
 * y "'C', "CONSECUTIV"...". Son las filas de encabezado del CSV. Las
 * estructuras que había aquí antes (paciente anidado, idCita, etc.)
 * estaban inferidas de una descripción, nunca probadas contra el API.
 *
 * El motor en Python del tablero de Frecuencias lleva semanas leyendo
 * estos mismos endpoints: pide formato=csv y separador=; y parsea el
 * resultado. Aquí se hace igual, para que ambos lean lo mismo.
 *
 * Los nombres de columna NO son uniformes entre endpoints:
 *   citas-atendidas  -> minúsculas con guión bajo (asunto, fecha_cita…)
 *   programacion-qx  -> MAYÚSCULAS (ESTADO, MOTIVO_DETALLE, CUPS…)
 * Por eso las filas se normalizan a minúsculas y se leen con `campo()`,
 * que acepta varios nombres posibles.
 */
export type FilaCsv = Record<string, string>;

/** Parte una línea de CSV respetando las comillas dobles. */
function partirLinea(linea: string, sep: string): string[] {
  const out: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (c === sep && !enComillas) {
      out.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  out.push(actual);
  return out;
}

function parsearCsv(texto: string, sep = ";"): FilaCsv[] {
  const limpio = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (!limpio) return [];
  const lineas = limpio.split("\n");
  const encabezados = partirLinea(lineas[0], sep).map((h) => h.trim().toLowerCase());
  const filas: FilaCsv[] = [];
  for (let i = 1; i < lineas.length; i++) {
    if (!lineas[i].trim()) continue;
    const celdas = partirLinea(lineas[i], sep);
    const fila: FilaCsv = {};
    encabezados.forEach((h, j) => {
      fila[h] = (celdas[j] ?? "").trim();
    });
    filas.push(fila);
  }
  return filas;
}

/** Lee un campo probando varios nombres posibles (los endpoints no usan
 * la misma convención). Devuelve "" si ninguno existe. */
export function campo(fila: FilaCsv, ...nombres: string[]): string {
  for (const n of nombres) {
    const v = fila[n.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

async function sismaNodeFetch(
  path: string,
): Promise<{ filas: FilaCsv[]; aviso: string | null }> {
  if (!NODE_API_KEY) {
    throw new Error("SIN_LLAVE");
  }
  const sep = ";";
  const unido = path.includes("?") ? "&" : "?";
  const url = `${NODE_BASE_URL}${path}${unido}formato=csv&separador=${encodeURIComponent(sep)}`;

  const res = await fetch(url, {
    headers: { "X-Api-Key": NODE_API_KEY, Accept: "text/csv" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`El sistema respondió con un error ${res.status} al consultar ${path}.`);
  }
  const texto = await res.text();
  return { filas: parsearCsv(texto, sep), aviso: res.headers.get("X-Aviso") };
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
/** Columnas reales (verificadas contra Informes/ATENDIDAS_COLUMNAS.txt
 * del motor): tipo_documento, numero_documento, edad, municipio,
 * contrato, empresa, telefono, medico, paciente, asunto,
 * codigo_procedimiento, procedimiento, cantidad, fecha_solicitud,
 * fecha_atencion, fecha_cita, fecha_marca_atendida, diagnostico,
 * dias_oportunidad, usuario_nombre… */
export interface SismaCitaAtendida {
  fecha: string;
  asunto: string | null;
  procedimiento: string | null;
  paciente: string | null;
  medico: string | null;
  empresa: string | null;
  contrato: string | null;
}

export async function fetchCitasAtendidas(desde: string, hasta: string): Promise<SismaCitaAtendida[]> {
  const { filas } = await sismaNodeFetch(
    `/api/informes/citas-atendidas?desde=${desde}&hasta=${hasta}`
  );
  return filas.map((f) => ({
    fecha: campo(f, "fecha_atencion", "fecha_cita", "fecha"),
    // Para categorizar sirve el asunto; si viene vacío, el procedimiento.
    asunto: campo(f, "asunto", "procedimiento") || null,
    procedimiento: campo(f, "procedimiento") || null,
    paciente: campo(f, "paciente") || null,
    medico: campo(f, "medico") || null,
    empresa: campo(f, "empresa") || null,
    contrato: campo(f, "contrato") || null,
  }));
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
/** Columnas reales (verificadas contra la muestra que bajó el motor):
 * CONSECUTIVO, FECHA_SOLICITUD, FECHA_PROGRAMADA, DIAS_OPORTUNIDAD,
 * HORA_INICIAL, HORA_FINAL, ESTADO, ESTADO_CODIGO, MOTIVO_TIPO,
 * MOTIVO_DETALLE, PACIENTE, TIPO_DOCUMENTO, DOCUMENTO, EDAD, TELEFONO,
 * CORREO, MUNICIPIO, CUPS, PROCEDIMIENTO, QUIROFANO, CIRUJANO,
 * ANESTESIOLOGO, AYUDANTE, MEDICO_AUXILIAR, RESPONSABLE, EMPRESA,
 * CONTRATO, ESTUDIO, OBSERVACION.
 *
 * Ojo con ESTADO: el valor real que devuelve el sistema es "Atendida",
 * no "Realizada". El código anterior contaba estados que no existen y
 * por eso habría dado cero aunque la llave hubiera funcionado. Aquí se
 * cuenta por el valor que venga, sin lista fija. */
export interface SismaProgramacionQx {
  consecutivo: string;
  paciente: string | null;
  procedimiento: string | null;
  cups: string | null;
  cirujano: string | null;
  anestesiologo: string | null;
  quirofano: string | null;
  fechaProgramada: string;
  horaInicial: string | null;
  estado: string;
  motivoTipo: string | null;
  motivoCancelacion: string | null;
  empresa: string | null;
  diasOportunidad: number | null;
}

export interface SismaProgramacionQxResult {
  items: SismaProgramacionQx[];
  aviso: string | null;
}

function aQx(f: FilaCsv): SismaProgramacionQx {
  const dias = campo(f, "dias_oportunidad");
  return {
    consecutivo: campo(f, "consecutivo"),
    paciente: campo(f, "paciente") || null,
    procedimiento: campo(f, "procedimiento") || null,
    cups: campo(f, "cups") || null,
    cirujano: campo(f, "cirujano") || null,
    anestesiologo: campo(f, "anestesiologo") || null,
    quirofano: campo(f, "quirofano") || null,
    fechaProgramada: campo(f, "fecha_programada", "fecha"),
    horaInicial: campo(f, "hora_inicial") || null,
    estado: campo(f, "estado") || "Sin estado",
    motivoTipo: campo(f, "motivo_tipo") || null,
    motivoCancelacion: campo(f, "motivo_detalle", "motivo_cancelacion") || null,
    empresa: campo(f, "empresa") || null,
    diasOportunidad: dias ? Number(dias) : null,
  };
}

export async function fetchProgramacionQx(desde: string, hasta: string): Promise<SismaProgramacionQxResult> {
  const { filas, aviso } = await sismaNodeFetch(
    `/api/informes/programacion-qx?desde=${desde}&hasta=${hasta}`
  );
  return { items: filas.map(aQx), aviso };
}

/** Misma información que fetchProgramacionQx, con "días de oportunidad"
 * como eje — no usado todavía en Venta del Día, queda disponible para
 * cuando se necesite. */
export async function fetchProgramacionQxOportunidad(
  desde: string,
  hasta: string
): Promise<SismaProgramacionQxResult> {
  const { filas, aviso } = await sismaNodeFetch(
    `/api/informes/programacion-qx/oportunidad?desde=${desde}&hasta=${hasta}`
  );
  return { items: filas.map(aQx), aviso };
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
