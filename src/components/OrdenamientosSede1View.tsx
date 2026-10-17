"use client";

import React, { useMemo, useState } from "react";

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
  nombre: string; // Nombre homologado oficial de Frecuencias (TIPO_CX o _exam/_apoyo)
  ordeno: number;
  hechosMes: number;
  vienenOtros: number;
}

interface DoctorBase {
  medico: string;
  procedimientos: ProcRow[];
}

interface MonthFactor {
  key: string;
  label: string;
  shortLabel: string;
  prevLabel: string;
  factor: number;
  carryFactor: number;
}

const MONTHS: MonthFactor[] = [
  { key: "mayo", label: "Mayo", shortLabel: "MAY", prevLabel: "De Abr / Mar / Feb", factor: 0.686, carryFactor: 0.714 },
  { key: "junio", label: "Junio", shortLabel: "JUN", prevLabel: "De May / Abr / Mar", factor: 0.800, carryFactor: 0.752 },
  { key: "julio", label: "Julio", shortLabel: "JUL", prevLabel: "De Jun / May / Abr", factor: 0.886, carryFactor: 0.752 },
  { key: "agosto", label: "Agosto", shortLabel: "AGO", prevLabel: "De Jul / Jun / May", factor: 0.943, carryFactor: 0.962 },
  { key: "septiembre", label: "Septiembre", shortLabel: "SEP", prevLabel: "De Ago / Jul / Jun", factor: 0.971, carryFactor: 1.000 },
  { key: "octubre", label: "Octubre 2026", shortLabel: "OCT", prevLabel: "De Sep / Ago / Jul", factor: 1.000, carryFactor: 1.000 },
];

// Homologaciones oficiales de Frecuencias (dic_tipocx.parquet / CIRUGIAS_POR_TIPO_final.xlsx)
const DOCTORS_QUIRURGICOS: DoctorBase[] = [
  {
    medico: "Dr. Carlos Mendoza",
    procedimientos: [
      { nombre: "FACO + LIO", ordeno: 72, hechosMes: 42, vienenOtros: 16 },
      { nombre: "SEG. ANTERIOR", ordeno: 26, hechosMes: 14, vienenOtros: 6 },
    ],
  },
  {
    medico: "Dra. Laura Gómez",
    procedimientos: [
      { nombre: "GLAUCOMA", ordeno: 58, hechosMes: 34, vienenOtros: 15 },
      { nombre: "GLAUCOMA - VÁLVULA", ordeno: 18, hechosMes: 10, vienenOtros: 4 },
    ],
  },
  {
    medico: "Dr. Andrés Silva",
    procedimientos: [
      { nombre: "RETINA", ordeno: 42, hechosMes: 21, vienenOtros: 12 },
      { nombre: "APLI. DE MEDICAMENTO", ordeno: 22, hechosMes: 11, vienenOtros: 6 },
    ],
  },
  {
    medico: "Dra. Sofía Medina",
    procedimientos: [
      { nombre: "OCULOPLASTIA MAYOR", ordeno: 34, hechosMes: 12, vienenOtros: 16 },
      { nombre: "OCULOPLASTIA MENOR", ordeno: 18, hechosMes: 6, vienenOtros: 8 },
    ],
  },
  {
    medico: "Dr. Javier Córdoba",
    procedimientos: [
      { nombre: "FACO + LIO", ordeno: 20, hechosMes: 5, vienenOtros: 7 },
      { nombre: "TRASPLANTE", ordeno: 9, hechosMes: 2, vienenOtros: 3 },
      { nombre: "REFRACTIVA", ordeno: 7, hechosMes: 2, vienenOtros: 2 },
    ],
  },
  {
    medico: "Dra. Natalia Pineda",
    procedimientos: [
      { nombre: "ESTRABISMO", ordeno: 14, hechosMes: 4, vienenOtros: 6 },
      { nombre: "OFT GENERAL", ordeno: 10, hechosMes: 2, vienenOtros: 4 },
    ],
  },
];

