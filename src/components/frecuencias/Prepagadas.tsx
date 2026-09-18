"use client";

import { useMemo, useState } from "react";
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
import type { FrecuenciaPrepagadaMensual, FrecuenciaPrepagadaRanking } from "@/lib/types";
import { MES_CORTO, MES_ORDEN, YEAR_COLORS, type Mode, fmtVal } from "./shared";

export function Prepagadas({
  mensual,
  ranking,
  years: selectedYears,
  mode,
}: {
  mensual: FrecuenciaPrepagadaMensual[];
  ranking: FrecuenciaPrepagadaRanking[];
  years: number[];
  mode: Mode;
}) {
  const years = selectedYears.slice().sort((a, b) => a - b);
  const y2 = years[years.length - 1];
  const valueKey: keyof Pick<FrecuenciaPrepagadaRanking, "freq" | "valor"> = mode === "val" ? "valor" : "freq";
  const [search, setSearch] = useState("");

  const mensualIndex = useMemo(() => {
    const m = new Map<string, FrecuenciaPrepagadaMensual>();
    for (const r of mensual) m.set(`${r.year}|${r.month_num}`, r);
    return m;
  }, [mensual]);

  const chartData = MES_ORDEN.map((mesNombre, idx) => {
    const monthNum = idx + 1;
    const row: Record<string, number | string | null> = { mes: MES_CORTO[mesNombre] };
    years.forEach((y) => {
      const r = mensualIndex.get(`${y}|${monthNum}`);
      const v = r ? r[mode === "val" ? "valor" : "freq"] : 0;
      row[String(y)] = v > 0 ? v : null;
    });
    return row;
  });

  const totalMensual: Record<number, number> = {};
  years.forEach((y) => {
    totalMensual[y] = mensual
      .filter((r) => r.year === y)
      .reduce((s, r) => s + (mode === "val" ? r.valor : r.freq), 0);
  });

  const top5 = ranking
    .filter((r) => r.year === y2)
    .slice()
    .sort((a, b) => b[valueKey] - a[valueKey])
    .slice(0, 5);

  const rankingFiltrado = ranking
    .filter((r) => r.year === y2)
    .filter((r) => (search ? r.contrato.toLowerCase().includes(search.toLowerCase()) : true))
    .slice()
    .sort((a, b) => b[valueKey] - a[valueKey]);

  return (
    <div>
      {/* KPI total por año */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {years.map((y) => (
          <div key={y} className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <p className="eb-label text-[11px] text-ink-3">Prepagadas · Año {y}</p>
            <p className="mt-1 font-heading text-3xl font-semibold text-navy">{fmtVal(mode, totalMensual[y] ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Top 5 Prepagadas — {y2}</h2>
          {top5.length === 0 ? (
            <p className="text-sm text-ink-3">Sin datos de ranking para {y2}.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={top5.map((r) => ({ label: r.contrato, valor: r[valueKey] }))}
                layout="vertical"
                margin={{ left: 24, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickFormatter={(v) => fmtVal(mode, v)} />
                <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => fmtVal(mode, value)} />
                <Bar dataKey="valor" fill="#0F2FF3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Evolución Mensual Prepagadas</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} tickFormatter={(v) => fmtVal(mode, v)} />
              <Tooltip formatter={(value: number, name: string) => [fmtVal(mode, value), name]} />
              <Legend />
              {years.map((y, i) => (
                <Bar key={y} dataKey={String(y)} name={`Año ${y}`} fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">Ranking de Prepagadas — {y2}</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-64 rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>
        {rankingFiltrado.length === 0 ? (
          <p className="text-sm text-ink-3">Sin resultados.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                  <th className="sticky top-0 bg-white px-3 py-2">Contrato / Entidad</th>
                  <th className="sticky top-0 bg-white px-3 py-2 text-right">Frecuencia</th>
                  <th className="sticky top-0 bg-white px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rankingFiltrado.map((r) => (
                  <tr key={r.contrato} className="border-b border-line-2">
                    <td className="px-3 py-2 text-ink">{r.contrato}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{r.freq.toLocaleString("es-CO")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{fmtVal("val", r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-line bg-line-2 p-5 text-sm text-ink-3">
        Esta pestaña, en el tablero original, también incluye el embudo del paciente nuevo (consulta →
        orden → realizado), el comparativo "órdenes vs. realizado" y un buscador de tarifas por
        contrato. Esos tres vienen vacíos incluso en el export automático que ya sincronizamos — no es
        que falte sincronizarlos, el motor de Pedro no los está calculando en la corrida programada
        (probablemente porque necesitan datos o permisos de API que solo están disponibles cuando él
        corre el proceso localmente).
      </div>
    </div>
  );
}
