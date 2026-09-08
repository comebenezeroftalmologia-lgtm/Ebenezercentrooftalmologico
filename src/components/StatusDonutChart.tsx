"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusCounts } from "@/lib/dashboard";

const SLICES: { key: "open" | "expired" | "lost" | "won"; label: string; color: string }[] = [
  { key: "open", label: "Abiertas", color: "#6791F0" },
  { key: "expired", label: "Vencidas", color: "#C77A00" },
  { key: "lost", label: "Perdidas", color: "#B3261E" },
  { key: "won", label: "Ganadas", color: "#21814B" },
];

export function StatusDonutChart({ counts }: { counts: StatusCounts }) {
  const data = SLICES.map((s) => ({ name: s.label, value: counts[s.key], color: s.color })).filter(
    (d) => d.value > 0
  );

  if (data.length === 0) {
    return <p className="text-sm text-ink-3">Sin oportunidades para este filtro todavía.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="h-[220px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm text-ink-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-pill"
              style={{ backgroundColor: d.color }}
            />
            {d.name}: <span className="font-semibold text-navy">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
