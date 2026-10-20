import { requireAppUser } from "@/lib/auth";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import TableroCarteraAnalytics from "../analytics/TableroCarteraAnalytics";

export const dynamic = "force-dynamic";

export default async function CarteraPage() {
  await requireAppUser();
  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <ExecutiveHeader
        overline="FINANZAS Y CARTERA"
        title="Cartera y Glosas"
        subtitle="Control de cartera corriente, cartera vencida, giros por cruzar y gestión operativa de glosas."
        variant="analytics"
      />
      <TableroCarteraAnalytics />
    </div>
  );
}
