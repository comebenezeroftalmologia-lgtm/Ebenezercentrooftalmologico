/**
 * El marco de Procesos: su propio menu al lado del riel de modulos.
 *
 * Ya no calcula si el usuario tiene Analytics. Lo hacia para pintar un
 * enlace a /analytics dentro de este menu, y ese enlace sobraba por dos
 * razones: Analytics ya tiene su icono en el riel de la izquierda, y no
 * es parte de Procesos — en lib/modulos.ts son dos grupos hermanos, y
 * ese mismo archivo es el que gobierna los permisos por usuario.
 */
import { getMisAsignaciones, requireModuloAccess } from "@/lib/auth";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
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