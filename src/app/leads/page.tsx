import { CalendarClock, LineChart, Percent, Target, Wallet } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DrillDownTable } from "@/components/DrillDownTable";
import { KpiCard } from "@/components/KpiCard";
import { ServiceFilter } from "@/components/ServiceFilter";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import { StatusCards } from "@/components/StatusCards";
import { StatusDonutChart } from "@/components/StatusDonutChart";
import {
  ESTADO_LABELS,
  avgDaysBetween,
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
        <KpiCard
          label="Total de Oportunidades Vendidas"
          value={formatNumber(vendidas.length)}
          hint="Ganadas + Programación de Cirugía"
          href={buildHref(currentParams, { estado: "vendidas" })}
          active={searchParams.estado === "vendidas"}
          icon={Target}
        />
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

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Distribución por Estado</h2>
          <StatusDonutChart counts={counts} />
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Etapas de las Oportunidades</h2>
          <StageFunnelChart data={funnel} />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Detalle{estado ? ` — ${ESTADO_LABELS[estado] ?? estado}` : ""}
        </h2>
        <DrillDownTable opportunities={filtered} serviceNames={serviceNames} />
      </div>
    </div>
  );
}
