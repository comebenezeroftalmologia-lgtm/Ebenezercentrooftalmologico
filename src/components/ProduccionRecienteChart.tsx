"use client";

import { useState } from "react";
import { BarChart2, Calendar, ChevronDown } from "lucide-react";

const DATOS_14_DIAS = [
  { etiqueta: "2 oct", valorM: 18.2, destacado: false, esActual: false },
  { etiqueta: "3 oct", valorM: 21.5, destacado: false, esActual: false },
  { etiqueta: "4 oct", valorM: 19.8, destacado: false, esActual: false },
  { etiqueta: "5 oct", valorM: 22.7, destacado: false, esActual: false },
  { etiqueta: "6 oct", valorM: 24.1, destacado: false, esActual: false },
  { etiqueta: "7 oct", valorM: 26.3, destacado: false, esActual: false },
  { etiqueta: "8 oct", valorM: 23.9, destacado: false, esActual: false },
  { etiqueta: "9 oct", valorM: 25.6, destacado: false, esActual: false },
  { etiqueta: "10 oct", valorM: 28.4, destacado: false, esActual: false },
  { etiqueta: "11 oct", valorM: 27.1, destacado: false, esActual: false },
  { etiqueta: "12 oct", valorM: 29.8, destacado: false, esActual: false },
  { etiqueta: "13 oct", valorM: 26.7, destacado: false, esActual: false },
  { etiqueta: "14 oct", valorM: 30.2, destacado: true, esActual: false },
  { etiqueta: "15 oct", valorM: 28.4, destacado: true, esActual: true },
];

