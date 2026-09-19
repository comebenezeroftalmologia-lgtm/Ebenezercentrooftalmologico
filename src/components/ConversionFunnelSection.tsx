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
      fill: "#0F2FF3",
    },
    {
      name: `Paso 2 — Probabilidad de Compra — ${formatNumber(probabilidad)}`,
      value: probabilidad,
      fill: "#D97706",
    },
    {
      name: `Paso 3 — Programación de Cirugía — ${formatNumber(cierre)}`,
      value: cierre,
      fill: "#21814B",
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="mb-1 text-lg font-semibold text-navy">Embudo de Conversión</h2>
      <p className="mb-4 text-xs text-ink-3">
        Atracción (Meta Ads) → Conversión y Cierre (Clientify), para el período y filtros
        seleccionados arriba.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="eb-label text-[11px] text-ink-3">Impresiones → Clics (CTR)</p>
          <p className="mt-1 font-heading text-3xl font-semibold text-navy">
            {ctr !== null ? `${ctr}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {formatNumber(impressions)} impresiones → {formatNumber(clicks)} clics
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="eb-label text-[11px] text-ink-3">Clics → Leads Captados</p>
          <p className="mt-1 font-heading text-3xl font-semibold text-navy">
            {leadRate !== null ? `${leadRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {formatNumber(clicks)} clics → {formatNumber(leadsCaptados)} leads captados
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <ResponsiveContainer width="100%" height={320}>
          <FunnelChart>
            <Tooltip formatter={(value: number) => formatNumber(value)} />
            <Funnel dataKey="value" data={steps} isAnimationActive>
              <LabelList
                dataKey="name"
                position="right"
                style={{ fill: "#0B1633", fontSize: 12, fontWeight: 600 }}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1 rounded-pill bg-[#FDF2E1] px-3 py-1 text-xs font-semibold text-[#B45309]">
            Conversión (Leads → Probabilidad): {conversionRate !== null ? `${conversionRate}%` : "—"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-pill bg-green-10 px-3 py-1 text-xs font-semibold text-green">
            Cierre (Probabilidad → Programación de Cirugía):{" "}
            {cierreRate !== null ? `${cierreRate}%` : "—"}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#B3261E] px-5 py-4 text-white">
          <span className="text-sm font-semibold">Oportunidades Perdidas</span>
          <div className="text-right">
            <span className="text-2xl font-bold">{formatNumber(perdidas)}</span>
            {perdidaRate !== null && (
              <p className="text-xs text-white/80">{perdidaRate}% sobre Leads Captados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
