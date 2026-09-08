"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FunnelDatum } from "@/lib/dashboard";

export function StageFunnelChart({ data }: { data: FunnelDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-ink-3">
        Sin oportunidades para este filtro todavía.
      </p>
    );
  }

  const height = Math.max(240, data.length * 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="stage" width={220} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#0F2FF3" radius={[0, 4, 4, 0]} name="Oportunidades" />
      </BarChart>
    </ResponsiveContainer>
  );
}
