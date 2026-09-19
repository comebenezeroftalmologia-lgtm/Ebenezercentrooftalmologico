"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  /** Oportunidades "vendidas" (Ganadas o en Programación de Cirugía). */
  cierre: number;
  /** Oportunidades con status "Perdida" en el rango. */
  perdidas: number;
}

function pct(part: number, total: number): number | null {
  if (!total) return null;
  return Math.round((part / total) * 1000) / 10;
}

export function ConversionFunnelSection({
  impressions,
  clicks,
  leadsCaptados,
  probabilidad,
  cierre,
  perdidas,
}: ConversionFunnelSectionProps) {
  const ctr = pct(clicks, impressions);
  const leadRate = pct(leadsCaptados, clicks);
  const conversionRate = pct(probabilidad, leadsCaptados);
  const cierreRate = pct(cierre, probabilidad);
  const perdidaRate = pct(perdidas, leadsCaptados);

  const steps = [
    { label: "Paso 1 — Leads Captados", value: leadsCaptados, color: "#0F2FF3" },
    { label: "Paso 2 — Probabilidad de Compra", value: probabilidad, color: "#D97706" },
    { label: "Paso 3 — Cierre (Vendidas)", value: cierre, color: "#21814B" },
    { label: "Oportunidades Perdidas", value: perdidas, color: "#B3261E" },
  ];

  const height = Math.max(220, steps.length * 56);

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
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={steps} layout="vertical" margin={{ left: 24, right: 48 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={220} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => formatNumber(value)} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Oportunidades">
              {steps.map((s) => (
                <Cell key={s.label} fill={s.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fill: "#0B1633", fontSize: 12, fontWeight: 600 }}
                formatter={(v: number) => formatNumber(v)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1 rounded-pill bg-[#FDF2E1] px-3 py-1 text-xs font-semibold text-[#B45309]">
            Conversión (Leads → Probabilidad): {conversionRate !== null ? `${conversionRate}%` : "—"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-pill bg-green-10 px-3 py-1 text-xs font-semibold text-green">
            Cierre (Probabilidad → Vendidas): {cierreRate !== null ? `${cierreRate}%` : "—"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-pill bg-[#FBEAE8] px-3 py-1 text-xs font-semibold text-[#B3261E]">
            Pérdida (sobre Leads Captados): {perdidaRate !== null ? `${perdidaRate}%` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
