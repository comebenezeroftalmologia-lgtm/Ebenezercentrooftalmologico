"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FrecuenciaConteo, FrecuenciaMonthly } from "@/lib/types";
import { formatNumber } from "@/lib/text";
import { GREEN, MES_CORTO, MES_LARGO, MES_ORDEN, MUTUAL_RE, RED, YEAR_COLORS, type Mode, fmtVal } from "./shared";

export function TendenciaMensual({
  rows,
  metaRows,
  years: selectedYears,
  mutualIncluded,
  mode,
}: {
  rows: FrecuenciaConteo[];
  metaRows: FrecuenciaMonthly[];
  years: number[];
  mutualIncluded: boolean;
  mode: Mode;
}) {
  const years = selectedYears.slice().sort((a, b) => a - b);
  const y2 = years[years.length - 1];
  const showMeta = mode === "freq";

  const allUfs = useMemo(
    () => Array.from(new Set(rows.map((r) => r.uf))).sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );
  const allGrupos = useMemo(
    () => Array.from(new Set(rows.map((r) => r.grupo))).sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );
  const ufs = allUfs;
  const grupos = allGrupos.filter((g) => mutualIncluded || !MUTUAL_RE.test(g));
  const valueKey: keyof Pick<FrecuenciaConteo, "cantidad" | "valor"> = mode === "val" ? "valor" : "cantidad";

  const index = useMemo(() => {
    const m = new Map<string, FrecuenciaConteo>();
    for (const r of rows) m.set(`${r.year}|${r.month_num}|${r.uf}|${r.grupo}`, r);
    return m;
  }, [rows]);

  const diasHabilesByYearMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.year}|${r.month_num}`;
      if (!m.has(key) && r.dias_habiles != null) m.set(key, r.dias_habiles);
    }
    return m;
  }, [rows]);

  const monthsByYear = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const r of rows) {
      if (!m.has(r.year)) m.set(r.year, []);
      const list = m.get(r.year)!;
      if (!list.includes(r.month_num)) list.push(r.month_num);
    }
    for (const list of m.values()) list.sort((a, b) => a - b);
    return m;
  }, [rows]);

  function diasHabilesTotal(year: number): number {
    const months = monthsByYear.get(year) ?? [];
    const total = months.reduce((s, m) => s + (diasHabilesByYearMonth.get(`${year}|${m}`) ?? 0), 0);
    return total || 1;
  }

  function valExact(uf: string, grupo: string, year: number, monthNum: number): number {
    const r = index.get(`${year}|${monthNum}|${uf}|${grupo}`);
    return r ? r[valueKey] : 0;
  }
  function valYM(year: number, monthNum: number): number {
    return ufs.reduce((s, u) => s + grupos.reduce((ss, g) => ss + valExact(u, g, year, monthNum), 0), 0);
  }

  // meta total (uf=null) por mes, para el año y2 — ya calculada sin Mutual por el motor de Pedro.
  const metaTotalByMonth = useMemo(() => {
    const m = new Map<number, { real: number; meta: number }>();
    for (const r of metaRows) {
      if (r.uf !== null || r.year !== y2) continue;
      const acc = m.get(r.month_num) ?? { real: 0, meta: 0 };
      acc.real += r.real;
      acc.meta += r.meta;
      m.set(r.month_num, acc);
    }
    return m;
  }, [metaRows, y2]);

  // --- Gráfico de tendencia: una línea por año, Enero-Diciembre ---
  const chartData = MES_ORDEN.map((mesNombre, idx) => {
    const monthNum = idx + 1;
    const row: Record<string, number | string | null> = { mes: MES_CORTO[mesNombre] };
    years.forEach((y) => {
      const v = valYM(y, monthNum);
      row[String(y)] = v > 0 ? v : null;
    });
    if (showMeta) {
      const m = metaTotalByMonth.get(monthNum);
      row["meta"] = m && m.meta > 0 ? m.meta : null;
    }
    return row;
  });

  // --- Tabla mensual (sin columnas de variación, igual que el original) ---
  const tots: Record<number, number> = {};
  years.forEach((y) => (tots[y] = 0));

  return (
    <div>
      {/* Gráfico de tendencia */}
      <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Tendencia Mensual</h2>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ left: 8, right: 16, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} tickFormatter={(v) => fmtVal(mode, v)} />
            <Tooltip formatter={(value: number, name: string) => [fmtVal(mode, value), name]} />
            <Legend />
            {years.map((y, i) => (
              <Line
                key={y}
                type="monotone"
                dataKey={String(y)}
                name={`Año ${y}`}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
            {showMeta && (
              <Line
                type="monotone"
                dataKey="meta"
                name={`Meta ${y2} (+15%)`}
                stroke="#E11D48"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla mensual */}
      <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          {mode === "val" ? "Valor" : "Frecuencias"} por Mes — {years.join(", ")}
        </h2>
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
              <th className="px-3 py-2">Mes</th>
              {years.map((y) => (
                <th key={y} className="px-3 py-2 text-right">
                  {y}
                </th>
              ))}
              <th className="px-3 py-2 text-right">÷día {y2}</th>
            </tr>
          </thead>
          <tbody>
            {MES_ORDEN.map((mesNombre, idx) => {
              const monthNum = idx + 1;
              const vals: Record<number, number> = {};
              years.forEach((y) => {
                const v = valYM(y, monthNum);
                vals[y] = v;
                tots[y] += v;
              });
              if (!Object.values(vals).some((v) => v > 0)) return null;
              const dh = diasHabilesByYearMonth.get(`${y2}|${monthNum}`) ?? 1;
              return (
                <tr key={monthNum} className="border-b border-line-2">
                  <td className="px-3 py-2 text-ink">{MES_LARGO[mesNombre]}</td>
                  {years.map((y) => (
                    <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                      {fmtVal(mode, vals[y])}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right text-blue">
                    {vals[y2] > 0 ? fmtVal(mode, vals[y2] / dh) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy font-bold text-navy">
              <td className="px-3 py-2">TOTAL</td>
              {years.map((y) => (
                <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                  {fmtVal(mode, tots[y])}
                </td>
              ))}
              <td className="whitespace-nowrap px-3 py-2 text-right">
                {fmtVal(mode, tots[y2] / diasHabilesTotal(y2))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Meta mensual (solo modo Frecuencias) */}
      {showMeta && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Meta Mensual (+15%) — {y2}</h2>
          {metaTotalByMonth.size === 0 ? (
            <p className="text-sm text-ink-3">Sin datos de meta para {y2}.</p>
          ) : (
            <MetaMensualTable months={metaTotalByMonth} />
          )}
          <p className="mt-3 text-xs text-ink-3">
            Meta = mismo mes del año anterior + 15% (calculada por el motor de Pedro). Falta = lo que
            resta para la meta (rojo = por debajo). El mes en curso puede ir parcial.
          </p>
        </div>
      )}
    </div>
  );
}

function MetaMensualTable({ months }: { months: Map<number, { real: number; meta: number }> }) {
  let totalReal = 0;
  let totalMeta = 0;
  const filas = MES_ORDEN.map((mesNombre, idx) => {
    const monthNum = idx + 1;
    const d = months.get(monthNum);
    if (!d || d.real <= 0) return null;
    totalReal += d.real;
    totalMeta += d.meta;
    const pct = d.meta ? Math.round((100 * d.real) / d.meta) : 0;
    const falta = Math.max(0, d.meta - d.real);
    return { mesNombre, real: d.real, meta: d.meta, falta, pct };
  }).filter(Boolean) as { mesNombre: string; real: number; meta: number; falta: number; pct: number }[];

  const totalPct = totalMeta ? Math.round((100 * totalReal) / totalMeta) : 0;
  const totalFalta = Math.max(0, totalMeta - totalReal);

  return (
    <table className="w-full min-w-[480px] border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
          <th className="px-3 py-2">Mes</th>
          <th className="px-3 py-2 text-right">Realizado</th>
          <th className="px-3 py-2 text-right">Meta (+15%)</th>
          <th className="px-3 py-2 text-right">Falta</th>
          <th className="px-3 py-2 text-right">% Avance</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.mesNombre} className="border-b border-line-2">
            <td className="px-3 py-2 font-medium text-navy">{MES_LARGO[f.mesNombre]}</td>
            <td className="whitespace-nowrap px-3 py-2 text-right">{formatNumber(f.real)}</td>
            <td className="whitespace-nowrap px-3 py-2 text-right">{formatNumber(f.meta)}</td>
            <td
              className="whitespace-nowrap px-3 py-2 text-right font-semibold"
              style={{ color: f.pct >= 100 ? GREEN : RED }}
            >
              {f.falta > 0 ? formatNumber(f.falta) : "✓"}
            </td>
            <td
              className="whitespace-nowrap px-3 py-2 text-right font-semibold"
              style={{ color: f.pct >= 100 ? GREEN : RED }}
            >
              {f.pct}%
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-navy bg-line-2 font-bold text-navy">
          <td className="px-3 py-2">TOTAL</td>
          <td className="whitespace-nowrap px-3 py-2 text-right">{formatNumber(totalReal)}</td>
          <td className="whitespace-nowrap px-3 py-2 text-right">{formatNumber(totalMeta)}</td>
          <td className="whitespace-nowrap px-3 py-2 text-right" style={{ color: totalPct >= 100 ? GREEN : RED }}>
            {totalFalta > 0 ? formatNumber(totalFalta) : "✓"}
          </td>
          <td className="whitespace-nowrap px-3 py-2 text-right" style={{ color: totalPct >= 100 ? GREEN : RED }}>
            {totalPct}%
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
