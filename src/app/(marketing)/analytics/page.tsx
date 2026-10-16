import { requireAppUser } from "@/lib/auth";
import { ExecutiveOverview } from "@/components/ExecutiveOverview";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverview() {
  const user = await requireAppUser();
  return <ExecutiveOverview mode="analytics" userName={user.nombreCompleto} />;
}
