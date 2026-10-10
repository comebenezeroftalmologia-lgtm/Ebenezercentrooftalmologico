import {
  esCancelacionAutomatica,
  fetchCitasAtendidas,
  fetchCitasDia,
  fetchProgramacionQx,
  type SismaCitaAtendida,
  type SismaProgramacionQx,
} from "@/lib/integrations/sisma";
import { categorizeAsunto, SISMA_CATEGORIA_LABELS, type SismaCategoria } from "@/lib/sismaCategories";
import { traerDiaTipico } from "@/lib/diaTipico";

/**
 * Todo lo que calcula Venta del Día, en un solo sitio.
 *
 * Por qué existe: se está rediseñando la página, y la forma de que el
 * rediseño no dañe nada es que la versión vieja y la nueva no puedan dar
 * números distintos — porque las dos llaman a esta misma función. Lo que
 * cambia es cómo se pinta, nunca lo que se cuenta.
 *
 * Aquí no hay nada de apariencia: ni colores, ni textos de pantalla, ni
 * componentes. Solo los datos y las reglas.
 */

export type SedeFiltro = "todas" | "1" | "2";

/** Sede 2 es Mutual; Sede 1 es todo lo demás. No se lee de SISMA —no lo
 *  manda— sino que se deduce de la empresa, igual que en el tablero de
 *  Frecuencias, para que las dos pantallas digan lo mismo. */
export const esMutual = (empresa: string | null | undefined) =>
  /MUTUAL/i.test(String(empresa ?? ""));

/** La regla de Faber, más exigente que el contrato: un paciente NUEVO no
 *  debería esperar más de 3 semanas en la Sede 1. */
export const LIMITE_SEDE1 = 21;
/** Los plazos del contrato de Mutual, verificados contra su propio Excel
 *  mes a mes (enero dio 1.067 contra 1.067). */
export const LIMITE_MUTUAL_GENERAL = 50;
export const LIMITE_MUTUAL_ESPECIALIDAD = 90;

const CATEGORIA_ORDEN: SismaCategoria[] = [
  "primera_vez",
  "control",
  "posquirurgico",
  "prequirurgico",
  "diagnostico",
  "otro",
];

const DIA_SEMANA = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

/** La mitad esperó más de esto y la otra mitad menos. No se usa el promedio
 *  porque un control pedido a propósito para dentro de un año lo dispara y
 *  deja de representar a nadie. */
function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.length % 2
    ? xs[(xs.length - 1) / 2]
    : Math.round(((xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2) * 10) / 10;
}

const esGeneral = (asunto: string) => {
  const a = asunto.toUpperCase();
  return a.includes("GENERAL") || a.includes("DESPUES DE 1");
};

export type FilaEspera = {
  servicio: string;
  n: number;
  espera: number;
  limite: number;
};

export type BloqueEspera = {
  titulo: string;
  regla: string;
  filas: FilaEspera[];
};

export type DatosVentaDelDia = Awaited<ReturnType<typeof calcularVentaDelDia>>;

