export const EBENEZER_COMBINACION_GANADORA_SNIPPET = `
<style id="ebenezer-combinacion-ganadora-styles">
  /* === LA COMBINACIÓN GANADORA: ESTÁNDAR EJECUTIVO MULTI-HOJA === */
  /* 0. Posición de MUTUAL (.tg-grupo) pegado a LIMPIAR a la izquierda para despejar ilustración derecha */
  .embebido .period-bar, .period-bar {
    justify-content: flex-start !important;
  }
  .embebido .period-bar .tg-grupo, .period-bar .tg-grupo, .tg-grupo {
    margin-left: 10px !important;
    margin-right: auto !important;
    flex-shrink: 0 !important;
  }
  
  /* 1. Cintillos de contexto / resumen (Opción 3) */
  .eb-cg-context-strip {
    background: linear-gradient(90deg, #EAF2FE 0%, #F4F8FF 50%, #EAF2FE 100%) !important;
    border: 1px solid #D4E4FA !important;
    border-radius: 12px !important;
    box-shadow: 0 3px 10px -4px rgba(14, 36, 94, 0.06) !important;
  }

  /* 2. Tarjeta ejecutiva de Cierre del Día */
  .eb-cg-cierre-card {
    background: linear-gradient(135deg, #EAF2FE 0%, #F4F8FF 58%, #FFFFFF 100%) !important;
    border: 1px solid #D0E2FA !important;
    border-left: 4px solid #1D4ED8 !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 22px -10px rgba(14, 36, 94, 0.10) !important;
  }

  .eb-cg-pill-item {
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    background: #FFFFFF !important;
    border: 1px solid #D8E6FA !important;
    border-radius: 999px !important;
    padding: 3px 11px !important;
    font-size: 12px !important;
    color: #0E245E !important;
    box-shadow: 0 2px 6px rgba(14, 36, 94, 0.05) !important;
    margin-right: 4px !important;
    margin-top: 4px !important;
  }

  /* 3. Tarjetas de KPIs en todas las hojas (Opción 3 + Mini-gráfica Opción 1) */
  .eb-cg-kpi-card {
    position: relative !important;
    overflow: hidden !important;
    border-radius: 16px !important;
    border: 1px solid #DCE8F8 !important;
    border-left-width: 4px !important;
    border-left-style: solid !important;
    background: linear-gradient(180deg, #ECF4FE 0%, #F7FAFF 38%, #FFFFFF 60%) !important;
    box-shadow: 0 8px 22px -10px rgba(14, 36, 94, 0.10) !important;
    padding-bottom: 48px !important;
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
  }

  .eb-cg-kpi-card:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 14px 28px -10px rgba(29, 88, 216, 0.16) !important;
  }

  .eb-cg-kpi-card[data-eb-accent="blue"] {
    border-left-color: #3B82F6 !important;
    background: linear-gradient(180deg, #EBF3FE 0%, #F7FAFF 40%, #FFFFFF 64%) !important;
  }
  .eb-cg-kpi-card[data-eb-accent="royal"] {
    border-left-color: #1D4ED8 !important;
    background: linear-gradient(180deg, #E6F0FE 0%, #F5F9FF 40%, #FFFFFF 64%) !important;
  }
  .eb-cg-kpi-card[data-eb-accent="emerald"] {
    border-left-color: #10B981 !important;
    background: linear-gradient(180deg, #E6FAF3 0%, #F4FDF9 40%, #FFFFFF 64%) !important;
  }
  .eb-cg-kpi-card[data-eb-accent="violet"] {
    border-left-color: #8B5CF6 !important;
    background: linear-gradient(180deg, #F0EBFE 0%, #FAF8FF 40%, #FFFFFF 64%) !important;
  }
  .eb-cg-kpi-card[data-eb-accent="amber"] {
    border-left-color: #F59E0B !important;
    background: linear-gradient(180deg, #FEF5E7 0%, #FFFDF9 40%, #FFFFFF 64%) !important;
  }

  .eb-cg-kpi-icon {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 26px !important;
    height: 26px !important;
    border-radius: 999px !important;
    margin-right: 8px !important;
    vertical-align: middle !important;
    flex-shrink: 0 !important;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.85) !important;
  }

  .eb-cg-spark-wrap {
    position: absolute !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    height: 42px !important;
    pointer-events: none !important;
    z-index: 1 !important;
  }

  .eb-cg-kpi-card > *:not(.eb-cg-spark-wrap) {
    position: relative !important;
    z-index: 2 !important;
  }

  /* 4. Tarjeta de Meta a la Fecha */
  .eb-cg-meta-card {
    border-radius: 16px !important;
    border: 1px solid #DCE8F8 !important;
    border-left: 4px solid #F59E0B !important;
    background: linear-gradient(180deg, #FFFDF7 0%, #FFFFFF 45%) !important;
    box-shadow: 0 8px 22px -10px rgba(14, 36, 94, 0.09) !important;
  }

  /* 5. Paneles, gráficas y tablas de todas las hojas secundarias */
  .eb-cg-panel-card {
    border-radius: 16px !important;
    border: 1px solid #DCE8F8 !important;
    border-left: 3.5px solid #2563EB !important;
    background: linear-gradient(180deg, #F2F7FE 0%, #FFFFFF 46px) !important;
    box-shadow: 0 8px 22px -10px rgba(14, 36, 94, 0.08) !important;
  }

  /* 6. Tablas ejecutivas en todas las hojas */
  table thead th {
    background: linear-gradient(180deg, #EAF2FE 0%, #F3F8FF 100%) !important;
    color: #0E245E !important;
    font-weight: 700 !important;
    border-bottom: 1px solid #CFE0F8 !important;
  }
  table tbody tr:hover td {
    background-color: #F4F8FF !important;
  }
</style>

<script id="ebenezer-combinacion-ganadora-script">
(function() {
  var ACCENTS = [
    {
      key: "blue",
      stroke: "#3B82F6",
      iconBg: "#DCEBFE",
      iconColor: "#1D4ED8",
      path: "M 0 34 C 28 30, 52 18, 84 25 C 116 32, 146 12, 182 19 C 208 24, 224 10, 240 7",
      iconSvg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    },
    {
      key: "royal",
      stroke: "#1D4ED8",
      iconBg: "#DBEAFE",
      iconColor: "#1E40AF",
      path: "M 0 35 C 30 28, 58 20, 90 26 C 122 31, 152 14, 186 18 C 212 21, 226 9, 240 6",
      iconSvg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>'
    },
    {
      key: "emerald",
      stroke: "#10B981",
      iconBg: "#D1FAE5",
      iconColor: "#059669",
      path: "M 0 34 C 32 26, 62 19, 94 24 C 126 28, 156 12, 188 15 C 214 17, 228 8, 240 5",
      iconSvg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>'
    },
    {
      key: "violet",
      stroke: "#8B5CF6",
      iconBg: "#EDE9FE",
      iconColor: "#7C3AED",
      path: "M 0 36 C 34 32, 64 25, 96 29 C 128 33, 158 16, 192 19 C 216 21, 229 9, 240 4",
      iconSvg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m17 8-5-5-5 5"/><path d="m17 16-5 5-5-5"/></svg>'
    },
    {
      key: "amber",
      stroke: "#F59E0B",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      path: "M 0 34 C 30 29, 60 22, 92 25 C 124 28, 154 14, 188 16 C 214 18, 228 9, 240 6",
      iconSvg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    }
  ];

  var uidCounter = 0;

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 30;
  }

  function enhanceCardAsKpi(card, idx) {
    if (!card || card.classList.contains("eb-cg-cierre-card") || card.classList.contains("eb-cg-meta-card")) return;
    var accent = ACCENTS[idx % ACCENTS.length];
    card.classList.add("eb-cg-kpi-card");
    card.setAttribute("data-eb-accent", accent.key);

    // 1. Prepend circular icon badge to the card header/label if not already added
    if (!card.querySelector(".eb-cg-kpi-icon")) {
      var firstChild = card.firstElementChild;
      if (firstChild && firstChild.tagName !== "TABLE" && firstChild.tagName !== "SVG") {
        var badge = document.createElement("span");
        badge.className = "eb-cg-kpi-icon";
        badge.style.backgroundColor = accent.iconBg;
        badge.style.color = accent.iconColor;
        badge.innerHTML = accent.iconSvg;
        firstChild.insertBefore(badge, firstChild.firstChild);
      }
    }

    // 2. Append mini-area sparkline wave at the bottom of the card if not already added
    if (!card.querySelector(".eb-cg-spark-wrap")) {
      uidCounter += 1;
      var gradId = "eb-cg-grad-" + accent.key + "-" + uidCounter;
      var sparkColor = accent.key === "violet" ? "#10B981" : accent.stroke;
      var areaPath = accent.path + " L 240 44 L 0 44 Z";
      var wrap = document.createElement("div");
      wrap.className = "eb-cg-spark-wrap";
      wrap.innerHTML =
        '<svg width="100%" height="100%" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="' + sparkColor + '" stop-opacity="0.25"/>' +
              '<stop offset="100%" stop-color="' + sparkColor + '" stop-opacity="0.02"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path d="' + areaPath + '" fill="url(#' + gradId + ')"/>' +
          '<path d="' + accent.path + '" fill="none" stroke="' + sparkColor + '" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';
      card.appendChild(wrap);
    }
  }

  function applyCombinacionGanadora() {
    try {
      // A. Keep MUTUAL toggle right next to LIMPIAR
      var allEls = document.querySelectorAll("div, span, label");
      for (var i = 0; i < allEls.length; i++) {
        var el = allEls[i];
        var txt = (el.textContent || "").trim();
        if (txt === "MUTUAL" && el.parentElement) { el.parentElement.style.setProperty("margin-left", "10px", "important"); el.parentElement.style.setProperty("margin-right", "auto", "important"); if (el.parentElement.parentElement) el.parentElement.parentElement.style.setProperty("justify-content", "flex-start", "important");
          el.parentElement.style.marginLeft = "8px";
        }
      }

      // B. Detect context strips, Cierre del Día, Meta a la fecha, KPI cards, and panels across all visible sheets
      var blocks = document.querySelectorAll("div, section, article");
      var kpiCandidates = [];

      for (var j = 0; j < blocks.length; j++) {
        var b = blocks[j];
        if (!isVisible(b)) continue;
        var rect = b.getBoundingClientRect();
        var text = (b.textContent || "").trim();

        // 1. Context strip ("Período: ...")
        if (rect.height >= 28 && rect.height <= 64 && rect.width > 500 && (text.indexOf("Período:") === 0 || text.indexOf("Periodo:") === 0)) {
          b.classList.add("eb-cg-context-strip");
          continue;
        }

        // 2. Cierre del día banner
        if (rect.height >= 70 && rect.height <= 190 && rect.width > 500 && text.indexOf("CIERRE DEL") !== -1 && b.children.length <= 6) {
          b.classList.add("eb-cg-cierre-card");
          continue;
        }

        // 3. Meta a la fecha card
        if (rect.height >= 90 && rect.height <= 260 && rect.width > 500 && text.indexOf("Meta a la fecha") !== -1 && text.indexOf("REALIZADO") !== -1 && b.children.length <= 8) {
          b.classList.add("eb-cg-meta-card");
          continue;
        }
      }

      // 4. Identify KPI grids / KPI cards on ANY active sheet
      var explicitKpis = document.querySelectorAll(".kpi-card, .kpi, .stat-card, .metric-card, .card-kpi, [class*='kpi-']");
      var styledCount = 0;
      for (var k = 0; k < explicitKpis.length; k++) {
        var ek = explicitKpis[k];
        if (!isVisible(ek)) continue;
        var er = ek.getBoundingClientRect();
        if (er.width >= 150 && er.width <= 520 && er.height >= 85 && er.height <= 310 && !ek.querySelector("table, canvas")) {
          enhanceCardAsKpi(ek, styledCount++);
        }
      }

      // Also detect grid rows of 2 to 6 sibling cards on any tab (e.g. 2024, 2025, 2026, DIFERENCIA, or secondary tab KPI rows)
      for (var m = 0; m < blocks.length; m++) {
        var parent = blocks[m];
        if (!isVisible(parent)) continue;
        var children = [];
        for (var c = 0; c < parent.children.length; c++) {
          var ch = parent.children[c];
          if (ch.tagName === "DIV" || ch.tagName === "ARTICLE" || ch.tagName === "SECTION") {
            children.push(ch);
          }
        }
        if (children.length >= 2 && children.length <= 6) {
          var allLookLikeKpi = true;
          var firstTop = null;
          for (var n = 0; n < children.length; n++) {
            var cr = children[n].getBoundingClientRect();
            if (cr.width < 150 || cr.width > 520 || cr.height < 90 || cr.height > 290) {
              allLookLikeKpi = false;
              break;
            }
            if (children[n].querySelector("table, canvas, iframe")) {
              allLookLikeKpi = false;
              break;
            }
            if (firstTop === null) firstTop = cr.top;
          }
          if (allLookLikeKpi) {
            for (var p = 0; p < children.length; p++) {
              enhanceCardAsKpi(children[p], p);
            }
          }
        }
      }

      // 5. Enhance large chart/table panels on all secondary sheets
      var panels = document.querySelectorAll(".card, .panel, .chart-card, .table-card, .box, .section-card");
      for (var q = 0; q < panels.length; q++) {
        var pn = panels[q];
        if (!isVisible(pn)) continue;
        if (
          !pn.classList.contains("eb-cg-kpi-card") &&
          !pn.classList.contains("eb-cg-cierre-card") &&
          !pn.classList.contains("eb-cg-meta-card") &&
          !pn.classList.contains("eb-cg-context-strip")
        ) {
          var pr = pn.getBoundingClientRect();
          if (pr.width > 380 && pr.height > 160) {
            pn.classList.add("eb-cg-panel-card");
          }
        }
      }
    } catch (e) {
      // Ignore transient DOM errors during re-render
    }
  }

  // Run initially and whenever tabs or filters change
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCombinacionGanadora);
  } else {
    applyCombinacionGanadora();
  }
  window.addEventListener("load", applyCombinacionGanadora);

  document.addEventListener("click", function() {
    requestAnimationFrame(applyCombinacionGanadora);
    setTimeout(applyCombinacionGanadora, 60);
    setTimeout(applyCombinacionGanadora, 220);
  }, true);

  var debounceTimer = null;
  var obs = new MutationObserver(function() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyCombinacionGanadora, 50);
  });
  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
</script>
`;

export function injectCombinacionGanadora(html: string): string {
  if (html.includes("ebenezer-combinacion-ganadora-styles")) {
    return html;
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${EBENEZER_COMBINACION_GANADORA_SNIPPET}\n</body>`);
  }
  return `${html}\n${EBENEZER_COMBINACION_GANADORA_SNIPPET}`;
}