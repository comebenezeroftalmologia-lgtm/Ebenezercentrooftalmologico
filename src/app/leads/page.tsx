import { KpiCard } from "@/components/KpiCard";
import { ServiceFilter } from "@/components/ServiceFilter";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import {
  getAdSpendTotal,
  getAvgClosingTime,
  getStageFunnel,
  listServices,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { servicio?: string };
}) {
  const serviceId = searchParams.servicio ? Number(searchParams.servicio) : null;

  const today = new Date();
  const from = new Date(today.getTime() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const to = today.toISOString().slice(0, 10);

  const [services, funnel, closingTime, spend] = await Promise.all([
    listServices(),
    getStageFunnel({ pipeline: "generacion_leads", serviceId }),
    getAvgClosingTime({ pipeline: "generacion_leads", serviceId }),
    getAdSpendTotal({ from, to }),
  ]);

  const avgDays = closingTime[0]?.avg_days_to_close ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">
          Generación de Clientes Potenciales
        </h1>
        <ServiceFilter services={services} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Gasto en Meta Ads (30 días)"
          value={spend.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
        />
        <KpiCard
          label="Tiempo promedio de cierre"
          value={avgDays !== null ? `${avgDays.toFixed(1)} días` : "—"}
          hint="Solo oportunidades cerradas"
        />
        <KpiCard
          label="Oportunidades abiertas"
          value={String(funnel.reduce((a, r) => a + r.opportunity_count, 0))}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Etapas de las Oportunidades
        </h2>
        <StageFunnelChart rows={funnel} />
      </div>
    </div>
  );
}
