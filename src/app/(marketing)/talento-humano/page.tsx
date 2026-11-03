import { requireModuloAccess } from "@/lib/auth";

/* ---------------------------------------------------------------------
   TALENTO HUMANO

   El tablero se muestra tal cual se construyo, dentro de un marco. No se
   reescribio en React a proposito: son 28 graficas y la lectura de siete
   hojas de Excel, y reescribir eso es la forma mas rapida de que un
   numero cambie sin que nadie se entere. Si mas adelante se quiere que
   luzca nativo, se hace aparte y se compara contra este.

   El dato no vive aqui: el Excel se arrastra, se procesa en el navegador
   de quien lo abre y no se guarda en ninguna parte.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function TalentoHumanoPage() {
  await requireModuloAccess("talento_humano");

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE5F2] bg-white px-5 py-3">
        <div>
          <h1 className="text-[15px] font-semibold text-[#0E245E]">Talento Humano</h1>
          <p className="text-[12px] text-[#5B6B8C]">
            Planta, retiros, ausentismo, clima y desempeño
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[11px] font-medium text-[#166534]">
          El Excel se lee en este navegador · no se guarda
        </span>
      </div>

      <iframe
        src="/api/talento-humano-app"
        title="Reporte de Talento Humano"
        className="w-full flex-1 border-0"
        // El tablero necesita ejecutar su propio JavaScript (Chart.js y la
        // lectura del Excel) y leer el archivo que se le arrastra. Se deja
        // en su propio origen para que no alcance la sesion de la
        // plataforma: lo unico que hace es dibujar.
        sandbox="allow-scripts allow-downloads allow-popups"
      />
    </div>
  );
}
