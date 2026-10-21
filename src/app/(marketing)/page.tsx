import { requireAppUser } from "@/lib/auth";
import { ExecutiveOverview } from "@/components/ExecutiveOverview";
import { traerDatosPortada } from "@/lib/portadaReal";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const user = await requireAppUser();
  const { fecha } = await searchParams;
  const datos = await traerDatosPortada(fecha);
  return (
    <ExecutiveOverview mode="inicio" userName={user.nombreCompleto} datos={datos} />
  );
}
