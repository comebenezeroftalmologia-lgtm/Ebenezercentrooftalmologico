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
import type { FrecuenciaMedicoMensual } from "@/lib/types";
import { MES_CORTO, MES_LARGO, MES_ORDEN, YEAR_COLORS, type Mode, fmtVal } from "./shared";

export function Medicos({
  rows,
  years: selectedYears,
  mutualIncluded,
  mode,
}: {
  rows: FrecuenciaMedicoMensual[];
  years: number[];
  mutualIncluded: boolean;
  mode: Mode;
}) {
  const years = selectedYears.slice().sort((a, b) => a - b);
  const y2 = years[years.length - 1];
  const valueKey: keyof Pick<FrecuenciaMedicoMensual, "cantidad" | "valor"> = mode === "val" ? "valor" : "cantidad";
  const [search, setSearch] = useState("");
  const [selectedMedico, setSelectedMedico] = useState<string | null>(null);

  // "Sede 2" es donde se atiende Mutual — el toggle global decide si entra.
  const visibleRows = useMemo(
    () => rows.filter((r) => mutualIncluded || r.sede !== "Sede 2"),
    [rows, mutualIncluded],
  );

  const index = useMemo(() => {
    const m = new Map<string, FrecuenciaMedicoMensual[]>();
    for (const r of visibleRows) {
      const key = `${r.medico}|${r.year}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [visibleRows]);

  function totalFor(medico: string, year: number): number {
    return (index.get(`${medico}|${year}`) ?? []).reduce((s, r) => s + r[valueKey], 0);
  }

  const allMedicos = useMemo(() => Array.from(new Set(visibleRows.map((r) => r.medico))), [visibleRows]);

  const ranking = allMedicos
    .map((medico) => ({ medico, total: totalFor(medico, y2) }))
    .filter((r) => r.total > 0)
    .filter((r) => (search ? r.medico.toLowerCase().includes(search.toLowerCase()) : true))
    .sort((a, b) => b.total - a.total);

  // --- Detalle del médico seleccionado ---
  const detalle = useMemo(() => {
    if (!selectedMedico) return null;
    const rowsMed = visibleRows.filter((r) => r.medico === selectedMedico);
    if (rowsMed.length === 0) return null;

    const porUf = new Map<string, number>();
    const porMesYear = new Map<string, number>(); // `${year}|${monthNum}`
    for (const r of rowsMed) {
      if (r.year !== y2) continue;
      porUf.set(r.uf, (porUf.get(r.uf) ?? 0) + r[valueKey]);
    }
    for (const r of rowsMed) {
      const key = `${r.year}|${r.month_num}`;
      porMesYear.set(key, (porMesYear.get(key) ?? 0) + r[valueKey]);
    }

    const totalY2 = Array.from(porUf.values()).reduce((s, v) => s + v, 0);
    let ufPrincipal = "—";
    let ufPrincipalV = -1;
    for (const [uf, v] of porUf.entries()) {
      if (v > ufPrincipalV) {
        ufPrincipalV = v;
        ufPrincipal = uf;
      }
    }

    let mesActivo = "—";
    let mesActivoV = -1;
    for (const [idx, mesNombre] of MES_ORDEN.entries()) {
      const v = porMesYear.get(`${y2}|${idx + 1}`) ?? 0;
      if (v > mesActivoV) {
        mesActivoV = v;
        mesActivo = mesNombre;
      }
    }

    const chartData = MES_ORDEN.map((mesNombre, idx) => {
      const monthNum = idx + 1;
      const row: Record<string, number | string | null> = { mes: MES_CORTO[mesNombre] };
      years.forEach((y) => {
        const v = porMesYear.get(`${y}|${monthNum}`) ?? 0;
        row[String(y)] = v > 0 ? v : null;
      });
      return row;
    });

    const ufRows = Array.from(porUf.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    return { totalY2, ufPrincipal, ufPrincipalV, mesActivo, mesActivoV, chartData, ufRows };
  }, [selectedMedico, visibleRows, y2, years, valueKey]);

  return (
    <div>
      <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">Ranking de Médicos — {y2}</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar médico..."
            className="w-64 rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>
        {ranking.length === 0 ? (
          <p className="text-sm text-ink-3">Sin resultados.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                  <th className="sticky top-0 bg-white px-3 py-2">Médico</th>
                  <th className="sticky top-0 bg-white px-3 py-2 text-right">
                    {mode === "val" ? "Valor" : "Frecuencia"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr
                    key={r.medico}
                    onClick={() => setSelectedMedico(r.medico === selectedMedico ? null : r.medico)}
                    className={`cursor-pointer border-b border-line-2 transition-colors duration-150 ease-eb-out hover:bg-blue-10 ${
                      r.medico === selectedMedico ? "bg-blue-10" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-navy">{r.medico}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{fmtVal(mode, r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedMedico && detalle && (
        <div className="rounded-xl border-2 border-blue bg-white p-6 shadow-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy">
              Detalle de {selectedMedico} — {y2}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedMedico(null)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-3 hover:border-navy-20"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-line-2 p-4">
              <p className="eb-label text-[11px] text-ink-3">Total servicios</p>
              <p className="mt-1 text-2xl font-bold text-navy">{fmtVal(mode, detalle.totalY2)}</p>
            </div>
            <div className="rounded-xl border border-line bg-line-2 p-4">
              <p className="eb-label text-[11px] text-ink-3">Servicio principal</p>
              <p className="mt-1 text-lg font-bold text-navy">{detalle.ufPrincipal}</p>
              <p className="text-xs text-ink-3">
                {fmtVal(mode, Math.max(detalle.ufPrincipalV, 0))} ·{" "}
                {detalle.totalY2 ? ((Math.max(detalle.ufPrincipalV, 0) * 100) / detalle.totalY2).toFixed(0) : 0}%
              </p>
            </div>
            <div className="rounded-xl border border-line bg-line-2 p-4">
              <p className="eb-label text-[11px] text-ink-3">Mes más activo</p>
              <p className="mt-1 text-lg font-bold text-navy">{MES_LARGO[detalle.mesActivo] ?? detalle.mesActivo}</p>
              <p className="text-xs text-ink-3">{fmtVal(mode, Math.max(detalle.mesActivoV, 0))} servicios</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-line p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-3">Comparativo mes a mes — año vs año</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={detalle.chartData} margin={{ left: 8, right: 16 }}>
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

          <div className="rounded-xl border border-line p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-3">Por servicio — {y2}</h3>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {detalle.ufRows.map(([uf, v]) => (
                  <tr key={uf} className="border-b border-line-2">
                    <td className="px-3 py-2 text-ink">{uf}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-navy">{fmtVal(mode, v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-dashed border-line bg-line-2 p-5 text-sm text-ink-3">
        Esta pestaña, en el tablero original, también desglosa cada médico por tipo de consulta
        (Primera vez / Control / Otros) y muestra órdenes pendientes por médico. Esos dos quedan para
        una siguiente vuelta si los necesitas — no requieren datos nuevos, solo ampliar la ingesta que
        ya existe.
      </div>
    </div>
  );
}
