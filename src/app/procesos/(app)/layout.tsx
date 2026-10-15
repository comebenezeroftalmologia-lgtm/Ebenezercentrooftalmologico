import { getMisAsignaciones, getMisModulos, requireModuloAccess } from "@/lib/auth";
import { listAreas } from "@/lib/procesos/queries";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireModuloAccess("procesos");
  const [misAsignaciones, modulos, areas] = await Promise.all([
    getMisAsignaciones(user.id),
    getMisModulos(user.id, user.isAdmin),
    listAreas(),
  ]);
  const puedeVerDashboard = user.isAdmin || misAsignaciones.some((a) => a.rol === "lider");

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <ProcesosNav
        user={user}
        puedeVerDashboard={puedeVerDashboard}
        areas={areas}
        modulos={Array.from(modulos)}
      />
      <main className="hoja-cuadriculada z-10 min-w-0 flex-1 overflow-y-auto p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}

