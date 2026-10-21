import { traerDiasTipicos } from "@/lib/diaTipico";
import { calcularVentaDelDia } from "@/lib/ventaDelDia";
import digiturno from "@/lib/digiturno-contact-data.json";

/* ---------------------------------------------------------------------
   LOS NUMEROS DE LA PORTADA, TODOS CON FUENTE.
   Escrito el 21-10-2026.

   La portada mostraba cuatro cifras y una grafica de catorce dias que
   estaban escritas a mano en el componente: "453", "$ 28,4 M", "14 min",
   "38", y los catorce valores de la grafica. Se veian reales —fecha de
   hoy arriba, porcentajes, flechas de tendencia— y no lo eran. Gerencia
   abre esa pantalla.

   Este archivo reemplaza eso. Una regla, sin excepciones: si no hay de
   donde sacar el dato, la tarjeta lo dice. Nunca se rellena.

   De donde sale cada uno:
     · Atenciones    base/dia_tipico.json, que escribe el motor en cada
                     corrida. Es el mismo numero del tablero de
                     Frecuencias, asi que las dos pantallas coinciden.
     · Asistencia    SISMA en vivo, por calcularVentaDelDia. Reemplaza a
                     "Produccion del dia": la plataforma no tiene ninguna
                     cifra en pesos, en ningun lado, y una tarjeta en
                     pesos no se puede sostener sin inventarla.
     · Espera        digiturno-contact-data.json. La suma de los cinco
                     pasos se calcula IGUAL que en la pagina de Digiturno
                     (ver su monthlyChart): si las dos pantallas usaran
                     definiciones distintas, una de las dos mentiria.
     · Cirugias      SISMA en vivo, la programacion de quirofano.
   --------------------------------------------------------------------- */

export type KpiReal = {
  valor: string;
  subtitulo: string;
  delta: string | null;
  flecha: "up" | "down" | null;
  hayDato: boolean;
};

export type PuntoSerie = {
  etiqueta: string;
  valor: number;
  esActual: boolean;
  destacado: boolean;
};

export type DatosPortada = {
  /** El dia que se esta mostrando, AAAA-MM-DD. */
  fecha: string;
  /** Hoy en Colombia: el tope del selector. */
  hoy: string;
  /** Si el dia elegido es el de hoy, la jornada va corriendo. */
  enCurso: boolean;
  atenciones: KpiReal;
  asistencia: KpiReal;
  espera: KpiReal;
  cirugias: KpiReal;
  serie: PuntoSerie[];
  metaSerie: number | null;
  maxSerie: number;
  tituloSerie: string;
  subtituloSerie: string;
  hayAlgoSinDato: boolean;
};

const SIN_DATO: KpiReal = {
  valor: "—",
  subtitulo: "Sin dato disponible",
  delta: null,
  flecha: null,
  hayDato: false,
};

const MES_CORTO = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function num(n: number): string {
  return n.toLocaleString("es-CO");
}

