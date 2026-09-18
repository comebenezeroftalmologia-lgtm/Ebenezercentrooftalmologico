"use client";

import { Fragment, useMemo, useState } from "react";
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
import { formatCOP, formatNumber } from "@/lib/text";

const MES_ORDEN = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
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
const MES_LARGO: Record<string, string> = {
  enero: "Enero",
  febrero: "Febrero",
  marzo: "Marzo",
  abril: "Abril",
  mayo: "Mayo",
  junio: "Junio",
  julio: "Julio",
  agosto: "Agosto",
  septiembre: "Septiembre",
  octubre: "Octubre",
  noviembre: "Noviembre",
  diciembre: "Diciembre",
};

const MUTUAL_RE = /MUTUAL/i;
const YEAR_COLORS = ["#B0C0D3", "#0F2FF3", "#21814B", "#F2994A", "#9B51E0"];
const GREEN = "#059669";
const RED = "#DC2626";

type Mode = "freq" | "val";

function fmtVal(mode: Mode, v: number): string {
  return mode === "val" ? formatCOP(v) : formatNumber(v);
}

function DeltaCell({ value, mode }: { value: number; mode: Mode }) {
  const color = value >= 0 ? GREEN : RED;
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color }}>
      {value >= 0 ? "+" : ""}
      {fmtVal(mode, value)}
    </td>
  );
}

function PctCell({ before, after }: { before: number; after: number }) {
  if (!before) {
    return (
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color: after ? GREEN : "#94A3B8" }}>
        {after ? "Nuevo" : "0%"}
      </td>
    );
  }
  const pct = ((after - before) / before) * 100;
  const color = pct >= 0 ? GREEN : RED;
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color }}>
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </td>
  );
}

