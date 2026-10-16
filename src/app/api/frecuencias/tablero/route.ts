import { requireModuloAccess } from "@/lib/auth";

const REPO = "pedroluisherrerabenitez5-design/tablero-ebenezer";
const ARCHIVO = "Dashboard_Frecuencias.html";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_SEGUNDOS = 120;

const ESTILOS_AJUSTE_FILTROS = `
<style id="eb-frecuencias-inline-fix">
  /* 1. En modo embebido, ocultar el escalón superior (.header) y organizar .sticky-top
        para que UNIDAD DE MEDIDA y el resumen de filtros compartan una sola franja limpia */
  .embebido .header {
    display: none !important;
  }
  .embebido .sticky-top {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    background-color: #EEF4FD !important;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 140' fill='none'%3E%3Cdefs%3E%3ClinearGradient id='b1' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%232563EB' stop-opacity='0.48'/%3E%3Cstop offset='100%25' stop-color='%2360A5FA' stop-opacity='0.06'/%3E%3C/linearGradient%3E%3ClinearGradient id='b2' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%231D4ED8' stop-opacity='0.68'/%3E%3Cstop offset='100%25' stop-color='%233B82F6' stop-opacity='0.12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='190' y='68' width='20' height='72' rx='4' fill='url(%23b1)'/%3E%3Crect x='220' y='48' width='20' height='92' rx='4' fill='url(%23b1)'/%3E%3Crect x='250' y='58' width='20' height='82' rx='4' fill='url(%23b1)'/%3E%3Crect x='280' y='32' width='20' height='108' rx='4' fill='url(%23b2)'/%3E%3Crect x='310' y='44' width='20' height='96' rx='4' fill='url(%23b1)'/%3E%3Crect x='340' y='18' width='20' height='122' rx='4' fill='url(%23b2)'/%3E%3Crect x='370' y='28' width='20' height='112' rx='4' fill='url(%23b1)'/%3E%3Cpath d='M 80 120 C 150 105 225 65 290 32 C 335 12 380 10 420 4' stroke='%231D4ED8' stroke-width='2' stroke-opacity='0.75'/%3E%3Cpath d='M 120 132 C 190 112 260 82 350 42 C 380 28 405 24 420 20' stroke='%232563EB' stroke-width='1.5' stroke-opacity='0.55'/%3E%3Ccircle cx='230' cy='48' r='3.5' fill='%23FFFFFF' stroke='%231D4ED8' stroke-width='2'/%3E%3Ccircle cx='290' cy='32' r='4' fill='%23FFFFFF' stroke='%231D4ED8' stroke-width='2'/%3E%3Ccircle cx='350' cy='18' r='4' fill='%23FFFFFF' stroke='%231D4ED8' stroke-width='2'/%3E%3C/svg%3E"), linear-gradient(90deg, #F4F8FE 0%, #E7F0FD 58%, #D4E5FA 100%) !important;
    background-repeat: no-repeat, no-repeat !important;
    background-position: right 0px top 0px, center !important;
    background-size: 420px 140px, 100% 100% !important;
    box-shadow: 0 2px 10px rgba(14, 36, 94, 0.05) !important;
  }

  /* 2. Barra de filtros (.period-bar) en una sola fila continua con aire superior y Mutual a la derecha */
  .embebido .period-bar {
    order: 1 !important;
    width: 100% !important;
    flex: 0 0 100% !important;
    padding: 12px 24px 10px !important;
    gap: 8px !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
    overflow: visible !important;
    background: rgba(255, 255, 255, 0.55) !important; border-bottom: 1px solid rgba(213, 227, 247, 0.8) !important;
    box-shadow: none !important;
  }
  .embebido .period-bar .dd-trig {
    min-width: 0 !important;
    padding: 6px 11px !important;
    font-size: 0.79rem !important;
    white-space: nowrap !important;
    border-radius: 9px !important;
  }
  .embebido .period-bar #dias-btn {
    min-width: 0 !important;
  }
  .embebido .period-bar .btn-apl {
    padding: 7px 16px !important;
    font-size: 0.74rem !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
  .embebido .period-bar button[onclick*="limpiarFiltros"] {
    padding: 6px 14px !important;
    font-size: 0.74rem !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
  .embebido .period-bar .tg-grupo {
    margin-left: auto !important;
    flex-shrink: 0 !important;
  }

  /* 3. UNIDAD DE MEDIDA (izq) y #resumen-filtros (der) con el mismo order:2 para compartir exactamente el mismo renglón sin escalón intermedio */
  .embebido .medida {
    order: 2 !important;
    width: auto !important;
    flex: 0 0 auto !important;
    margin: 0 !important;
    padding: 6px 16px 6px 24px !important;
    background: rgba(250, 251, 252, 0.72) !important;
    border-bottom: 1px solid #E7E9F2 !important;
    height: 40px !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
  }
  .embebido #resumen-filtros {
    order: 2 !important;
    width: auto !important;
    flex: 1 1 auto !important;
    margin: 0 !important;
    padding: 6px 24px 6px 12px !important;
    background: rgba(250, 251, 252, 0.72) !important;
    border-bottom: 1px solid #E7E9F2 !important;
    height: 40px !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 5px !important;
    font-size: 0.72rem !important;
    color: #5B6483 !important;
  }

  /* 4. Las 10 pestañas (.tabs) en una sola línea completa debajo de la franja de unidad de medida */
  .embebido .tabs {
    order: 3 !important;
    width: 100% !important;
    flex: 0 0 100% !important;
    padding: 6px 24px !important;
    overflow-x: hidden !important;
    flex-wrap: nowrap !important;
    gap: 2px !important;
    border-bottom: 1px solid #E7E9F2 !important;
  }
  .embebido .tabs .tab {
    padding: 8px 13px !important;
    font-size: 0.775rem !important;
    border-radius: 999px !important;
  }
  .embebido #aviso-pacientes,
  .embebido #aviso-rips,
  .embebido #alerta-contratos,
  .embebido #dias-banner {
    order: 4 !important;
    width: calc(100% - 48px) !important;
    flex-basis: calc(100% - 48px) !important;
  }

  /* 5. Aprovechamiento limpio del ancho en el área de contenido */
  .embebido .content {
    padding: 20px 24px 32px !important;
  }

  /* 6. Barra de contexto (.ctx-bar): diseño ejecutivo sobre blanco para no apilar dos cajas azules sobre #hoy-strip */
  .ctx-bar {
    background: #FFFFFF !important;
    border: 1px solid #E7E9F2 !important;
    border-radius: 12px !important;
    padding: 9px 18px !important;
    margin-bottom: 14px !important;
    font-size: 0.76rem !important;
    color: #5B6483 !important;
    box-shadow: 0 1px 2px rgba(14, 36, 94, 0.03) !important;
  }
  .ctx-bar strong {
    color: #0E245E !important;
    font-weight: 600 !important;
  }

  /* 7. Cierre del día (#hoy-strip): armonizado con la tipografía liviana y bordes suaves del sistema */
  #hoy-strip > div[style*="#E7ECFE"] {
    background: linear-gradient(135deg, #F4F7FE 0%, #ECF2FC 100%) !important;
    border: 1px solid #D5E0F5 !important;
    border-radius: 15px !important;
    padding: 16px 22px !important;
    margin-bottom: 18px !important;
    box-shadow: 0 1px 3px rgba(14, 36, 94, 0.04) !important;
  }
  #hoy-strip > div > div > div:first-child > div:first-child {
    font-size: 0.65rem !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.14em !important;
    color: #3B4F8D !important;
    margin-bottom: 4px !important;
  }
  #hoy-strip > div > div > div:first-child > div:nth-child(2) > span:first-child {
    font-size: 2.25rem !important;
    font-weight: 300 !important;
    letter-spacing: -0.025em !important;
    color: #0E245E !important;
    line-height: 1.05 !important;
    font-variant-numeric: tabular-nums !important;
  }

  /* 8. Tarjeta de Meta (#meta-card): acabado ejecutivo sin borde rojo estridente, manteniendo el semáforo en el estado y en la cifra faltante */
  #meta-card > div[style*="border-left"] {
    background: #FFFFFF !important;
    border: 1px solid #E7E9F2 !important;
    border-left: 3px solid #0E245E !important;
    border-radius: 15px !important;
    padding: 18px 22px !important;
    box-shadow: 0 1px 2px rgba(14, 36, 94, 0.04) !important;
  }
  #meta-card > div > div:first-child > span:first-child {
    font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif !important;
    font-size: 1.02rem !important;
    font-weight: 500 !important;
    color: #0E245E !important;
    letter-spacing: -0.012em !important;
  }
  #meta-card > div > div:nth-child(2) > div > div:first-child {
    font-size: 0.63rem !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.14em !important;
    color: #949BB4 !important;
    margin-bottom: 4px !important;
  }
  #meta-card > div > div:nth-child(2) > div > div:nth-child(2) {
    font-size: 1.95rem !important;
    font-weight: 300 !important;
    letter-spacing: -0.025em !important;
    line-height: 1.08 !important;
    font-variant-numeric: tabular-nums !important;
  }
  #meta-card > div > div:nth-child(3) {
    height: 7px !important;
    background: #EFF1F6 !important;
    border-radius: 999px !important;
  }
  #meta-card > div > div:nth-child(3) > div {
    background: linear-gradient(90deg, #0E245E 0%, #0F2FF3 100%) !important;
    border-radius: 999px !important;
  }

  /* 9. FILTROS DE MEDICOS (#p-medicos) y encabezados locales (#p-mutual): azul sutil (#EAF1FB) respetando intacta su estructura */
  #p-medicos > div:first-child,
  #p-mutual > div:first-child {
    background: #EAF1FB !important;
    border: 1px solid #C7CDE0 !important;
    box-shadow: 0 1px 3px rgba(14, 36, 94, 0.04) !important;
    color: #0E245E !important;
  }
  #p-medicos > div:first-child > div:first-child,
  #p-mutual > div:first-child > div:first-child > div:first-child {
    color: #0E245E !important;
  }
  #p-mutual > div:first-child > div:first-child > div:nth-child(2) {
    color: #3B4F8D !important;
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

  /* 10. Unificar bordes de tarjetas en Prepagadas y Buscar Servicio con el resto del tablero */
  #p-prep .card,
  #p-servicio .card {
    border: 1px solid #E7E9F2 !important;
  }

  /* 11. Ajuste fino de relleno en tablas de muchas columnas (#tbl-medicos, #tbl-dx, #tbl-apoyo)
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