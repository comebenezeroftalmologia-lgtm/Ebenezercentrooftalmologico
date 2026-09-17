import { requireModuloAccess } from "@/lib/auth";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
  // "procesos" es un módulo asignable más (como los del dashboard de
  // mercadeo): un admin lo tiene implícito, cualquier otro usuario
  // necesita que se lo asignen desde /usuarios.
  const user = await requireModuloAccess("procesos");

  return (
    <div className="flex min-h-screen">
      <ProcesosNav user={user} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
