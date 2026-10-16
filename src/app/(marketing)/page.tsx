import { requireAppUser } from "@/lib/auth";
import { ExecutiveOverview } from "@/components/ExecutiveOverview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser();
  return <ExecutiveOverview mode="inicio" userName={user.nombreCompleto} />;
}
