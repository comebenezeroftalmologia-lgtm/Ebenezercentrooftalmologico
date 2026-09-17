import { Activity, CalendarCheck2, PieChart, TrendingUp } from "lucide-react";
import { CategoryRealVsMetaChart } from "@/components/CategoryRealVsMetaChart";
import { FrecuenciasFilters } from "@/components/FrecuenciasFilters";
import { KpiCard } from "@/components/KpiCard";
import { RealVsMetaChart } from "@/components/RealVsMetaChart";
import {
  getFrecuenciasAniosDisponibles,
  getFrecuenciasMesMasReciente,
  getFrecuenciasPorGrupo,
  getFrecuenciasPorUF,
  getFrecuenciasTotalSerie,
} from "@/lib/queries";
import { formatNumber } from "@/lib/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const MESES: Record<string, string> = {
  enero: "Enero",
  febrero: "Febrero",
  marzo: "Marzo",
  abril: "Abril",
  mayo: "Mayo",
  junio: "Junio",
  julio: "Julio",
  agosto: "Agosto",
  septiembre: "Septiembre",
  octubre: "Octubre",
  noviembre: "Noviembre",
  diciembre: "Diciembre",
};

export default async function FrecuenciasPage({
  searchParams,
}: {
  searchParams: { anio?: string; mes?: string };
}) {
  const years = await getFrecuenciasAniosDisponibles();
  const latest = await getFrecuenciasMesMasReciente();

  const selectedYear = searchParams.anio ? Number(searchParams.anio) : latest?.year ?? years[0];

  const totalSerie = await getFrecuenciasTotalSerie(selectedYear);
  const monthsAvailable = totalSerie.map((r) => r.month_num);

  const selectedMonth = searchParams.mes
    ? Number(searchParams.mes)
    : selectedYear === latest?.year
      ? latest.month_num
      : monthsAvailable[monthsAvailable.length - 1];

  const [porUF, porGrupo] = await Promise.all([
    getFrecuenciasPorUF({ year: selectedYear, monthNum: selectedMonth }),
    getFrecuenciasPorGrupo({ year: selectedYear, monthNum: selectedMonth }),
  ]);

  const mesActual = totalSerie.find((r) => r.month_num === selectedMonth);
  const real = mesActual?.real ?? 0;
  const meta = mesActual?.meta ?? 0;
  const basePrev = mesActual?.base_prev ?? 0;
  const isMtd = mesActual?.is_mtd ?? false;
  const monthLabel = mesActual ? (MESES[mesActual.month_name] ?? mesActual.month_name) : "";

  const cumplimiento = meta > 0 ? Math.round((real / meta) * 1000) / 10 : null;
  const deltaVsAnterior = basePrev > 0 ? real - basePrev : null;
  const deltaPct = basePrev > 0 ? Math.round(((real - basePrev) / basePrev) * 1000) / 10 : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Frecuencias</h1>
          <p className="mt-1 text-sm text-ink-3">
            Utilización real vs. meta mensual — fuente: SISMA, validado y clasificado
            (persona + IA) antes de esta carga.
          </p>
        </div>
        <FrecuenciasFilters
          years={years}
          selectedYear={selectedYear}
          monthsAvailable={monthsAvailable}
          selectedMonth={selectedMonth}
        />
      </div>

      {isMtd && (
        <div className="mb-6 rounded-lg border border-[#F2C744] bg-[#FEF8E7] px-4 py-2.5 text-sm text-[#8A6D00]">
          {monthLabel} {selectedYear} está en curso — es un corte parcial, no lo compares 1:1
          con meses ya cerrados.
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Real del mes"
          value={formatNumber(real)}
          hint={`${monthLabel} ${selectedYear}${isMtd ? " · parcial" : ""}`}
          icon={Activity}
        />
        <KpiCard
          label="Meta del mes"
          value={formatNumber(meta)}
          hint="Meta mensual definida"
          icon={CalendarCheck2}
        />
        <KpiCard
          label="Cumplimiento"
          value={cumplimiento !== null ? `${cumplimiento}%` : "—"}
          hint="Real / Meta del mes"
          icon={PieChart}
        />
        <KpiCard
          label="vs. Año Anterior"
          value={
            deltaVsAnterior !== null
              ? `${deltaVsAnterior >= 0 ? "+" : ""}${formatNumber(deltaVsAnterior)}`
              : "—"
          }
          hint={
            basePrev > 0
              ? `${monthLabel} ${selectedYear - 1}: ${formatNumber(basePrev)}${
                  deltaPct !== null ? ` (${deltaPct >= 0 ? "+" : ""}${deltaPct}%)` : ""
                }`
              : "Sin dato del año anterior"
          }
          icon={TrendingUp}
        />
      </div>

      <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold text-navy">Real vs. Meta — {selectedYear}</h2>
        </div>
        <RealVsMetaChart
          data={totalSerie.map((r) => ({ month_name: r.month_name, real: r.real, meta: r.meta, is_mtd: r.is_mtd }))}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">
            Por Unidad Funcional — {monthLabel} {selectedYear}
          </h2>
          <CategoryRealVsMetaChart
            data={porUF.map((r) => ({ label: r.uf ?? "", real: r.real, meta: r.meta }))}
          />
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">
            Por Empresa / Contrato — {monthLabel} {selectedYear}
          </h2>
          <CategoryRealVsMetaChart
            data={porGrupo.map((r) => ({ label: r.grupo ?? "", real: r.real, meta: r.meta }))}
          />
        </div>
      </div>
    </div>
  );
}
