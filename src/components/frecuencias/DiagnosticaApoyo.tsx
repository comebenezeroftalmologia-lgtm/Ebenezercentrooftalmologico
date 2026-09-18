"use client";

import { useMemo } from "react";
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
import type { FrecuenciaConteo } from "@/lib/types";
import { MES_CORTO, MES_ORDEN, MUTUAL_RE, YEAR_COLORS, type Mode, fmtVal, pctPill } from "./shared";

const UFS_TAB = ["Ayuda Diagnostica", "Apoyo Terapeutico"] as const;

export function DiagnosticaApoyo({
  rows,
  years: selectedYears,
  mutualIncluded,
  mode,
}: {
  rows: FrecuenciaConteo[];
  years: number[];
  mutualIncluded: boolean;
  mode: Mode;
}) {
  const years = selectedYears.slice().sort((a, b) => a - b);
  const y2 = years[years.length - 1];
  const valueKey: keyof Pick<FrecuenciaConteo, "cantidad" | "valor"> = mode === "val" ? "valor" : "cantidad";

  const allGrupos = useMemo(
    () => Array.from(new Set(rows.map((r) => r.grupo))).sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );
  const grupos = allGrupos.filter((g) => mutualIncluded || !MUTUAL_RE.test(g));

  const index = useMemo(() => {
    const m = new Map<string, FrecuenciaConteo>();
    for (const r of rows) m.set(`${r.year}|${r.month_num}|${r.uf}|${r.grupo}`, r);
    return m;
  }, [rows]);

  function valYM(uf: string, year: number, monthNum: number): number {
    return grupos.reduce((s, g) => {
      const r = index.get(`${year}|${monthNum}|${uf}|${g}`);
      return s + (r ? r[valueKey] : 0);
    }, 0);
  }
  function valYear(uf: string, year: number): number {
    return MES_ORDEN.reduce((s, _m, idx) => s + valYM(uf, year, idx + 1), 0);
  }

  return (
    <div>
      {UFS_TAB.map((uf) => {
        const chartData = MES_ORDEN.map((mesNombre, idx) => {
          const monthNum = idx + 1;
          const row: Record<string, number | string | null> = { mes: MES_CORTO[mesNombre] };
          years.forEach((y) => {
            const v = valYM(uf, y, monthNum);
            row[String(y)] = v > 0 ? v : null;
          });
          return row;
        });

        // Tabla por empresa x mes — solo el último año seleccionado, igual que el original.
        const gruposConDatos = grupos.filter((g) =>
          MES_ORDEN.some((_m, idx) => {
            const r = index.get(`${y2}|${idx + 1}|${uf}|${g}`);
            return r && r[valueKey] > 0;
          }),
        );

        return (
          <div key={uf} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-navy">{uf}</h2>

            {/* KPI por año */}
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {years.map((y, i) => {
                const v = valYear(uf, y);
                const prevY = years[i - 1];
                const pill = prevY !== undefined ? pctPill(valYear(uf, prevY), v) : null;
                return (
                  <div key={y} className="rounded-xl border border-line bg-white p-5 shadow-sm">
                    <p className="eb-label text-[11px] text-ink-3">
                      {uf} · {y}
                    </p>
                    <p className="mt-1 font-heading text-3xl font-semibold text-navy">{fmtVal(mode, v)}</p>
                    {pill && (
                      <p className="mt-2 text-xs font-semibold" style={{ color: pill.color }}>
                        {pill.text} vs. {prevY}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Gráfico mensual */}
            <div className="mb-4 rounded-xl border border-line bg-white p-6 shadow-sm">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} tickFormatter={(v) => fmtVal(mode, v)} />
                  <Tooltip formatter={(value: number, name: string) => [fmtVal(mode, value), name]} />
                  <Legend />
                  {years.map((y, i) => (
                    <Bar key={y} dataKey={String(y)} name={`${y}`} fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla por Empresa y Mes (último año seleccionado) */}
            <div className="overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-ink-3">
                Por Empresa y Mes — {y2}
              </h3>
              {gruposConDatos.length === 0 ? (
                <p className="text-sm text-ink-3">Sin datos para {y2}.</p>
              ) : (
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                      <th className="px-3 py-2">Empresa</th>
                      {MES_ORDEN.map((m) => (
                        <th key={m} className="px-3 py-2 text-right">
                          {MES_CORTO[m]}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right">TOTAL {y2}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruposConDatos.map((g) => {
                      const vals = MES_ORDEN.map((_m, idx) => {
                        const r = index.get(`${y2}|${idx + 1}|${uf}|${g}`);
                        return r ? r[valueKey] : 0;
                      });
                      const tot = vals.reduce((s, v) => s + v, 0);
                      return (
                        <tr key={g} className="border-b border-line-2">
                          <td className="px-3 py-2 text-ink">{g}</td>
                          {vals.map((v, i) => (
                            <td key={i} className="whitespace-nowrap px-3 py-2 text-right">
                              {v ? fmtVal(mode, v) : "—"}
                            </td>
                          ))}
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-blue">
                            {fmtVal(mode, tot)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-navy font-bold text-navy">
                      <td className="px-3 py-2">TOTAL</td>
                      {MES_ORDEN.map((_m, idx) => {
                        const v = valYM(uf, y2, idx + 1);
                        return (
                          <td key={idx} className="whitespace-nowrap px-3 py-2 text-right">
                            {v ? fmtVal(mode, v) : "—"}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-3 py-2 text-right">{fmtVal(mode, valYear(uf, y2))}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
