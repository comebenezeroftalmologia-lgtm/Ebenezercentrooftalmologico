import { requireModuloAccess } from "@/lib/auth";
import { CarteraWorkspace } from "@/components/workcenter/CarteraWorkspace";

export const dynamic = "force-dynamic";

export default async function WorkCenterCarteraPage() {
  // Permiso propio: no cuelga de Frecuencias ni de Proyectos. Se asigna
  // persona por persona en /usuarios, igual que Talento Humano, porque aqui
  // se mueve la plata de las glosas.
  const user = await requireModuloAccess("cartera");

  return (
    <CarteraWorkspace
      usuario={{ id: user.id, nombre: user.nombreCompleto, esAdmin: user.isAdmin }}
    />
  );
}
