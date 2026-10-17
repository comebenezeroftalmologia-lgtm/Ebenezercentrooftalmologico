"use client";

import { useMemo, useState } from "react";
import { BarChart2, Calendar } from "lucide-react";
import { formatNumber } from "@/lib/text";

export type OrdenadoRealizadoItem = {
  createdAt: string;
  realizada: boolean;
  abierta: boolean;
};

type ModoAgrupacion = "auto" | "mes" | "semana" | "dia";

const MESES_CORTO = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function parseIsoDate(raw: string): Date {
  const clean = raw.slice(0, 10);
  const d = new Date(clean + "T12:00:00");
  return isNaN(d.getTime()) ? new Date(raw) : d;
}

export function OrdenadosVsRealizadosChart({
  items,
  from,
  to,
  tituloTipo,
}: {
  items: OrdenadoRealizadoItem[];
  from: string;
  to: string;
  tituloTipo: string;
}) {
  const [modo, setModo] = useState<ModoAgrupacion>("auto");

  const { buckets, modoEfectivo, totalOrdenados, totalRealizados, totalAbiertas } = useMemo(() => {
    const dFrom = parseIsoDate(from);
    const dTo = parseIsoDate(to);
    const diffDays = Math.max(
      1,
      Math.round((dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24))
    );

    const eff: "mes" | "semana" | "dia" =
      modo !== "auto"
        ? modo
        : diffDays > 65
        ? "mes"
        : diffDays > 16
        ? "semana"
        : "dia";

    const map = new Map<
      string,
      { key: string; label: string; sortKey: number; ordenados: number; realizados: number }
    >();

    for (const item of items) {
      const dt = parseIsoDate(item.createdAt);
      if (isNaN(dt.getTime())) continue;

      let key = "";
      let label = "";
      let sortKey = dt.getTime();

      if (eff === "mes") {
        const y = dt.getFullYear();
        const m = dt.getMonth();
        key = `${y}-${String(m + 1).padStart(2, "0")}`;
        label = `${MESES_CORTO[m]} ${String(y).slice(-2)}`;
        sortKey = y * 100 + m;
      } else if (eff === "semana") {
        const day = dt.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(dt);
        monday.setDate(dt.getDate() + diffToMonday);
        monday.setHours(12, 0, 0, 0);
        const y = monday.getFullYear();
        const m = monday.getMonth();
        const dNum = monday.getDate();
        key = `${y}-${String(m + 1).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
        label = `${dNum} ${MESES_CORTO[m].toLowerCase()}`;
        sortKey = monday.getTime();
      } else {
        const y = dt.getFullYear();
        const m = dt.getMonth();
        const dNum = dt.getDate();
        key = `${y}-${String(m + 1).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
        label = `${dNum} ${MESES_CORTO[m].toLowerCase()}`;
        sortKey = new Date(y, m, dNum).getTime();
      }

      const prev = map.get(key) ?? {
        key,
        label,
        sortKey,
        ordenados: 0,
        realizados: 0,
      };
      prev.ordenados += 1;
      if (item.realizada) {
        prev.realizados += 1;
      }
      map.set(key, prev);
    }

    const sorted = Array.from(map.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-12)
      .map((b) => ({
        ...b,
        pct: b.ordenados > 0 ? Math.round((b.realizados / b.ordenados) * 100) : 0,
      }));

    const totOrd = items.length;
    const totReal = items.filter((i) => i.realizada).length;
    const totAb = items.filter((i) => i.abierta && !i.realizada).length;

    return {
      buckets: sorted,
      modoEfectivo: eff,
      totalOrdenados: totOrd,
      totalRealizados: totReal,
      totalAbiertas: totAb,
    };
  }, [items, from, to, modo]);

  const tasaGlobal =
    totalOrdenados > 0 ? ((totalRealizados / totalOrdenados) * 100).toFixed(1).replace(".", ",") : "0,0";
  const pctAbiertas =
    totalOrdenados > 0 ? ((totalAbiertas / totalOrdenados) * 100).toFixed(1).replace(".", ",") : "0,0";

  const maxEscala = useMemo(() => {
    if (!buckets.length) return 10;
    const m = Math.max(...buckets.map((b) => Math.max(b.ordenados, b.realizados)), 1);
    return Math.ceil(m * 1.15);
  }, [buckets]);

  return (
    <section className="mb-7 rounded-[18px] border border-[#DCE8F8] border-l-[4px] border-l-[#2563EB] bg-white p-5 shadow-[0_8px_24px_-10px_rgba(14,36,94,0.10)]">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EBF3FE] text-[#1D58D8]">
            <BarChart2 className="h-[18px] w-[18px]" strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="text-[15.5px] font-extrabold tracking-[-0.015em] text-[#0E245E]">
              Ordenados vs. Realizados por Período · {tituloTipo}
            </h2>
            <p className="text-[11.5px] font-medium text-[#64748B]">
              Comparativo de órdenes emitidas frente a procedimientos efectivos y tasa de conversión ({modoEfectivo === "mes" ? "mensual" : modoEfectivo === "semana" ? "semanal" : "diario"})
            </p>
          </div>
        </div>

        {/* Selector de agrupación temporal */}
        <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#DCE7F7] bg-[#F8FAFE] p-1">
          <Calendar className="ml-2 mr-1 h-3.5 w-3.5 text-[#2563EB]" strokeWidth={2} />
          {(
            [
              { id: "auto", label: "Auto" },
              { id: "mes", label: "Por Mes" },
              { id: "semana", label: "Por Semana" },
              { id: "dia", label: "Por Día" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setModo(opt.id)}
              className={`rounded-[7px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                modo === opt.id
                  ? "bg-[#1D58D8] text-white shadow-sm"
                  : "text-[#475569] hover:bg-white hover:text-[#0E245E]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cintillo ejecutivo de 3 indicadores (Opción 3) */}
      <div className="mt-3.5 grid grid-cols-1 divide-y divide-[#D5E3F7] rounded-[11px] border border-[#DCE8FA] bg-gradient-to-r from-[#EDF4FE] via-[#F5F9FF] to-[#EDF4FE] px-4 py-2.5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-start sm:py-0 sm:pr-4">
          <span className="text-[12px] font-medium text-[#475569]">Total Ordenados (Período):</span>
          <span className="text-[14px] font-extrabold tabular-nums text-[#0E245E]">
            {formatNumber(totalOrdenados)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-center sm:py-0 sm:px-4">
          <span className="text-[12px] font-medium text-[#475569]">Total Realizados (Efectivos):</span>
          <span className="inline-flex items-center gap-1.5 text-[14px] font-extrabold tabular-nums text-[#0E245E]">
            {formatNumber(totalRealizados)}
            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#15803D]">
              {tasaGlobal}% conversión
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 sm:justify-end sm:py-0 sm:pl-4">
          <span className="text-[12px] font-medium text-[#475569]">En Gestión / Pendientes:</span>
          <span className="inline-flex items-center gap-1.5 text-[14px] font-extrabold tabular-nums text-[#1D4ED8]">
            {formatNumber(totalAbiertas)}
            <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold text-[#B45309]">
              {pctAbiertas}% por captar
            </span>
          </span>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] font-semibold text-[#475569]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-gradient-to-b from-[#6EA2F7] to-[#AFCBFA]" />
            Ordenados (Emitidos)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-gradient-to-b from-[#1D4ED8] to-[#2563EB]" />
            Realizados (Ganadas + Programación)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block rounded-full border border-[#93C5FD] bg-[#F4F8FF] px-1.5 py-0.2 text-[10px] font-extrabold text-[#1D4ED8]">
              %
            </span>
            Tasa de conversión del período
          </span>
        </div>
      </div>

      {/* Cuerpo de la gráfica comparativa */}
      {buckets.length === 0 ? (
        <div className="mt-4 flex h-[180px] items-center justify-center rounded-[12px] border border-dashed border-[#CBD9EE] bg-[#F8FAFE] text-[13px] font-medium text-[#64748B]">
          No hay órdenes registradas en el rango seleccionado.
        </div>
      ) : (
        <div className="relative mt-4 flex gap-3 pt-4">
          {/* Eje Y */}
          <div className="flex h-[196px] flex-col justify-between pb-6 pr-1 text-right text-[11px] font-medium tabular-nums text-[#64748B]">
            <span>{formatNumber(maxEscala)}</span>
            <span>{formatNumber(Math.round(maxEscala * 0.75))}</span>
            <span>{formatNumber(Math.round(maxEscala * 0.5))}</span>
            <span>{formatNumber(Math.round(maxEscala * 0.25))}</span>
            <span>0</span>
          </div>

          {/* Lienzo de barras dobles */}
          <div className="relative flex-1">
            {/* Líneas guía */}
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
              <div className="border-b border-dashed border-[#E8EFFA]" />
              <div className="border-b border-dashed border-[#E8EFFA]" />
              <div className="border-b border-dashed border-[#E8EFFA]" />
              <div className="border-b border-dashed border-[#E8EFFA]" />
              <div className="border-b border-[#DCE7F7]" />
            </div>

            {/* Onda suave de área en el fondo */}
            <div className="pointer-events-none absolute inset-x-0 top-4 bottom-6 z-0 overflow-hidden">
              <svg
                className="h-full w-full"
                viewBox="0 0 700 160"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="eb-ovr-wave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 100 C 60 85, 120 92, 180 72 C 240 52, 300 78, 360 64 C 420 50, 480 68, 540 46 C 600 28, 650 38, 700 30 L 700 160 L 0 160 Z"
                  fill="url(#eb-ovr-wave)"
                />
              </svg>
            </div>

            <div
              className="relative z-10 grid h-[196px] items-end gap-2 sm:gap-3"
              style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
            >
              {buckets.map((b) => {
                const hOrd = Math.max(8, Math.round((b.ordenados / maxEscala) * 136));
                const hReal =
                  b.realizados > 0
                    ? Math.max(8, Math.round((b.realizados / maxEscala) * 136))
                    : 3;

                return (
                  <div
                    key={b.key}
                    title={`${b.label}: ${formatNumber(b.ordenados)} ordenados · ${formatNumber(b.realizados)} realizados (${b.pct}%)`}
                    className="group flex h-full flex-col items-center justify-end"
                  >
                    {/* Cápsula superior con % de conversión */}
                    <span className="mb-1.5 rounded-full border border-[#BFDBFE] bg-[#F4F8FF] px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-[#1D4ED8] shadow-[0_2px_6px_rgba(29,78,216,0.10)]">
                      {b.pct}%
                    </span>

                    {/* Par de barras: Ordenados (izq) vs Realizados (der) */}
                    <div className="flex w-full flex-1 items-end justify-center gap-1 pb-1.5 sm:gap-1.5">
                      {/* Barra Ordenados */}
                      <div className="flex flex-col items-center justify-end">
                        <span className="mb-0.5 text-[9.5px] font-bold tabular-nums text-[#475569]">
                          {formatNumber(b.ordenados)}
                        </span>
                        <div
                          style={{
                            height: `${hOrd}px`,
                            background: "linear-gradient(180deg, #6EA2F7 0%, #AFCBFA 100%)",
                          }}
                          className="w-[14px] rounded-t-[5px] transition-all group-hover:brightness-95 sm:w-[18px]"
                        />
                      </div>

                      {/* Barra Realizados */}
                      <div className="flex flex-col items-center justify-end">
                        <span className="mb-0.5 text-[9.5px] font-extrabold tabular-nums text-[#0E245E]">
                          {formatNumber(b.realizados)}
                        </span>
                        <div
                          style={{
                            height: `${hReal}px`,
                            background: "linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)",
                          }}
                          className="w-[14px] rounded-t-[5px] shadow-[0_4px_10px_rgba(29,78,216,0.28)] transition-all group-hover:brightness-105 sm:w-[18px]"
                        />
                      </div>
                    </div>

                    {/* Etiqueta del período */}
                    <span className="h-5 truncate pt-1 text-[10.5px] font-bold text-[#334155]">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}