/** Fecha de Colombia en AAAA-MM-DD, sin depender de la zona del servidor. */
function hoyColombia(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function comoFecha(f: string): Date {
  return new Date(f + "T12:00:00");
}

/** El ultimo dia CERRADO y la serie de los ultimos 14, del archivo del motor. */
async function deDiaTipico(fecha: string): Promise<{
  atenciones: KpiReal;
  serie: PuntoSerie[];
  meta: number | null;
  max: number;
  sub: string;
}> {
  const vacio = { atenciones: SIN_DATO, serie: [], meta: null, max: 10, sub: "Sin dato disponible" };
  try {
    const archivo = await traerDiasTipicos();
    if (!archivo?.dias) return vacio;

    // Hasta la fecha pedida, inclusive. La serie de barras termina ahi,
    // asi quien mira un dia de la semana pasada ve el contexto de esos
    // dias y no el de hoy.
    const cerrados = Object.entries(archivo.dias)
      .filter(([f]) => f <= fecha)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    if (!cerrados.length) return vacio;

    // Si el dia pedido no tiene cierre todavia (hoy, o un domingo), se
    // muestra el ultimo que si lo tenga y se dice cual es.
    const exacto = archivo.dias[fecha];
    const [fechaUlt, ult] = exacto
      ? ([fecha, exacto] as const)
      : cerrados[cerrados.length - 1];
    const d = comoFecha(fechaUlt);
    const cuando = `${d.getDate()} de ${MES_CORTO[d.getMonth()]}`;

    const pct =
      ult.tipico && ult.tipico > 0 ? Math.round((ult.total / ult.tipico) * 100) : null;

    const atenciones: KpiReal = {
      valor: num(ult.total),
      subtitulo:
        pct === null
          ? `Cierre del ${cuando}`
          : `Cierre del ${cuando} · un día igual cierra en ${num(ult.tipico ?? 0)}`,
      delta: pct === null ? null : `${pct}%`,
      flecha: pct === null ? null : pct >= 100 ? "up" : "down",
      hayDato: true,
    };

    const ultimos = cerrados.slice(-14);
    const serie: PuntoSerie[] = ultimos.map(([f, v], i) => {
      const fd = comoFecha(f);
      return {
        etiqueta: `${fd.getDate()} ${MES_CORTO[fd.getMonth()]}`,
        valor: v.total,
        esActual: i === ultimos.length - 1,
        destacado: i >= ultimos.length - 2,
      };
    });

    // La "meta" de la grafica es el dia tipico promedio del tramo: es con
    // lo que de verdad se compara cada dia, y sale del mismo archivo.
    const tipicos = ultimos.map(([, v]) => v.tipico ?? 0).filter((t) => t > 0);
    const meta = tipicos.length
      ? Math.round(tipicos.reduce((a, b) => a + b, 0) / tipicos.length)
      : null;

    const max = Math.max(...serie.map((p) => p.valor), meta ?? 0) * 1.15 || 10;

    return {
      atenciones,
      serie,
      meta,
      max: Math.ceil(max / 50) * 50,
      sub: `Atenciones facturadas por día — últimos ${serie.length} días cerrados`,
    };
  } catch {
    return vacio;
  }
}

/** Asistencia del dia y cirugias programadas: SISMA en vivo. */
async function deVentaDelDia(
  fecha: string,
  enCurso: boolean,
): Promise<{ asistencia: KpiReal; cirugias: KpiReal }> {
  try {
    const v = await calcularVentaDelDia({ fecha, sede: "todas" });

    // Con el dia corriendo NO se muestra el porcentaje: a media manana
    // "19%" no es la asistencia del dia, es la hora que es. Se muestra el
    // avance, que si se puede leer a cualquier hora.
    const asistencia: KpiReal =
      v.hayAgendado && v.agendaDia > 0
        ? enCurso
          ? {
              valor: `${num(v.asistidas)} de ${num(v.agendaDia)}`,
              subtitulo: "Atendidos hasta ahora · la jornada va corriendo",
              delta: null,
              flecha: null,
              hayDato: true,
            }
          : {
              valor: `${Math.round((v.asistidas / v.agendaDia) * 100)}%`,
              subtitulo: `${num(v.asistidas)} atendidos de ${num(v.agendaDia)} agendados`,
              delta: null,
              flecha: null,
              hayDato: true,
            }
        : SIN_DATO;

    const cirugias: KpiReal = v.cirugiaError
      ? SIN_DATO
      : {
          valor: num(v.cirugiaTotal),
          subtitulo: enCurso
            ? "Programadas hoy en quirófano"
            : "Programadas ese día en quirófano",
          delta: null,
          flecha: null,
          hayDato: true,
        };

    return { asistencia, cirugias };
  } catch {
    // SISMA se cae de vez en cuando. Eso no puede tumbar la portada, pero
    // tampoco puede rellenarse: se dice que no hay dato.
    return { asistencia: SIN_DATO, cirugias: SIN_DATO };
  }
}

/** Tiempo total del paciente en el centro, del ultimo mes con datos. */
function deDigiturno(): KpiReal {
  try {
    const meses = (digiturno as { digiturnoMonthly?: unknown[] }).digiturnoMonthly ?? [];
    if (!meses.length) return SIN_DATO;

    type Lado = { espera: number; atencion: number };
    type Mes = {
      month: string;
      year: number;
      steps: Record<string, { sede1: Lado; sede2: Lado }>;
    };
    const m = meses[meses.length - 1] as Mes;
    const pasos = ["step1", "step2", "step3", "step4", "step5"];

    // Misma suma que usa la pagina de Digiturno: espera + atencion de los
    // cinco pasos. Se promedian las dos sedes.
    const total = (lado: "sede1" | "sede2") =>
      pasos.reduce((a, p) => {
        const s = m.steps?.[p]?.[lado];
        return a + (s ? s.espera + s.atencion : 0);
      }, 0);

    const minutos = Math.round((total("sede1") + total("sede2")) / 2);
    if (!minutos) return SIN_DATO;

    return {
      valor: `${minutos} min`,
      subtitulo: `Recorrido completo del paciente · ${m.month} ${m.year}`,
      delta: null,
      flecha: null,
      hayDato: true,
    };
  } catch {
    return SIN_DATO;
  }
}

/** Ultimo dia CERRADO: es con lo que abre la portada. Nunca el de hoy. */
function diaPorDefecto(): string {
  const hoy = hoyColombia();
  const d = new Date(hoy + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function traerDatosPortada(fechaPedida?: string): Promise<DatosPortada> {
  const hoy = hoyColombia();
  // Una fecha que llega por la direccion no se usa en crudo: se valida el
  // formato y no se deja pasar del dia de hoy.
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(fechaPedida ?? "");
  let fecha = valida ? (fechaPedida as string) : diaPorDefecto();
  if (fecha > hoy) fecha = hoy;
  const enCurso = fecha === hoy;

  const [dt, vd] = await Promise.all([
    deDiaTipico(fecha),
    deVentaDelDia(fecha, enCurso),
  ]);
  const espera = deDigiturno();

  const kpis = [dt.atenciones, vd.asistencia, espera, vd.cirugias];

  return {
    fecha,
    hoy,
    enCurso,
    atenciones: dt.atenciones,
    asistencia: vd.asistencia,
    espera,
    cirugias: vd.cirugias,
    serie: dt.serie,
    metaSerie: dt.meta,
    maxSerie: dt.max,
    tituloSerie: "Producción reciente",
    subtituloSerie: dt.sub,
    hayAlgoSinDato: kpis.some((k) => !k.hayDato) || dt.serie.length === 0,
  };
}
