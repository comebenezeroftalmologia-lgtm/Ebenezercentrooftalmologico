import { getMisAsignaciones, requireModuloAccess, getMisModulos } from "@/lib/auth";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";
import { MODULOS } from "@/lib/modulos";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireModuloAccess("procesos");
  const misAsignaciones = await getMisAsignaciones(user.id);
  const puedeVerDashboard = user.isAdmin || misAsignaciones.some((a) => a.rol === "lider");
  
  const misModulos = await getMisModulos(user.id, user.isAdmin);
  const tieneAnalytics = MODULOS.some((m) => misModulos.has(m.slug) && m.grupo === "Analytics");

  return (
    <div className="flex min-h-screen">
      <ProcesosNav user={user} puedeVerDashboard={puedeVerDashboard} tieneAnalytics={tieneAnalytics} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
