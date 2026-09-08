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
import type { StageFunnelRow } from "@/lib/types";

export function StageFunnelChart({ rows }: { rows: StageFunnelRow[] }) {
  // Agrupa por etapa (por si vienen varios servicios sumados)
  const byStage = new Map<string, number>();
  for (const row of rows) {
    byStage.set(row.stage, (byStage.get(row.stage) ?? 0) + row.opportunity_count);
  }
  const data = Array.from(byStage, ([stage, count]) => ({ stage, count }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Sin oportunidades abiertas para este filtro todavía.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="stage" width={180} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#0F2FF3" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
