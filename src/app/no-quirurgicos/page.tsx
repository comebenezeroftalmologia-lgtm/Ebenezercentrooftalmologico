import { CalendarClock, Target } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { KpiCard } from "@/components/KpiCard";
import { ServiceFilter } from "@/components/ServiceFilter";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import { StatusCards } from "@/components/StatusCards";
import { ServiceDistributionChart } from "@/components/ServiceDistributionChart";
import { StatusDonutChart } from "@/components/StatusDonutChart";
import {
  avgDaysBetween,
  buildStageFunnel,
  defaultDateRange,
  filterByEstado,
  isVendida,
  statusCounts,
  type EstadoFilter,
} from "@/lib/dashboard";
import { getOpportunities, listServices, serviceNameMap } from "@/lib/queries";
import { formatNumber } from "@/lib/text";
import { buildHref } from "@/lib/url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NoQuirurgicosPage({
  searchParams,
}: {
  searchParams: { servicio?: string; desde?: string; hasta?: string; estado?: string };
}) {
  const serviceId = searchParams.servicio ? Number(searchParams.servicio) : null;
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? defaults.from;
  const to = searchParams.hasta ?? defaults.to;
  const estado = searchParams.estado as EstadoFilter;

  const [services, allOpportunities] = await Promise.all([
    listServices(),
    getOpportunities({ pipeline: "ordenamientos_no_qx", from, to, serviceId }),
  ]);

  const serviceNames = serviceNameMap(services);
  const counts = statusCounts(allOpportunities);
  const filtered = filterByEstado(allOpportunities, estado);
  const funnel = buildStageFunnel(filtered);

  const vendidas = allOpportunities.filter(isVendida);
  const avgClosingDays = avgDaysBetween(
    allOpportunities.filter((o) => o.closed_at),
    (o) => o.created_at,
    (o) => o.closed_at
  );

  const currentParams: Record<string, string | undefined> = {
    servicio: searchParams.servicio,
    desde: searchParams.desde,
    hasta: searchParams.hasta,
    estado: searchParams.estado,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-navy">Ordenamientos No Quirúrgicos</h1>
        <div className="flex flex-wrap items-end gap-3">
          <ServiceFilter services={services} />
          <DateRangePicker
            from={from}
            to={to}
            otherParams={{ servicio: searchParams.servicio, estado: searchParams.estado }}
          />
        </div>
      </div>

      <StatusCards counts={counts} activeEstado={searchParams.estado} currentParams={currentParams} />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Tiempo promedio de cierre"
          value={avgClosingDays !== null ? `${avgClosingDays.toFixed(1)} días` : "—"}
          hint="Solo órdenes cerradas"
          icon={CalendarClock}
        />
        <KpiCard
          label="Total Vendidas"
          value={formatNumber(vendidas.length)}
          hint="Ganadas + Programación de Servicio"
          href={buildHref(currentParams, { estado: "vendidas" })}
          active={searchParams.estado === "vendidas"}
          icon={Target}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Distribución por Estado</h2>
          <StatusDonutChart counts={counts} />
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Distribución por Servicio</h2>
          <ServiceDistributionChart opportunities={filtered} serviceNames={serviceNames} />
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Etapas de las Oportunidades</h2>
          <StageFunnelChart data={funnel} />
        </div>
      </div>
    </div>
  );
}
