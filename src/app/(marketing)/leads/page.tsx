import { requireModuloAccess } from "@/lib/auth";
import { ArrowDown, ArrowUp, CalendarClock, LineChart, Percent, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { DateRangePicker } from "@/components/DateRangePicker";
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

  // "Tiempo promedio de cierre" sigue basado en fecha de CREACIÓN (no
  // cambia con este ajuste): creación -> fecha esperada de cierre, para
  // las vendidas del período en que se CREARON.
  const vendidasPorCreacion = allOpportunities.filter(isVendida);
  const avgClosingDays = avgDaysBetween(
    vendidasPorCreacion,
    (o) => o.created_at,
    (o) => o.expected_close_date
  );

  const probabilidad = allOpportunities.filter(isProbabilidadCompra);
  const probabilidadBreakdown = buildStageBreakdown(filtered, PROBABILIDAD_COMPRA_STAGES);

  // "Total de Oportunidades Vendidas" y el Paso 3 del embudo cuentan por
  // FECHA DE CIERRE EFECTIVA, no por fecha de creación — una cirugía
  // puede cerrarse meses después de haberse creado el lead, y con el
  // filtro anterior (por creación) esas ventas desaparecían del período
  // en que realmente se vendieron. `ventasCandidatas` no está acotado
  // por fecha de creación, así que cualquier rango de fechas encuentra
  // sus ventas correctamente.
  const vendidas = ventasCandidatas.filter((o) => isVendidaEnRango(o, from, to, cirugiaExitosaDates));
  const vendidasBreakdown = breakdownVendidas(vendidas, "generacion_leads");

  // Paso 3 del Embudo de Conversión: puntualmente las etapas de cierre
  // de Campañas — "Programación de Cirugía" y "Cirugía Exitosa" (no
  // "vendidas" en general, que también incluye Ganadas en cualquier
  // otra etapa) — filtradas por fecha de cierre efectiva.
  const cirugiaBreakdown = buildStageBreakdown(
    ventasCandidatas.filter((o) => isCierreStageEnRango(o, from, to, cirugiaExitosaDates)),
    VENTA_STAGES.generacion_leads
  );
  const cirugiaProgramada = cirugiaBreakdown.reduce((sum, item) => sum + item.count, 0);
  const cierreRate = ratioPct(cirugiaProgramada, probabilidad.length);
  const proyeccionCirugias = cierreRate !== null ? Math.round((probabilidad.length * cierreRate) / 100) : null;

  // Comparativo vs. período anterior (mismo rango de días, inmediatamente
  // antes del seleccionado) — para IMPORTE y Vendidas, los dos números que
  // más le importan a gerencia mes a mes. Vendidas usa la misma fecha de
  // cierre efectiva, comparando contra `previousRange`.
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
          <ServiciosAgendadosButton rows={serviciosAgendadosLog} serviceNames={serviceNames} />
        </div>
      </div>

      <StatusCards
        counts={counts}
        previousTotal={previousOpportunities.length}
        activeEstado={searchParams.estado}
        currentParams={currentParams}
      />

      <div className="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          className={`rounded-xl border p-5 shadow-sm transition-colors duration-150 ease-eb-out hover:border-navy-20 ${
            searchParams.estado === "vendidas" ? "border-blue bg-blue-10" : "border-line bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="eb-label text-[11px] text-ink-3">Total de Oportunidades Vendidas</p>
            <Target className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
          </div>
          <p className="mt-1 font-heading text-3xl font-semibold text-navy">{formatNumber(vendidas.length)}</p>
          {vendidasPct !== null && (
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold ${
                vendidasPct >= 0 ? "bg-green-10 text-green" : "bg-[#FBEAE8] text-[#B3261E]"
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
          <div className="mt-2 flex flex-col gap-0.5">
            {vendidasBreakdown.map((item) => (
              <p key={item.label} className="text-xs text-ink-3">
                {item.label}: <span className="font-semibold text-ink-2">{formatNumber(item.count)}</span>
              </p>
            ))}
          </div>
        </Link>
        <Link
          href={buildHref(currentParams, { estado: "probabilidad" })}
          className={`rounded-xl border p-5 shadow-sm transition-colors duration-150 ease-eb-out hover:border-navy-20 ${
            searchParams.estado === "probabilidad" ? "border-blue bg-blue-10" : "border-line bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="eb-label text-[11px] text-ink-3">Oportunidades con Probabilidad de Compra</p>
            <LineChart className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
          </div>
          <p className="mt-1 font-heading text-3xl font-semibold text-navy">
            {formatNumber(probabilidad.length)}
          </p>
          {proyeccionCirugias !== null && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-pill bg-green-10 px-2 py-0.5 text-xs font-semibold text-green">
              Proyección: ~{formatNumber(proyeccionCirugias)} cirugías ({cierreRate}%)
            </span>
          )}
          <p className="mt-2 text-xs text-ink-3">Ver etapas incluidas abajo</p>
        </Link>
      </div>

      <p className="mb-8 text-xs text-ink-3">
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
