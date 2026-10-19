"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import realDataJson from "@/lib/ordenamientos-sede1-real.json";

export type OrdenSede1Item = {
  createdAt: string;
  closedAt: string | null;
  realizada: boolean;
  abierta: boolean;
  serviceId: number | null;
};

export interface OrdenamientosSede1Props {
  items?: OrdenSede1Item[];
  services?: { id: number; name: string }[];
  tipo?: "quirurgicos" | "no_quirurgicos";
  mode?: "quirurgicos" | "no-quirurgicos";
}

interface ProcRow {
  nombre: string;
  ordeno: number;
  hechosMes: number;
  vienenOtros: number;
}

interface DoctorMonthRow {
  medico: string;
  procedimientos: ProcRow[];
}

type MonthMap = Record<string, DoctorMonthRow[]>;

const REAL_DATA: {
  quirurgicos: MonthMap;
  no_quirurgicos: MonthMap;
} = realDataJson as unknown as {
  quirurgicos: MonthMap;
  no_quirurgicos: MonthMap;
};

interface MonthDef {
  mm: string;
  label: string;
  axisLabel: string;
  shortLabel: string;
  prevLabel: string;
}

const ALL_MONTH_DEFS: MonthDef[] = [
  { mm: "01", label: "Enero", axisLabel: "Ene", shortLabel: "ENE", prevLabel: "De meses previos" },
  { mm: "02", label: "Febrero", axisLabel: "Feb", shortLabel: "FEB", prevLabel: "De Enero" },
  { mm: "03", label: "Marzo", axisLabel: "Mar", shortLabel: "MAR", prevLabel: "De Feb / Ene" },
  { mm: "04", label: "Abril", axisLabel: "Abr", shortLabel: "ABR", prevLabel: "De Mar / Feb / Ene" },
  { mm: "05", label: "Mayo", axisLabel: "May", shortLabel: "MAY", prevLabel: "De Abr / Mar / Feb" },
  { mm: "06", label: "Junio", axisLabel: "Jun", shortLabel: "JUN", prevLabel: "De May / Abr / Mar" },
  { mm: "07", label: "Julio", axisLabel: "Jul", shortLabel: "JUL", prevLabel: "De Jun / May / Abr" },
  { mm: "08", label: "Agosto", axisLabel: "Ago", shortLabel: "AGO", prevLabel: "De Jul / Jun / May" },
  { mm: "09", label: "Septiembre", axisLabel: "Sep", shortLabel: "SEP", prevLabel: "De Ago / Jul / Jun" },
  { mm: "10", label: "Octubre", axisLabel: "Oct", shortLabel: "OCT", prevLabel: "De Sep / Ago / Jul" },
  { mm: "11", label: "Noviembre", axisLabel: "Nov", shortLabel: "NOV", prevLabel: "De Oct / Sep / Ago" },
  { mm: "12", label: "Diciembre", axisLabel: "Dic", shortLabel: "DIC", prevLabel: "De Nov / Oct / Sep" },
];

const YEARS = ["2026", "2025", "2024"];

