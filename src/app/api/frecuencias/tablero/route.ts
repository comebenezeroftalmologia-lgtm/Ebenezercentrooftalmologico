import { requireModuloAccess } from "@/lib/auth";

/**
 * Sirve el tablero de Frecuencias completo.
 *
 * Por qué existe:
 * Durante un tiempo este módulo reconstruyó el tablero a mano, pestaña
 * por pestaña. Esa copia siempre iba por detrás del original: llegó a
 * tener dos pestañas vacías y a mostrar una diferencia de -24.927
 * atenciones que no era real (comparaba 9 meses de 2026 contra 12 de
 * 2025). El motor en Python es la única fuente de los números y ya
 * genera el tablero completo dos veces al día, así que aquí se muestra
 * ESE archivo en vez de reconstruirlo.
 *
 * Cómo funciona:
 * 1. Verifica que el usuario tenga acceso al módulo "frecuencias"
 *    (mismo login y mismos permisos que el resto de la plataforma).
 * 2. Trae Dashboard_Frecuencias.html del repositorio del tablero con un
 *    token de SOLO LECTURA (el mismo que ya usa la sincronización).
 * 3. Lo devuelve tal cual. No guarda copia: lo que se ve es siempre la
 *    última versión que generó el motor.
 *
 * El archivo va con los nombres de pacientes enmascarados
 * (TABLERO_PUBLICO=1 en el workflow que lo genera).
 */

const REPO = "pedroluisherrerabenitez5-design/tablero-ebenezer";
const ARCHIVO = "Dashboard_Frecuencias.html";

// Depende de la sesión del usuario (verifica permisos), así que no se
// puede pre-generar: tiene que resolverse en cada petición.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Caché corta sobre la descarga: evita bajar 5 MB en cada clic dentro
// de la sesión, pero sin que un cambio recién publicado tarde en verse.
// (Con media hora, después de regenerar el tablero la página seguía
// mostrando la versión anterior y parecía que no había servido.)
const CACHE_SEGUNDOS = 120;

export async function GET() {
  await requireModuloAccess("frecuencias");

  const token = process.env.TABLERO_EBENEZER_PAT;
  if (!token) {
    return html(
      aviso(
        "Falta configurar el acceso al tablero",
        "No está definida la variable <code>TABLERO_EBENEZER_PAT</code> en Vercel. " +
          "Es el token de solo lectura del repositorio del tablero, el mismo que " +
          "ya usa la sincronización en GitHub. Se agrega en " +
          "<strong>Vercel → Settings → Environment Variables</strong> y luego se vuelve a desplegar.",
      ),
      500,
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
    return html(
      aviso(
        "No se pudo contactar el repositorio",
        "Puede ser una caída momentánea de GitHub. Recargue en un minuto.",
      ),
      502,
    );
  }

  if (!res.ok) {
    const detalle =
      res.status === 401 || res.status === 403
        ? "El token no tiene permiso de lectura sobre el repositorio, o está vencido."
        : res.status === 404
          ? `No se encontró <code>${ARCHIVO}</code> en la rama main del repositorio.`
          : `GitHub respondió ${res.status}.`;
    return html(aviso("No se pudo traer el tablero", detalle), 502);
  }

  const contenido = await res.text();

  return new Response(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Solo se puede mostrar dentro de esta misma plataforma.
      "Content-Security-Policy": "frame-ancestors 'self'",
      // EL TABLERO SE GUARDA EN EL NAVEGADOR DE CADA USUARIO.
      //
      // Antes iba con max-age=0, must-revalidate: el navegador no lo
      // reutilizaba nunca y cada visita a Frecuencias bajaba 1,9 MB
      // enteros desde GitHub. Medido en produccion: 3,8 segundos solo en
      // eso, de los 5,8 que tardaba la pantalla.
      //
      // El revalidate de arriba no servia de nada para esto: el archivo
      // pesa unos 7 MB sin comprimir y la cache de datos de Vercel no
      // admite entradas de mas de 2 MB, asi que nunca llego a guardarse.
      // La cache que si funciona es la del navegador.
      //
      //   private  -> queda SOLO en el navegador de quien lo pidio.
      //               Nunca en un cache compartido: el tablero depende de
      //               permisos y no puede viajar de un usuario a otro.
      //   max-age=300 -> cinco minutos instantaneos.
      //   stale-while-revalidate=900 -> hasta quince minutos mas lo
      //               muestra al instante mientras baja la version nueva
      //               por detras. Asi nadie espera y nadie ve algo viejo
      //               por mucho rato.
      //
      // El motor corre unas pocas veces al dia, no cada cinco minutos.
      "Cache-Control": "private, max-age=300, stale-while-revalidate=900",
    },
  });
}

function aviso(titulo: string, cuerpo: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#FAFBFC;color:#0B1633">
<div style="max-width:640px;margin:56px auto;padding:26px;background:#fff;border:1px solid #E1E4EC;border-radius:18px;box-shadow:0 4px 10px rgba(14,36,94,.06)">
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#B3541E;font-weight:700">Tablero no disponible</div>
  <h1 style="font-size:19px;margin:8px 0 12px">${titulo}</h1>
  <p style="font-size:14px;line-height:1.6;color:#2A335A;margin:0">${cuerpo}</p>
  <p style="font-size:13px;line-height:1.6;color:#5B6483;margin:16px 0 0">
    Los datos no se perdieron: el tablero se sigue generando cada día. Esto solo afecta a esta pantalla.
  </p>
</div></body></html>`;
}

function html(cuerpo: string, status: number) {
  return new Response(cuerpo, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
