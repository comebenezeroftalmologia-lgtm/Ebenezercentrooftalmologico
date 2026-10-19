import { requireAppUser } from "@/lib/auth";
import TableroCarteraAnalytics from "../analytics/TableroCarteraAnalytics";

export const dynamic = "force-dynamic";

export default async function CarteraPage() {
  await requireAppUser();
  return (
    <div className="mx-auto max-w-[1380px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <TableroCarteraAnalytics />
    </div>
  );
}
