import { getMisModulos, requireModuloAccess } from "@/lib/auth";
import { getArbol } from "@/lib/proyectos/queries";
import { ProyectosShell } from "@/components/proyectos/ProyectosShell";

export const dynamic = "force-dynamic";

export default async function ProyectosLayout({ children }: { children: React.ReactNode }) {
  const user = await requireModuloAccess("proyectos");
  const [arbol, modulos] = await Promise.all([
    getArbol(user.id, user.isAdmin),
    getMisModulos(user.id, user.isAdmin),
  ]);

  return (
    <ProyectosShell
      arbol={arbol}
      usuario={{ id: user.id, nombre: user.nombreCompleto, esAdmin: user.isAdmin }}
      modulos={Array.from(modulos)}
    >
      {children}
    </ProyectosShell>
  );
}