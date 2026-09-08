import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatNumber } from "@/lib/text";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  deltaLabel = "en el rango",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  /** Cambio neto dentro del rango seleccionado (ganados/perdidos). Omitir si no aplica. */
  delta?: number | null;
  deltaLabel?: string;
}) {
  const showDelta = delta !== undefined && delta !== null;
  const isUp = (delta ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="eb-label text-[11px] text-ink-3">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />}
      </div>
      <p className="mt-1 font-heading text-3xl font-semibold text-navy">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {showDelta && (
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold ${
              isUp ? "bg-green-10 text-green" : "bg-[#FBEAE8] text-[#B3261E]"
            }`}
          >
            {isUp ? (
              <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
            )}
            {formatNumber(Math.abs(delta ?? 0))} {isUp ? "ganados" : "perdidos"} {deltaLabel}
          </span>
        )}
        {!showDelta && hint && <p className="text-xs text-ink-3">{hint}</p>}
      </div>
      {showDelta && hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
