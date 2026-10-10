import { notFound } from "next/navigation";
import { requireModuloAccess } from "@/lib/auth";
import { getDoc } from "@/lib/proyectos/queries";
import { DocView } from "@/components/proyectos/DocView";

const UUID = /^[0-9a-fA-F-]{36}$/;

export default async function PaginaDoc({
  params,
  searchParams,
}: {
  params: { docId: string };
  searchParams: { pagina?: string };
}) {
  const user = await requireModuloAccess("proyectos");
  if (!UUID.test(params.docId)) notFound();
  const pagina = searchParams.pagina && UUID.test(searchParams.pagina) ? searchParams.pagina : undefined;
  const datos = await getDoc(params.docId, pagina, user.id, user.isAdmin);
  if (!datos) notFound();
  return <DocView key={datos.doc.id} datos={datos} />;
}
