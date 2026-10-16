import { requireModuloAccess } from "@/lib/auth";

const REPO = "pedroluisherrerabenitez5-design/tablero-ebenezer";
const ARCHIVO = "Dashboard_Frecuencias.html";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_SEGUNDOS = 120;

const ESTILOS_AJUSTE_FILTROS = `
<style id="eb-frecuencias-inline-fix">
  /* 1. En modo embebido, ocultar el escalón superior (.header) que dejaba espacio vacío a la izquierda */
  .embebido .header {
    display: none !important;
  }

  /* 2. Barra de filtros (.period-bar) en una sola fila continua, con Mutual alineado a la derecha y sin scroll */
  .embebido .period-bar {
    padding: 10px 24px !important;
    gap: 8px !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
    overflow: visible !important;
  }
  .embebido .period-bar .dd-trig {
    min-width: 0 !important;
    padding: 7px 11px !important;
    font-size: 0.8rem !important;
    white-space: nowrap !important;
  }
  .embebido .period-bar #dias-btn {
    min-width: 0 !important;
  }
  .embebido .period-bar .btn-apl {
    padding: 8px 16px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
  .embebido .period-bar button[onclick*="limpiarFiltros"] {
    padding: 7px 14px !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
  .embebido .period-bar .tg-grupo {
    margin-left: auto !important;
    flex-shrink: 0 !important;
  }
  .embebido .medida {
    padding: 8px 24px 0 !important;
  }
  .embebido #resumen-filtros {
    padding: 5px 24px 7px !important;
  }

  /* 3. Las 10 pestañas (.tabs) en una sola línea completa sin barra de desplazamiento */
  .embebido .tabs {
    padding: 4px 24px !important;
    overflow-x: hidden !important;
    flex-wrap: nowrap !important;
  }
  .embebido .tabs .tab {
    padding: 10px 13px !important;
    font-size: 0.78rem !important;
  }

  /* 4. Aprovechamiento limpio del ancho en el área de contenido */
  .embebido .content {
    padding: 22px 24px !important;
  }

  /* 5. FILTROS DE MEDICOS (#p-medicos): conserva intacta su estructura original, cambiando solo el azul oscuro por azul sutil (#EAF1FB) */
  #p-medicos > div:first-child {
    background: #EAF1FB !important;
    border: 1px solid #C7CDE0 !important;
    box-shadow: 0 1px 3px rgba(14, 36, 94, 0.04) !important;
  }
  #p-medicos > div:first-child > div:first-child {
    color: #0E245E !important;
  }
  #p-medicos > div:first-child > div:nth-child(2),
  #p-medicos > div:first-child > div:nth-child(3) {
    background: #DCE7F7 !important;
    border: 1px solid #C2D4EE !important;
  }
  #p-medicos > div:first-child > div:nth-child(2) > span,
  #p-medicos > div:first-child > div:nth-child(3) > span {
    color: #3B4F8D !important;
  }
  #p-medicos .med-sede,
  #p-medicos .med-uf {
    color: #3B4F8D !important;
  }
  #p-medicos .med-sede:hover,
  #p-medicos .med-uf:hover {
    color: #0E245E !important;
    background: rgba(14, 36, 94, 0.06) !important;
  }
  #p-medicos .med-sede.active,
  #p-medicos .med-uf.active {
    background: #FFFFFF !important;
    color: #0E245E !important;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12) !important;
  }
  #p-medicos #med-search {
    border: 1px solid #C7CDE0 !important;
    background: #FFFFFF !important;
    color: #0E245E !important;
  }

  /* 6. Ajuste fino de relleno en tablas de muchas columnas (#tbl-medicos, #tbl-dx, #tbl-apoyo)
        para que entren completas en su tarjeta sin desbordar y respetando intacta la columna Participación */
  #tbl-medicos th,
  #tbl-dx th,
  #tbl-apoyo th {
    padding: 11px 8px !important;
    letter-spacing: 0.05em !important;
  }
  #tbl-medicos td,
  #tbl-dx td,
  #tbl-apoyo td {
    padding: 10px 8px !important;
  }
  #tbl-medicos th:first-child,
  #tbl-medicos td:first-child {
    width: 42px !important;
    padding-left: 14px !important;
    padding-right: 6px !important;
  }
  #tbl-medicos th:last-child,
  #tbl-medicos td:last-child {
    min-width: 140px !important;
    padding-right: 16px !important;
  }
</style>
`;

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

  let contenido = await res.text();
  if (contenido.includes("</head>")) {
    contenido = contenido.replace("</head>", `${ESTILOS_AJUSTE_FILTROS}</head>`);
  } else {
    contenido = ESTILOS_AJUSTE_FILTROS + contenido;
  }

  return new Response(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
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