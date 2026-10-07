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

/**
 * El último día que tiene datos, con su fecha.
 *
 * Inicio no puede pedir "hoy" a secas: la facturación de hoy casi nunca está
 * cerrada todavía, y a primera hora el archivo ni siquiera trae la fecha de
 * hoy. Pedir hoy daría una portada en blanco justo cuando más se mira.
 * Se toma el día más reciente que exista y se dice cuál es, para que nadie
 * confunda el cierre de ayer con el de hoy.
 */
export async function traerUltimoDia(): Promise<(DiaTipico & { fecha: string }) | null> {
  const datos = await traerDiasTipicos();
  const dias = datos?.dias;
  if (!dias) return null;
  const fechas = Object.keys(dias).sort();
  const f = fechas[fechas.length - 1];
  return f ? { ...dias[f], fecha: f } : null;
}
