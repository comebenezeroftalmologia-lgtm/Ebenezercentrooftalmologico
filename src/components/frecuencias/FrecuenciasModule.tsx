"use client";

import { useMemo, useState } from "react";
import type {
  FrecuenciaCobrableMensual,
  FrecuenciaConteo,
  FrecuenciaMedicoMensual,
  FrecuenciaMonthly,
  FrecuenciaPrepagadaMensual,
  FrecuenciaPrepagadaRanking,
} from "@/lib/types";
import { CobrableVsNo } from "./CobrableVsNo";
import { ComparativoAnual } from "./ComparativoAnual";
import { DetallePorEmpresa } from "./DetallePorEmpresa";
import { DiagnosticaApoyo } from "./DiagnosticaApoyo";
import { Medicos } from "./Medicos";
import { Prepagadas } from "./Prepagadas";
import { ResumenComparativo } from "./ResumenComparativo";
import { TendenciaMensual } from "./TendenciaMensual";
import type { Mode } from "./shared";

const TABS = [
  { key: "resumen", label: "Resumen Comparativo", enabled: true },
  { key: "anual", label: "Comparativo Anual", enabled: true },
  { key: "tendencia", label: "Tendencia Mensual", enabled: true },
  { key: "detalle", label: "Detalle por Empresa", enabled: true },
  { key: "prep", label: "Prepagadas", enabled: true },
  { key: "dxapoyo", label: "Diagnóstica y Apoyo", enabled: true },
  { key: "medicos", label: "Médicos", enabled: true },
  { key: "cobrable", label: "Cobrable vs No", enabled: true },
  { key: "mutual", label: "Contrato Mutual", enabled: false },
  { key: "servicio", label: "Buscar Servicio", enabled: false },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FrecuenciasModule({
  rows,
  metaRows,
  metaDetalleRows,
  prepagadasMensual,
  prepagadasRanking,
  medicosRows,
  cobrableRows,
}: {
  rows: FrecuenciaConteo[];
  metaRows: FrecuenciaMonthly[];
  metaDetalleRows: FrecuenciaMonthly[];
  prepagadasMensual: FrecuenciaPrepagadaMensual[];
  prepagadasRanking: FrecuenciaPrepagadaRanking[];
  medicosRows: FrecuenciaMedicoMensual[];
  cobrableRows: FrecuenciaCobrableMensual[];
}) {
  const allYears = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b), [rows]);

  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const [selectedYears, setSelectedYears] = useState<number[]>(allYears);
  const [mutualIncluded, setMutualIncluded] = useState(true);
  const [mode, setMode] = useState<Mode>("freq");

  const years = selectedYears.length ? selectedYears : allYears;

  function toggleYear(y: number) {
    setSelectedYears((prev) => {
      const has = prev.includes(y);
      if (has && prev.length === 1) return prev; // no dejar la selección vacía
      const next = has ? prev.filter((x) => x !== y) : [...prev, y];
      return next.sort((a, b) => a - b);
    });
  }

  return (
    <div>
      {/* Pestañas */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-line pb-3">
        {TABS.map((tab) =>
          tab.enabled ? (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-eb-out ${
                activeTab === tab.key
                  ? "border-blue bg-blue text-white"
                  : "border-line bg-white text-ink hover:border-navy-20"
              }`}
            >
              {tab.label}
            </button>
          ) : (
            <span
              key={tab.key}
              title="Próximamente"
              className="cursor-not-allowed rounded-pill border border-line bg-line-2 px-4 py-2 text-sm font-medium text-ink-3"
            >
              {tab.label}
            </span>
          ),
        )}
      </div>

      {/* Barra de filtros — compartida entre pestañas, igual que el tablero original */}
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
        Comparación: <strong className="text-ink">{years.slice().sort((a, b) => a - b).join(" vs ")}</strong> ·
        Mutual: <strong className="text-ink">{mutualIncluded ? "Incluido" : "Excluido"}</strong> · Modo:{" "}
        <strong className="text-ink">{mode === "val" ? "Pesos $" : "Frecuencias"}</strong>
      </p>

      {activeTab === "resumen" && (
        <ResumenComparativo rows={rows} years={years} mutualIncluded={mutualIncluded} mode={mode} />
      )}
      {activeTab === "anual" && (
        <ComparativoAnual
          rows={rows}
          metaRows={metaRows}
          years={years}
          mutualIncluded={mutualIncluded}
          mode={mode}
        />
      )}
      {activeTab === "tendencia" && (
        <TendenciaMensual
          rows={rows}
          metaRows={metaRows}
          years={years}
          mutualIncluded={mutualIncluded}
          mode={mode}
        />
      )}
      {activeTab === "detalle" && (
        <DetallePorEmpresa
          rows={rows}
          metaRows={metaDetalleRows}
          years={years}
          mutualIncluded={mutualIncluded}
          mode={mode}
        />
      )}
      {activeTab === "prep" && (
        <Prepagadas mensual={prepagadasMensual} ranking={prepagadasRanking} years={years} mode={mode} />
      )}
      {activeTab === "dxapoyo" && (
        <DiagnosticaApoyo rows={rows} years={years} mutualIncluded={mutualIncluded} mode={mode} />
      )}
      {activeTab === "medicos" && (
        <Medicos rows={medicosRows} years={years} mutualIncluded={mutualIncluded} mode={mode} />
      )}
      {activeTab === "cobrable" && <CobrableVsNo rows={cobrableRows} years={years} />}
    </div>
  );
}
