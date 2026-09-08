import { KpiCard } from "@/components/KpiCard";
import { ServiceFilter } from "@/components/ServiceFilter";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import { getAvgClosingTime, getStageFunnel, listServices } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuirurgicosPage({
  searchParams,
}: {
  searchParams: { servicio?: string };
}) {
  const serviceId = searchParams.servicio ? Number(searchParams.servicio) : null;

  const [services, funnel, closingTime] = await Promise.all([
    listServices(),
    getStageFunnel({ pipeline: "ordenamientos_qx", serviceId }),
    getAvgClosingTime({ pipeline: "ordenamientos_qx", serviceId }),
  ]);

  const avgDays = closingTime[0]?.avg_days_to_close ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">
          Ordenamientos Quirúrgicos
        </h1>
        <ServiceFilter services={services} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Tiempo promedio de cierre"
          value={avgDays !== null ? `${avgDays.toFixed(1)} días` : "—"}
          hint="Solo cirugías cerradas"
        />
        <KpiCard
          label="Órdenes abiertas"
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
