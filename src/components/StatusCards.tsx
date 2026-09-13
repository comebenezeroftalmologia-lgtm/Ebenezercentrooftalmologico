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
  /** Total de oportunidades del período anterior (mismo rango de días) —
   * si se pasa, la tarjeta "Total Oportunidades" muestra el % de cambio. */
  previousTotal?: number | null;
  activeEstado?: string;
  currentParams: Record<string, string | undefined>;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
            className={`rounded-xl border p-4 shadow-sm transition-colors duration-150 ease-eb-out ${
              isActive ? "border-blue bg-blue-10" : "border-line bg-white hover:border-navy-20"
            }`}
          >
            <p className="eb-label text-[11px] text-ink-3">{card.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-navy">
              {formatNumber(value)}
            </p>
            {pct !== null && (
              <p
                className={`mt-1 text-[11px] font-semibold ${
                  pct >= 0 ? "text-green" : "text-[#B3261E]"
                }`}
              >
                {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs. anterior
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
