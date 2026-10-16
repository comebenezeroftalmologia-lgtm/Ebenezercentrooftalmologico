import { requireModuloAccess } from "@/lib/auth";
import { ArrowDown, ArrowUp, CalendarClock, LineChart, Percent, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { KpiCard } from "@/components/KpiCard";
import { ServiceFilter } from "@/components/ServiceFilter";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import { ConversionFunnelSection } from "@/components/ConversionFunnelSection";
import { ServiciosAgendadosButton } from "@/components/ServiciosAgendadosButton";
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
  isCierreStageEnRango,
  isProbabilidadCompra,
  isVendida,
  isVendidaEnRango,
  pctChange,
  previousPeriodRange,
  ratioPct,
  statusCounts,
  totalImporte,
  type EstadoFilter,
} from "@/lib/dashboard";
import { PROBABILIDAD_COMPRA_STAGES, VENTA_STAGES } from "@/lib/pipelineStages";
import {
  getAdSpendStats,
  getCirugiaExitosaEntryDates,
  getOpportunities,
  getServiciosAgendadosLog,
  getVentasCandidatas,
  listServices,
  serviceNameMap,
} from "@/lib/queries";
import { formatCOP, formatNumber } from "@/lib/text";
import { buildHref } from "@/lib/url";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { servicio?: string; desde?: string; hasta?: string; estado?: string };
}) {
  await requireModuloAccess("leads");
  const serviceId = searchParams.servicio ? Number(searchParams.servicio) : null;
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? defaults.from;
  const to = searchParams.hasta ?? defaults.to;
  const estado = searchParams.estado as EstadoFilter;
  const previousRange = previousPeriodRange(from, to);

  const [
    services,
    allOpportunities,
    adStats,
    previousOpportunities,
    serviciosAgendadosLog,
    ventasCandidatas,
    cirugiaExitosaDates,
  ] = await Promise.all([
    listServices(),
    getOpportunities({ pipeline: "generacion_leads", from, to, serviceId }),
    getAdSpendStats({ from, to }),
    getOpportunities({ pipeline: "generacion_leads", ...previousRange, serviceId }),
    getServiciosAgendadosLog(),
    getVentasCandidatas({ pipeline: "generacion_leads", serviceId }),
    getCirugiaExitosaEntryDates(),
  ]);
  const gasto = adStats.spend;

  const serviceNames = serviceNameMap(services);
  const counts = statusCounts(allOpportunities);
  const filtered = filterByEstado(allOpportunities, estado);
  const funnel = buildStageFunnel(filtered);

  const importeTotal = totalImporte(allOpportunities);
  const roi = calcROI({ totalImporte: importeTotal, gasto });

  const vendidasPorCreacion = allOpportunities.filter(isVendida);
  const avgClosingDays = avgDaysBetween(
    vendidasPorCreacion,
    (o) => o.created_at,
    (o) => o.expected_close_date
  );

  const probabilidad = allOpportunities.filter(isProbabilidadCompra);
  const probabilidadBreakdown = buildStageBreakdown(filtered, PROBABILIDAD_COMPRA_STAGES);

  const vendidas = ventasCandidatas.filter((o) => isVendidaEnRango(o, from, to, cirugiaExitosaDates));
  const vendidasBreakdown = breakdownVendidas(vendidas, "generacion_leads");

  const cirugiaBreakdown = buildStageBreakdown(
    ventasCandidatas.filter((o) => isCierreStageEnRango(o, from, to, cirugiaExitosaDates)),
    VENTA_STAGES.generacion_leads
  );
  const cirugiaProgramada = cirugiaBreakdown.reduce((sum, item) => sum + item.count, 0);
  const cierreRate = ratioPct(cirugiaProgramada, probabilidad.length);
  const proyeccionCirugias = cierreRate !== null ? Math.round((probabilidad.length * cierreRate) / 100) : null;

  const prevImporte = totalImporte(previousOpportunities);
  const prevVendidas = ventasCandidatas.filter((o) =>
    isVendidaEnRango(o, previousRange.from, previousRange.to, cirugiaExitosaDates)
  ).length;
  const importePct = pctChange(importeTotal, prevImporte);
  const vendidasPct = pctChange(vendidas.length, prevVendidas);

  const currentParams: Record<string, string | undefined> = {
    servicio: searchParams.servicio,
    desde: searchParams.desde,
    hasta: searchParams.hasta,
    estado: searchParams.estado,
  };

  return (
    <div className="pb-12">
      <ExecutiveHeader overline="TABLEROS · EMBUDO COMERCIAL" title="Clientes Potenciales" subtitle="Captación, conversión y seguimiento de pacientes." variant="leads" rightControls={<div className="flex flex-wrap items-end gap-2.5"><ServiceFilter services={services} /><DateRangePicker from={from} to={to} otherParams={{ servicio: searchParams.servicio, estado: searchParams.estado }} /><ServiciosAgendadosButton rows={serviciosAgendadosLog} serviceNames={serviceNames} /></div>} />

      <StatusCards
        counts={counts}
        previousTotal={previousOpportunities.length}
        activeEstado={searchParams.estado}
        currentParams={currentParams}
      />

      <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Gasto en Meta Ads" value={formatCOP(gasto)} hint={`${from} — ${to}`} icon={Wallet} />
        <KpiCard
          label="Total IMPORTE"
          value={formatCOP(importeTotal)}
          hint="Suma de todas las oportunidades del período, en cualquier etapa"
          comparison={{ pct: importePct }}
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
          className={`rounded-[15px] border p-5 shadow-eb-1 transition-all duration-150 ease-eb-out hover:border-navy-20 ${
            searchParams.estado === "vendidas" ? "border-blue bg-[#F4F7FE]" : "border-[#E7E9F2] bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
              Total de Oportunidades Vendidas
            </p>
            <Target className="h-4 w-4 shrink-0 text-navy-70" strokeWidth={1.75} />
          </div>
          <p className="mt-1.5 text-[34px] font-light leading-[1.05] tracking-[-0.025em] tabular-nums text-navy">
            {formatNumber(vendidas.length)}
          </p>
          {vendidasPct !== null && (
            <span
              className={`mt-2.5 inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11.5px] font-bold tabular-nums ${
                vendidasPct >= 0 ? "bg-green-10 text-green" : "bg-[#FEE2E2] text-[#DC2626]"
              }`}
            >
              {vendidasPct >= 0 ? (
                <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
              )}
              {Math.abs(vendidasPct)}% vs. período anterior
            </span>
          )}
          <div className="mt-2.5 flex flex-col gap-0.5">
            {vendidasBreakdown.map((item) => (
              <p key={item.label} className="text-[11.5px] text-[#949BB4]">
                {item.label}: <span className="font-semibold tabular-nums text-ink-2">{formatNumber(item.count)}</span>
              </p>
            ))}
          </div>
        </Link>
        <Link
          href={buildHref(currentParams, { estado: "probabilidad" })}
          className={`rounded-[15px] border p-5 shadow-eb-1 transition-all duration-150 ease-eb-out hover:border-navy-20 ${
            searchParams.estado === "probabilidad" ? "border-blue bg-[#F4F7FE]" : "border-[#E7E9F2] bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
              Oportunidades con Probabilidad de Compra
            </p>
            <LineChart className="h-4 w-4 shrink-0 text-navy-70" strokeWidth={1.75} />
          </div>
          <p className="mt-1.5 text-[34px] font-light leading-[1.05] tracking-[-0.025em] tabular-nums text-navy">
            {formatNumber(probabilidad.length)}
          </p>
          {proyeccionCirugias !== null && (
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-pill bg-green-10 px-2.5 py-0.5 text-[11.5px] font-bold tabular-nums text-green">
              Proyección: ~{formatNumber(proyeccionCirugias)} cirugías ({cierreRate}%)
            </span>
          )}
          <p className="mt-2 text-[11.5px] text-[#949BB4]">Ver etapas incluidas abajo</p>
        </Link>
      </div>

      <p className="mb-7 text-[11.5px] text-[#949BB4]">
        <span className="font-semibold text-ink-2">Probabilidad de Compra</span> incluye las
        etapas: {PROBABILIDAD_COMPRA_STAGES.join(", ")}.
      </p>

      <ConversionFunnelSection
        impressions={adStats.impressions}
        clicks={adStats.clicks}
        leadsCaptados={adStats.leads}
        probabilidad={probabilidad.length}
        cierre={cirugiaProgramada}
        perdidas={counts.lost}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
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

      <div className="rounded-[15px] border border-[#E7E9F2] bg-white shadow-eb-1">
        <div className="border-b border-[#F0F1F7] px-5 py-3.5">
          <h2 className="font-titulo text-[16.5px] font-medium tracking-[-0.012em] text-navy">
            Oportunidades con Probabilidad de Compra por Etapa
          </h2>
        </div>
        <div className="p-5">
          <StageFunnelChart data={probabilidadBreakdown} color="#1A3174" />
        </div>
      </div>
    </div>
  );
}