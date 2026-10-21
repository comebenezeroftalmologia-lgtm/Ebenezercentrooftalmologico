import { requireAppUser } from "@/lib/auth";
import { ExecutiveOverview } from "@/components/ExecutiveOverview";
import { traerDatosPortada } from "@/lib/portadaReal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser();
  const datos = await traerDatosPortada();
  return (
    <ExecutiveOverview mode="inicio" userName={user.nombreCompleto} datos={datos} />
  );
}