export function ResumenComparativo({ rows }: { rows: FrecuenciaConteo[] }) {
  const allYears = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b), [rows]);
  const allUfs = useMemo(
    () => Array.from(new Set(rows.map((r) => r.uf))).sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );
  const allGrupos = useMemo(
    () => Array.from(new Set(rows.map((r) => r.grupo))).sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );

  const [selectedYears, setSelectedYears] = useState<number[]>(allYears);
  const [mutualIncluded, setMutualIncluded] = useState(true);
  const [mode, setMode] = useState<Mode>("freq");

  const years = (selectedYears.length ? selectedYears : allYears).slice().sort((a, b) => a - b);
  const grupos = allGrupos.filter((g) => mutualIncluded || !MUTUAL_RE.test(g));
  const ufs = allUfs;
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

  function valExact(uf: string, grupo: string, year: number, monthNum: number): number {
    const r = index.get(`${year}|${monthNum}|${uf}|${grupo}`);
    return r ? r[valueKey] : 0;
  }
  function valUfEmp(uf: string, grupo: string, year: number): number {
    const months = monthsByYear.get(year) ?? [];
    return months.reduce((s, m) => s + valExact(uf, grupo, year, m), 0);
  }
  function valUf(uf: string, year: number): number {
    return grupos.reduce((s, g) => s + valUfEmp(uf, g, year), 0);
  }
  function valGrp(grupo: string, year: number): number {
    return ufs.reduce((s, u) => s + valUfEmp(u, grupo, year), 0);
  }
  function totYear(year: number): number {
    return ufs.reduce((s, u) => s + valUf(u, year), 0);
  }
  function diasHabiles(year: number): number {
    const months = monthsByYear.get(year) ?? [];
    const total = months.reduce((s, m) => s + (diasHabilesByYearMonth.get(`${year}|${m}`) ?? 0), 0);
    return total || 1;
  }

  const y1 = years.length >= 2 ? years[years.length - 2] : years[0];
  const y2 = years[years.length - 1];
  const twoOrMore = years.length >= 2;

  function toggleYear(y: number) {
    setSelectedYears((prev) => {
      const has = prev.includes(y);
      if (has && prev.length === 1) return prev; // no dejar la selección vacía
      const next = has ? prev.filter((x) => x !== y) : [...prev, y];
      return next.sort((a, b) => a - b);
    });
  }

  // --- Mes a mes (años seleccionados) ---
  const mesesConDatos = useMemo(() => {
    const set = new Set<number>();
    years.forEach((y) => (monthsByYear.get(y) ?? []).forEach((m) => set.add(m)));
    return Array.from(set).sort((a, b) => a - b);
  }, [years, monthsByYear]);

  const dataMes = mesesConDatos
    .map((monthNum) => {
      const mesNombre = MES_ORDEN[monthNum - 1] ?? String(monthNum);
      const row: Record<string, number | string> = { monthNum, mes: mesNombre };
      years.forEach((y) => {
        row[String(y)] = ufs.reduce(
          (s, u) => s + grupos.reduce((ss, g) => ss + valExact(u, g, y, monthNum), 0),
          0,
        );
      });
      return row;
    })
    .filter((d) => years.some((y) => Number(d[String(y)]) > 0));

  const totales = { } as Record<number, number>;
  years.forEach((y) => (totales[y] = totYear(y)));

  const grand: Record<number, number> = {};
  years.forEach((y) => (grand[y] = 0));

  return (
    <div>
      {/* Barra de filtros del tablero */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-3">Años</span>
          {allYears.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => toggleYear(y)}
              className={`rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-eb-out ${
                years.includes(y)
                  ? "border-blue bg-blue text-white"
                  : "border-line bg-white text-ink-3 hover:border-navy-20"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">Mutual</span>
            <div className="inline-flex rounded-lg border border-line bg-line-2 p-1">
              <button
                type="button"
                onClick={() => setMutualIncluded(true)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-eb-out ${
                  mutualIncluded ? "bg-navy text-white" : "text-ink-3"
                }`}
              >
                Incluir
              </button>
              <button
                type="button"
                onClick={() => setMutualIncluded(false)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-eb-out ${
                  !mutualIncluded ? "bg-navy text-white" : "text-ink-3"
                }`}
              >
                Excluir
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">Mostrar como</span>
            <div className="inline-flex rounded-lg border border-line bg-line-2 p-1">
              <button
                type="button"
                onClick={() => setMode("freq")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-eb-out ${
                  mode === "freq" ? "bg-blue text-white" : "text-ink-3"
                }`}
              >
                Frecuencias
              </button>
              <button
                type="button"
                onClick={() => setMode("val")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-eb-out ${
                  mode === "val" ? "bg-blue text-white" : "text-ink-3"
                }`}
              >
                Pesos $
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mb-6 text-xs text-ink-3">
        Periodo: <strong className="text-ink">año completo</strong> · Comparación:{" "}
        <strong className="text-ink">{years.join(" vs ")}</strong> · Mutual:{" "}
        <strong className="text-ink">{mutualIncluded ? "Incluido" : "Excluido"}</strong> · Modo:{" "}
        <strong className="text-ink">{mode === "val" ? "Pesos $" : "Frecuencias"}</strong>
      </p>

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {years.map((y, i) => {
          const v = totales[y];
          const prevY = years[i - 1];
          const prom = v / diasHabiles(y);
          return (
            <div key={y} className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <p className="eb-label text-[11px] text-ink-3">
                {mode === "val" ? "Valor" : "Atenciones"} · Año {y}
              </p>
              <p className="mt-1 font-heading text-3xl font-semibold text-navy">{fmtVal(mode, v)}</p>
              <p className="mt-2 text-xs text-ink-3">
                {fmtVal(mode, prom)} {mode === "val" ? "facturados" : "atenciones"} por día hábil ·{" "}
                {diasHabiles(y)} días trabajados
              </p>
              {prevY !== undefined && (
                <p className="mt-1 text-xs font-semibold" style={{ color: v >= totales[prevY] ? GREEN : RED }}>
                  {v >= totales[prevY] ? "+" : ""}
                  {fmtVal(mode, v - totales[prevY])} vs. {prevY}
                </p>
              )}
            </div>
          );
        })}
        {twoOrMore && (
          <div className="rounded-xl border border-blue bg-blue-10 p-5 shadow-sm">
            <p className="eb-label text-[11px] text-ink-3">Diferencia</p>
            <p
              className="mt-1 font-heading text-3xl font-semibold"
              style={{ color: totales[y2] - totales[y1] >= 0 ? GREEN : RED }}
            >
              {totales[y2] - totales[y1] >= 0 ? "+" : ""}
              {fmtVal(mode, totales[y2] - totales[y1])}
            </p>
            <p className="mt-2 text-xs text-ink-3">
              {y1} → {y2}
            </p>
          </div>
        )}
      </div>

      {/* Barras horizontales por UF y por Empresa */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Por Unidad Funcional</h2>
          <ResponsiveContainer width="100%" height={Math.max(220, ufs.length * 56)}>
            <BarChart
              data={ufs.map((u) => ({
                label: u,
                ...(twoOrMore ? { [`Año ${y1}`]: valUf(u, y1) } : {}),
                [`Año ${y2}`]: valUf(u, y2),
              }))}
              layout="vertical"
              margin={{ left: 24, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickFormatter={(v) => fmtVal(mode, v)} />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number, name: string) => [fmtVal(mode, value), name]} />
              <Legend />
              {twoOrMore && <Bar dataKey={`Año ${y1}`} fill="#B0C0D3" radius={[0, 4, 4, 0]} />}
              <Bar dataKey={`Año ${y2}`} fill="#0F2FF3" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy">Por Empresa / Contrato</h2>
          <ResponsiveContainer width="100%" height={Math.max(220, grupos.length * 40)}>
            <BarChart
              data={grupos.map((g) => ({
                label: g,
                ...(twoOrMore ? { [`Año ${y1}`]: valGrp(g, y1) } : {}),
                [`Año ${y2}`]: valGrp(g, y2),
              }))}
              layout="vertical"
              margin={{ left: 24, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickFormatter={(v) => fmtVal(mode, v)} />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number, name: string) => [fmtVal(mode, value), name]} />
              <Legend />
              {twoOrMore && <Bar dataKey={`Año ${y1}`} fill="#B0C0D3" radius={[0, 4, 4, 0]} />}
              <Bar dataKey={`Año ${y2}`} fill="#0F2FF3" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla principal: UF x Empresa */}
      <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          {mode === "val" ? "Valor" : "Frecuencias"} por UF y Empresa {mutualIncluded ? "(Incluido Mutual)" : "(SIN Mutual)"} —{" "}
          {years.join(" vs ")}
        </h2>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
              <th className="px-3 py-2">UF / Empresa</th>
              {years.map((y) => (
                <th key={y} className="px-3 py-2 text-right">
                  Año {y}
                </th>
              ))}
              {twoOrMore && (
                <>
                  <th className="px-3 py-2 text-right">
                    Dif. {String(y1).slice(2)}→{String(y2).slice(2)}
                  </th>
                  <th className="px-3 py-2 text-right">
                    % Var {String(y1).slice(2)}→{String(y2).slice(2)}
                  </th>
                </>
              )}
              <th className="px-3 py-2 text-right">÷día {y2}</th>
            </tr>
          </thead>
          <tbody>
            {ufs.map((u) => {
              const tBy: Record<number, number> = {};
              years.forEach((y) => {
                tBy[y] = valUf(u, y);
                grand[y] += tBy[y];
              });
              return (
                <Fragment key={u}>
                  <tr className="border-b border-line-2 bg-line-2 font-semibold text-navy">
                    <td className="px-3 py-2">{u}</td>
                    {years.map((y) => (
                      <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                        {fmtVal(mode, tBy[y])}
                      </td>
                    ))}
                    {twoOrMore && (
                      <>
                        <DeltaCell value={tBy[y2] - tBy[y1]} mode={mode} />
                        <PctCell before={tBy[y1]} after={tBy[y2]} />
                      </>
                    )}
                    <td className="whitespace-nowrap px-3 py-2 text-right text-blue">
                      {fmtVal(mode, tBy[y2] / diasHabiles(y2))}
                    </td>
                  </tr>
                  {grupos.map((g) => {
                    const vBy: Record<number, number> = {};
                    years.forEach((y) => (vBy[y] = valUfEmp(u, g, y)));
                    if (!Object.values(vBy).some((v) => v > 0)) return null;
                    return (
                      <tr key={`${u}-${g}`} className="border-b border-line-2">
                        <td className="px-3 py-2 pl-6 text-ink-2">{g}</td>
                        {years.map((y) => (
                          <td key={y} className="whitespace-nowrap px-3 py-2 text-right text-ink">
                            {fmtVal(mode, vBy[y])}
                          </td>
                        ))}
                        {twoOrMore && (
                          <>
                            <DeltaCell value={vBy[y2] - vBy[y1]} mode={mode} />
                            <PctCell before={vBy[y1]} after={vBy[y2]} />
                          </>
                        )}
                        <td className="whitespace-nowrap px-3 py-2 text-right text-ink-3">
                          {fmtVal(mode, vBy[y2] / diasHabiles(y2))}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy font-bold text-navy">
              <td className="px-3 py-2">TOTAL</td>
              {years.map((y) => (
                <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                  {fmtVal(mode, grand[y])}
                </td>
              ))}
              {twoOrMore && (
                <>
                  <DeltaCell value={grand[y2] - grand[y1]} mode={mode} />
                  <PctCell before={grand[y1]} after={grand[y2]} />
                </>
              )}
              <td className="whitespace-nowrap px-3 py-2 text-right">{fmtVal(mode, grand[y2] / diasHabiles(y2))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Comparativo mes a mes */}
      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Comparativo Mes a Mes</h2>
        {dataMes.length === 0 ? (
          <p className="text-sm text-ink-3">Sin datos para los años seleccionados.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataMes.map((d) => ({ ...d, mesCorto: MES_CORTO[String(d.mes)] ?? d.mes }))} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mesCorto" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} tickFormatter={(v) => fmtVal(mode, v)} />
                <Tooltip formatter={(value: number, name: string) => [fmtVal(mode, value), name]} />
                <Legend />
                {years.map((y, i) => (
                  <Bar key={y} dataKey={String(y)} name={`Año ${y}`} fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                    <th className="px-3 py-2">Mes</th>
                    {years.map((y) => (
                      <th key={y} className="px-3 py-2 text-right">
                        {y}
                      </th>
                    ))}
                    {twoOrMore && (
                      <>
                        <th className="px-3 py-2 text-right">
                          Dif. {String(y1).slice(2)}→{String(y2).slice(2)}
                        </th>
                        <th className="px-3 py-2 text-right">
                          % Var {String(y1).slice(2)}→{String(y2).slice(2)}
                        </th>
                      </>
                    )}
                    <th className="px-3 py-2 text-right">÷día {y2}</th>
                  </tr>
                </thead>
                <tbody>
                  {dataMes.map((d) => {
                    const monthNum = Number(d.monthNum);
                    const v2 = Number(d[String(y2)] ?? 0);
                    const v1 = Number(d[String(y1)] ?? 0);
                    const hasY2 = v2 > 0;
                    const dh = diasHabilesByYearMonth.get(`${y2}|${monthNum}`) ?? 1;
                    return (
                      <tr key={monthNum} className="border-b border-line-2">
                        <td className="px-3 py-2">{MES_LARGO[String(d.mes)] ?? d.mes}</td>
                        {years.map((y) => (
                          <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                            {fmtVal(mode, Number(d[String(y)] ?? 0))}
                          </td>
                        ))}
                        {twoOrMore &&
                          (hasY2 ? (
                            <>
                              <DeltaCell value={v2 - v1} mode={mode} />
                              <PctCell before={v1} after={v2} />
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-right text-line">—</td>
                              <td className="px-3 py-2 text-right text-line">—</td>
                            </>
                          ))}
                        <td className="whitespace-nowrap px-3 py-2 text-right text-blue">
                          {hasY2 ? fmtVal(mode, v2 / dh) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
