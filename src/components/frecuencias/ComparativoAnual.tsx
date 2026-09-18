"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FrecuenciaConteo, FrecuenciaMonthly } from "@/lib/types";
import { formatNumber } from "@/lib/text";
import { GREEN, MUTUAL_RE, RED, YEAR_COLORS, type Mode, fmtVal, pctPill } from "./shared";

const PIE_COLORS = ["#0F2FF3", "#21814B", "#F2994A", "#9B51E0", "#0BA5EC", "#EB5757"];

function PctPillCell({ before, after }: { before: number; after: number }) {
  const { text, color } = pctPill(before, after);
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color }}>
      {text}
    </td>
  );
}

export function ComparativoAnual({
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

  const diasHabilesByYearMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.year}|${r.month_num}`;
      if (!m.has(key) && r.dias_habiles != null) m.set(key, r.dias_habiles);
    }
    return m;
  }, [rows]);

  function valExact(uf: string, grupo: string, year: number, monthNum: number): number {
    const r = index.get(`${year}|${monthNum}|${uf}|${grupo}`);
    return r ? r[valueKey] : 0;
  }
  function valUf(uf: string, year: number): number {
    const months = monthsByYear.get(year) ?? [];
    return months.reduce((s, m) => s + grupos.reduce((ss, g) => ss + valExact(uf, g, year, m), 0), 0);
  }
  function valGrp(grupo: string, year: number): number {
    const months = monthsByYear.get(year) ?? [];
    return months.reduce((s, m) => s + ufs.reduce((ss, u) => ss + valExact(u, grupo, year, m), 0), 0);
  }
  function totYear(year: number): number {
    return ufs.reduce((s, u) => s + valUf(u, year), 0);
  }
  function diasHabiles(year: number): number {
    const months = monthsByYear.get(year) ?? [];
    const total = months.reduce((s, m) => s + (diasHabilesByYearMonth.get(`${year}|${m}`) ?? 0), 0);
    return total || 1;
  }
  function mesesConDatos(year: number): number {
    return (monthsByYear.get(year) ?? []).length;
  }

  // --- Meta (+15% vs. año anterior, ya calculada sin Mutual por el motor de Pedro) ---
  const metaByUfYear = useMemo(() => {
    const m = new Map<string, { real: number; meta: number }>();
    for (const r of metaRows) {
      const key = `${r.uf ?? "__total__"}|${r.year}`;
      const acc = m.get(key) ?? { real: 0, meta: 0 };
      acc.real += r.real;
      acc.meta += r.meta;
      m.set(key, acc);
    }
    return m;
  }, [metaRows]);

  function metaFor(uf: string | null, year: number) {
    return metaByUfYear.get(`${uf ?? "__total__"}|${year}`) ?? { real: 0, meta: 0 };
  }

  const y2 = years[years.length - 1];
  const twoOrMore = years.length >= 2;
  const showMeta = mode === "freq";

  const totales: Record<number, number> = {};
  years.forEach((y) => (totales[y] = totYear(y)));

  const totalMeta = metaFor(null, y2);
  const totalMetaPct = totalMeta.meta ? Math.round((100 * totalMeta.real) / totalMeta.meta) : 0;
  const totalMetaOk = totalMetaPct >= 100;

  const totsUf: Record<number, number> = {};
  years.forEach((y) => (totsUf[y] = 0));
  const totsGrp: Record<number, number> = {};
  years.forEach((y) => (totsGrp[y] = 0));

  return (
    <div>
      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {years.map((y, i) => {
          const v = totales[y];
          const prevY = years[i - 1];
          const prom = v / diasHabiles(y);
          const pill = prevY !== undefined ? pctPill(totales[prevY], v) : null;
          return (
            <div key={y} className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <p className="eb-label text-[11px] text-ink-3">Total {y}</p>
              <p className="mt-1 font-heading text-3xl font-semibold text-navy">{fmtVal(mode, v)}</p>
              <p className="mt-2 text-xs text-ink-3">
                {fmtVal(mode, prom)} / día · {mesesConDatos(y)} meses
              </p>
              {pill && (
                <p className="mt-1 text-xs font-semibold" style={{ color: pill.color }}>
                  {pill.text} vs. {prevY}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Banner de meta (+15%) — solo en modo Frecuencias */}
      {showMeta && totalMeta.meta > 0 && (
        <div
          className="mb-8 rounded-xl border border-line bg-white p-5 shadow-sm"
          style={{ borderLeft: `5px solid ${totalMetaOk ? GREEN : RED}` }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink-3">
              Meta {y2} · 15% más que el año pasado
            </span>
            <span
              className="rounded-pill px-3 py-1 text-xs font-bold"
              style={{ color: totalMetaOk ? GREEN : RED, background: totalMetaOk ? "#DCEEE3" : "#FBEAE8" }}
            >
              {totalMetaOk ? "Meta cumplida" : "Por debajo de la meta"}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-6">
            <div>
              <p className="text-xs text-ink-3">Realizado</p>
              <p className="text-2xl font-bold text-navy">{formatNumber(totalMeta.real)}</p>
            </div>
            <p className="text-ink-3">de</p>
            <div>
              <p className="text-xs text-ink-3">Meta</p>
              <p className="text-2xl font-bold text-navy">{formatNumber(totalMeta.meta)}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-ink-3">{totalMetaOk ? "Sobrepasó por" : "Faltan"}</p>
              <p className="text-2xl font-bold" style={{ color: totalMetaOk ? GREEN : RED }}>
                {formatNumber(Math.abs(totalMeta.real - totalMeta.meta))}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line-2">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, totalMetaPct))}%`, background: totalMetaOk ? GREEN : RED }}
            />
          </div>
        </div>
      )}

      {/* Barra de totales por año + distribución por UF */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Total por Año</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={years.map((y) => ({ year: String(y), total: totales[y] }))} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} tickFormatter={(v) => fmtVal(mode, v)} />
              <Tooltip formatter={(value: number) => fmtVal(mode, value)} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {years.map((y, i) => (
                  <Cell key={y} fill={YEAR_COLORS[i % YEAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Distribución por UF — {y2}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={ufs.map((u) => ({ name: u, value: valUf(u, y2) }))}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {ufs.map((u, i) => (
                  <Cell key={u} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [fmtVal(mode, value), name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla por UF */}
      <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          {mode === "val" ? "Valor" : "Frecuencias"} por UF — {years.join(", ")}
        </h2>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
              <th className="px-3 py-2">UF</th>
              {years.map((y) => (
                <th key={y} className="px-3 py-2 text-right">
                  {y}
                </th>
              ))}
              {twoOrMore &&
                years.slice(1).map((y, i) => (
                  <th key={`var-${y}`} className="px-3 py-2 text-right">
                    {String(years[i]).slice(2)}→{String(y).slice(2)}
                  </th>
                ))}
              {showMeta && (
                <>
                  <th className="px-3 py-2 text-right">Meta {y2} (+15%)</th>
                  <th className="px-3 py-2 text-right">% Avance</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {ufs.map((u) => {
              const vals = years.map((y) => {
                const v = valUf(u, y);
                totsUf[y] += v;
                return v;
              });
              const m = metaFor(u, y2);
              const pct = m.meta ? Math.round((100 * m.real) / m.meta) : 0;
              return (
                <tr key={u} className="border-b border-line-2">
                  <td className="px-3 py-2 font-medium text-navy">{u}</td>
                  {vals.map((v, i) => (
                    <td key={years[i]} className="whitespace-nowrap px-3 py-2 text-right">
                      {fmtVal(mode, v)}
                    </td>
                  ))}
                  {twoOrMore &&
                    vals.slice(1).map((v, i) => <PctPillCell key={`v-${years[i + 1]}`} before={vals[i]} after={v} />)}
                  {showMeta && (
                    <>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-ink-3">
                        {m.meta ? formatNumber(m.meta) : "—"}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2 text-right font-semibold"
                        style={{ color: !m.meta ? "#94A3B8" : pct >= 100 ? GREEN : RED }}
                      >
                        {m.meta ? `${pct}%` : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy font-bold text-navy">
              <td className="px-3 py-2">TOTAL</td>
              {years.map((y) => (
                <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                  {fmtVal(mode, totsUf[y])}
                </td>
              ))}
              {twoOrMore &&
                years.slice(1).map((y, i) => (
                  <PctPillCell key={`t-${y}`} before={totsUf[years[i]]} after={totsUf[y]} />
                ))}
              {showMeta && (
                <>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {totalMeta.meta ? formatNumber(totalMeta.meta) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right" style={{ color: totalMetaOk ? GREEN : RED }}>
                    {totalMeta.meta ? `${totalMetaPct}%` : "—"}
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
        {showMeta && (
          <p className="mt-3 text-xs text-ink-3">
            Meta = +15% sobre el mismo periodo del año anterior (calculada por el motor de Pedro, ya sin
            Mutual). % Avance = realizado ÷ meta.
          </p>
        )}
      </div>

      {/* Tabla por Empresa / Grupo */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          {mode === "val" ? "Valor" : "Frecuencias"} por Empresa {mutualIncluded ? "(Incluido Mutual)" : "(SIN Mutual)"} —{" "}
          {years.join(", ")}
        </h2>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
              <th className="px-3 py-2">Empresa</th>
              {years.map((y) => (
                <th key={y} className="px-3 py-2 text-right">
                  {y}
                </th>
              ))}
              {twoOrMore &&
                years.slice(1).map((y, i) => (
                  <th key={`gvar-${y}`} className="px-3 py-2 text-right">
                    {String(years[i]).slice(2)}→{String(y).slice(2)}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const vals = years.map((y) => {
                const v = valGrp(g, y);
                totsGrp[y] += v;
                return v;
              });
              if (!vals.some((v) => v > 0)) return null;
              return (
                <tr key={g} className="border-b border-line-2">
                  <td className="px-3 py-2 text-ink-2">{g}</td>
                  {vals.map((v, i) => (
                    <td key={years[i]} className="whitespace-nowrap px-3 py-2 text-right">
                      {fmtVal(mode, v)}
                    </td>
                  ))}
                  {twoOrMore &&
                    vals.slice(1).map((v, i) => <PctPillCell key={`gv-${years[i + 1]}`} before={vals[i]} after={v} />)}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy font-bold text-navy">
              <td className="px-3 py-2">TOTAL</td>
              {years.map((y) => (
                <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                  {fmtVal(mode, totsGrp[y])}
                </td>
              ))}
              {twoOrMore &&
                years.slice(1).map((y, i) => (
                  <PctPillCell key={`gt-${y}`} before={totsGrp[years[i]]} after={totsGrp[y]} />
                ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
