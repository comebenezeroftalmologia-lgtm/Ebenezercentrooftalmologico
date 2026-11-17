import {
  getMisModulos,
  puedeGestionarUsuarios,
  requireAnyModuloAccess,
} from "@/lib/auth";
import { MODULOS_WORKCENTER } from "@/lib/modulos";
import { WorkCenterShell } from "@/components/workcenter/WorkCenterShell";

export const dynamic = "force-dynamic";

export default async function WorkCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAnyModuloAccess(MODULOS_WORKCENTER);
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <WorkCenterShell
      usuario={{
        id: user.id,
        nombre: user.nombreCompleto,
        esAdmin: user.isAdmin,
        puedeUsuarios: puedeGestionarUsuarios(user),
      }}
      modulos={Array.from(modulos)}
    >
      {children}
    </WorkCenterShell>
  );
}
