import Link from "next/link";
import { pctChange, type StatusCounts } from "@/lib/dashboard";
import { buildHref } from "@/lib/url";
import { formatNumber } from "@/lib/text";

const CARDS: { key: "total" | "open" | "expired" | "lost" | "won"; label: string }[] = [
  { key: "total", label: "Total Oportunidades" },
  { key: "open", label: "Abiertas" },
  { key: "expired", label: "Vencidas" },
  { key: "lost", label: "Perdidas" },
  { key: "won", label: "Ganadas" },
];

export function StatusCards({
  counts,
  previousTotal,
  activeEstado,
  currentParams,
}: {
  counts: StatusCounts;
  /** Total de oportunidades del perÃ­odo anterior (mismo rango de dÃ­as) â€”
   * si se pasa, la tarjeta "Total Oportunidades" muestra el % de cambio. */
  previousTotal?: number | null;
  activeEstado?: string;
  currentParams: Record<string, string | undefined>;
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-5">
      {CARDS.map((card) => {
        const isActive = card.key === "total" ? !activeEstado : activeEstado === card.key;
        const href = buildHref(currentParams, {
          estado: card.key === "total" ? undefined : card.key,
        });
        const value = card.key === "total" ? counts.total : counts[card.key];
        const pct =
          card.key === "total" && previousTotal !== undefined && previousTotal !== null
            ? pctChange(value, previousTotal)
            : null;
        return (
          <Link
            key={card.key}
            href={href}
            className={`rounded-[15px] border px-4 py-4 shadow-eb-1 transition-all duration-150 ease-eb-out ${
              isActive
                ? "border-blue bg-[#F4F7FE]"
                : "border-[#E7E9F2] bg-white hover:border-navy-20"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
              {card.label}
            </p>
            <p className="mt-1.5 text-[28px] font-light leading-[1.05] tracking-[-0.025em] tabular-nums text-navy">
              {formatNumber(value)}
            </p>
            {pct !== null && (
              <p
                className={`mt-2 inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                  pct >= 0 ? "bg-green-10 text-green" : "bg-[#FEE2E2] text-[#DC2626]"
                }`}
              >
                {pct >= 0 ? "â–²" : "â–¼"} {Math.abs(pct)}% vs. anterior
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}