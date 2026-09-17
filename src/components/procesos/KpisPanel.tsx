import { Clock, ListChecks, RotateCcw, ShieldCheck, Timer } from "lucide-react";
import type { KpisTareas } from "@/lib/procesos/types";

function formatPct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v)}%`;
}

function formatHoras(v: number | null): string {
  if (v === null) return "—";
  if (v >= 24) return `${(v / 24).toFixed(1)} d`;
  return `${v.toFixed(1)} h`;
}

interface Stat {
  label: string;
  valor: string;
  detalle: string;
  icon: typeof ShieldCheck;
}

/** Panel de KPIs — mismo cálculo (calcularKpis en queries.ts) para el
 * Dashboard general (todas las áreas) y el dashboard de cada área
 * individual. Catálogo fijo (fase 1): alto riesgo, SLA/tiempo de
 * ciclo, retrabajo, carga de trabajo. */
export function KpisPanel({ kpis }: { kpis: KpisTareas }) {
  const stats: Stat[] = [
    {
      label: "Alto riesgo mitigado",
      valor: formatPct(kpis.pctAltoRiesgoMitigado),
      detalle:
        kpis.altoRiesgoTotal > 0
          ? `${kpis.altoRiesgoMitigado}/${kpis.altoRiesgoTotal} completadas`
          : "Sin tareas de alto riesgo",
      icon: ShieldCheck,
    },
    {
      label: "Cumplimiento de SLA",
      valor: formatPct(kpis.pctCumplimientoSla),
      detalle: kpis.conSla > 0 ? `${kpis.cumplenSla}/${kpis.conSla} a tiempo` : "Sin tareas con SLA",
      icon: Clock,
    },
    {
      label: "Tasa de retrabajo",
      valor: formatPct(kpis.tasaRetrabajo),
      detalle: `${kpis.rechazadas}/${kpis.totalTareas} rechazadas alguna vez`,
      icon: RotateCcw,
    },
    {
      label: "Tiempo de ciclo promedio",
      valor: formatHoras(kpis.tiempoCicloPromedioHoras),
      detalle: "Desde iniciada hasta completada",
      icon: Timer,
    },
    {
      label: "Carga de trabajo",
      valor: String(kpis.activas),
      detalle: `de ${kpis.totalTareas} tareas totales`,
      icon: ListChecks,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-ink-3">
            <s.icon className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
            <p className="text-xs">{s.label}</p>
          </div>
          <p className="text-2xl font-semibold text-navy">{s.valor}</p>
          <p className="text-xs text-ink-3">{s.detalle}</p>
        </div>
      ))}
    </div>
  );
}
