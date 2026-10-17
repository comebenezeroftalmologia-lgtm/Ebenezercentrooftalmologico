import Link from "next/link";
import { ArrowDown, ArrowUp, Ban, FolderOpen, Trophy, Users, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { pctChange, type StatusCounts } from "@/lib/dashboard";
import { buildHref } from "@/lib/url";
import { formatNumber } from "@/lib/text";

const CARDS: {
  key: "total" | "open" | "expired" | "lost" | "won";
  label: string;
  Icon: LucideIcon;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  sparkPath: string;
  sparkArea: string;
}[] = [
  {
    key: "total",
    label: "Total Ordenados",
    Icon: Users,
    borderColor: "#2563EB",
    iconBg: "#DCEBFE",
    iconColor: "#1D4ED8",
    sparkColor: "#2563EB",
    sparkPath: "M 2 28 C 14 26, 24 20, 36 22 C 48 24, 56 12, 68 7",
    sparkArea: "M 2 28 C 14 26, 24 20, 36 22 C 48 24, 56 12, 68 7 L 68 34 L 2 34 Z",
  },
  {
    key: "open",
    label: "Abiertas (En Gestión)",
    Icon: FolderOpen,
    borderColor: "#0EA5E9",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    sparkColor: "#0EA5E9",
    sparkPath: "M 2 27 C 14 24, 24 22, 36 18 C 48 15, 56 14, 68 9",
    sparkArea: "M 2 27 C 14 24, 24 22, 36 18 C 48 15, 56 14, 68 9 L 68 34 L 2 34 Z",
  },
  {
    key: "expired",
    label: "Vencidas",
    Icon: XCircle,
    borderColor: "#F59E0B",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    sparkColor: "#F59E0B",
    sparkPath: "M 2 24 C 14 25, 24 21, 36 23 C 48 25, 56 18, 68 16",
    sparkArea: "M 2 24 C 14 25, 24 21, 36 23 C 48 25, 56 18, 68 16 L 68 34 L 2 34 Z",
  },
  {
    key: "lost",
    label: "Perdidas",
    Icon: Ban,
    borderColor: "#EF4444",
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    sparkColor: "#EF4444",
    sparkPath: "M 2 22 C 14 24, 24 25, 36 23 C 48 21, 56 24, 68 20",
    sparkArea: "M 2 22 C 14 24, 24 25, 36 23 C 48 21, 56 24, 68 20 L 68 34 L 2 34 Z",
  },
  {
    key: "won",
    label: "Ganadas (Efectivas)",
    Icon: Trophy,
    borderColor: "#10B981",
    iconBg: "#D1FAE5",
    iconColor: "#059669",
    sparkColor: "#10B981",
    sparkPath: "M 2 29 C 14 26, 24 21, 36 19 C 48 17, 56 11, 68 6",
    sparkArea: "M 2 29 C 14 26, 24 21, 36 19 C 48 17, 56 11, 68 6 L 68 34 L 2 34 Z",
  },
];

export function StatusCards({
  counts,
  previousTotal,
  activeEstado,
  currentParams,
}: {
  counts: StatusCounts;
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
        const sharePct =
          card.key !== "total" && counts.total > 0
            ? Math.round((value / counts.total) * 100)
            : null;
        const Icon = card.Icon;
        const gradId = `eb-status-spark-${card.key}`;

        return (
          <Link
            key={card.key}
            href={href}
            style={{ borderLeftColor: card.borderColor }}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-l-[3.5px] shadow-[0_6px_18px_-8px_rgba(14,36,94,0.10)] transition-all duration-200 hover:-translate-y-0.5 ${
              isActive
                ? "border-[#2563EB] bg-[#F5F9FF] ring-1 ring-[#2563EB]/20"
                : "border-[#E2ECF8] bg-white hover:border-[#BFD4F4]"
            }`}
          >
            {/* Franja superior azul hielo (Opción 3) */}
            <div className="flex items-center gap-2 bg-gradient-to-b from-[#EDF4FD]/90 via-[#F5F9FF]/65 to-white px-3.5 pt-3 pb-1.5">
              <span
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.1} />
              </span>
              <p className="text-[12px] font-bold leading-snug text-[#1E293B] group-hover:text-[#0E245E]">
                {card.label}
              </p>
            </div>

            {/* Cuerpo con cifra + cápsula + mini-gráfica (Opción 1) */}
            <div className="flex items-end justify-between gap-1.5 px-3.5 pb-3 pt-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[24px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[#0E245E]">
                    {formatNumber(value)}
                  </p>
                  {pct !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums ${
                        pct >= 0
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEE2E2] text-[#DC2626]"
                      }`}
                    >
                      {pct >= 0 ? (
                        <ArrowUp className="h-2.5 w-2.5" strokeWidth={2.5} />
                      ) : (
                        <ArrowDown className="h-2.5 w-2.5" strokeWidth={2.5} />
                      )}
                      {pct >= 0 ? "+" : "-"}
                      {Math.abs(pct)}%
                    </span>
                  )}
                  {sharePct !== null && (
                    <span className="inline-flex items-center rounded-full bg-[#EEF4FF] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-[#1E3A8A]">
                      {sharePct}%
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <svg
                  className="h-[32px] w-[62px] overflow-visible"
                  viewBox="0 0 70 34"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={card.sparkColor} stopOpacity="0.26" />
                      <stop offset="100%" stopColor={card.sparkColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={card.sparkArea} fill={`url(#${gradId})`} />
                  <path
                    d={card.sparkPath}
                    stroke={card.sparkColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="68"
                    cy={card.key === "won" ? 6 : card.key === "total" ? 7 : 12}
                    r="2.4"
                    fill="#FFFFFF"
                    stroke={card.sparkColor}
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}