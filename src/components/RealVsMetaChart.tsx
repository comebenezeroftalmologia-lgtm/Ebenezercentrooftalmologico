"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MES_CORTO: Record<string, string> = {
  enero: "Ene",
  febrero: "Feb",
  marzo: "Mar",
  abril: "Abr",
  mayo: "May",
  junio: "Jun",
  julio: "Jul",
  agosto: "Ago",
  septiembre: "Sep",
  octubre: "Oct",
  noviembre: "Nov",
  diciembre: "Dic",
};

export interface RealVsMetaDatum {
  month_name: string;
  real: number;
  meta: number;
  is_mtd: boolean;
}

export function RealVsMetaChart({ data }: { data: RealVsMetaDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-3">Sin datos de Frecuencias para este año.</p>;
  }

  const chartData = data.map((d) => ({
    ...d,
    mes: MES_CORTO[d.month_name] ?? d.month_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip
          formatter={(value: number, name: string) => [value.toLocaleString("es-CO"), name]}
          labelFormatter={(label, payload) => {
            const isMtd = payload?.[0]?.payload?.is_mtd;
            return isMtd ? `${label} (corte parcial)` : label;
          }}
        />
        <Legend />
        <Bar dataKey="real" name="Real" fill="#0F2FF3" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell key={i} fillOpacity={d.is_mtd ? 0.45 : 1} />
          ))}
        </Bar>
        <Bar dataKey="meta" name="Meta" fill="#B0FFFA" stroke="#21814B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
