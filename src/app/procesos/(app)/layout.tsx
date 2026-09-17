import { getMisAsignaciones, requireModuloAccess } from "@/lib/auth";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
  // "procesos" es un módulo asignable más (como los del dashboard de
  // mercadeo): un admin lo tiene implícito, cualquier otro usuario
  // necesita que se lo asignen desde /usuarios.
  const user = await requireModuloAccess("procesos");
  const misAsignaciones = await getMisAsignaciones(user.id);
  const puedeVerDashboard = user.isAdmin || misAsignaciones.some((a) => a.rol === "lider");

  return (
    <div className="flex min-h-screen">
      <ProcesosNav user={user} puedeVerDashboard={puedeVerDashboard} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
