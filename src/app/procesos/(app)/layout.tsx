import { getMisAsignaciones, requireModuloAccess, getMisModulos } from "@/lib/auth";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";
import { Sidebar } from "@/components/Sidebar";
import { MODULOS } from "@/lib/modulos";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireModuloAccess("procesos");
  const misAsignaciones = await getMisAsignaciones(user.id);
  const puedeVerDashboard = user.isAdmin || misAsignaciones.some((a) => a.rol === "lider");
  
  const misModulos = await getMisModulos(user.id, user.isAdmin);
  const tieneAnalytics = MODULOS.some((m) => misModulos.has(m.slug) && m.grupo === "Analytics");

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar modulos={Array.from(misModulos)} isAdmin={user.isAdmin} />
      <ProcesosNav user={user} puedeVerDashboard={puedeVerDashboard} tieneAnalytics={tieneAnalytics} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white min-w-0 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] z-10">
        {children}
      </main>
    </div>
  );
}
