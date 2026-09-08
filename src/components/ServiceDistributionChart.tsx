"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Opportunity } from "@/lib/types";

const PALETTE = ["#0F2FF3", "#21814B", "#0E245E", "#6791F0", "#3B4F8D", "#C77A00"];
const NO_SERVICE_COLOR = "#9CA3AF";
const NO_SERVICE_LABEL = "Sin servicio";

export function ServiceDistributionChart({
  opportunities,
  serviceNames,
}: {
  opportunities: Opportunity[];
  serviceNames: Map<number, string>;
}) {
  // Paleta estable por nombre de servicio (no por posición/conteo), para
  // que el color de cada servicio no cambie al filtrar por estado.
  const allNames = Array.from(new Set(serviceNames.values())).sort((a, b) =>
    a.localeCompare(b, "es")
  );
  const colorByName = new Map<string, string>();
  allNames.forEach((name, i) => colorByName.set(name, PALETTE[i % PALETTE.length]));
  colorByName.set(NO_SERVICE_LABEL, NO_SERVICE_COLOR);

  const counts = new Map<string, number>();
  for (const o of opportunities) {
    const name = o.service_id ? serviceNames.get(o.service_id) ?? NO_SERVICE_LABEL : NO_SERVICE_LABEL;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const data = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value, color: colorByName.get(name) ?? NO_SERVICE_COLOR }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

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
