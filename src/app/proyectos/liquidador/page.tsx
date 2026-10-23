import { requireModuloAccess } from "@/lib/auth";
import { LiquidadorWorkspace } from "@/components/proyectos/LiquidadorWorkspace";

export const dynamic = "force-dynamic";

export default async function LiquidadorHonorariosPage() {
  const user = await requireModuloAccess("proyectos");

  return (
    <LiquidadorWorkspace
      usuario={{
        id: user.id,
        nombre: user.nombreCompleto,
        email: user.email,
        esAdmin: user.isAdmin,
      }}
    />
  );
}
