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

const AVISO_SIN_RASTRO = `
<script>
  // Recordatorio visible en la consola para quien audite esto despues.
  console.info(
    "[Talento Humano] El Excel se procesa aqui, en este navegador. " +
    "No se envia ni se guarda en ningun servidor."
  );
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

  const inyeccion = `${ESTILO_EBENEZER}\n${AVISO_SIN_RASTRO}`;
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${inyeccion}\n</head>`);
  } else {
    html = inyeccion + html;
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Nunca en cache: lleva permiso por usuario detras.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
