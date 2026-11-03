import { requireModuloAccess } from "@/lib/auth";
import { infoArchivoTH, describirArchivo } from "@/lib/talentoHumano";
import { TalentoHumanoShell } from "@/components/TalentoHumanoShell";

/* ---------------------------------------------------------------------
   TALENTO HUMANO

   El tablero se muestra tal cual se construyo, dentro de un marco. No se
   reescribio en React a proposito: son 28 graficas y la lectura de siete
   hojas de Excel, y reescribir eso es la forma mas rapida de que un
   numero cambie sin que nadie se entere.

   El dato sale de UN archivo de trabajo guardado en el almacenamiento
   privado de Supabase. Nunca en el repositorio, que es publico: el Excel
   trae nombres, salarios, incapacidades y evaluaciones.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function TalentoHumanoPage() {
  const user = await requireModuloAccess("talento_humano");
  const info = await infoArchivoTH();

  return (
    <TalentoHumanoShell
      esAdmin={user.isAdmin}
      descripcionArchivo={info ? describirArchivo(info) : null}
    />
  );
}
