import { requireModuloAccess } from "@/lib/auth";
import { getArbol } from "@/lib/proyectos/queries";
import { ProyectosShell } from "@/components/proyectos/ProyectosShell";

export const dynamic = "force-dynamic";

export default async function ProyectosLayout({ children }: { children: React.ReactNode }) {
  // "proyectos" es un módulo asignable más: un admin lo tiene implícito;
  // el resto necesita que se lo asignen desde /usuarios. Dentro del módulo,
  // cada espacio tiene sus propios miembros y roles (lo aplica la base de datos).
  const user = await requireModuloAccess("proyectos");
  const arbol = await getArbol(user.id, user.isAdmin);

  return (
    <ProyectosShell arbol={arbol} usuario={{ id: user.id, nombre: user.nombreCompleto, esAdmin: user.isAdmin }}>
      {children}
    </ProyectosShell>
  );
}
