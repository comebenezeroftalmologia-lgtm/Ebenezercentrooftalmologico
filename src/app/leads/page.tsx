import { CalendarClock, LineChart, Percent, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { DateRangePicker } from "@/components/DateRangePicker";
import { KpiCard } from "@/components/KpiCard";
import { ServiceFilter } from "@/components/ServiceFilter";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import { StatusCards } from "@/components/StatusCards";
import { ServiceDistributionChart } from "@/components/ServiceDistributionChart";
import { StatusDonutChart } from "@/components/StatusDonutChart";
import {
  avgDaysBetween,
  breakdownVendidas,
  buildStageBreakdown,
  buildStageFunnel,
  calcROI,
  defaultDateRange,
  filterByEstado,
  isProbabilidadCompra,
  isVendida,
  statusCounts,
  totalImporte,
  type EstadoFilter,
} from "@/lib/dashboard";
import { PROBABILIDAD_COMPRA_STAGES } from "@/lib/pipelineStages";
import { getAdSpendTotal, getOpportunities, listServices, serviceNameMap } from "@/lib/queries";
import { formatCOP, formatNumber } from "@/lib/text";
import { buildHref } from "@/lib/url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { servicio?: string; desde?: string; hasta?: string; estado?: string };
}) {
  const serviceId = searchParams.servicio ? Number(searchParams.servicio) : null;
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? defaults.from;
  const to = searchParams.hasta ?? defaults.to;
  const estado = searchParams.estado as EstadoFilter;

  const [services, allOpportunities, gasto] = await Promise.all([
    listServices(),
    getOpportunities({ pipeline: "generacion_leads", from, to, serviceId }),
    getAdSpendTotal({ from, to }),
  ]);

  const serviceNames = serviceNameMap(services);
  const counts = statusCounts(allOpportunities);
  const filtered = filterByEstado(allOpportunities, estado);
  const funnel = buildStageFunnel(filtered);

  const importeTotal = totalImporte(allOpportunities);
  const roi = calcROI({ totalImporte: importeTotal, gasto });

  const vendidas = allOpportunities.filter(isVendida);
  const avgClosingDays = avgDaysBetween(
    vendidas,
    (o) => o.created_at,
    (o) => o.expected_close_date
  );

  const probabilidad = allOpportunities.filter(isProbabilidadCompra);
  const vendidasBreakdown = breakdownVendidas(vendidas, "generacion_leads");
  const probabilidadBreakdown = buildStageBreakdown(filtered, PROBABILIDAD_COMPRA_STAGES);

  const currentParams: Record<string, string | undefined> = {
    servicio: searchParams.servicio,
    desde: searchParams.desde,
    hasta: searchParams.hasta,
    estado: searchParams.estado,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-navy">
          Generación de Clientes Potenciales
        </h1>
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

      <div className="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Gasto en Meta Ads" value={formatCOP(gasto)} hint={`${from} — ${to}`} icon={Wallet} />
        <KpiCard
          label="Total IMPORTE"
          value={formatCOP(importeTotal)}
          hint="Suma de todas las oportunidades del período, en cualquier etapa"
        />
        <KpiCard
          label="ROI"
          value={roi !== null ? `${roi.toFixed(0)}%` : "—"}
          hint="(Total IMPORTE − Gasto) / Gasto"
          icon={Percent}
        />
        <KpiCard
          label="Tiempo promedio de cierre"
          value={avgClosingDays !== null ? `${avgClosingDays.toFixed(1)} días` : "—"}
          hint="Creación → Fecha esperada de cierre, solo vendidas"
          icon={CalendarClock}
        />
        <Link
          href={buildHref(currentParams, { estado: "vendidas" })}
          className={`rounded-xl border p-5 shadow-sm transition-colors duration-150 ease-eb-out hover:border-navy-20 ${
            searchParams.estado === "vendidas" ? "border-blue bg-blue-10" : "border-line bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="eb-label text-[11px] text-ink-3">Total de Oportunidades Vendidas</p>
            <Target className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
          </div>
          <p className="mt-1 font-heading text-3xl font-semibold text-navy">{formatNumber(vendidas.length)}</p>
          <div className="mt-2 flex flex-col gap-0.5">
            {vendidasBreakdown.map((item) => (
              <p key={item.label} className="text-xs text-ink-3">
                {item.label}: <span className="font-semibold text-ink-2">{formatNumber(item.count)}</span>
              </p>
            ))}
          </div>
        </Link>
        <KpiCard
          label="Oportunidades con Probabilidad de Compra"
          value={formatNumber(probabilidad.length)}
          hint="Ver etapas incluidas abajo"
          href={buildHref(currentParams, { estado: "probabilidad" })}
          active={searchParams.estado === "probabilidad"}
          icon={LineChart}
        />
      </div>

      <p className="mb-8 text-xs text-ink-3">
        <span className="font-semibold text-ink-2">Probabilidad de Compra</span> incluye las
        etapas: {PROBABILIDAD_COMPRA_STAGES.join(", ")}.
      </p>

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

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Oportunidades con Probabilidad de Compra por Etapa
        </h2>
        <StageFunnelChart data={probabilidadBreakdown} color="#21814B" />
      </div>
    </div>
  );
}