export async function calcularVentaDelDia({
  fecha,
  sede,
}: {
  fecha: string;
  sede: SedeFiltro;
}) {
  const pasaSede = (empresa: string | null | undefined) =>
    sede === "todas" ? true : sede === "2" ? esMutual(empresa) : !esMutual(empresa);

  // La agenda del día. Si esto falla no hay nada que mostrar.
  let fetchError: string | null = null;
  let citasDia: Awaited<ReturnType<typeof fetchCitasDia>> = [];
  try {
    citasDia = await fetchCitasDia(fecha);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Error desconocido consultando SISMA.";
  }

  // La asistencia real. Se degrada por sección: si falla, el resto sigue.
  let asistenciaError: string | null = null;
  let citasAtendidas: SismaCitaAtendida[] = [];
  if (!fetchError) {
    try {
      citasAtendidas = await fetchCitasAtendidas(fecha, fecha);
    } catch (e) {
      asistenciaError =
        e instanceof Error ? e.message : "Error desconocido consultando SISMA (node).";
    }
  }

  let cirugiaError: string | null = null;
  let cirugiaItems: SismaProgramacionQx[] = [];
  let cirugiaAviso: string | null = null;
  if (!fetchError) {
    try {
      const r = await fetchProgramacionQx(fecha, fecha);
      cirugiaItems = r.items;
      cirugiaAviso = r.aviso;
    } catch (e) {
      cirugiaError =
        e instanceof Error ? e.message : "Error desconocido consultando SISMA (node).";
    }
  }

  const programadas = citasDia.length;

  // El filtro va aquí, antes de contar: así todo lo que viene después ya
  // sale por sede sin tener que acordarse de filtrarlo en cada sitio.
  if (sede !== "todas") citasAtendidas = citasAtendidas.filter((c) => pasaSede(c.empresa));
  const asistidas = citasAtendidas.length;

  // Las citas AGENDADAS que manda SISMA no traen empresa, solo las
  // atendidas. Filtrar unas y las otras no haría que el porcentaje compare
  // peras con manzanas, y nadie se daría cuenta. Con una sede escogida se
  // marca como no disponible en vez de mostrar un número equivocado.
  const hayAgendado = sede === "todas";
  const agendaDia = programadas + asistidas;
  const pctAgenda =
    hayAgendado && agendaDia > 0 ? Math.round((asistidas / agendaDia) * 1000) / 10 : null;

  const diaTipico = await traerDiaTipico(fecha);
  const pctTipico =
    diaTipico?.tipico && diaTipico.tipico > 0
      ? Math.round((diaTipico.total / diaTipico.tipico) * 100)
      : null;
  const nombreDia = DIA_SEMANA[new Date(fecha + "T12:00:00").getDay()];

  const atendidasConCategoria = citasAtendidas.map((c) => ({
    cita: c,
    categoria: categorizeAsunto(c.asunto),
  }));

  const porCategoria = CATEGORIA_ORDEN.map((cat) => ({
    stage: SISMA_CATEGORIA_LABELS[cat],
    count: atendidasConCategoria.filter((c) => c.categoria === cat).length,
    value: 0,
  })).filter((d) => d.count > 0);

  const preQuirurgicas = atendidasConCategoria.filter(
    (c) => c.categoria === "prequirurgico",
  ).length;
  const posQuirurgicos = atendidasConCategoria.filter(
    (c) => c.categoria === "posquirurgico",
  ).length;

  // --- La espera ---
  // Solo primera vez. Un control se agenda lejos a propósito: no es falta
  // de oportunidad, es el plan del médico.
  const diasDe = (cs: typeof atendidasConCategoria) =>
    cs
      .map((c) => c.cita.diasOportunidad)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);

  const diasPrimera = diasDe(
    atendidasConCategoria.filter((c) => c.categoria === "primera_vez"),
  );
  const oportunidad = mediana(diasPrimera);
  const mismoDia = diasPrimera.filter((d) => d <= 0).length;

  const limiteDe = (asunto: string, mutual: boolean) =>
    !mutual
      ? LIMITE_SEDE1
      : esGeneral(asunto)
        ? LIMITE_MUTUAL_GENERAL
        : LIMITE_MUTUAL_ESPECIALIDAD;

  function armarTabla(mutual: boolean): FilaEspera[] {
    const g = new Map<string, number[]>();
    for (const { cita, categoria } of atendidasConCategoria) {
      if (categoria !== "primera_vez") continue;
      if (esMutual(cita.empresa) !== mutual) continue;
      const d = cita.diasOportunidad;
      if (d === null) continue;
      const k = (cita.asunto ?? "Sin asunto").trim() || "Sin asunto";
      const a = g.get(k) ?? [];
      a.push(d);
      g.set(k, a);
    }
    return [...g.entries()]
      .map(([servicio, ds]) => ({
        servicio,
        n: ds.length,
        espera: mediana([...ds].sort((a, b) => a - b)) ?? 0,
        limite: limiteDe(servicio, mutual),
      }))
      // Con uno o dos pacientes la "mitad" no significa nada: se omiten para
      // no señalar un cuello de botella que no existe.
      .filter((x) => x.n >= 3)
      .sort((a, b) => b.espera / b.limite - a.espera / a.limite);
  }

  const bloques: BloqueEspera[] = [
    { titulo: "Sede 1", regla: "en rojo, más de 3 semanas", filas: armarTabla(false) },
    {
      titulo: "Sede 2 · Mutual",
      regla: "en rojo, fuera del plazo del contrato (50 días general, 90 especialidad)",
      filas: armarTabla(true),
    },
  ].filter(
    (b) =>
      b.filas.length > 0 && (sede === "todas" || (sede === "2") === (b.titulo !== "Sede 1")),
  );

  // --- Cirugía ---
  // Se cuenta por el estado que DEVUELVE el sistema, no por una lista fija.
  const cirugiaSinAutoCanceladas = cirugiaItems.filter((qx) => !esCancelacionAutomatica(qx));
  const porEstado = new Map<string, number>();
  for (const qx of cirugiaSinAutoCanceladas) {
    porEstado.set(qx.estado, (porEstado.get(qx.estado) ?? 0) + 1);
  }
  const estadosCirugia = Array.from(porEstado.entries()).sort((a, b) => b[1] - a[1]);
  const cirugiaTotal = cirugiaSinAutoCanceladas.length;
  const autoCanceladas = cirugiaItems.length - cirugiaTotal;

  return {
    fecha,
    sede,
    fetchError,
    asistenciaError,
    cirugiaError,
    cirugiaAviso,
    programadas,
    asistidas,
    hayAgendado,
    agendaDia,
    pctAgenda,
    diaTipico,
    pctTipico,
    nombreDia,
    porCategoria,
    preQuirurgicas,
    posQuirurgicos,
    diasPrimera,
    oportunidad,
    mismoDia,
    bloques,
    estadosCirugia,
    cirugiaTotal,
    autoCanceladas,
  };
}

/** Los errores técnicos no se le muestran a quien consulta el tablero: un
 *  código HTTP no le dice nada a gerencia ni a facturación. */
export function mensajeClaro(error: string, que: string): string {
  if (error === "SIN_LLAVE") {
    return `Todavía no está configurado el acceso al sistema para consultar ${que}. Avísele a quien administra la plataforma.`;
  }
  if (/not valid JSON|Unexpected token/i.test(error)) {
    return `El sistema respondió con un formato que la plataforma no pudo leer al consultar ${que}. Ya quedó reportado; si sigue apareciendo, avísenos.`;
  }
  if (/\b(401|403)\b/.test(error)) {
    return `El acceso al sistema no tiene permiso para consultar ${que}. Hay que revisar la llave configurada.`;
  }
  if (/\b(5\d\d)\b/.test(error)) {
    return `SISMA no respondió al consultar ${que}. Suele ser momentáneo: vuelva a intentar en unos minutos.`;
  }
  return `No se pudo consultar ${que} en este momento. Intente de nuevo en unos minutos.`;
}
