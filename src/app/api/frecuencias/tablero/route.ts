import { requireModuloAccess } from "@/lib/auth";

const REPO = "pedroluisherrerabenitez5-design/tablero-ebenezer";
const ARCHIVO = "Dashboard_Frecuencias.html";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_SEGUNDOS = 120;

const ESTILOS_AJUSTE_FILTROS = `
<style id="eb-frecuencias-inline-fix">
  /* Mantener todos los filtros + APLICAR + LIMPIAR + MUTUAL en una sola fila armónica */
  .filters, .filter-bar, .barra-filtros, .filtros-row, .controls-row, .top-filters {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: 8px !important;
  }
  /* Evitar que el bloque de Mutual salte a una segunda línea y ubicarlo justo al lado de LIMPIAR */
  .filters > *, .filter-bar > *, .barra-filtros > * {
    flex-shrink: 1 !important;
    white-space: nowrap !important;
  }
  /* Ajuste fino de proporción en pantallas medianas para que quepan todos los controles en 1 renglón sin verse apretados */
  @media (max-width: 1600px) {
    .filters, .filter-bar, .barra-filtros {
      gap: 6px !important;
    }
    .filters select, .filters button, .filter-bar select, .filter-bar button, .dd-btn, .f-btn, .btn-apply, .btn-clear {
      padding-left: 10px !important;
      padding-right: 10px !important;
      font-size: 12.5px !important;
    }
  }
</style>
<script id="eb-frecuencias-mutual-row-fix">
  (function() {
    function alinearFilaFiltros() {
      try {
        // Buscar el botón LIMPIAR y el bloque de MUTUAL para asegurar que compartan el mismo contenedor en una sola fila
        var botones = Array.from(document.querySelectorAll('button'));
        var btnLimpiar = botones.find(function(b) { return (b.textContent || '').trim().toUpperCase() === 'LIMPIAR'; });
        var btnIncluir = botones.find(function(b) { return (b.textContent || '').trim() === 'Incluir'; });
        if (btnLimpiar && btnIncluir) {
          var fila = btnLimpiar.parentElement;
          var grupoMutual = btnIncluir.parentElement;
          if (grupoMutual && grupoMutual.parentElement && grupoMutual.parentElement !== fila) {
            // Si tiene el rótulo MUTUAL al lado, tomamos el contenedor que agrupa el rótulo + Incluir/Excluir
            var bloqueMutual = grupoMutual.parentElement;
            if ((bloqueMutual.textContent || '').toUpperCase().indexOf('MUTUAL') !== -1 && bloqueMutual !== fila && !bloqueMutual.contains(btnLimpiar)) {
              grupoMutual = bloqueMutual;
            }
          }
          if (fila) {
            fila.style.display = 'flex';
            fila.style.flexWrap = 'nowrap';
            fila.style.alignItems = 'center';
            fila.style.gap = '8px';
            fila.style.width = '100%';
            if (grupoMutual && grupoMutual.parentElement !== fila && !grupoMutual.contains(fila)) {
              fila.appendChild(grupoMutual);
            }
            if (grupoMutual) {
              grupoMutual.style.marginLeft = '4px';
              grupoMutual.style.marginTop = '0px';
              grupoMutual.style.display = 'inline-flex';
              grupoMutual.style.alignItems = 'center';
              grupoMutual.style.flexShrink = '0';
            }
          }
        }
      } catch (e) {}
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', alinearFilaFiltros);
    } else {
      alinearFilaFiltros();
    }
    window.addEventListener('load', alinearFilaFiltros);
  })();
</script>
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