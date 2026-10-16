import Link from "next/link";
import { ArrowDown, ArrowUp, Ban, FolderOpen, Trophy, Users, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { pctChange, type StatusCounts } from "@/lib/dashboard";
import { buildHref } from "@/lib/url";
import { formatNumber } from "@/lib/text";

const CARDS: { key: "total" | "open" | "expired" | "lost" | "won"; label: string; Icon: LucideIcon }[] = [
  { key: "total", label: "Total Oportunidades", Icon: Users },
  { key: "open", label: "Abiertas", Icon: FolderOpen },
  { key: "expired", label: "Vencidas", Icon: XCircle },
  { key: "lost", label: "Perdidas", Icon: Ban },
  { key: "won", label: "Ganadas", Icon: Trophy },
];

export function StatusCards({ counts, previousTotal, activeEstado, currentParams }: { counts: StatusCounts; previousTotal?: number | null; activeEstado?: string; currentParams: Record<string, string | undefined> }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-5">
      {CARDS.map((card) => {
        const isActive = card.key === "total" ? !activeEstado : activeEstado === card.key;
        const href = buildHref(currentParams, { estado: card.key === "total" ? undefined : card.key });
        const value = card.key === "total" ? counts.total : counts[card.key];
        const pct = card.key === "total" && previousTotal !== undefined && previousTotal !== null ? pctChange(value, previousTotal) : null;
        const Icon = card.Icon;
        return (
          <Link key={card.key} href={href} className={`flex flex-col justify-between rounded-[16px] border p-4 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-150 ${isActive ? "border-[#2563EB] bg-[#F4F8FE]" : "border-[#E6EEF8] bg-white hover:border-[#BFD4F4]"}`}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#1D58D8]">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <p className="text-[12.5px] font-bold leading-tight text-[#0E245E]">{card.label}</p>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-[28px] font-bold leading-none tracking-[-0.025em] tabular-nums text-[#0E245E]">{formatNumber(value)}</p>
              {pct !== null && (
                <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-bold tabular-nums ${pct >= 0 ? "text-[#15803D]" : "text-[#DC2626]"}`}>
                  {pct >= 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
                  {pct >= 0 ? "+" : "-"}{Math.abs(pct)}%
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}