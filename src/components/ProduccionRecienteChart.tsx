"use client";

import { useState } from "react";
import { BarChart2, Calendar, ChevronDown } from "lucide-react";

const DATOS_14_DIAS = [
  { etiqueta: "2 oct", valorM: 18.2 },
  { etiqueta: "3 oct", valorM: 21.5 },
  { etiqueta: "4 oct", valorM: 19.8 },
  { etiqueta: "5 oct", valorM: 22.7 },
  { etiqueta: "6 oct", valorM: 24.1 },
  { etiqueta: "7 oct", valorM: 26.3 },
  { etiqueta: "8 oct", valorM: 23.9 },
  { etiqueta: "9 oct", valorM: 25.6 },
  { etiqueta: "10 oct", valorM: 28.4 },
  { etiqueta: "11 oct", valorM: 27.1 },
  { etiqueta: "12 oct", valorM: 29.8 },
  { etiqueta: "13 oct", valorM: 26.7 },
  { etiqueta: "14 oct", valorM: 30.2 },
  { etiqueta: "15 oct", valorM: 28.4 },
];

export function ProduccionRecienteChart() {
  const [rango, setRango] = useState<"14" | "7">("14");
  const datos = rango === "14" ? DATOS_14_DIAS : DATOS_14_DIAS.slice(-7);
  const maxEscala = 40;

  return (
    <section className="mb-5 rounded-[16px] border border-[#E6EEF8] bg-white px-5 py-4 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-[18px] w-[18px] text-[#1D58D8]" strokeWidth={2.1} />
          <h2 className="text-[15.5px] font-bold tracking-[-0.015em] text-[#0E245E]">
            Producción reciente
          </h2>
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

      <div className="relative flex gap-3 pt-2">
        {/* Eje Y */}
        <div className="flex h-[168px] flex-col justify-between pb-6 pr-1 text-right text-[11px] font-medium tabular-nums text-[#64748B]">
          <span>40M</span>
          <span>30M</span>
          <span>20M</span>
          <span>10M</span>
          <span>0</span>
        </div>

        {/* Área de barras + líneas guía */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            <div className="border-b border-[#EEF2F8]" />
            <div className="border-b border-[#EEF2F8]" />
            <div className="border-b border-[#EEF2F8]" />
            <div className="border-b border-[#EEF2F8]" />
            <div className="border-b border-[#E2E8F0]" />
          </div>

          <div className="relative z-10 grid h-[168px] grid-cols-7 items-end gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${datos.length}, minmax(0, 1fr))` }}>
            {datos.map((d, idx) => {
              const esUltimo = idx === datos.length - 1;
              const alturaPct = Math.min(100, Math.round((d.valorM / maxEscala) * 100));
              const textoValor = `${d.valorM.toFixed(1).replace(".", ",")}M`;

              return (
                <div key={d.etiqueta} className="flex h-full flex-col items-center justify-end">
                  <div className="flex flex-1 w-full flex-col items-center justify-end pb-1.5">
                    <span className="mb-1 text-[10.5px] font-semibold tabular-nums text-[#334155]">
                      {textoValor}
                    </span>
                    <div
                      className={`w-full max-w-[46px] rounded-t-[5px] transition-all duration-300 ${
                        esUltimo
                          ? "bg-[#2B6BE4] shadow-[0_2px_8px_rgba(43,107,228,0.28)]"
                          : "bg-[#97B8EC] hover:bg-[#7FA6E6]"
                      }`}
                      style={{ height: `${alturaPct}%` }}
                    />
                  </div>
                  <span className="h-5 pt-1 text-[11px] font-medium text-[#475569]">
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
