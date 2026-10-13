import { getMisAsignaciones, requireModuloAccess } from "@/lib/auth";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireModuloAccess("procesos");
  const misAsignaciones = await getMisAsignaciones(user.id);
  const puedeVerDashboard = user.isAdmin || misAsignaciones.some((a) => a.rol === "lider");

  /* UN SOLO MENU EN PROCESOS.
     Procesos tiene su propio menu; el riel de iconos es de los tableros.
     Tenerlos juntos ponia dos navegaciones en la misma pantalla y se leia
     desordenado. Asi estaba antes y asi vuelve. */
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <ProcesosNav user={user} puedeVerDashboard={puedeVerDashboard} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white min-w-0 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] z-10">
        {children}
      </main>
    </div>
  );
}
