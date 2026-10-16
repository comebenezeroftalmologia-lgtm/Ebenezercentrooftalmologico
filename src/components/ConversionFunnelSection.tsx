"use client";

import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";
import { ratioPct } from "@/lib/dashboard";
import { formatNumber } from "@/lib/text";

export interface ConversionFunnelSectionProps {
  /** Impresiones y clics de Meta Ads en el rango seleccionado. */
  impressions: number;
  clicks: number;
  /** Leads reportados por Meta (action_type "lead") en el rango. */
  leadsCaptados: number;
  /** Oportunidades de Clientify en alguna de las etapas con
   * probabilidad de compra (ver PROBABILIDAD_COMPRA_STAGES). */
  probabilidad: number;
  /** Oportunidades en la etapa "Programación de Cirugía" puntualmente
   * (no "vendidas" en general — solo esa etapa). */
  cierre: number;
  /** Oportunidades con status "Perdida" en el rango — se muestra aparte
   * del embudo, no como un paso más. */
  perdidas: number;
}

export function ConversionFunnelSection({
  impressions,
  clicks,
  leadsCaptados,
  probabilidad,
  cierre,
  perdidas,
}: ConversionFunnelSectionProps) {
  const ctr = ratioPct(clicks, impressions);
  const leadRate = ratioPct(leadsCaptados, clicks);
  const conversionRate = ratioPct(probabilidad, leadsCaptados);
  const cierreRate = ratioPct(cierre, probabilidad);
  const perdidaRate = ratioPct(perdidas, leadsCaptados);

  const steps = [
    {
      name: `Paso 1 — Leads Captados — ${formatNumber(leadsCaptados)}`,
      value: leadsCaptados,
      fill: "#0E245E",
    },
    {
      name: `Paso 2 — Probabilidad de Compra — ${formatNumber(probabilidad)}`,
      value: probabilidad,
      fill: "#3B4F8D",
    },
    {
      name: `Paso 3 — Programación de Cirugía — ${formatNumber(cierre)}`,
      value: cierre,
      fill: "#21814B",
    },
  ];

  return (
    <div className="mb-8">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[15px] border border-[#E7E9F2] bg-white p-5 shadow-eb-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
            Impresiones → Clics (CTR)
          </p>
          <p className="mt-1.5 text-[34px] font-light leading-[1.05] tracking-[-0.025em] tabular-nums text-navy">
            {ctr !== null ? `${ctr}%` : "—"}
          </p>
          <p className="mt-2 text-[11.5px] text-[#949BB4]">
            {formatNumber(impressions)} impresiones → {formatNumber(clicks)} clics
          </p>
        </div>
        <div className="rounded-[15px] border border-[#E7E9F2] bg-white p-5 shadow-eb-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
            Clics → Leads Captados
          </p>
          <p className="mt-1.5 text-[34px] font-light leading-[1.05] tracking-[-0.025em] tabular-nums text-navy">
            {leadRate !== null ? `${leadRate}%` : "—"}
          </p>
          <p className="mt-2 text-[11.5px] text-[#949BB4]">
            {formatNumber(clicks)} clics → {formatNumber(leadsCaptados)} leads captados
          </p>
        </div>
      </div>

      <div className="rounded-[15px] border border-[#E7E9F2] bg-white shadow-eb-1">
        <div className="border-b border-[#F0F1F7] px-6 py-4">
          <h2 className="font-titulo text-[17px] font-medium tracking-[-0.012em] text-navy">
            Embudo de Conversión — Atracción a Cierre
          </h2>
          <p className="mt-0.5 text-[11.5px] text-[#949BB4]">
            Atracción (Meta Ads) → Conversión y Cierre (Clientify), según el período y filtros activos.
          </p>
        </div>

        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Funnel dataKey="value" data={steps} isAnimationActive>
                <LabelList
                  dataKey="name"
                  position="right"
                  style={{ fill: "#0E245E", fontSize: 12, fontWeight: 600 }}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>

          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1 rounded-pill bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-navy-90">
              Conversión (Leads → Probabilidad): {conversionRate !== null ? `${conversionRate}%` : "—"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-pill bg-green-10 px-3 py-1 text-xs font-semibold text-green">
              Cierre (Probabilidad → Programación de Cirugía):{" "}
              {cierreRate !== null ? `${cierreRate}%` : "—"}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[12px] border border-[#F3D2D0] border-l-[3px] border-l-[#DC2626] bg-[#FDF8F8] px-5 py-3.5">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
                Oportunidades Perdidas en el Período
              </span>
              {perdidaRate !== null && (
                <p className="mt-0.5 text-xs text-ink-3">{perdidaRate}% sobre Leads Captados</p>
              )}
            </div>
            <span className="text-[28px] font-light leading-none tracking-[-0.025em] tabular-nums text-[#DC2626]">
              {formatNumber(perdidas)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}