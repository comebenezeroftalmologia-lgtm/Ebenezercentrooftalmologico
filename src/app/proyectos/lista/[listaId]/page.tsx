import { notFound } from "next/navigation";
import { requireModuloAccess } from "@/lib/auth";
import { getLista } from "@/lib/proyectos/queries";
import { ListaView } from "@/components/proyectos/ListaView";

const UUID = /^[0-9a-fA-F-]{36}$/;

export default async function PaginaLista({
  params,
  searchParams,
}: {
  params: { listaId: string };
  searchParams: { vista?: string };
}) {
  const user = await requireModuloAccess("proyectos");
  if (!UUID.test(params.listaId)) notFound();
  const datos = await getLista(params.listaId, user.id, user.isAdmin);
  if (!datos) notFound();
  const vista = searchParams.vista === "tablero" ? "tablero" : "lista";
  return <ListaView key={datos.lista.id} datos={datos} vista={vista} yoId={user.id} />;
}
