import React from "react";

type KpiItem = {
  id: string;
  label: string;
  value: string;
  delta: string;
  sub: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  sparkGradId: string;
  sparkPath: string;
  sparkArea: string;
  endX: number;
  endY: number;
  icon: React.ReactNode;
};

const KPIS: KpiItem[] = [
  {
    id: "atenciones",
    label: "Atenciones facturadas",
    value: "1.284",
    delta: "+12.4%",
    sub: "vs. mes anterior",
    borderColor: "#2563EB",
    iconBg: "#DCEBFE",
    iconColor: "#1D4ED8",
    sparkColor: "#2563EB",
    sparkGradId: "eb-spark-blue",
    sparkPath: "M 2 30 C 14 29, 20 23, 30 24 C 40 25, 48 15, 58 14 C 65 13, 70 8, 76 6",
    sparkArea: "M 2 30 C 14 29, 20 23, 30 24 C 40 25, 48 15, 58 14 C 65 13, 70 8, 76 6 L 76 36 L 2 36 Z",
    endX: 76,
    endY: 6,
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "produccion",
    label: "Producción del día",
    value: "$28,4M",
    delta: "+8.2%",
    sub: "meta diaria $26,0M",
    borderColor: "#10B981",
    iconBg: "#D1FAE5",
    iconColor: "#059669",
    sparkColor: "#10B981",
    sparkGradId: "eb-spark-emerald",
    sparkPath: "M 2 31 C 14 28, 22 26, 32 21 C 42 16, 50 19, 60 12 C 67 8, 71 7, 76 5",
    sparkArea: "M 2 31 C 14 28, 22 26, 32 21 C 42 16, 50 19, 60 12 C 67 8, 71 7, 76 5 L 76 36 L 2 36 Z",
    endX: 76,
    endY: 5,
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "espera",
    label: "Tiempo promedio de espera",
    value: "14 min",
    delta: "-3.1 min",
    sub: "rango óptimo < 18m",
    borderColor: "#8B5CF6",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    sparkColor: "#8B5CF6",
    sparkGradId: "eb-spark-violet",
    sparkPath: "M 2 29 C 14 27, 22 24, 32 22 C 42 20, 50 16, 60 11 C 67 8, 71 7, 76 6",
    sparkArea: "M 2 29 C 14 27, 22 24, 32 22 C 42 20, 50 16, 60 11 C 67 8, 71 7, 76 6 L 76 36 L 2 36 Z",
    endX: 76,
    endY: 6,
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "cirugias",
    label: "Cirugías programadas",
    value: "38",
    delta: "94.7%",
    sub: "ocupación de salas",
    borderColor: "#F59E0B",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    sparkColor: "#10B981",
    sparkGradId: "eb-spark-amber-green",
    sparkPath: "M 2 30 C 14 28, 22 23, 32 22 C 42 21, 50 14, 60 11 C 67 9, 71 7, 76 5",
    sparkArea: "M 2 30 C 14 28, 22 23, 32 22 C 42 21, 50 14, 60 11 C 67 9, 71 7, 76 5 L 76 36 L 2 36 Z",
    endX: 76,
    endY: 5,
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
];

export default function ExecutiveOverview() {
  return (
    <section aria-label="Indicadores ejecutivos principales" className="mb-5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <div
            key={k.id}
            style={{ borderLeftColor: k.borderColor }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-[#E2ECF8] border-l-[3.5px] bg-white shadow-[0_6px_18px_-8px_rgba(14,36,94,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9DCF5] hover:shadow-[0_12px_24px_-10px_rgba(29,88,216,0.16)]"
          >
            {/* Franja superior azul hielo sutil (Opción 3) */}
            <div className="flex items-center gap-2.5 bg-gradient-to-b from-[#EDF4FD]/90 via-[#F5F9FF]/60 to-white px-4 pt-3 pb-2">
              <span
                style={{ backgroundColor: k.iconBg, color: k.iconColor }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]"
              >
                {k.icon}
              </span>
              <span className="text-[12.5px] font-semibold leading-snug tracking-[-0.01em] text-[#334155]">
                {k.label}
              </span>
            </div>

            {/* Cuerpo con valor + cápsula verde + mini gráfica (Opción 1 + Opción 3) */}
            <div className="flex items-end justify-between gap-2 px-4 pb-3.5 pt-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-[#0E245E]">
                    {k.value}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#15803D]">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 8.5 9.5 2.5" />
                      <path d="M4.5 2.5h5v5" />
                    </svg>
                    {k.delta}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] font-medium text-[#64748B]">
                  {k.sub}
                </p>
              </div>

              {/* Mini-gráfica de área integrada dentro del recuadro (Opción 1) */}
              <div className="shrink-0 pt-1">
                <svg
                  className="h-[38px] w-[78px] overflow-visible"
                  viewBox="0 0 80 38"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={k.sparkGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={k.sparkColor} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={k.sparkColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={k.sparkArea} fill={`url(#${k.sparkGradId})`} />
                  <path
                    d={k.sparkPath}
                    stroke={k.sparkColor}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={k.endX}
                    cy={k.endY}
                    r="3"
                    fill="#FFFFFF"
                    stroke={k.sparkColor}
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}