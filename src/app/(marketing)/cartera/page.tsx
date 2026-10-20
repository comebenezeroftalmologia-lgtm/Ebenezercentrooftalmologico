import { requireAppUser } from "@/lib/auth";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import TableroCarteraAnalytics from "../analytics/TableroCarteraAnalytics";

export const dynamic = "force-dynamic";

export default async function CarteraPage() {
  await requireAppUser();
  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <ExecutiveHeader
        overline="TABLEROS · EXCLUSIVO SISMA BACK & MESA DE TRABAJO"
        title="Cartera SISMA Back y Sistema Operativo de Glosas (2021 – 2026)"
        subtitle="Análisis de vencimiento (< 60 y >= 60 días), Auxiliar abierto de Giros (1301250602, 2501010602, 2501010607) y Mesa de Trabajo interactiva que reemplaza el Excel."
        variant="analytics"
      />
      <TableroCarteraAnalytics />
    </div>
  );
}
