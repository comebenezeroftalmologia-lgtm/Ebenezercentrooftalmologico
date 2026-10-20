import { requireAppUser } from "@/lib/auth";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import TableroCarteraAnalytics from "../analytics/TableroCarteraAnalytics";

export const dynamic = "force-dynamic";

export default async function CarteraPage() {
  await requireAppUser();
  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <ExecutiveHeader
        overline="TABLEROS · FINANCIERO Y CARTERA SISMA"
        title="Cartera, Radicación, Glosas y Giros"
        subtitle="Control de cartera corriente (< 60 días), vencida (>= 60 días), facturación pendiente por radicar, conciliaciones Alfanet y giros SISMA."
        variant="analytics"
      />
      <TableroCarteraAnalytics />
    </div>
  );
}
