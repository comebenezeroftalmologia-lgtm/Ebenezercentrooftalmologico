import { requireAppUser } from "@/lib/auth";

/**
 * Cuánto cierra un día típico, según el motor de Frecuencias.
 *
 * Venta del Día muestra cuántas atenciones hubo hoy, pero un número
 * suelto no dice si el día fue bueno o malo. El tablero de Frecuencias
 * ya calcula ese contexto —"un miércoles típico cierra en 328"— y lo
 * muestra en su tarjeta de cierre. Lo que faltaba era que la plataforma
 * pudiera leerlo, porque ese cálculo vivía dentro del HTML del tablero.
 *
 * Ahora el motor lo escribe aparte, en `base/dia_tipico.json`, con la
 * misma regla que usa la tarjeta: promedio del mismo día de la semana
 * en las 4 semanas anteriores, contando solo los días con datos. Una
 * sola definición para los dos lados.
 *
 * Esta ruta solo lo trae y lo entrega. No calcula nada.
 */

const REPO = "pedroluisherrerabenitez5-design/tablero-ebenezer";
const ARCHIVO = "base/dia_tipico.json";

export const dynamic = "force-dynamic";

// El archivo cambia cuando corre el motor (un puñado de veces al día),
// así que media hora de caché sobra y ahorra llamadas a GitHub.
const CACHE_SEGUNDOS = 1800;

export type DiaTipico = {
  total: number;
  tipico: number | null;
  semanas: number;
};

export async function GET(req: Request) {
  await requireAppUser();

  const token = process.env.TABLERO_EBENEZER_PAT;
  if (!token) {
    return Response.json(
      { error: "Falta TABLERO_EBENEZER_PAT en Vercel." },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(
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
  } catch {
    return Response.json(
      { error: "No se pudo contactar el repositorio del tablero." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    // Que falte el contexto no es grave: Venta del Día sigue sirviendo
    // sin él. Se responde 200 con el dato vacío para que la página no
    // tenga que tratar esto como un error.
    return Response.json({ dias: {}, aviso: `GitHub respondió ${res.status}.` });
  }

  const datos = (await res.json()) as {
    generado?: string;
    regla?: string;
    dias?: Record<string, DiaTipico>;
  };

  // Si piden una fecha concreta, se devuelve solo esa: la página no
  // necesita cargar 180 días para pintar una tarjeta.
  const fecha = new URL(req.url).searchParams.get("fecha");
  if (fecha) {
    return Response.json({
      generado: datos.generado ?? null,
      fecha,
      dato: datos.dias?.[fecha] ?? null,
    });
  }

  return Response.json(datos);
}