// Homologaciones oficiales de Frecuencias (_exam y _apoyo en dashboard.py)
const DOCTORS_NO_QUIRURGICOS: DoctorBase[] = [
  {
    medico: "Dr. Carlos Mendoza",
    procedimientos: [
      { nombre: "Biometría", ordeno: 96, hechosMes: 62, vienenOtros: 24 },
      { nombre: "Paquimetría", ordeno: 54, hechosMes: 34, vienenOtros: 14 },
      { nombre: "Recuento endotelial", ordeno: 38, hechosMes: 22, vienenOtros: 10 },
    ],
  },
  {
    medico: "Dra. Laura Gómez",
    procedimientos: [
      { nombre: "Campo visual", ordeno: 88, hechosMes: 54, vienenOtros: 22 },
      { nombre: "Tomografía / OCT", ordeno: 64, hechosMes: 40, vienenOtros: 16 },
      { nombre: "Trabeculoplastia láser", ordeno: 24, hechosMes: 14, vienenOtros: 6 },
      { nombre: "Iridotomía láser", ordeno: 18, hechosMes: 11, vienenOtros: 5 },
    ],
  },
  {
    medico: "Dr. Andrés Silva",
    procedimientos: [
      { nombre: "Tomografía / OCT", ordeno: 74, hechosMes: 44, vienenOtros: 18 },
      { nombre: "Angiografía", ordeno: 42, hechosMes: 24, vienenOtros: 11 },
      { nombre: "Fotocoagulación láser", ordeno: 28, hechosMes: 16, vienenOtros: 7 },
      { nombre: "Ecografía", ordeno: 20, hechosMes: 12, vienenOtros: 5 },
    ],
  },
  {
    medico: "Dra. Sofía Medina",
    procedimientos: [
      { nombre: "Vías lagrimales", ordeno: 46, hechosMes: 26, vienenOtros: 14 },
      { nombre: "Luz pulsada (IPL)", ordeno: 32, hechosMes: 18, vienenOtros: 9 },
      { nombre: "Toxina botulínica", ordeno: 22, hechosMes: 12, vienenOtros: 6 },
    ],
  },
  {
    medico: "Dr. Javier Córdoba",
    procedimientos: [
      { nombre: "Topografía", ordeno: 48, hechosMes: 26, vienenOtros: 12 },
      { nombre: "Aberrometría", ordeno: 28, hechosMes: 15, vienenOtros: 7 },
      { nombre: "Capsulotomía láser", ordeno: 22, hechosMes: 12, vienenOtros: 6 },
    ],
  },
  {
    medico: "Dra. Natalia Pineda",
    procedimientos: [
      { nombre: "Campo visual", ordeno: 34, hechosMes: 18, vienenOtros: 8 },
      { nombre: "Fotografía", ordeno: 22, hechosMes: 12, vienenOtros: 5 },
      { nombre: "Gonioscopía", ordeno: 16, hechosMes: 8, vienenOtros: 4 },
    ],
  },
];

