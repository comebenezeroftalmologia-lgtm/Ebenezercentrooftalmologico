import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
  href,
  active,
  icon: Icon,
  comparison,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  active?: boolean;
  icon?: LucideIcon;
  /** % de cambio vs. el período anterior (mismo rango de días,
   * inmediatamente anterior al seleccionado). pct === null = sin base
   * de comparación (período anterior en cero) — no se muestra nada. */
  comparison?: { pct: number | null; label?: string };
}) {
  const showComparison = comparison && comparison.pct !== null;

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="eb-label text-[11px] text-ink-3">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />}
      </div>
      <p className="mt-1 font-heading text-3xl font-semibold text-navy">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {showComparison && (
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold ${
              (comparison!.pct as number) >= 0 ? "bg-green-10 text-green" : "bg-[#FBEAE8] text-[#B3261E]"
            }`}
          >
            {(comparison!.pct as number) >= 0 ? (
              <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
            )}
            {Math.abs(comparison!.pct as number)}% {comparison!.label ?? "vs. período anterior"}
          </span>
        )}
        {!showComparison && hint && <p className="text-xs text-ink-3">{hint}</p>}
      </div>
      {showComparison && hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </>
  );

  const className = `rounded-xl border p-5 shadow-sm transition-colors duration-150 ease-eb-out ${
    active ? "border-blue bg-blue-10" : "border-line bg-white"
  } ${href ? "hover:border-navy-20" : ""}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