export function ProduccionRecienteChart() {
  const [rango, setRango] = useState<"14" | "7">("14");
  const datos = rango === "14" ? DATOS_14_DIAS : DATOS_14_DIAS.slice(-7);
  const maxEscala = 40;
  const metaDiaria = 26.0;
  const metaBottomPct = Math.round((metaDiaria / maxEscala) * 100);

  return (
    <section className="mb-5 rounded-[16px] border border-[#E6EEF8] bg-white px-5 py-4 shadow-[0_6px_22px_-10px_rgba(14,36,94,0.08)]">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EBF3FE] text-[#1D58D8]">
            <BarChart2 className="h-[18px] w-[18px]" strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="text-[15.5px] font-bold tracking-[-0.015em] text-[#0E245E]">
              Producción reciente
            </h2>
            <p className="text-[11.5px] font-medium text-[#64748B]">
              Facturación diaria consolidada — últimos 14 días (millones COP)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRango((prev) => (prev === "14" ? "7" : "14"))}
          className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[#DCE5F2] bg-[#F8FAFE] px-3 text-[12px] font-medium text-[#0E245E] transition hover:border-[#94A3B8] hover:bg-white"
        >
          <Calendar className="h-3.5 w-3.5 text-[#3B4F8D]" strokeWidth={1.85} />
          <span>{rango === "14" ? "Últimos 14 días" : "Últimos 7 días"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" strokeWidth={2} />
        </button>
      </div>

      {/* Cintillo de 3 indicadores resumen (Opción 3) */}
      <div className="mt-3.5 grid grid-cols-1 divide-y divide-[#D5E3F7] rounded-[11px] border border-[#DCE8FA] bg-gradient-to-r from-[#EDF4FE] via-[#F5F9FF] to-[#EDF4FE] px-4 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-start sm:py-0 sm:pr-4">
          <span className="text-[12px] font-medium text-[#475569]">Acumulado 14 días:</span>
          <span className="text-[13.5px] font-extrabold tabular-nums tracking-[-0.01em] text-[#0E245E]">
            $354,1 M
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-center sm:py-0 sm:px-4">
          <span className="text-[12px] font-medium text-[#475569]">Promedio diario:</span>
          <span className="text-[13.5px] font-extrabold tabular-nums tracking-[-0.01em] text-[#0E245E]">
            $25,3 M
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-end sm:py-0 sm:pl-4">
          <span className="text-[12px] font-medium text-[#475569]">Día pico (14 oct):</span>
          <span className="text-[13.5px] font-extrabold tabular-nums tracking-[-0.01em] text-[#1D4ED8]">
            $30,2 M
          </span>
        </div>
      </div>

      {/* Área de gráfica (Opción 2: onda de fondo + línea de meta diaria + barras con cápsulas destacadas) */}
      <div className="relative mt-4 flex gap-3 pt-2">
        {/* Eje Y */}
        <div className="flex h-[184px] flex-col justify-between pb-6 pr-1 text-right text-[11px] font-medium tabular-nums text-[#64748B]">
          <span>40M</span>
          <span>30M</span>
          <span>20M</span>
          <span>10M</span>
          <span>0</span>
        </div>

        {/* Área de barras + líneas guía */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            <div className="border-b border-dashed border-[#E8EFFA]" />
            <div className="border-b border-dashed border-[#E8EFFA]" />
            <div className="border-b border-dashed border-[#E8EFFA]" />
            <div className="border-b border-dashed border-[#E8EFFA]" />
            <div className="border-b border-[#DCE7F7]" />
          </div>

          {/* Onda suave de área en el fondo */}
          <div className="pointer-events-none absolute inset-x-0 top-2 bottom-6 z-0 overflow-hidden">
            <svg
              className="h-full w-full"
              viewBox="0 0 700 160"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="eb-prod-area-wave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                  <stop offset="75%" stopColor="#93C5FD" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 106 C 45 92, 85 88, 125 94 C 165 100, 205 70, 248 74 C 290 78, 330 56, 372 64 C 415 70, 455 44, 498 50 C 540 55, 580 28, 625 32 C 660 35, 682 20, 700 24 L 700 160 L 0 160 Z"
                fill="url(#eb-prod-area-wave)"
              />
              <path
                d="M 0 106 C 45 92, 85 88, 125 94 C 165 100, 205 70, 248 74 C 290 78, 330 56, 372 64 C 415 70, 455 44, 498 50 C 540 55, 580 28, 625 32 C 660 35, 682 20, 700 24"
                fill="none"
                stroke="#93C5FD"
                strokeWidth="1.6"
              />
            </svg>
          </div>

          {/* Línea punteada horizontal de Meta diaria: $26,0M */}
          <div
            style={{ bottom: `calc(24px + (160px * ${metaBottomPct} / 100))` }}
            className="pointer-events-none absolute inset-x-0 z-20 border-t border-dashed border-[#3B82F6]/80"
          >
            <span className="absolute -top-5 left-1.5 rounded-md border border-[#DCE8FA] bg-white/95 px-2 py-0.5 text-[10.5px] font-bold text-[#1D4ED8] shadow-[0_2px_6px_rgba(14,36,94,0.06)]">
              Meta diaria: $26,0M
            </span>
          </div>

          <div
            className="relative z-10 grid h-[184px] grid-cols-7 items-end gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${datos.length}, minmax(0, 1fr))` }}
          >
            {datos.map((d) => {
              const alturaPct = Math.min(100, Math.round((d.valorM / maxEscala) * 100));
              const textoValor = `${d.valorM.toFixed(1).replace(".", ",")}M`;

              return (
                <div key={d.etiqueta} className="group flex h-full flex-col items-center justify-end">
                  <div className="relative flex w-full flex-1 flex-col items-center justify-end pb-1.5">
                    {d.destacado ? (
                      <span
                        className={`mb-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums shadow-[0_3px_10px_rgba(29,78,216,0.18)] ${
                          d.esActual
                            ? "border border-[#93C5FD] bg-white text-[#0E245E]"
                            : "border border-[#BFDBFE] bg-white text-[#1E3A8A]"
                        }`}
                      >
                        {textoValor}
                      </span>
                    ) : (
                      <span className="mb-1 text-[10px] font-semibold tabular-nums text-[#475569] transition-colors group-hover:font-bold group-hover:text-[#0E245E]">
                        {textoValor}
                      </span>
                    )}

                    <div
                      className={`w-full max-w-[44px] rounded-t-[7px] transition-all duration-300 ${
                        d.esActual
                          ? "shadow-[0_6px_14px_-3px_rgba(29,78,216,0.42)] ring-1 ring-[#1D4ED8]/20"
                          : "group-hover:brightness-95"
                      }`}
                      style={{
                        height: `${alturaPct}%`,
                        background: d.esActual
                          ? "linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)"
                          : d.destacado
                          ? "linear-gradient(180deg, #3B82F6 0%, #7BA9FA 100%)"
                          : "linear-gradient(180deg, #6EA2F7 0%, #AFCBFA 100%)",
                      }}
                    />
                  </div>
                  <span
                    className={`h-5 pt-1 text-[11px] ${
                      d.destacado
                        ? "font-bold text-[#0E245E]"
                        : "font-medium text-[#475569]"
                    }`}
                  >
                    {d.etiqueta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}