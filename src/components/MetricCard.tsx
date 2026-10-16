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
    <div className="rounded-[15px] border border-[#E7E9F2] bg-white p-5 shadow-eb-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-navy-70" strokeWidth={1.75} />}
      </div>
      <p className="mt-1.5 text-[34px] font-light leading-[1.05] tracking-[-0.025em] tabular-nums text-navy">
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        {showDelta && (
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11.5px] font-bold tabular-nums ${
              isUp ? "bg-green-10 text-green" : "bg-[#FEE2E2] text-[#DC2626]"
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
        {!showDelta && hint && (
          <p className="text-[11.5px] leading-relaxed text-[#949BB4]">{hint}</p>
        )}
      </div>
      {showDelta && hint && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#949BB4]">{hint}</p>
      )}
    </div>
  );
}