import { requireModuloAccess } from "@/lib/auth";

const REPO = "pedroluisherrerabenitez5-design/tablero-ebenezer";
const ARCHIVO = "Dashboard_Frecuencias.html";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_SEGUNDOS = 120;

const ESTILOS_AJUSTE_FILTROS = `
<style id="eb-frecuencias-inline-fix">
  /* 1. Evitar cualquier barra de desplazamiento horizontal en el encabezado de filtros y pestañas */
  header, .header, .filters, .filter-bar, .barra-filtros, .filtros-row, .tabs {
    overflow-x: visible !important;
  }

  /* 2. Que las 10 pestañas entren completas en pantalla sin que "Contrato Mutual" se corte a la derecha */
  .tabs {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
  }
  .tabs button {
    padding: 7px 11px !important;
    font-size: 12.2px !important;
    white-space: nowrap !important;
  }

  /* 3. Evitar que las tablas anchas (como Ranking Completo de Médicos) se desborden por la derecha */
  table {
    width: 100% !important;
    max-width: 100% !important;
    border-collapse: collapse !important;
  }
  table th,
  table td {
    padding-left: 7px !important;
    padding-right: 7px !important;
    box-sizing: border-box !important;
  }
  table th:first-child,
  table td:first-child {
    padding-left: 14px !important;
  }
  table th:last-child,
  table td:last-child {
    padding-right: 16px !important;
  }
  /* Darle buen ancho al nombre del médico (2da columna después de #) y acotar la barrita derecha */
  table td:nth-child(2) {
    min-width: 180px !important;
    line-height: 1.3 !important;
  }
  table td:last-child > div {
    max-width: 54px !important;
  }
</style>
<script id="eb-frecuencias-ui-clean">
  (function() {
    function limpiarTablero() {
      try {
        // A. Quitar el escalón superior ("276.493 registros · BASE_CLASIFICADA...") que deja un espacio vacío arriba a la izquierda
        var todos = Array.from(document.querySelectorAll('div, span, p'));
        for (var i = 0; i < todos.length; i++) {
          var el = todos[i];
          var txt = (el.textContent || '').trim();
          if (txt.indexOf('BASE_CLASIFICADA') !== -1 && el.children.length <= 3) {
            var filaSup = el.parentElement;
            if (filaSup && (filaSup.textContent || '').trim() === txt) {
              filaSup.style.display = 'none';
            } else {
              el.style.display = 'none';
            }
          }
        }

        // B. Mantener MUTUAL [Incluir | Excluir] en la misma fila de LIMPIAR, sin espacio muerto y sin barra de scroll
        var botones = Array.from(document.querySelectorAll('button'));
        var btnLimpiar = botones.find(function(b) { return (b.textContent || '').trim().toUpperCase() === 'LIMPIAR'; });
        var btnIncluir = botones.find(function(b) { return (b.textContent || '').trim() === 'Incluir'; });
        if (btnLimpiar && btnIncluir) {
          var fila = btnLimpiar.parentElement;
          var grupoMutual = btnIncluir.parentElement;
          if (grupoMutual && grupoMutual.parentElement && grupoMutual.parentElement !== fila) {
            var bloqueMutual = grupoMutual.parentElement;
            if ((bloqueMutual.textContent || '').toUpperCase().indexOf('MUTUAL') !== -1 && bloqueMutual !== fila && !bloqueMutual.contains(btnLimpiar)) {
              grupoMutual = bloqueMutual;
            }
          }
          if (fila) {
            fila.style.display = 'flex';
            fila.style.flexWrap = 'nowrap';
            fila.style.alignItems = 'center';
            fila.style.justifyContent = 'flex-start';
            fila.style.gap = '8px';
            fila.style.overflow = 'visible';
            if (grupoMutual && grupoMutual.parentElement !== fila && !grupoMutual.contains(fila)) {
              fila.appendChild(grupoMutual);
            }
            if (grupoMutual) {
              grupoMutual.style.marginLeft = '8px';
              grupoMutual.style.marginTop = '0px';
              grupoMutual.style.display = 'inline-flex';
              grupoMutual.style.alignItems = 'center';
              grupoMutual.style.flexShrink = '0';
            }
          }
        }

        // C. FILTROS DE MEDICOS: dejarlo exactamente como está en su posición y estructura, pero quitarle el fondo azul oscuro
        var inputMed = document.querySelector('input[placeholder*="medico"], input[placeholder*="médico"]');
        if (inputMed) {
          var cajaMed = inputMed.parentElement;
          while (cajaMed && cajaMed !== document.body) {
            var t = (cajaMed.textContent || '').toUpperCase();
            if (t.indexOf('FILTROS DE MEDICOS') !== -1 || t.indexOf('FILTROS DE MÉDICOS') !== -1) {
              break;
            }
            cajaMed = cajaMed.parentElement;
          }
          if (cajaMed && cajaMed !== document.body) {
            cajaMed.style.background = '#EAF1FB';
            cajaMed.style.backgroundColor = '#EAF1FB';
            cajaMed.style.backgroundImage = 'none';
            cajaMed.style.border = '1px solid #C9D9F0';
            cajaMed.style.boxShadow = 'none';
            cajaMed.style.color = '#0C1F3F';

            inputMed.style.border = '1px solid #BFD2EE';
            inputMed.style.background = '#FFFFFF';
            inputMed.style.color = '#0F172A';

            // Ajustar textos y sub-cajas dentro del bloque de médicos sobre el azul sutil
            var internos = cajaMed.querySelectorAll('*');
            for (var j = 0; j < internos.length; j++) {
              var nodo = internos[j];
              if (nodo === inputMed) continue;
              var tag = nodo.tagName;
              if (tag === 'BUTTON') {
                var bgBtn = window.getComputedStyle(nodo).backgroundColor;
                var esActivo = nodo.classList.contains('active') || nodo.classList.contains('on') || bgBtn === 'rgb(255, 255, 255)';
                if (esActivo) {
                  nodo.style.background = '#FFFFFF';
                  nodo.style.color = '#0C1F3F';
                  nodo.style.boxShadow = '0 1px 3px rgba(12,31,63,0.12)';
                } else {
                  nodo.style.background = 'transparent';
                  nodo.style.color = '#334E7B';
                }
              } else if (tag === 'DIV' || tag === 'SPAN') {
                var cs = window.getComputedStyle(nodo);
                if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
                  nodo.style.background = '#DCE7F7';
                  nodo.style.borderColor = '#C2D4EE';
                }
                if (cs.color === 'rgb(255, 255, 255)' || cs.color.indexOf('255, 255, 255') !== -1) {
                  nodo.style.color = '#0C1F3F';
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', limpiarTablero);
    } else {
      limpiarTablero();
    }
    window.addEventListener('load', limpiarTablero);
    document.addEventListener('click', function() { setTimeout(limpiarTablero, 30); });
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