"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SocialStatPoint } from "@/lib/types";

export function FollowerHistoryChart({ data }: { data: SocialStatPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-ink-3">
        Aún no hay suficiente histórico de seguidores para graficar.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0F2FF3"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Seguidores"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
