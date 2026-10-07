/**
 * Cuánto cierra un día típico, según el motor de Frecuencias.
 *
 * El motor escribe `base/dia_tipico.json` en el repositorio del tablero con
 * la misma regla que usa su tarjeta de cierre: promedio del mismo día de la
 * semana en las 4 semanas anteriores, contando solo los días con datos.
 *
 * Esto vive aquí y no dentro de la ruta de API porque las páginas del
 * servidor lo llaman directo. Pedirle a la propia aplicación una dirección
 * relativa desde el servidor no funciona —ahí no hay navegador que complete
 * el dominio— y era por eso que la franja de contexto de Venta del Día
 * salía siempre vacía.
 */

const REPO = "pedroluisherrerabenitez5-design/tablero-ebenezer";
const ARCHIVO = "base/dia_tipico.json";

// El archivo cambia cuando corre el motor, unas pocas veces al día.
const CACHE_SEGUNDOS = 1800;

export type DiaTipico = {
  /** Atenciones que se cerraron ese día. */
  total: number;
  /** Lo que cierra un día igual de la semana. null si no hay historia. */
  tipico: number | null;
  /** Cuántas de las 4 semanas anteriores tenían datos. */
  semanas: number;
};

export type ArchivoDiaTipico = {
  generado?: string;
  regla?: string;
  dias?: Record<string, DiaTipico>;
};

/** Todo el archivo. Devuelve null si no se pudo traer: es contexto, no un
 *  dato esencial, así que quien llame debe seguir funcionando sin él. */
export async function traerDiasTipicos(): Promise<ArchivoDiaTipico | null> {
  const token = process.env.TABLERO_EBENEZER_PAT;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${REPO}/main/${ARCHIVO}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.raw",
          "User-Agent": "ebenezer-plataforma",
        },
        next: { revalidate: CACHE_SEGUNDOS },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as ArchivoDiaTipico;
  } catch {
    return null;
  }
}

/** El dato de una fecha concreta, o null si no está. */
export async function traerDiaTipico(fecha: string): Promise<DiaTipico | null> {
  const datos = await traerDiasTipicos();
  return datos?.dias?.[fecha] ?? null;
}

/** Hoy en Colombia. El servidor corre en UTC: despues de las 7 de la noche
 *  alla ya es el dia siguiente, y sin esto el corte se iria un dia. */
function hoyColombia(): string {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * El último día CERRADO, con su fecha. Nunca el de hoy.
 *
 * Por qué nunca hoy: la facturación del día en curso va a medias. Se vio en
 * la portada marcando "125 atenciones · un miércoles típico cierra en 336 ·
 * 37%" a media mañana. Ese 37% no significa nada —el día apenas empieza—
 * pero en rojo y en grande parece una alarma. Un número que asusta sin
 * motivo es peor que no mostrar nada.
 *
 * Así que se toma el último día ANTERIOR a hoy: ese sí cerró y sí se puede
 * comparar contra un día igual de la semana.
 */
export async function traerUltimoDia(): Promise<(DiaTipico & { fecha: string }) | null> {
  const datos = await traerDiasTipicos();
  const dias = datos?.dias;
  if (!dias) return null;
  const hoy = hoyColombia();
  const fechas = Object.keys(dias).filter((f) => f < hoy).sort();
  const f = fechas[fechas.length - 1];
  return f ? { ...dias[f], fecha: f } : null;
}
