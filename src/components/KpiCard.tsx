import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, BarChart2, ChevronRight } from "lucide-react";

export function KpiCard({ label, value, hint, href, active, icon: Icon, comparison }: { label: string; value: string; hint?: string; href?: string; active?: boolean; icon?: LucideIcon; comparison?: { pct: number | null; label?: string } }) {
  const showComparison = comparison && comparison.pct !== null;
  const BadgeIcon = Icon ?? BarChart2;
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#1D58D8]">
            <BadgeIcon className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <p className="truncate text-[13px] font-bold tracking-[-0.01em] text-[#0E245E]">{label}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#64748B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1D58D8]" strokeWidth={2} />
      </div>
      <div className="mt-3.5 flex flex-wrap items-baseline gap-2.5">
        <p className="text-[30px] font-bold leading-none tracking-[-0.025em] tabular-nums text-[#0E245E]">{value}</p>
        {showComparison && (
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums ${(comparison!.pct as number) >= 0 ? "text-[#15803D]" : "text-[#DC2626]"}`}>
            {(comparison!.pct as number) >= 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
            {(comparison!.pct as number) >= 0 ? "+" : "-"}{Math.abs(comparison!.pct as number)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-[12px] leading-relaxed text-[#64748B]">{hint}</p>}
    </>
  );
  const className = `group relative flex flex-col justify-between rounded-[16px] border p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-150 ${active ? "border-[#2563EB] bg-[#F4F8FE]" : "border-[#E6EEF8] bg-white hover:border-[#BFD4F4] hover:shadow-[0_6px_20px_rgba(14,36,94,0.07)]"}`;
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}