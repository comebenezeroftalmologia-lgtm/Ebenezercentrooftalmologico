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
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-navy-70" strokeWidth={1.75} />}
      </div>
      <p className="mt-1.5 text-[34px] font-light leading-[1.05] tracking-[-0.025em] tabular-nums text-navy">
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        {showComparison && (
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11.5px] font-bold tabular-nums ${
              (comparison!.pct as number) >= 0 ? "bg-green-10 text-green" : "bg-[#FEE2E2] text-[#DC2626]"
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
        {!showComparison && hint && (
          <p className="text-[11.5px] leading-relaxed text-[#949BB4]">{hint}</p>
        )}
      </div>
      {showComparison && hint && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#949BB4]">{hint}</p>
      )}
    </>
  );

  const className = `rounded-[15px] border p-5 shadow-eb-1 transition-all duration-150 ease-eb-out ${
    active ? "border-blue bg-[#F4F7FE]" : "border-[#E7E9F2] bg-white"
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