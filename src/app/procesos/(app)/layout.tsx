import { ProcesosNav } from "@/components/procesos/ProcesosNav";
import { requireModuloAccess } from "@/lib/auth/permissions";
import { getMisModulos } from "@/lib/modulos/queries";
import { getMisAsignaciones, listAreas } from "@/lib/procesos/queries";

export const dynamic = "force-dynamic";

export default async function ProcesosAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireModuloAccess("procesos");
  const [asignaciones, areas, modulos] = await Promise.all([
    getMisAsignaciones(user.id),
    listAreas(),
    getMisModulos(user.id, user.isAdmin),
  ]);
  const puedeVerDashboard =
    user.isAdmin || asignaciones.some((a) => a.rol === "lider");

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <ProcesosNav
        user={user}
        puedeVerDashboard={puedeVerDashboard}
        areas={areas}
        modulos={modulos}
      />
      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto bg-gradient-to-b from-[#EAF2FC] via-[#F2F7FD] to-[#F8FAFE] p-4 sm:px-7 sm:py-5">
        {children}
      </main>
    </div>
  );
}