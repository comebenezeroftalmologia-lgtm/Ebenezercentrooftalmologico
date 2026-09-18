"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FrecuenciaCobrableMensual } from "@/lib/types";
import { formatCOP, formatNumber } from "@/lib/text";
import { GREEN, MES_LARGO, MES_ORDEN, RED } from "./shared";

export function CobrableVsNo({
  rows,
  years: selectedYears,
}: {
  rows: FrecuenciaCobrableMensual[];
  years: number[];
}) {
  const years = selectedYears.slice().sort((a, b) => a - b);
  const y2 = years[years.length - 1];

  const totalesPorAnio = useMemo(() => {
    const m = new Map<number, { si: number; no: number; valorSi: number; valorNo: number }>();
    for (const r of rows) {
      if (r.uf !== null) continue; // solo la fila total
      const acc = m.get(r.year) ?? { si: 0, no: 0, valorSi: 0, valorNo: 0 };
      acc.si += r.si;
      acc.no += r.no;
      acc.valorSi += r.valor_si ?? 0;
      acc.valorNo += r.valor_no ?? 0;
      m.set(r.year, acc);
    }
    return m;
  }, [rows]);

  function totalFor(year: number) {
    return totalesPorAnio.get(year) ?? { si: 0, no: 0, valorSi: 0, valorNo: 0 };
  }

  const t2 = totalFor(y2);
  const totServiciosY2 = t2.si + t2.no;
  const pctCobY2 = totServiciosY2 ? (t2.si * 100) / totServiciosY2 : 0;

  const y1 = years.length >= 2 ? years[years.length - 2] : null;
  let difPct: number | null = null;
  if (y1 !== null) {
    const t1 = totalFor(y1);
    const totY1 = t1.si + t1.no;
    const pctY1 = totY1 ? (t1.si * 100) / totY1 : 0;
    difPct = pctCobY2 - pctY1;
  }

  const chartNoData = years.map((y) => {
    const t = totalFor(y);
    const tot = t.si + t.no;
    return { year: String(y), no: t.no, pct: tot ? (t.no * 100) / tot : 0 };
  });

  const filasMes = MES_ORDEN.map((mesNombre, idx) => {
    const monthNum = idx + 1;
    const r = rows.find((rr) => rr.year === y2 && rr.month_num === monthNum && rr.uf === null);
    if (!r || (r.si === 0 && r.no === 0)) return null;
    const tot = r.si + r.no;
    const pct = tot ? (r.si * 100) / tot : 0;
    return { mesNombre, si: r.si, no: r.no, tot, pct };
  }).filter(Boolean) as { mesNombre: string; si: number; no: number; tot: number; pct: number }[];

  const granSi = filasMes.reduce((s, f) => s + f.si, 0);
  const granNo = filasMes.reduce((s, f) => s + f.no, 0);
  const granTot = granSi + granNo;
  const granPct = granTot ? (granSi * 100) / granTot : 0;

  function pctColor(pct: number) {
    return pct >= 85 ? GREEN : pct >= 70 ? "#F59E0B" : RED;
  }

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="eb-label text-[11px] text-ink-3">Se factura {y2}</p>
          <p className="mt-1 font-heading text-2xl font-semibold text-navy">{formatCOP(t2.valorSi)}</p>
          <p className="mt-1 text-xs text-ink-3">{formatNumber(t2.si)} servicios</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="eb-label text-[11px] text-ink-3">No se cobra {y2}</p>
          <p className="mt-1 font-heading text-2xl font-semibold text-navy">{formatCOP(t2.valorNo)}</p>
          <p className="mt-1 text-xs text-ink-3">{formatNumber(t2.no)} servicios entregados sin cobro</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="eb-label text-[11px] text-ink-3">% que se factura</p>
          <p className="mt-1 font-heading text-3xl font-semibold text-navy">{pctCobY2.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-ink-3">de toda la producción</p>
        </div>
        {difPct !== null && y1 !== null && (
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <p className="eb-label text-[11px] text-ink-3">vs. {y1}</p>
            <p className="mt-1 font-heading text-3xl font-semibold" style={{ color: difPct >= 0 ? GREEN : RED }}>
              {difPct >= 0 ? "+" : ""}
              {difPct.toFixed(1)} pp
            </p>
            <p className="mt-1 text-xs text-ink-3">antes {(pctCobY2 - difPct).toFixed(1)}% facturado</p>
          </div>
        )}
      </div>

      <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Servicios no cobrados por Año</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartNoData} margin={{ left: 8, right: 16, top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number, name: string, item) => [
                `${formatNumber(value)} (${(item.payload as { pct: number }).pct.toFixed(1)}% del total)`,
                name,
              ]}
            />
            <Bar dataKey="no" name="Servicios no cobrados" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={90} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Detalle Mensual — {y2}</h2>
        {filasMes.length === 0 ? (
          <p className="text-sm text-ink-3">Sin datos para {y2}.</p>
        ) : (
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2">Mes {y2}</th>
                <th className="px-3 py-2 text-right">Se factura</th>
                <th className="px-3 py-2 text-right">No se cobra</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">% que se factura</th>
              </tr>
            </thead>
            <tbody>
              {filasMes.map((f) => (
                <tr key={f.mesNombre} className="border-b border-line-2">
                  <td className="px-3 py-2 font-semibold text-navy">{MES_LARGO[f.mesNombre]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium" style={{ color: GREEN }}>
                    {formatNumber(f.si)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right" style={{ color: "#B45309" }}>
                    {formatNumber(f.no)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{formatNumber(f.tot)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${f.pct}%`, background: pctColor(f.pct) }}
                        />
                      </div>
                      <span className="min-w-[48px] text-right text-xs font-bold" style={{ color: pctColor(f.pct) }}>
                        {f.pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy font-bold text-navy">
                <td className="px-3 py-2">TOTAL {y2}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right" style={{ color: GREEN }}>
                  {formatNumber(granSi)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right" style={{ color: "#B45309" }}>
                  {formatNumber(granNo)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatNumber(granTot)}</td>
                <td className="px-3 py-2">{granPct.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
