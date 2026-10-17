import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, BarChart2, ChevronRight } from "lucide-react";

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
  comparison?: { pct: number | null; label?: string };
}) {
  const showComparison = comparison && comparison.pct !== null;
  const BadgeIcon = Icon ?? BarChart2;
  const isTimeCard = label.toLowerCase().includes("tiempo");
  const borderColor = isTimeCard ? "#8B5CF6" : "#10B981";
  const iconBg = isTimeCard ? "#EDE9FE" : "#D1FAE5";
  const iconColor = isTimeCard ? "#7C3AED" : "#059669";
  const sparkColor = isTimeCard ? "#8B5CF6" : "#10B981";
  const gradId = isTimeCard ? "eb-kpicard-violet" : "eb-kpicard-emerald";

  const content = (
    <>
      <div className="flex items-center justify-between gap-2 bg-gradient-to-b from-[#EDF4FD]/90 via-[#F5F9FF]/65 to-white px-4 pt-3.5 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            style={{ backgroundColor: iconBg, color: iconColor }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]"
          >
            <BadgeIcon className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <p className="text-[13px] font-bold tracking-[-0.01em] text-[#0E245E]">{label}</p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-[#64748B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1D58D8]"
          strokeWidth={2}
        />
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-1.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[#0E245E]">
              {value}
            </p>
            {showComparison && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums ${
                  (comparison!.pct as number) >= 0
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : "bg-[#FEE2E2] text-[#DC2626]"
                }`}
              >
                {(comparison!.pct as number) >= 0 ? (
                  <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
                )}
                {(comparison!.pct as number) >= 0 ? "+" : "-"}
                {Math.abs(comparison!.pct as number)}%
              </span>
            )}
          </div>
          {hint && <p className="mt-1.5 text-[12px] font-medium text-[#64748B]">{hint}</p>}
        </div>

        <div className="shrink-0">
          <svg
            className="h-[38px] w-[78px] overflow-visible"
            viewBox="0 0 80 38"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={sparkColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 2 30 C 16 28, 24 22, 36 20 C 48 18, 58 12, 76 6 L 76 36 L 2 36 Z"
              fill={`url(#${gradId})`}
            />
            <path
              d="M 2 30 C 16 28, 24 22, 36 20 C 48 18, 58 12, 76 6"
              stroke={sparkColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="76" cy="6" r="2.8" fill="#FFFFFF" stroke={sparkColor} strokeWidth="2" />
          </svg>
        </div>
      </div>
    </>
  );

  const className = `group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-l-[3.5px] shadow-[0_6px_18px_-8px_rgba(14,36,94,0.10)] transition-all duration-200 hover:-translate-y-0.5 ${
    active
      ? "border-[#2563EB] bg-[#F4F8FE]"
      : "border-[#E2ECF8] bg-white hover:border-[#BFD4F4] hover:shadow-[0_12px_24px_-10px_rgba(29,88,216,0.16)]"
  }`;

  return href ? (
    <Link href={href} style={{ borderLeftColor: borderColor }} className={className}>
      {content}
    </Link>
  ) : (
    <div style={{ borderLeftColor: borderColor }} className={className}>
      {content}
    </div>
  );
}