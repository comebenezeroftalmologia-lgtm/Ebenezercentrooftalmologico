import { requireModuloAccess } from "@/lib/auth";
import { CalendarClock, Target } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { KpiCard } from "@/components/KpiCard";
import { ServiceFilter } from "@/components/ServiceFilter";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import { StatusCards } from "@/components/StatusCards";
import { ServiceDistributionChart } from "@/components/ServiceDistributionChart";
import { StatusDonutChart } from "@/components/StatusDonutChart";
import { OrdenadosVsRealizadosChart } from "@/components/OrdenadosVsRealizadosChart";
import {
  avgDaysBetween,
  buildStageFunnel,
  defaultDateRange,
  filterByEstado,
  isVendida,
  pctChange,
  previousPeriodRange,
  statusCounts,
  type EstadoFilter,
} from "@/lib/dashboard";
import { getOpportunities, listServices, serviceNameMap } from "@/lib/queries";
import { formatNumber } from "@/lib/text";
import { buildHref } from "@/lib/url";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export default async function NoQuirurgicosPage({
  searchParams,
}: {
  searchParams: { servicio?: string; desde?: string; hasta?: string; estado?: string };
}) {
  await requireModuloAccess("no_quirurgicos");
  const serviceId = searchParams.servicio ? Number(searchParams.servicio) : null;
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? defaults.from;
  const to = searchParams.hasta ?? defaults.to;
  const estado = searchParams.estado as EstadoFilter;
  const previousRange = previousPeriodRange(from, to);

  const [services, allOpportunities, previousOpportunities] = await Promise.all([
    listServices(),
    getOpportunities({ pipeline: "ordenamientos_no_qx", from, to, serviceId }),
    getOpportunities({ pipeline: "ordenamientos_no_qx", ...previousRange, serviceId }),
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

  const vendidasPct = pctChange(vendidas.length, previousOpportunities.filter(isVendida).length);

  const currentParams: Record<string, string | undefined> = {
    servicio: searchParams.servicio,
    desde: searchParams.desde,
    hasta: searchParams.hasta,
    estado: searchParams.estado,
  };

  return (
    <div className="pb-12">
      <ExecutiveHeader overline="TABLEROS · EMBUDO COMERCIAL" title="Ordenamientos No Quirúrgicos" subtitle="Conversión de órdenes de exámenes diagnósticos y procedimientos." variant="no_quirurgicos" rightControls={<div className="flex flex-wrap items-end gap-2.5"><ServiceFilter services={services} /><DateRangePicker from={from} to={to} otherParams={{ servicio: searchParams.servicio, estado: searchParams.estado }} /></div>} />

      <StatusCards
        counts={counts}
        previousTotal={previousOpportunities.length}
        activeEstado={searchParams.estado}
        currentParams={currentParams}
      />

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          comparison={{ pct: vendidasPct }}
        />
      </div>

      <OrdenadosVsRealizadosChart items={allOpportunities.map((o) => ({ createdAt: String(o.created_at), realizada: isVendida(o), abierta: o.status === "open" }))} from={from} to={to} tituloTipo="Exámenes y Procedimientos No Quirúrgicos" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[15px] border border-[#E7E9F2] bg-white shadow-eb-1">
          <div className="border-b border-[#F0F1F7] px-5 py-3.5">
            <h2 className="font-titulo text-[16.5px] font-medium tracking-[-0.012em] text-navy">
              Distribución por Estado
            </h2>
          </div>
          <div className="p-5">
            <StatusDonutChart counts={counts} />
          </div>
        </div>
        <div className="rounded-[15px] border border-[#E7E9F2] bg-white shadow-eb-1">
          <div className="border-b border-[#F0F1F7] px-5 py-3.5">
            <h2 className="font-titulo text-[16.5px] font-medium tracking-[-0.012em] text-navy">
              Distribución por Servicio
            </h2>
          </div>
          <div className="p-5">
            <ServiceDistributionChart opportunities={filtered} serviceNames={serviceNames} />
          </div>
        </div>
        <div className="rounded-[15px] border border-[#E7E9F2] bg-white shadow-eb-1">
          <div className="border-b border-[#F0F1F7] px-5 py-3.5">
            <h2 className="font-titulo text-[16.5px] font-medium tracking-[-0.012em] text-navy">
              Etapas de las Oportunidades
            </h2>
          </div>
          <div className="p-5">
            <StageFunnelChart data={funnel} color="#0E245E" />
          </div>
        </div>
      </div>
    </div>
  );
}