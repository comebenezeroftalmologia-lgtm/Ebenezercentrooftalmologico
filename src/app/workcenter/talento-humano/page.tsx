import { requireModuloAccess } from "@/lib/auth";
import { TalentoHumanoWorkspace } from "@/components/workcenter/TalentoHumanoWorkspace";

/* ---------------------------------------------------------------------
   La mesa de trabajo de Talento Humano.

   EL PERMISO, COMO QUEDO (revisado el 17-11-2026):

   Con "talento_humano" basta y sobra. El marco de WorkCenter deja entrar
   a quien tenga CUALQUIERA de sus modulos (ver MODULOS_WORKCENTER), y la
   bandeja lateral solo pinta los archivos que esa persona puede abrir:
   quien solo tenga Talento Humano no ve ni el Liquidador ni Cartera.

   Esta pantalla ademas lo exige por su cuenta, aqui abajo, y no se fia de
   que el marco ya lo haya mirado. Aqui hay salarios, cedulas y
   diagnosticos: dos candados en serie, no uno.

   (El comentario anterior decia que el marco pedia "proyectos". Dejo de
   ser cierto y por eso se cambia: un comentario que miente hace perder
   mas tiempo que no tener ninguno.)
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
