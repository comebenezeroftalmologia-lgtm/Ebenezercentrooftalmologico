import { notFound } from "next/navigation";
import { requireModuloAccess } from "@/lib/auth";
import { getTarea } from "@/lib/proyectos/queries";
import { TareaDetalleView } from "@/components/proyectos/TareaDetalle";

const UUID = /^[0-9a-fA-F-]{36}$/;

export default async function PaginaTarea({ params }: { params: { tareaId: string } }) {
  const user = await requireModuloAccess("proyectos");
  if (!UUID.test(params.tareaId)) notFound();
  const datos = await getTarea(params.tareaId, user.id, user.isAdmin);
  if (!datos) notFound();
  return <TareaDetalleView key={datos.tarea.id} datos={datos} yoId={user.id} />;
}
