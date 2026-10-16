import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, BarChart2, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/text";

export function MetricCard({ label, value, hint, icon: Icon, delta, deltaLabel = "en el rango" }: { label: string; value: string; hint?: string; icon?: LucideIcon; delta?: number | null; deltaLabel?: string }) {
  const showDelta = delta !== undefined && delta !== null;
  const isUp = (delta ?? 0) >= 0;
  const BadgeIcon = Icon ?? BarChart2;
  return (
    <div className="flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#1D58D8]">
            <BadgeIcon className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <p className="truncate text-[13px] font-bold tracking-[-0.01em] text-[#0E245E]">{label}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={2} />
      </div>
      <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5">
        <p className="text-[30px] font-bold leading-none tracking-[-0.025em] tabular-nums text-[#0E245E]">{value}</p>
        {showDelta && (
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums ${isUp ? "text-[#15803D]" : "text-[#DC2626]"}`}>
            {isUp ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
            {formatNumber(Math.abs(delta ?? 0))} {isUp ? "ganados" : "perdidos"}
          </span>
        )}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[#64748B]">{hint ?? (showDelta ? `Variación neta ${deltaLabel}` : "")}</p>
    </div>
  );
}