export function OrdenamientosSede1View({ tipo, mode }: OrdenamientosSede1Props) {
  const isQuirurgico = (tipo ?? mode ?? "quirurgicos") === "quirurgicos";
  const [selectedMonth, setSelectedMonth] = useState<string>("octubre");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("Todos");
  const [selectedProc, setSelectedProc] = useState<string>("Todos");
  // Por defecto los 2 primeros médicos aparecen desplegados tal como en la imagen aprobada
  const [expandedDoctors, setExpandedDoctors] = useState<Record<string, boolean>>({
    "Dr. Carlos Mendoza": true,
    "Dra. Laura Gómez": true,
  });

  const baseDoctors = isQuirurgico ? DOCTORS_QUIRURGICOS : DOCTORS_NO_QUIRURGICOS;

  const allProcedures = useMemo(() => {
    const set = new Set<string>();
    baseDoctors.forEach((d) => d.procedimientos.forEach((p) => set.add(p.nombre)));
    return Array.from(set);
  }, [baseDoctors]);

  const activeMonthObj = useMemo(() => {
    if (selectedMonth === "todos") {
      return {
        key: "todos",
        label: "Mayo–Octubre",
        shortLabel: "ACUM.",
        prevLabel: "De meses previos",
        factor: 5.286,
        carryFactor: 5.18,
      };
    }
    return MONTHS.find((m) => m.key === selectedMonth) || MONTHS[5];
  }, [selectedMonth]);

  const doctorTree = useMemo(() => {
    return baseDoctors
      .filter((d) => selectedDoctor === "Todos" || d.medico === selectedDoctor)
      .map((d) => {
        const procs = d.procedimientos
          .filter((p) => selectedProc === "Todos" || p.nombre === selectedProc)
          .map((p) => {
            const ordeno = Math.max(1, Math.round(p.ordeno * activeMonthObj.factor));
            const hechosMes = Math.min(ordeno, Math.max(1, Math.round(p.hechosMes * activeMonthObj.factor)));
            const vienenOtros = Math.max(1, Math.round(p.vienenOtros * activeMonthObj.carryFactor));
            const totalRealizados = hechosMes + vienenOtros;
            const pasanProxMes = Math.max(0, ordeno - hechosMes);
            return {
              nombre: p.nombre,
              ordeno,
              hechosMes,
              vienenOtros,
              totalRealizados,
              pasanProxMes,
            };
          });

        const ordeno = procs.reduce((a, r) => a + r.ordeno, 0);
        const hechosMes = procs.reduce((a, r) => a + r.hechosMes, 0);
        const vienenOtros = procs.reduce((a, r) => a + r.vienenOtros, 0);
        const totalRealizados = hechosMes + vienenOtros;
        const pasanProxMes = Math.max(0, ordeno - hechosMes);

        return {
          medico: d.medico,
          procs,
          ordeno,
          hechosMes,
          vienenOtros,
          totalRealizados,
          pasanProxMes,
        };
      })
      .filter((d) => d.procs.length > 0);
  }, [baseDoctors, selectedDoctor, selectedProc, activeMonthObj]);

  const totals = useMemo(() => {
    const ordeno = doctorTree.reduce((acc, r) => acc + r.ordeno, 0);
    const hechosMes = doctorTree.reduce((acc, r) => acc + r.hechosMes, 0);
    const vienenOtros = doctorTree.reduce((acc, r) => acc + r.vienenOtros, 0);
    const totalRealizados = hechosMes + vienenOtros;
    const pasanProxMes = doctorTree.reduce((acc, r) => acc + r.pasanProxMes, 0);
    const pctMismoMes = ordeno > 0 ? Math.round((hechosMes / ordeno) * 100) : 0;
    const enControl = Math.round(pasanProxMes * 0.757);
    const vencidos = Math.max(0, pasanProxMes - enControl);
    return { ordeno, hechosMes, vienenOtros, totalRealizados, pasanProxMes, pctMismoMes, enControl, vencidos };
  }, [doctorTree]);

  const monthlySeries = useMemo(() => {
    const filteredDocs = baseDoctors.filter((d) => selectedDoctor === "Todos" || d.medico === selectedDoctor);
    const baseOrd = filteredDocs.reduce(
      (acc, d) =>
        acc +
        d.procedimientos
          .filter((p) => selectedProc === "Todos" || p.nombre === selectedProc)
          .reduce((s, p) => s + p.ordeno, 0),
      0
    );
    const baseHechos = filteredDocs.reduce(
      (acc, d) =>
        acc +
        d.procedimientos
          .filter((p) => selectedProc === "Todos" || p.nombre === selectedProc)
          .reduce((s, p) => s + p.hechosMes, 0),
      0
    );
    const baseOtros = filteredDocs.reduce(
      (acc, d) =>
        acc +
        d.procedimientos
          .filter((p) => selectedProc === "Todos" || p.nombre === selectedProc)
          .reduce((s, p) => s + p.vienenOtros, 0),
      0
    );

    return MONTHS.map((m) => {
      const ord = Math.max(1, Math.round(baseOrd * m.factor));
      const hec = Math.min(ord, Math.max(1, Math.round(baseHechos * m.factor)));
      const otr = Math.max(1, Math.round(baseOtros * m.carryFactor));
      return {
        key: m.key,
        mes: m.label.replace(" 2026", ""),
        ordenado: ord,
        hechoMes: hec,
        vieneOtros: otr,
        totalRealizado: hec + otr,
      };
    });
  }, [baseDoctors, selectedDoctor, selectedProc]);

  const maxBar = useMemo(() => {
    return Math.max(...monthlySeries.map((s) => Math.max(s.ordenado, s.totalRealizado)), 1);
  }, [monthlySeries]);

  const allExpanded = useMemo(() => {
    return doctorTree.length > 0 && doctorTree.every((d) => !!expandedDoctors[d.medico]);
  }, [doctorTree, expandedDoctors]);

  const toggleDoctor = (medico: string) => {
    setExpandedDoctors((prev) => ({ ...prev, [medico]: !prev[medico] }));
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedDoctors({});
    } else {
      const next: Record<string, boolean> = {};
      doctorTree.forEach((d) => {
        next[d.medico] = true;
      });
      setExpandedDoctors(next);
    }
  };

  const mesTitle = activeMonthObj.label.replace(" 2026", "");

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 px-4 py-3 md:px-6 md:py-4 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-3">
        {/* Cabecera superior con letra pequeña y meses completos */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 pb-1">
          <div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600">
              <span>Centro Oftalmológico Ebenezer ·</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2B579A] text-white tracking-wide">
                SEDE 1
              </span>
              <span className="text-[11px] text-slate-400">
                · {isQuirurgico ? "Procedimientos Quirúrgicos (TIPO CX)" : "Ayudas Diagnósticas y Apoyo Terapéutico"}
              </span>
            </div>
            <h1 className="text-[18px] md:text-[19px] font-bold text-slate-900 tracking-tight leading-snug">
              Ordenado vs. Realizado por Mes · Sede 1
            </h1>
          </div>

          {/* Filtros por Mes, Médico y Procedimiento Homologado */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex flex-wrap items-center bg-white border border-slate-200/90 rounded-lg p-0.5 shadow-2xs">
              {MONTHS.map((m) => {
                const active = selectedMonth === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonth(m.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      active
                        ? "bg-[#2B579A] text-white font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedMonth("todos")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  selectedMonth === "todos"
                    ? "bg-[#2B579A] text-white font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Todos
              </button>
            </div>

            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              aria-label="Filtrar por médico"
              className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs focus:outline-none focus:border-[#2B579A]"
            >
              <option value="Todos">Médico: Todos los doctores</option>
              {baseDoctors.map((d) => (
                <option key={d.medico} value={d.medico}>
                  Médico: {d.medico}
                </option>
              ))}
            </select>

            <select
              value={selectedProc}
              onChange={(e) => setSelectedProc(e.target.value)}
              aria-label="Filtrar por procedimiento homologado"
              className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs focus:outline-none focus:border-[#2B579A]"
            >
              <option value="Todos">Servicio: Todos</option>
              {allProcedures.map((proc) => (
                <option key={proc} value={proc}>
                  Servicio: {proc}
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
                1. Ordenados en {mesTitle}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-end justify-between gap-2">
              <div>
                <div className="text-[21px] font-bold text-slate-900 leading-none tracking-tight">
                  {totals.ordeno.toLocaleString("es-CO")}{" "}
                  <span className="text-[12px] font-semibold text-slate-700">órdenes</span>
                </div>
                <p className="text-[10.5px] text-slate-600 mt-1.5 leading-snug">
                  Formuladas por los médicos este mes
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
                  Ordenados en {mesTitle} y hechos en {mesTitle}
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
                  Controles ordenados en meses anteriores · Total {activeMonthObj.shortLabel}: {totals.totalRealizados}
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

        {/* Sección inferior: Tabla desplegable por Médico y Procedimiento (Izquierda) + Comparativo Mes a Mes (Derecha) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Tabla izquierda con filas desplegables (▾ / ▸) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/85 shadow-2xs p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-end gap-0.5 h-3.5">
                    <span className="w-1 h-2 bg-slate-400 rounded-xs" />
                    <span className="w-1 h-3.5 bg-[#2B579A] rounded-xs" />
                    <span className="w-1 h-2.5 bg-[#2E9E6B] rounded-xs" />
                  </span>
                  <h2 className="text-[13.5px] font-bold text-slate-900">
                    Detalle por Médico y Procedimiento · Sede 1
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
                    {doctorTree.map((row) => {
                      const isOpen = !!expandedDoctors[row.medico];
                      return (
                        <React.Fragment key={row.medico}>
                          {/* Fila principal del médico (desplegable al hacer clic) */}
                          <tr
                            onClick={() => toggleDoctor(row.medico)}
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

                          {/* Sub-filas con los procedimientos homologados de Frecuencias */}
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

          {/* Gráfica derecha: Comparativo Mes a Mes (Origen de los Realizados) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/85 shadow-2xs p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13.5px] font-bold text-slate-900">
                  Comparativo Mes a Mes (Origen de los Realizados)
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

            {/* Barras agrupadas y apiladas */}
            <div className="pt-4 pb-1 px-1">
              <div className="grid grid-cols-6 gap-2 items-end h-[215px] border-b border-slate-200 pb-1">
                {monthlySeries.map((item) => {
                  const ordHeight = Math.max(22, Math.round((item.ordenado / maxBar) * 165));
                  const totalRealHeight = Math.max(24, Math.round((item.totalRealizado / maxBar) * 165));
                  const verdeHeight = Math.max(
                    18,
                    Math.round((item.vieneOtros / Math.max(item.totalRealizado, 1)) * totalRealHeight)
                  );
                  const azulOscuroHeight = Math.max(18, totalRealHeight - verdeHeight);
                  const isSelected = selectedMonth === item.key;

                  return (
                    <div
                      key={item.key}
                      onClick={() => setSelectedMonth(item.key)}
                      className={`flex flex-col items-center cursor-pointer transition-opacity ${
                        selectedMonth !== "todos" && !isSelected ? "opacity-85 hover:opacity-100" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-end justify-center gap-1 w-full">
                        {/* Barra 1: Azul claro (Ordenado en el mes) */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10.5px] font-semibold text-slate-800 mb-0.5">
                            {item.ordenado}
                          </span>
                          <div
                            style={{ height: `${ordHeight}px` }}
                            className="w-5 md:w-6 rounded-t-sm bg-gradient-to-b from-[#7FAEE7] to-[#BBD4F3] border border-[#6C9FDDF0]"
                          />
                        </div>

                        {/* Barra 2: Apilada (Verde arriba = Viene de otros meses, Azul oscuro abajo = Hecho del mismo mes) */}
                        <div className="flex flex-col items-center relative">
                          {item.key === "octubre" && (
                            <div className=" -top-7 right-0 z-10 pointer-events-none hidden sm:flex flex-col items-center">
                              <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-[#DDF3E8] text-[#1D6F4A] border border-[#A7DFC3] whitespace-nowrap shadow-2xs">
                                +otros meses
                              </span>
                            </div>
                          )}
                          {item.key !== "octubre" && (
                            <span className="text-[10.5px] font-semibold text-slate-800 mb-0.5">
                              {item.totalRealizado}
                            </span>
                          )}
                          <div className="flex flex-col w-5 md:w-6 rounded-t-sm overflow-hidden border border-slate-300/60">
                            <div
                              style={{ height: `${verdeHeight}px` }}
                              className="w-full bg-[#369F6E] flex items-center justify-center text-[9.5px] font-semibold text-slate-900 leading-none"
                            >
                              {item.vieneOtros}
                            </div>
                            <div
                              style={{ height: `${azulOscuroHeight}px` }}
                              className="w-full bg-[#1D4F9A] flex items-center justify-center text-[9.5px] font-semibold text-white leading-none"
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
              <div className="grid grid-cols-6 gap-2 pt-1.5 text-center">
                {monthlySeries.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedMonth(item.key)}
                    className={`text-[11px] truncate ${
                      selectedMonth === item.key
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