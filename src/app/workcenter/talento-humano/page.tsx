import { requireModuloAccess } from "@/lib/auth";
import { TalentoHumanoWorkspace } from "@/components/workcenter/TalentoHumanoWorkspace";

/* ---------------------------------------------------------------------
   La mesa de trabajo de Talento Humano.

   Ojo con el permiso: el marco de WorkCenter pide "proyectos", pero esta
   pantalla pide ADEMAS "talento_humano". Aqui hay salarios, cedulas y
   diagnosticos: no puede entrar cualquiera que tenga WorkCenter.

   (Pendiente con Faber: revisar si quien diligencia en TH necesita
   tambien "proyectos" para llegar hasta aca, o si conviene que esta
   pantalla cuelgue de otro lado.)
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function WorkCenterTalentoHumanoPage() {
  const user = await requireModuloAccess("talento_humano");

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#47597A]">
          WORKCENTER · ARCHIVO DE TRABAJO
        </p>
        <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#0E245E]">
          Talento Humano — Base de datos
        </h1>
        <p className="mt-1 text-[13px] font-medium text-[#47597A]">
          Aquí se meten y se corrigen los datos. El tablero de Analytics lee de aquí.
        </p>
      </header>

      <TalentoHumanoWorkspace esAdmin={user.isAdmin} />
    </div>
  );
}
