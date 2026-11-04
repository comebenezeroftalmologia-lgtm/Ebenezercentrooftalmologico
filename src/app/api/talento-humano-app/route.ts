import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireModuloAccess } from "@/lib/auth";

/* ---------------------------------------------------------------------
   SIRVE EL TABLERO DE TALENTO HUMANO, Y SOLO A QUIEN TENGA EL PERMISO.

   El archivo vive en public/talento-humano/index.html, pero NO se enlaza
   desde ahi: se sirve por esta ruta, que primero exige el modulo
   'talento_humano'. Es el mismo patron del liquidador.

   Que NO hace esta ruta, a proposito:
     · No guarda nada. El tablero lee un Excel que el usuario arrastra, lo
       procesa en su propio navegador y ahi se queda. Ni un nombre ni un
       salario sale del computador de quien lo abre.
     · No manda datos a ningun lado. El repositorio de la plataforma es
       publico, asi que guardar nomina ahi seria publicarla.

   El archivo que se sirve esta VACIO: son las graficas y la logica, sin
   un solo dato de empleado. Se comprobo antes de subirlo.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

/** Encaja el tablero en el marco de la plataforma, sin tocar su contenido. */
const ESTILO_EBENEZER = `
<style>
  html, body { margin: 0 !important; background: #F5F7FB !important; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
</style>`;

/* El tablero se alimenta solo del archivo de trabajo.

   No se reescribio nada del tablero: se reusa su mismo camino
   (XLSX.read -> globalWB -> buildMonthFilter -> parseWorkbook ->
   renderDashboard), el mismo que corre cuando alguien arrastra un Excel.
   Si manana ese camino cambia, este enganche cambia con el, porque es el
   mismo; no hay una segunda version de la logica que se pueda desfasar.

   Arrastrar sigue funcionando, pero como VISTA PREVIA: lo ve quien lo
   arrastro, en ese momento, y no reemplaza el archivo de trabajo. Para
   reemplazarlo esta el boton de arriba, solo para administradores. */
const AUTOCARGA = `
<script>
(function () {
  var AVISO_ID = "th-aviso-origen";

  function aviso(texto, color, fondo, borde) {
    var d = document.getElementById(AVISO_ID);
    if (!d) {
      d = document.createElement("div");
      d.id = AVISO_ID;
      d.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9999;" +
        "font:500 12px/1.4 ui-sans-serif,system-ui,sans-serif;padding:8px 12px;" +
        "border-radius:999px;box-shadow:0 2px 8px rgba(14,36,94,.12)";
      document.body.appendChild(d);
    }
    d.textContent = texto;
    d.style.color = color; d.style.background = fondo;
    d.style.border = "1px solid " + borde;
  }

  function pintar(buffer, origen) {
    var wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
    globalWB = wb;
    selectedMonths = new Set();
    buildMonthFilter(wb);
    renderDashboard(parseWorkbook(wb, selectedMonths));
    document.getElementById("loading").style.display = "none";
    document.getElementById("upload-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("topdate").textContent =
      new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
    if (origen === "trabajo") {
      aviso("Archivo de trabajo", "#166534", "#F0FDF4", "#BBF7D0");
    } else {
      aviso("VISTA PREVIA · no reemplaza el archivo de trabajo", "#92400E", "#FFFBEB", "#FDE68A");
    }
  }

  // 1) Al abrir: traer el archivo de trabajo.
  function cargarDeTrabajo() {
    var l = document.getElementById("loading");
    if (l) l.style.display = "flex";
    fetch("/api/talento-humano/archivo", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) {
        if (r.status === 404) return null;          // todavia no han subido ninguno
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        if (l) l.style.display = "none";
        if (!buf) {
          // Sin archivo de trabajo se deja la pantalla de arrastrar, que
          // es exactamente lo que hay que hacer: subir uno.
          aviso("Aún no hay archivo de trabajo", "#92400E", "#FFFBEB", "#FDE68A");
          return;
        }
        pintar(buf, "trabajo");
      })
      .catch(function (e) {
        if (l) l.style.display = "none";
        // Decir que fallo, no quedarse callado mostrando la pantalla de
        // arrastrar como si no hubiera base.
        aviso("No se pudo traer el archivo de trabajo", "#991B1B", "#FEF2F2", "#FECACA");
        console.error("[Talento Humano]", e);
      });
  }

  // 2) Si alguien arrastra un Excel, es vista previa.
  function engancharVistaPrevia() {
    if (typeof processFile !== "function") return;
    var original = processFile;
    window.processFile = processFile = function () {
      if (!selectedFile) return;
      var fr = new FileReader();
      fr.onload = function (e) {
        try { pintar(e.target.result, "previa"); }
        catch (err) { original(); }               // que el tablero diga su propio error
      };
      fr.readAsArrayBuffer(selectedFile);
    };
  }

  function arrancar() { engancharVistaPrevia(); cargarDeTrabajo(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
})();
</script>`;

export async function GET() {
  // Si no tiene el modulo, requireModuloAccess redirige y no se sirve nada.
  await requireModuloAccess("talento_humano");

  const archivo = path.join(process.cwd(), "public", "talento-humano", "index.html");

  let html: string;
  try {
    html = fs.readFileSync(archivo, "utf-8");
  } catch {
    // Mejor decir que falta que devolver una pagina en blanco que parezca
    // un tablero vacio: son dos problemas distintos y se arreglan distinto.
    return new NextResponse(
      `<!doctype html><meta charset="utf-8">
       <div style="font-family:system-ui;padding:40px;color:#0E245E">
         <h2>No se encontró el tablero de Talento Humano</h2>
         <p>Falta el archivo <code>public/talento-humano/index.html</code>.
            Esto no es un tablero sin datos: es el tablero que no está.</p>
       </div>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // El estilo va en <head>; la autocarga al FINAL del body, porque usa
  // funciones y variables que el tablero declara en su propio script.
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${ESTILO_EBENEZER}\n</head>`);
  } else {
    html = ESTILO_EBENEZER + html;
  }

  // La autocarga va de ultima, cuando el tablero ya declaro processFile,
  // globalWB, parseWorkbook y renderDashboard. Si se pusiera en <head> no
  // existirian todavia y el enganche no tendria a que agarrarse.
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${AUTOCARGA}\n</body>`);
  } else {
    html = html + AUTOCARGA;
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Nunca en cache: lleva permiso por usuario detras.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
