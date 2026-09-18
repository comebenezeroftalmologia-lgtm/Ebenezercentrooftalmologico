"use client";

import { Fragment, useMemo } from "react";
import type { FrecuenciaConteo, FrecuenciaMonthly } from "@/lib/types";
import { formatNumber } from "@/lib/text";
import { GREEN, MUTUAL_RE, RED, type Mode, fmtVal, pctPill } from "./shared";

function PctPillCell({ before, after }: { before: number; after: number }) {
  const { text, color } = pctPill(before, after);
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color }}>
      {text}
    </td>
  );
}

export function DetallePorEmpresa({
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
  const twoOrMore = years.length >= 2;
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

  function valUfEmp(uf: string, grupo: string, year: number): number {
    const months = monthsByYear.get(year) ?? [];
    return months.reduce((s, m) => {
      const r = index.get(`${year}|${m}|${uf}|${grupo}`);
      return s + (r ? r[valueKey] : 0);
    }, 0);
  }

  // meta granular (uf + grupo) del último año seleccionado — ya calculada
  // sin Mutual por el motor de Pedro.
  const metaByUfGrupo = useMemo(() => {
    const m = new Map<string, { real: number; meta: number }>();
    for (const r of metaRows) {
      if (r.uf === null || r.grupo === null || r.year !== y2) continue;
      const key = `${r.uf}|${r.grupo}`;
      const acc = m.get(key) ?? { real: 0, meta: 0 };
      acc.real += r.real;
      acc.meta += r.meta;
      m.set(key, acc);
    }
    return m;
  }, [metaRows, y2]);

  function metaFor(uf: string, grupo: string) {
    return metaByUfGrupo.get(`${uf}|${grupo}`) ?? { real: 0, meta: 0 };
  }

  const grandTot: Record<number, number> = {};
  years.forEach((y) => (grandTot[y] = 0));
  let grandMetaReal = 0;
  let grandMeta = 0;

  return (
    <div>
      <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          {mode === "val" ? "Valor" : "Frecuencias"} por UF y Empresa {mutualIncluded ? "(Incluido Mutual)" : "(SIN Mutual)"} —{" "}
          {years.join(", ")}
        </h2>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                <th className="sticky top-0 bg-white px-3 py-2">UF</th>
                <th className="sticky top-0 bg-white px-3 py-2">Empresa</th>
                {years.map((y) => (
                  <th key={y} className="sticky top-0 bg-white px-3 py-2 text-right">
                    {y}
                  </th>
                ))}
                {showMeta && (
                  <>
                    <th className="sticky top-0 bg-white px-3 py-2 text-right">Meta {y2} (+15%)</th>
                    <th className="sticky top-0 bg-white px-3 py-2 text-right">Falta</th>
                  </>
                )}
                {twoOrMore &&
                  years.slice(1).map((y, i) => (
                    <th key={`var-${y}`} className="sticky top-0 bg-white px-3 py-2 text-right">
                      {String(years[i]).slice(2)}→{String(y).slice(2)}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {ufs.map((u) => {
                const totalsUf: Record<number, number> = {};
                years.forEach((y) => (totalsUf[y] = 0));
                const filas = grupos
                  .map((g) => {
                    const vals = years.map((y) => valUfEmp(u, g, y));
                    if (!vals.some((v) => v > 0)) return null;
                    vals.forEach((v, i) => (totalsUf[years[i]] += v));
                    return { g, vals };
                  })
                  .filter(Boolean) as { g: string; vals: number[] }[];

                if (filas.length === 0) return null;
                years.forEach((y) => (grandTot[y] += totalsUf[y]));

                return (
                  <Fragment key={u}>
                    {filas.map(({ g, vals }) => {
                      const meta = metaFor(u, g);
                      if (showMeta) {
                        grandMetaReal += meta.real;
                        grandMeta += meta.meta;
                      }
                      const falta = Math.max(0, meta.meta - meta.real);
                      return (
                        <tr key={`${u}-${g}`} className="border-b border-line-2">
                          <td className="px-3 py-2 font-medium text-navy">{u}</td>
                          <td className="px-3 py-2 text-ink-2">{g}</td>
                          {vals.map((v, i) => (
                            <td key={years[i]} className="whitespace-nowrap px-3 py-2 text-right">
                              {fmtVal(mode, v)}
                            </td>
                          ))}
                          {showMeta && (
                            <>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-ink-3">
                                {meta.meta ? formatNumber(meta.meta) : "—"}
                              </td>
                              <td
                                className="whitespace-nowrap px-3 py-2 text-right font-semibold"
                                style={{ color: !meta.meta ? "#94A3B8" : falta > 0 ? RED : GREEN }}
                              >
                                {!meta.meta ? "—" : falta > 0 ? formatNumber(falta) : "✓"}
                              </td>
                            </>
                          )}
                          {twoOrMore &&
                            vals.slice(1).map((v, i) => (
                              <PctPillCell key={`v-${years[i + 1]}`} before={vals[i]} after={v} />
                            ))}
                        </tr>
                      );
                    })}
                    <tr className="bg-navy font-semibold text-white">
                      <td colSpan={2} className="px-3 py-1.5 tracking-wide">
                        ▶ TOTAL {u.toUpperCase()}
                      </td>
                      {years.map((y) => (
                        <td key={y} className="whitespace-nowrap px-3 py-1.5 text-right">
                          {fmtVal(mode, totalsUf[y])}
                        </td>
                      ))}
                      {showMeta && <td colSpan={2} />}
                      {twoOrMore &&
                        years.slice(1).map((y, i) => {
                          const { text, color } = pctPill(totalsUf[years[i]], totalsUf[y]);
                          return (
                            <td key={`tv-${y}`} className="whitespace-nowrap px-3 py-1.5 text-right" style={{ color }}>
                              {text}
                            </td>
                          );
                        })}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#0B1633] font-bold text-white">
                <td colSpan={2} className="px-3 py-2 tracking-wide">
                  TOTAL GENERAL
                </td>
                {years.map((y) => (
                  <td key={y} className="whitespace-nowrap px-3 py-2 text-right">
                    {fmtVal(mode, grandTot[y])}
                  </td>
                ))}
                {showMeta && (
                  <>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {grandMeta ? formatNumber(grandMeta) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {grandMeta ? formatNumber(Math.max(0, grandMeta - grandMetaReal)) : "—"}
                    </td>
                  </>
                )}
                {twoOrMore &&
                  years.slice(1).map((y, i) => {
                    const { text, color } = pctPill(grandTot[years[i]], grandTot[y]);
                    return (
                      <td key={`gv-${y}`} className="whitespace-nowrap px-3 py-2 text-right" style={{ color }}>
                        {text}
                      </td>
                    );
                  })}
              </tr>
            </tfoot>
          </table>
        </div>
        {showMeta && (
          <p className="mt-3 text-xs text-ink-3">
            Meta {y2} = +15% sobre el mismo periodo del año anterior, por Unidad Funcional y Empresa
            (calculada por el motor de Pedro, ya sin Mutual). Falta = lo que resta para la meta (✓ si ya
            se cumplió).
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-line bg-line-2 p-5 text-sm text-ink-3">
        Esta pestaña, en el tablero original, también incluye 4 tarjetas de "Cirugías/Consulta/Ayudas/
        Apoyo por Tipo de acto" y un comparativo "último mes completo vs. mes en curso, por día hábil".
        Esas dos piezas usan datos que todavía no sincronizamos hacia Supabase (el detalle por tipo de
        servicio y el detalle diario) — si los quieres aquí, hay que ampliar el pipeline de sincronización
        para traerlos.
      </div>
    </div>
  );
}
