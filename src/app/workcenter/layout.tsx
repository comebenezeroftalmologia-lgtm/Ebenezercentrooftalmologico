import { getMisModulos, requireModuloAccess } from "@/lib/auth";
import { WorkCenterShell } from "@/components/workcenter/WorkCenterShell";

export const dynamic = "force-dynamic";

export default async function WorkCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireModuloAccess("proyectos");
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <WorkCenterShell
      usuario={{ id: user.id, nombre: user.nombreCompleto, esAdmin: user.isAdmin }}
      modulos={Array.from(modulos)}
    >
      {children}
    </WorkCenterShell>
  );
}
