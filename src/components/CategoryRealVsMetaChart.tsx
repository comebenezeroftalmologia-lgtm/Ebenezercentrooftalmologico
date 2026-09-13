"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CategoryDatum {
  label: string;
  real: number;
  meta: number;
}

export function CategoryRealVsMetaChart({ data }: { data: CategoryDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-3">Sin datos para este mes todavía.</p>;
  }

  const height = Math.max(240, data.length * 56);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number, name: string) => [value.toLocaleString("es-CO"), name]} />
        <Legend />
        <Bar dataKey="real" name="Real" fill="#0F2FF3" radius={[0, 4, 4, 0]} />
        <Bar dataKey="meta" name="Meta" fill="#B0FFFA" stroke="#21814B" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
