import React from "react";

const DIAS = [
  { dia: "02 oct", valor: 21.0, pct: 69 },
  { dia: "03 oct", valor: 23.4, pct: 77 },
  { dia: "04 oct", valor: 22.1, pct: 73 },
  { dia: "05 oct", valor: 25.8, pct: 85 },
  { dia: "06 oct", valor: 24.5, pct: 81 },
  { dia: "07 oct", valor: 26.9, pct: 89 },
  { dia: "08 oct", valor: 24.0, pct: 79 },
  { dia: "09 oct", valor: 27.6, pct: 91 },
  { dia: "10 oct", valor: 26.2, pct: 86 },
  { dia: "11 oct", valor: 28.9, pct: 95 },
  { dia: "12 oct", valor: 25.1, pct: 83 },
  { dia: "13 oct", valor: 29.4, pct: 97 },
  { dia: "14 oct", valor: 30.2, pct: 100, badge: "30,2M" },
  { dia: "15 oct", valor: 28.4, pct: 94, badge: "28,4M", isCurrent: true },
];

export default function ProduccionRecienteChart() {
  return (
    <div className="rounded-[18px] border border-[#E2ECF8] bg-white p-5 shadow-[0_10px_28px_-12px_rgba(14,36,94,0.10)]">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-[#0E245E]">
            Producción reciente
          </h3>
          <p className="mt-0.5 text-[12px] font-medium text-[#64748B]">
            Evolución diaria de facturación — últimos 14 días hábiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE7F7] bg-[#F4F8FE] px-3 py-1 text-[11.5px] font-semibold text-[#1E3A8A]">
            <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
            Meta diaria: $26,0M
          </span>
        </div>
      </div>

      {/* Cintillo de 3 indicadores resumen (Opción 3) */}
      <div className="mt-3.5 grid grid-cols-1 divide-y divide-[#D5E3F7] rounded-[11px] border border-[#DCE8FA] bg-gradient-to-r from-[#EEF5FF] via-[#F5F9FF] to-[#EEF5FF] px-4 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-start sm:py-0 sm:pr-4">
          <span className="text-[12px] font-medium text-[#475569]">Acumulado 14 días:</span>
          <span className="text-[13.5px] font-extrabold tracking-[-0.01em] text-[#0E245E]">$354,1 M</span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-center sm:py-0 sm:px-4">
          <span className="text-[12px] font-medium text-[#475569]">Promedio diario:</span>
          <span className="text-[13.5px] font-extrabold tracking-[-0.01em] text-[#0E245E]">$25,3 M</span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-end sm:py-0 sm:pl-4">
          <span className="text-[12px] font-medium text-[#475569]">Día pico (14 oct):</span>
          <span className="text-[13.5px] font-extrabold tracking-[-0.01em] text-[#1D4ED8]">$30,2 M</span>
        </div>
      </div>

      {/* Área de la gráfica (Opción 2) */}
      <div className="relative mt-4 pt-6">
        {/* Onda suave de área en el fondo */}
        <div className="pointer-events-none absolute inset-x-0 top-5 bottom-6 z-0 overflow-hidden">
          <svg
            className="h-full w-full"
            viewBox="0 0 700 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="eb-prod-wave-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                <stop offset="75%" stopColor="#93C5FD" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 115 C 40 105, 75 95, 115 102 C 155 108, 190 78, 230 82 C 270 86, 310 64, 350 72 C 390 80, 430 52, 470 58 C 510 64, 550 34, 595 38 C 635 42, 670 22, 700 28 L 700 180 L 0 180 Z"
              fill="url(#eb-prod-wave-fill)"
            />
            <path
              d="M 0 115 C 40 105, 75 95, 115 102 C 155 108, 190 78, 230 82 C 270 86, 310 64, 350 72 C 390 80, 430 52, 470 58 C 510 64, 550 34, 595 38 C 635 42, 670 22, 700 28"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="1.6"
              strokeDasharray="3 3"
            />
          </svg>
        </div>

        {/* Línea horizontal punteada de Meta diaria ($26,0M = 86% del pico) */}
        <div
          style={{ bottom: "calc(24px + 148px * 0.80)" }}
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-dashed border-[#3B82F6]/75"
        >
          <span className="absolute -top-5 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#1D4ED8] shadow-[0_1px_4px_rgba(14,36,94,0.06)]">
            Meta diaria: $26,0M
          </span>
        </div>

        {/* Barras verticales */}
        <div className="relative z-10 grid grid-cols-14 items-end gap-1.5 sm:gap-2.5">
          {DIAS.map((d) => {
            const barHeight = Math.round((d.pct / 100) * 148);
            return (
              <div key={d.dia} className="group flex flex-col items-center">
                <div className="relative flex h-[168px] w-full items-end justify-center">
                  {/* Cápsula flotante permanente en días pico (14 oct y 15 oct) o en hover */}
                  {d.badge ? (
                    <span
                      style={{ bottom: `${barHeight + 6}px` }}
                      className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-extrabold shadow-[0_3px_10px_rgba(29,78,216,0.18)] ${
                        d.isCurrent
                          ? "border border-[#93C5FD] bg-white text-[#0E245E]"
                          : "border border-[#BFDBFE] bg-white text-[#1E3A8A]"
                      }`}
                    >
                      {d.badge}
                    </span>
                  ) : (
                    <span
                      style={{ bottom: `${barHeight + 5}px` }}
                      className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#DCE7F7] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#0E245E] opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                    >
                      ${d.valor.toFixed(1).replace(".", ",")}M
                    </span>
                  )}

                  {/* Barra con degradado ejecutivo */}
                  <div
                    style={{
                      height: `${barHeight}px`,
                      background: d.isCurrent
                        ? "linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)"
                        : d.badge
                        ? "linear-gradient(180deg, #3B82F6 0%, #7BA9FA 100%)"
                        : "linear-gradient(180deg, #6EA2F7 0%, #AFCBFA 100%)",
                    }}
                    className={`w-full max-w-[34px] rounded-t-[7px] transition-all duration-200 ${
                      d.isCurrent
                        ? "shadow-[0_6px_14px_-3px_rgba(29,78,216,0.42)] ring-1 ring-[#1D4ED8]/20"
                        : "group-hover:brightness-95"
                    }`}
                  />
                </div>
                <span
                  className={`mt-2 text-[10.5px] ${
                    d.isCurrent || d.badge
                      ? "font-bold text-[#0E245E]"
                      : "font-medium text-[#64748B]"
                  }`}
                >
                  {d.dia}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}