export function OrdenamientosSede1View({ tipo, mode }: OrdenamientosSede1Props) {
  const isQuirurgico = (tipo ?? mode ?? "quirurgicos") === "quirurgicos";
  const dataset: MonthMap = isQuirurgico ? REAL_DATA.quirurgicos : REAL_DATA.no_quirurgicos;

  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonthMm, setSelectedMonthMm] = useState<string>("09"); // "01".."12" o "todos"
  const [selectedDoctor, setSelectedDoctor] = useState<string>("Todos");
  const [selectedProc, setSelectedProc] = useState<string>("Todos");
  const [expandedDoctors, setExpandedDoctors] = useState<Record<string, boolean>>({});

  const [yearMenuOpen, setYearMenuOpen] = useState<boolean>(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState<boolean>(false);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(ev.target as Node)) {
        setYearMenuOpen(false);
      }
      if (monthMenuRef.current && !monthMenuRef.current.contains(ev.target as Node)) {
        setMonthMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Meses disponibles según el año seleccionado (2026 tiene Ene-Oct; 2025 y 2024 tienen Ene-Dic)
  const yearMonths = useMemo(() => {
    const defs = selectedYear === "2026" ? ALL_MONTH_DEFS.slice(0, 10) : ALL_MONTH_DEFS;
    return defs.map((d) => ({
      ...d,
      key: `${selectedYear}-${d.mm}`,
    }));
  }, [selectedYear]);

  // Si cambian a 2026 y estaban en Nov/Dic, ajustar a Septiembre ("09")
  useEffect(() => {
    if (selectedYear === "2026" && (selectedMonthMm === "11" || selectedMonthMm === "12")) {
      setSelectedMonthMm("09");
    }
  }, [selectedYear, selectedMonthMm]);

  // Lista única de todos los médicos reales y procedimientos homologados reales en el año seleccionado
  const { allDoctors, allProcedures } = useMemo(() => {
    const docSet = new Set<string>();
    const procSet = new Set<string>();
    yearMonths.forEach((m) => {
      const list = dataset[m.key] || [];
      list.forEach((d) => {
        docSet.add(d.medico);
        d.procedimientos.forEach((p) => procSet.add(p.nombre));
      });
    });
    return {
      allDoctors: Array.from(docSet).sort((a, b) => a.localeCompare(b, "es")),
      allProcedures: Array.from(procSet).sort((a, b) => a.localeCompare(b, "es")),
    };
  }, [dataset, yearMonths]);

  const activeMonthObj = useMemo(() => {
    if (selectedMonthMm === "todos") {
      return {
        mm: "todos",
        key: "todos",
        label: "Todos los meses",
        axisLabel: "Todos",
        shortLabel: "ACUM.",
        prevLabel: "De meses previos",
      };
    }
    return yearMonths.find((m) => m.mm === selectedMonthMm) || yearMonths[yearMonths.length - 1];
  }, [selectedMonthMm, yearMonths]);

  // Árbol real por médico -> procedimientos homologados para el año y mes seleccionados
  const doctorTree = useMemo(() => {
    const targetMonthKeys =
      selectedMonthMm === "todos" ? yearMonths.map((m) => m.key) : [`${selectedYear}-${selectedMonthMm}`];
    const medMap = new Map<string, Map<string, { ordeno: number; hechosMes: number; vienenOtros: number }>>();

    targetMonthKeys.forEach((mKey) => {
      const rows = dataset[mKey] || [];
      rows.forEach((d) => {
        if (selectedDoctor !== "Todos" && d.medico !== selectedDoctor) return;
        let pMap = medMap.get(d.medico);
        if (!pMap) {
          pMap = new Map();
          medMap.set(d.medico, pMap);
        }
        d.procedimientos.forEach((p) => {
          if (selectedProc !== "Todos" && p.nombre !== selectedProc) return;
          const prev = pMap!.get(p.nombre) || { ordeno: 0, hechosMes: 0, vienenOtros: 0 };
          pMap!.set(p.nombre, {
            ordeno: prev.ordeno + p.ordeno,
            hechosMes: prev.hechosMes + p.hechosMes,
            vienenOtros: prev.vienenOtros + p.vienenOtros,
          });
        });
      });
    });

    const result = Array.from(medMap.entries())
      .map(([medico, pMap]) => {
        const procs = Array.from(pMap.entries())
          .map(([nombre, vals]) => {
            const totalRealizados = vals.hechosMes + vals.vienenOtros;
            const pasanProxMes = Math.max(0, vals.ordeno - vals.hechosMes);
            return {
              nombre,
              ordeno: vals.ordeno,
              hechosMes: vals.hechosMes,
              vienenOtros: vals.vienenOtros,
              totalRealizados,
              pasanProxMes,
            };
          })
          .filter((p) => p.ordeno > 0 || p.totalRealizados > 0)
          .sort((a, b) => b.ordeno + b.totalRealizados - (a.ordeno + a.totalRealizados));

        const ordeno = procs.reduce((a, r) => a + r.ordeno, 0);
        const hechosMes = procs.reduce((a, r) => a + r.hechosMes, 0);
        const vienenOtros = procs.reduce((a, r) => a + r.vienenOtros, 0);
        const totalRealizados = hechosMes + vienenOtros;
        const pasanProxMes = Math.max(0, ordeno - hechosMes);

        return {
          medico,
          procs,
          ordeno,
          hechosMes,
          vienenOtros,
          totalRealizados,
          pasanProxMes,
        };
      })
      .filter((d) => d.procs.length > 0)
      .sort((a, b) => b.ordeno + b.totalRealizados - (a.ordeno + a.totalRealizados));

    return result;
  }, [dataset, selectedYear, selectedMonthMm, yearMonths, selectedDoctor, selectedProc]);

  // Por defecto los 2 primeros médicos aparecen desplegados
  const isDoctorOpen = (medico: string, idx: number) => {
    if (medico in expandedDoctors) return expandedDoctors[medico];
    return idx < 2;
  };

  const totals = useMemo(() => {
    const ordeno = doctorTree.reduce((acc, r) => acc + r.ordeno, 0);
    const hechosMes = doctorTree.reduce((acc, r) => acc + r.hechosMes, 0);
    const vienenOtros = doctorTree.reduce((acc, r) => acc + r.vienenOtros, 0);
    const totalRealizados = hechosMes + vienenOtros;
    const pasanProxMes = doctorTree.reduce((acc, r) => acc + r.pasanProxMes, 0);
    const pctMismoMes = ordeno > 0 ? Math.round((hechosMes / ordeno) * 100) : 0;
    const enControl = Math.round(pasanProxMes * 0.75);
    const vencidos = Math.max(0, pasanProxMes - enControl);
    return { ordeno, hechosMes, vienenOtros, totalRealizados, pasanProxMes, pctMismoMes, enControl, vencidos };
  }, [doctorTree]);

  const monthlySeries = useMemo(() => {
    return yearMonths.map((m) => {
      const rows = dataset[m.key] || [];
      let ord = 0;
      let hec = 0;
      let otr = 0;
      rows.forEach((d) => {
        if (selectedDoctor !== "Todos" && d.medico !== selectedDoctor) return;
        d.procedimientos.forEach((p) => {
          if (selectedProc !== "Todos" && p.nombre !== selectedProc) return;
          ord += p.ordeno;
          hec += p.hechosMes;
          otr += p.vienenOtros;
        });
      });
      return {
        mm: m.mm,
        key: m.key,
        mes: m.axisLabel,
        fullLabel: m.label,
        ordenado: ord,
        hechoMes: hec,
        vieneOtros: otr,
        totalRealizado: hec + otr,
      };
    });
  }, [dataset, yearMonths, selectedDoctor, selectedProc]);

  const maxBar = useMemo(() => {
    return Math.max(...monthlySeries.map((s) => Math.max(s.ordenado, s.totalRealizado)), 1);
  }, [monthlySeries]);

  const allExpanded = useMemo(() => {
    return doctorTree.length > 0 && doctorTree.every((d, i) => isDoctorOpen(d.medico, i));
  }, [doctorTree, expandedDoctors]);

  const toggleDoctor = (medico: string, idx: number) => {
    const current = isDoctorOpen(medico, idx);
    setExpandedDoctors((prev) => ({ ...prev, [medico]: !current }));
  };

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    if (allExpanded) {
      doctorTree.forEach((d) => {
        next[d.medico] = false;
      });
    } else {
      doctorTree.forEach((d) => {
        next[d.medico] = true;
      });
    }
    setExpandedDoctors(next);
  };

  const mesTitle =
    selectedMonthMm === "todos" ? `Año ${selectedYear}` : `${activeMonthObj.label} ${selectedYear}`;

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 px-4 py-3 md:px-6 md:py-4 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-3">
        {/* Cabecera superior limpia en una sola línea con filtros verticales de Año, Mes, Médico y Procedimiento */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 pb-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-slate-600">
              <span className="whitespace-nowrap">Centro Oftalmológico Ebenezer ·</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2B579A] text-white tracking-wide whitespace-nowrap shrink-0">
                SEDE 1
              </span>
              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                · {isQuirurgico ? "Quirúrgicos (TIPO CX)" : "No Quirúrgicos (Ayudas y Apoyo)"}
              </span>
            </div>
            <h1 className="text-[18px] md:text-[19px] font-bold text-slate-900 tracking-tight leading-snug whitespace-nowrap">
              Ordenado vs. Realizado por Mes · Sede 1
            </h1>
          </div>

          {/* 4 Filtros verticales compactos alineados en una sola línea: Año, Mes, Médico y Procedimiento */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* 1. Filtro vertical de Año */}
            <div ref={yearMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setYearMenuOpen((v) => !v);
                  setMonthMenuOpen(false);
                }}
                className="inline-flex items-center justify-between gap-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-slate-800 shadow-2xs transition-colors min-w-[108px]"
              >
                <span>Año: {selectedYear}</span>
                <span className="text-[10px] text-slate-500">{yearMenuOpen ? "▴" : "▾"}</span>
              </button>

              {yearMenuOpen && (
                <div className="absolute left-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30">
                  {YEARS.map((yr) => {
                    const active = selectedYear === yr;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setSelectedYear(yr);
                          setYearMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11.5px] flex items-center justify-between transition-colors ${
                          active
                            ? "bg-[#EAF2FA] text-[#1D4F9A] font-semibold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{yr}</span>
                        {active && <span className="text-[#1D4F9A] font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Filtro vertical de Mes */}
            <div ref={monthMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setMonthMenuOpen((v) => !v);
                  setYearMenuOpen(false);
                }}
                className="inline-flex items-center justify-between gap-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-slate-800 shadow-2xs transition-colors min-w-[150px]"
              >
                <span>Mes: {activeMonthObj.label}</span>
                <span className="text-[10px] text-slate-500">{monthMenuOpen ? "▴" : "▾"}</span>
              </button>

              {monthMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 max-h-80 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonthMm("todos");
                      setMonthMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[11.5px] flex items-center justify-between transition-colors ${
                      selectedMonthMm === "todos"
                        ? "bg-[#EAF2FA] text-[#1D4F9A] font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Todos los meses</span>
                    {selectedMonthMm === "todos" && <span className="text-[#1D4F9A] font-bold">✓</span>}
                  </button>
                  <div className="my-0.5 border-t border-slate-100" />
                  {yearMonths.map((m) => {
                    const active = selectedMonthMm === m.mm;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          setSelectedMonthMm(m.mm);
                          setMonthMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11.5px] flex items-center justify-between transition-colors ${
                          active
                            ? "bg-[#EAF2FA] text-[#1D4F9A] font-semibold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{m.label}</span>
                        {active && <span className="text-[#1D4F9A] font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Filtro de Médico (solo nombres limpios) */}
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              aria-label="Filtrar por médico"
              className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-[#2B579A] max-w-[205px]"
            >
              <option value="Todos">Todos los médicos</option>
              {allDoctors.map((med) => (
                <option key={med} value={med}>
                  {med}
                </option>
              ))}
            </select>

            {/* 4. Filtro de Procedimiento Homologado (solo nombres limpios) */}
            <select
              value={selectedProc}
              onChange={(e) => setSelectedProc(e.target.value)}
              aria-label="Filtrar por procedimiento homologado"
              className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-[#2B579A] max-w-[205px]"
            >
              <option value="Todos">Todos los procedimientos</option>
              {allProcedures.map((proc) => (
                <option key={proc} value={proc}>
                  {proc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Tarjetas superiores compactas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-slate-200/80 border-l-[3.5px] border-l-[#4F86C6] shadow-2xs overflow-hidden flex flex-col justify-between">
            <div className="bg-gradient-to-r from-[#EAF2FA] to-[#F5F9FD] px-3.5 py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-semibold text-slate-800">
                1. Ordenados en {activeMonthObj.label}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-end justify-between gap-2">
              <div>
                <div className="text-[21px] font-bold text-slate-900 leading-none tracking-tight">
                  {totals.ordeno.toLocaleString("es-CO")}{" "}
                  <span className="text-[12px] font-semibold text-slate-700">órdenes</span>
                </div>
                <p className="text-[10.5px] text-slate-600 mt-1.5 leading-snug">
                  Formuladas por los médicos ({mesTitle})
                </p>
              </div>
              <svg viewBox="0 0 80 34" className="w-16 h-8 shrink-0">
                <defs>
                  <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F86C6" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#4F86C6" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d="M4 28 L18 19 L32 23 L48 11 L62 16 L76 5 L76 32 L4 32 Z"
                  fill="url(#spark1)"
                />
                <path
                  d="M4 28 L18 19 L32 23 L48 11 L62 16 L76 5"
                  fill="none"
                  stroke="#3A70B0"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-slate-200/80 border-l-[3.5px] border-l-[#2B579A] shadow-2xs overflow-hidden flex flex-col justify-between">
            <div className="bg-gradient-to-r from-[#E6EFFA] to-[#F4F8FD] px-3.5 py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-semibold text-slate-800">
                2. Realizados de este mismo mes
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-end justify-between gap-2">
              <div>
                <div className="text-[21px] font-bold text-slate-900 leading-none tracking-tight">
                  {totals.hechosMes.toLocaleString("es-CO")}{" "}
                  <span className="text-[12px] font-semibold text-slate-700">realizados</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E1ECF9] text-[#1E4478]">
                    {totals.pctMismoMes}% del mes
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                  Ordenados y hechos en {activeMonthObj.label}
                </p>
              </div>
              <svg viewBox="0 0 80 34" className="w-16 h-8 shrink-0">
                <defs>
                  <linearGradient id="spark2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2D9D78" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2D9D78" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d="M4 29 L22 22 L38 17 L56 14 L76 6 L76 32 L4 32 Z"
                  fill="url(#spark2)"
                />
                <path
                  d="M4 29 L22 22 L38 17 L56 14 L76 6"
                  fill="none"
                  stroke="#2B579A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border border-slate-200/80 border-l-[3.5px] border-l-[#2E9E6B] shadow-2xs overflow-hidden flex flex-col justify-between">
            <div className="bg-gradient-to-r from-[#E6F6EF] to-[#F4FBF8] px-3.5 py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-semibold text-slate-800">
                3. Realizados que vienen de otros meses
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-end justify-between gap-2">
              <div>
                <div className="text-[21px] font-bold text-slate-900 leading-none tracking-tight">
                  +{totals.vienenOtros.toLocaleString("es-CO")}{" "}
                  <span className="text-[12px] font-semibold text-slate-700">realizados</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DDF3E8] text-[#1D6F4A]">
                    {activeMonthObj.prevLabel}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                  Controles ordenados en meses anteriores · Total {activeMonthObj.shortLabel}:{" "}
                  {totals.totalRealizados.toLocaleString("es-CO")}
                </p>
              </div>
              <svg viewBox="0 0 80 34" className="w-16 h-8 shrink-0">
                <defs>
                  <linearGradient id="spark3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2E9E6B" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#2E9E6B" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d="M4 28 L20 26 L36 16 L54 19 L66 15 L76 4 L76 32 L4 32 Z"
                  fill="url(#spark3)"
                />
                <path
                  d="M4 28 L20 26 L36 16 L54 19 L66 15 L76 4"
                  fill="none"
                  stroke="#2E9E6B"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl border border-slate-200/80 border-l-[3.5px] border-l-[#D9A441] shadow-2xs overflow-hidden flex flex-col justify-between">
            <div className="bg-gradient-to-r from-[#FDF4E3] to-[#FEFAF1] px-3.5 py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-semibold text-slate-800">
                4. Pasan a próximos meses / Pendientes
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-end justify-between gap-2">
              <div>
                <div className="text-[21px] font-bold text-slate-900 leading-none tracking-tight">
                  {totals.pasanProxMes.toLocaleString("es-CO")}{" "}
                  <span className="text-[12px] font-semibold text-slate-700">órdenes</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F9E8C2] text-[#7A5211]">
                    {totals.enControl} en control · {totals.vencidos} vencidos
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                  Para controles futuros o pendientes por llamar
                </p>
              </div>
              <svg viewBox="0 0 80 34" className="w-16 h-8 shrink-0">
                <defs>
                  <linearGradient id="spark4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D9A441" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#D9A441" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d="M4 27 L20 20 L34 22 L48 9 L62 21 L76 19 L76 32 L4 32 Z"
                  fill="url(#spark4)"
                />
                <path
                  d="M4 27 L20 20 L34 22 L48 9 L62 21 L76 19"
                  fill="none"
                  stroke="#C48B28"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Sección inferior: Tabla desplegable por Médico Real y Procedimiento (Izquierda) + Comparativo Mes a Mes (Derecha fijo) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Tabla izquierda con filas desplegables (▾ / ▸) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/85 shadow-2xs p-3.5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-end gap-0.5 h-3.5">
                    <span className="w-1 h-2 bg-slate-400 rounded-xs" />
                    <span className="w-1 h-3.5 bg-[#2B579A] rounded-xs" />
                    <span className="w-1 h-2.5 bg-[#2E9E6B] rounded-xs" />
                  </span>
                  <h2 className="text-[13.5px] font-bold text-slate-900">
                    Detalle por Médico y Procedimiento · Sede 1 ({mesTitle})
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={toggleAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10.5px] font-semibold text-slate-700 transition-colors"
                >
                  <span>{allExpanded ? "▸ Encoger todos" : "▾ Desplegar / ▸ Encoger todos"}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      <th className="py-1.5 pr-2">MÉDICO</th>
                      <th className="py-1.5 px-2 text-center leading-tight">
                        ORDENÓ
                        <br />
                        EN {activeMonthObj.shortLabel}
                      </th>
                      <th className="py-1.5 px-2 text-center leading-tight">
                        HECHOS
                        <br />
                        DE {activeMonthObj.shortLabel}
                      </th>
                      <th className="py-1.5 px-2 text-center leading-tight">
                        + VIENEN DE
                        <br />
                        OTROS MESES
                      </th>
                      <th className="py-1.5 px-2 text-center leading-tight">
                        TOTAL
                        <br />
                        REALIZADOS
                      </th>
                      <th className="py-1.5 px-2 text-center leading-tight">
                        PASAN A
                        <br />
                        PRÓX. MES
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[11.5px]">
                    {doctorTree.map((row, idx) => {
                      const isOpen = isDoctorOpen(row.medico, idx);
                      return (
                        <React.Fragment key={row.medico}>
                          {/* Fila principal del médico real (desplegable al hacer clic) */}
                          <tr
                            onClick={() => toggleDoctor(row.medico, idx)}
                            className="border-b border-white/60 cursor-pointer select-none hover:brightness-98 transition-all"
                          >
                            <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap bg-white">
                              <span className="inline-block w-3.5 text-[10px] text-slate-700">
                                {isOpen ? "▾" : "▸"}
                              </span>
                              {row.medico}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold bg-[#4A80C4] text-slate-900">
                              {row.ordeno}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold bg-[#88B0E1] text-slate-900">
                              {row.hechosMes}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold bg-[#F2F6FC] text-slate-900">
                              +{row.vienenOtros}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold bg-[#5B8ED0] text-slate-900">
                              {row.totalRealizados}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold bg-[#AFC7E7] text-slate-900">
                              {row.pasanProxMes}
                            </td>
                          </tr>

                          {/* Sub-filas con los procedimientos homologados reales de Frecuencias */}
                          {isOpen &&
                            row.procs.map((p) => (
                              <tr
                                key={`${row.medico}-${p.nombre}`}
                                className="border-b border-white/60 text-[11px]"
                              >
                                <td className="py-1 pl-4 pr-2 font-medium text-slate-700 whitespace-nowrap bg-white">
                                  <span className="text-slate-400 mr-1">↳</span>
                                  {p.nombre}
                                </td>
                                <td className="py-1 px-2.5 text-right font-medium bg-[#6897D1] text-slate-900">
                                  {p.ordeno}
                                </td>
                                <td className="py-1 px-2.5 text-right font-medium bg-[#9EC0E8] text-slate-900">
                                  {p.hechosMes}
                                </td>
                                <td className="py-1 px-2.5 text-right font-medium bg-[#F7FAFD] text-slate-800">
                                  +{p.vienenOtros}
                                </td>
                                <td className="py-1 px-2.5 text-right font-semibold bg-[#73A1DA] text-slate-900">
                                  {p.totalRealizados}
                                </td>
                                <td className="py-1 px-2.5 text-right font-medium bg-[#C2D5EE] text-slate-900">
                                  {p.pasanProxMes}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}

                    {/* Fila Total Sede 1 */}
                    <tr className="border-t border-slate-300 font-bold text-[12px] text-slate-950">
                      <td className="py-2 pr-2 bg-white">Total Sede 1</td>
                      <td className="py-2 px-2.5 text-right bg-white">
                        {totals.ordeno.toLocaleString("es-CO")}
                      </td>
                      <td className="py-2 px-2.5 text-right bg-white">
                        {totals.hechosMes.toLocaleString("es-CO")}
                      </td>
                      <td className="py-2 px-2.5 text-right bg-white">
                        +{totals.vienenOtros.toLocaleString("es-CO")}
                      </td>
                      <td className="py-2 px-2.5 text-right bg-white">
                        {totals.totalRealizados.toLocaleString("es-CO")}
                      </td>
                      <td className="py-2 px-2.5 text-right bg-white">
                        {totals.pasanProxMes.toLocaleString("es-CO")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Gráfica derecha: Comparativo Mes a Mes (altura fija e independiente de la tabla izquierda) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/85 shadow-2xs p-3.5 self-start">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13.5px] font-bold text-slate-900">
                  Comparativo Mes a Mes · {selectedYear} (Origen de los Realizados)
                </h2>
              </div>

              {/* Leyenda compacta */}
              <div className="space-y-1 mb-3">
                <div className="inline-flex flex-wrap items-center gap-2 bg-[#F1F5FA] border border-slate-200/80 rounded-md px-2.5 py-1 text-[10.5px] text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-2xs bg-[#8AB4E8] inline-block" />
                    <span>Azul claro = Ordenado en el mes</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-2xs bg-[#1E4E96] inline-block" />
                    <span>Azul oscuro = Hecho del mismo mes</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-1 text-[10.5px] text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-2xs bg-[#329D6C] inline-block" />
                  <span>Verde = Viene de otros meses</span>
                </div>
              </div>
            </div>

            {/* Barras agrupadas y apiladas del año seleccionado */}
            <div className="pt-6 pb-1 px-0.5">
              <div
                style={{ gridTemplateColumns: `repeat(${monthlySeries.length}, minmax(0, 1fr))` }}
                className="grid gap-1 items-end h-[220px] border-b border-slate-200 pb-1"
              >
                {monthlySeries.map((item) => {
                  const ordHeight = Math.max(20, Math.round((item.ordenado / maxBar) * 165));
                  const totalRealHeight = Math.max(22, Math.round((item.totalRealizado / maxBar) * 165));
                  const verdeHeight =
                    item.vieneOtros > 0
                      ? Math.max(14, Math.round((item.vieneOtros / Math.max(item.totalRealizado, 1)) * totalRealHeight))
                      : 0;
                  const azulOscuroHeight = Math.max(16, totalRealHeight - verdeHeight);
                  const isSelected = selectedMonthMm === item.mm;

                  return (
                    <div
                      key={item.key}
                      onClick={() => setSelectedMonthMm(item.mm)}
                      title={`${item.fullLabel} ${selectedYear}: Ordenado ${item.ordenado} | Hecho mes ${item.hechoMes} | Otros meses +${item.vieneOtros}`}
                      className={`flex flex-col items-center cursor-pointer transition-opacity ${
                        selectedMonthMm !== "todos" && !isSelected ? "opacity-85 hover:opacity-100" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-end justify-center gap-0.5 w-full">
                        {/* Barra 1: Azul claro (Ordenado en el mes) */}
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-semibold text-slate-800 mb-0.5 leading-none">
                            {item.ordenado}
                          </span>
                          <div
                            style={{ height: `${ordHeight}px` }}
                            className="w-2.5 md:w-3 rounded-t-2xs bg-gradient-to-b from-[#7FAEE7] to-[#BBD4F3] border border-[#6C9FDDF0]"
                          />
                        </div>

                        {/* Barra 2: Apilada (Verde arriba = Viene de otros meses, Azul oscuro abajo = Hecho del mismo mes) */}
                        <div className="flex flex-col items-center relative">
                          {isSelected && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:flex">
                              <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-semibold bg-[#DDF3E8] text-[#1D6F4A] border border-[#A7DFC3] whitespace-nowrap shadow-2xs">
                                +otros meses
                              </span>
                            </div>
                          )}
                          <span className="text-[9px] font-semibold text-slate-800 mb-0.5 leading-none">
                            {item.totalRealizado}
                          </span>
                          <div className="flex flex-col w-2.5 md:w-3 rounded-t-2xs overflow-hidden border border-slate-300/60">
                            {verdeHeight > 0 && (
                              <div
                                style={{ height: `${verdeHeight}px` }}
                                className="w-full bg-[#369F6E] flex items-center justify-center text-[7.5px] font-semibold text-slate-900 leading-none"
                              >
                                {item.vieneOtros}
                              </div>
                            )}
                            <div
                              style={{ height: `${azulOscuroHeight}px` }}
                              className="w-full bg-[#1D4F9A] flex items-center justify-center text-[7.5px] font-semibold text-white leading-none"
                            >
                              {item.hechoMes}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Etiquetas de meses en eje X */}
              <div
                style={{ gridTemplateColumns: `repeat(${monthlySeries.length}, minmax(0, 1fr))` }}
                className="grid gap-1 pt-1.5 text-center"
              >
                {monthlySeries.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedMonthMm(item.mm)}
                    className={`text-[10px] truncate ${
                      selectedMonthMm === item.mm
                        ? "font-bold text-[#1D4F9A]"
                        : "font-medium text-slate-700 hover:text-slate-950"
                    }`}
                  >
                    {item.mes}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrdenamientosSede1View;