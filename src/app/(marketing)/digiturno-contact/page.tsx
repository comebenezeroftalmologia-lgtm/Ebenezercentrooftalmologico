'use client';

import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Clock,
  Users,
  ChevronRight,
  ChevronDown,
  Briefcase, User,
  CheckCircle2,
  Activity,
  Calendar,
  Building2,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ReferenceLine,
} from 'recharts';
import rawData from '@/lib/digiturno-contact-data.json';
import { FechaDelDato } from '@/components/FechaDelDato';

type ActiveTab = 'digiturno' | 'contact';

interface QueueAgentItem {
  id: string;
  name: string;
  timbradas: number;
  contestadas: number;
  perdidas: number;
  duracionMin: number;
  efectividad?: number;
}

const MONTHS_ORDER = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const STEP_META: Record<
  string,
  { id: string; label: string; metaMin: number }
> = {
  step1: { id: 'step1', label: '1. Digiturno → Admisiones', metaMin: 15.0 },
  step2: { id: 'step2', label: '2. Proceso en Admisiones', metaMin: 5.0 },
  step3: { id: 'step3', label: '3. Preconsulta y Estudios', metaMin: 20.0 },
  step4: { id: 'step4', label: 'Consulta Oftalmólogo', metaMin: 35.0 },
  step5: { id: 'step5', label: '5. Orientación: HC, Órdenes y Cita', metaMin: 15.0 },
};

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('es-CO');
}

function fmtDec(n: number, decimals = 1): string {
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function DigiturnoContactPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('contact');

  // Shared multi-select filters (Años, Meses, Sedes)
  const ALL_YEARS_OPTIONS = ['2026', '2025'];
  const [selectedYears, setSelectedYears] = useState<string[]>(['2026']);
  const [yearMenuOpen, setYearMenuOpen] = useState<boolean>(false);

  const [selectedMonths, setSelectedMonths] = useState<string[]>([...MONTHS_ORDER]);
  const [monthMenuOpen, setMonthMenuOpen] = useState<boolean>(false);

  const ALL_SEDES_OPTIONS = [
    { id: 'Sede 1', label: 'Sede 1 · Principal' },
    { id: 'Sede 2', label: 'Sede 2 · Consultorios' },
  ];
  const [selectedSedes, setSelectedSedes] = useState<string[]>(['Sede 1', 'Sede 2']);
  const [sedeMenuOpen, setSedeMenuOpen] = useState<boolean>(false);

  const selectedSede =
    selectedSedes.length === 2
      ? 'Ambas'
      : selectedSedes.includes('Sede 1')
      ? 'Sede 1'
      : 'Sede 2';

  const selectedYear =
    selectedYears.length === 2 ? 'Todos' : selectedYears[0] ?? '2026';

  const toggleSelectYear = (yr: string) => {
    setSelectedYears((prev) => {
      if (prev.includes(yr)) {
        const next = prev.filter((x) => x !== yr);
        return next.length === 0 ? ['2026'] : next;
      }
      return [...prev, yr];
    });
  };

  const toggleSelectMonth = (m: string) => {
    setSelectedMonths((prev) => {
      if (prev.includes(m)) {
        const next = prev.filter((x) => x !== m);
        return next.length === 0 ? [...MONTHS_ORDER] : next;
      }
      return MONTHS_ORDER.filter((item) => prev.includes(item) || item === m);
    });
  };

  const toggleSelectSede = (sedeId: string) => {
    setSelectedSedes((prev) => {
      if (prev.includes(sedeId)) {
        const next = prev.filter((x) => x !== sedeId);
        return next.length === 0 ? ['Sede 1', 'Sede 2'] : next;
      }
      return [...prev, sedeId];
    });
  };
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    step1: true,
  });

  // Contact Center specific filters & expanded rows (Multiselección de líneas)
  const ALL_LINES_OPTIONS = [
    { id: '506012', label: 'Mutual Subsidiado', isMutual: true },
    { id: '506013', label: 'Mutual Contributivo', isMutual: true },
    { id: '506014', label: 'PYP (Particular y Prepagada) y Ecopetrol', isMutual: false },
    { id: '506015', label: 'Cirugía Refractiva', isMutual: false },
  ];
  const [selectedLines, setSelectedLines] = useState<string[]>(['506012', '506013', '506014', '506015']);
  const [lineMenuOpen, setLineMenuOpen] = useState<boolean>(false);

  const isAllSelected = selectedLines.length === 4;
  const isOnlyMutual =
    selectedLines.length === 2 &&
    selectedLines.includes('506012') &&
    selectedLines.includes('506013');
  const isOnlyComercial =
    selectedLines.length === 2 &&
    selectedLines.includes('506014') &&
    selectedLines.includes('506015');
  const excludeMutual = isOnlyComercial;

  const toggleSelectLineOption = (id: string) => {
    setSelectedLines((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length === 0 ? ['506012', '506013', '506014', '506015'] : next;
      }
      return [...prev, id];
    });
  };
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({
    '506012': true,
    '506014': true,
  });

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const toggleLine = (lineId: string) => {
    setExpandedLines((prev) => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  // ============================================================================
  // 1. CÁLCULOS ARITMÉTICOS DIGITURNO (SEDE 1 Y SEDE 2)
  // ============================================================================
  const digiturnoComputed = useMemo(() => {
    const records = (rawData.digiturnoMonthly || []).filter((item) => {
      if (!selectedYears.includes(String(item.year))) {
        return false;
      }
      if (!selectedMonths.includes(item.month)) {
        return false;
      }
      return true;
    });

    // Chart data across months for the selected year
    const chartRecords = (rawData.digiturnoMonthly || []).filter(
      (item) =>
        (selectedYear === 'Todos' ? item.year === 2026 : String(item.year) === selectedYear) &&
        selectedMonths.includes(item.month)
    );

    const monthlyChart = chartRecords.map((m) => {
      const s = m.steps;
      const s1Total =
        s.step1.sede1.espera +
        s.step1.sede1.atencion +
        s.step2.sede1.espera +
        s.step2.sede1.atencion +
        s.step3.sede1.espera +
        s.step3.sede1.atencion +
        s.step4.sede1.espera +
        s.step4.sede1.atencion +
        s.step5.sede1.espera +
        s.step5.sede1.atencion;

      const s2Total =
        s.step1.sede2.espera +
        s.step1.sede2.atencion +
        s.step2.sede2.espera +
        s.step2.sede2.atencion +
        s.step3.sede2.espera +
        s.step3.sede2.atencion +
        s.step4.sede2.espera +
        s.step4.sede2.atencion +
        s.step5.sede2.espera +
        s.step5.sede2.atencion;

      return {
        month: m.month,
        sede1: Math.round(s1Total),
        sede2: Math.round(s2Total),
      };
    });

    const stepKeys = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;
    const nMonths = Math.max(1, records.length);

    let totalTurnosS1 = 0;
    let totalTurnosS2 = 0;
    let sumEsperaS1 = 0;
    let sumAtencionS1 = 0;
    let sumEsperaS2 = 0;
    let sumAtencionS2 = 0;

    const rows = stepKeys.map((k) => {
      const meta = STEP_META[k];
      let tS1 = 0;
      let tS2 = 0;
      let wS1 = 0;
      let aS1 = 0;
      let wS2 = 0;
      let aS2 = 0;

      records.forEach((r) => {
        const st = r.steps[k];
        tS1 += st.sede1.turnos;
        tS2 += st.sede2.turnos;
        wS1 += st.sede1.espera;
        aS1 += st.sede1.atencion;
        wS2 += st.sede2.espera;
        aS2 += st.sede2.atencion;
      });

      wS1 = wS1 / nMonths;
      aS1 = aS1 / nMonths;
      wS2 = wS2 / nMonths;
      aS2 = aS2 / nMonths;

      const totS1 = wS1 + aS1;
      const totS2 = wS2 + aS2;

      totalTurnosS1 += tS1;
      totalTurnosS2 += tS2;
      sumEsperaS1 += wS1;
      sumAtencionS1 += aS1;
      sumEsperaS2 += wS2;
      sumAtencionS2 += aS2;

      let turnos = tS1 + tS2;
      let espera = (wS1 + wS2) / 2;
      let atencion = (aS1 + aS2) / 2;
      if (selectedSede === 'Sede 1') {
        turnos = tS1;
        espera = wS1;
        atencion = aS1;
      } else if (selectedSede === 'Sede 2') {
        turnos = tS2;
        espera = wS2;
        atencion = aS2;
      }
      const total = espera + atencion;
      const cumpl = Math.min(100, Math.round((meta.metaMin / Math.max(0.1, total)) * 1000) / 10);
      const cumplS1 = Math.min(100, Math.round((meta.metaMin / Math.max(0.1, totS1)) * 1000) / 10);
      const cumplS2 = Math.min(100, Math.round((meta.metaMin / Math.max(0.1, totS2)) * 1000) / 10);

      return {
        id: k,
        label: meta.label,
        metaMin: meta.metaMin,
        turnos,
        espera,
        atencion,
        total,
        cumpl,
        sede1: {
          turnos: tS1,
          espera: wS1,
          atencion: aS1,
          total: totS1,
          cumpl: cumplS1,
        },
        sede2: {
          turnos: tS2,
          espera: wS2,
          atencion: aS2,
          total: totS2,
          cumpl: cumplS2,
        },
      };
    });

    const totalTurnos =
      selectedSede === 'Sede 1'
        ? totalTurnosS1
        : selectedSede === 'Sede 2'
        ? totalTurnosS2
        : totalTurnosS1 + totalTurnosS2;

    const totalEspera =
      selectedSede === 'Sede 1'
        ? sumEsperaS1
        : selectedSede === 'Sede 2'
        ? sumEsperaS2
        : (sumEsperaS1 + sumEsperaS2) / 2;

    const totalAtencion =
      selectedSede === 'Sede 1'
        ? sumAtencionS1
        : selectedSede === 'Sede 2'
        ? sumAtencionS2
        : (sumAtencionS1 + sumAtencionS2) / 2;

    const totalCiclo = totalEspera + totalAtencion;
    const cumplGlobal = Math.min(100, Math.round((90.0 / Math.max(1, totalCiclo)) * 1000) / 10);

    return {
      monthlyChart,
      rows,
      totalTurnos,
      totalTurnosS1,
      totalTurnosS2,
      totalEspera,
      totalAtencion,
      totalCiclo,
      cicloS1: sumEsperaS1 + sumAtencionS1,
      cicloS2: sumEsperaS2 + sumAtencionS2,
      esperaS1: sumEsperaS1,
      esperaS2: sumEsperaS2,
      atencionS1: sumAtencionS1,
      atencionS2: sumAtencionS2,
      cumplGlobal,
    };
  }, [selectedYear, selectedYears, selectedMonths, selectedSede]);

  // ============================================================================
  // 2. CÁLCULOS ARITMÉTICOS CONTACT CENTER (PBX) CON BOTÓN EXCLUIR MUTUAL
  // ============================================================================
  const contactComputed = useMemo(() => {
    const records = (rawData.contactCenterMonthly || []).filter((item) => {
      if (!selectedYears.includes(String(item.year))) {
        return false;
      }
      if (!selectedMonths.includes(item.month)) {
        return false;
      }
      return true;
    });

    const chartRecords = (rawData.contactCenterMonthly || []).filter(
      (item) =>
        selectedYears.includes(String(item.year)) &&
        selectedMonths.includes(item.month)
    );

    const monthlyChart = chartRecords.map((m) => {
      const validLines = m.lines.filter((l) => {
        if (!selectedLines.includes(l.id)) return false;
        return true;
      });
      const rec = validLines.reduce((acc, x) => acc + x.recibidas, 0);
      const con = validLines.reduce((acc, x) => acc + x.contestadas, 0);
      const per = validLines.reduce((acc, x) => acc + x.perdidas, 0);
      return {
        month: m.month.slice(0, 3),
        fullMonth: m.month,
        Recibidas: rec,
        Contestadas: con,
        Perdidas: per,
      };
    });

    // Aggregate lines
    const lineMap: Record<
      string,
      {
        id: string;
        name: string;
        isMutual: boolean;
        recibidas: number;
        contestadas: number;
        perdidas: number;
        esperaMin: number;
        slaPct: number;
        count: number;
        agentsMap: Record<string, { id: string; name: string; timbradas: number; contestadas: number; perdidas: number; duracionWeighted: number }>;
      }
    > = {};

    // Aggregate agents
    const agentMap: Record<
      string,
      {
        id: string;
        name: string;
        timbradas: number;
        contestadas: number;
        perdidas: number;
        duracionMin: number;
        count: number;
      }
    > = {};

    let allWithMutualRec = 0;
    let allWithoutMutualRec = 0;
    let allWithoutMutualCon = 0;

    records.forEach((r) => {
      r.lines.forEach((l) => {
        allWithMutualRec += l.recibidas;
        if (!l.isMutual) {
          allWithoutMutualRec += l.recibidas;
          allWithoutMutualCon += l.contestadas;
        }
        if (!selectedLines.includes(l.id)) return;

        if (!lineMap[l.id]) {
          lineMap[l.id] = {
            id: l.id,
            name: l.name,
            isMutual: l.isMutual,
            recibidas: 0,
            contestadas: 0,
            perdidas: 0,
            esperaMin: 0,
            slaPct: 0,
            count: 0,
            agentsMap: {},
          };
        }
        lineMap[l.id].recibidas += l.recibidas;
        lineMap[l.id].contestadas += l.contestadas;
        lineMap[l.id].perdidas += l.perdidas;
        lineMap[l.id].esperaMin += l.esperaMin;
        lineMap[l.id].slaPct += l.slaPct;
        lineMap[l.id].count += 1;
        (l.agents || []).forEach((qa: QueueAgentItem) => {
          if (!lineMap[l.id].agentsMap[qa.id]) {
            lineMap[l.id].agentsMap[qa.id] = {
              id: qa.id,
              name: qa.name,
              timbradas: 0,
              contestadas: 0,
              perdidas: 0,
              duracionWeighted: 0,
            };
          }
          lineMap[l.id].agentsMap[qa.id].timbradas += qa.timbradas;
          lineMap[l.id].agentsMap[qa.id].contestadas += qa.contestadas;
          lineMap[l.id].agentsMap[qa.id].perdidas += qa.perdidas;
          lineMap[l.id].agentsMap[qa.id].duracionWeighted += qa.duracionMin * Math.max(1, qa.contestadas);
        });
      });

      r.agents.forEach((a) => {
        if (!agentMap[a.id]) {
          agentMap[a.id] = {
            id: a.id,
            name: a.name,
            timbradas: 0,
            contestadas: 0,
            perdidas: 0,
            duracionMin: 0,
            count: 0,
          };
        }
        agentMap[a.id].timbradas += a.timbradas;
        agentMap[a.id].contestadas += a.contestadas;
        agentMap[a.id].perdidas += a.perdidas;
        agentMap[a.id].duracionMin += a.duracionMin;
        agentMap[a.id].count += 1;
      });
    });

    const linesList = Object.values(lineMap).map((l) => {
      const espera = l.count > 0 ? l.esperaMin / l.count : 0;
      const sla = l.count > 0 ? l.slaPct / l.count : 0;
      const efect = l.recibidas > 0 ? (l.contestadas / l.recibidas) * 100 : 0;
      const qAgents = Object.values(l.agentsMap)
        .map((qa) => ({
          id: qa.id,
          name: qa.name,
          timbradas: qa.timbradas,
          contestadas: qa.contestadas,
          perdidas: qa.perdidas,
          duracionMin: Math.round((qa.duracionWeighted / Math.max(1, qa.contestadas)) * 10) / 10,
          efectividad: qa.timbradas > 0 ? (qa.contestadas / qa.timbradas) * 100 : 0,
        }))
        .sort((a, b) => b.contestadas - a.contestadas);
      return {
        ...l,
        esperaMin: espera,
        slaPct: sla,
        efectividad: efect,
        agents: qAgents,
      };
    });

    const totalContestadasGlobal = Object.values(agentMap).reduce(
      (acc, a) => acc + a.contestadas,
      0
    );

    const agentsList = Object.values(agentMap).map((a) => {
      const dur = a.count > 0 ? a.duracionMin / a.count : 0;
      const efect = a.timbradas > 0 ? (a.contestadas / a.timbradas) * 100 : 0;
      const share =
        totalContestadasGlobal > 0 ? a.contestadas / totalContestadasGlobal : 1 / 6;
      return {
        ...a,
        duracionMin: dur,
        efectividad: efect,
        share,
      };
    });

    const totalRecibidas = linesList.reduce((acc, l) => acc + l.recibidas, 0);
    const totalContestadas = linesList.reduce((acc, l) => acc + l.contestadas, 0);
    const totalPerdidas = linesList.reduce((acc, l) => acc + l.perdidas, 0);
    const efectividadGlobal =
      totalRecibidas > 0 ? (totalContestadas / totalRecibidas) * 100 : 0;
    const abandonoGlobal =
      totalRecibidas > 0 ? (totalPerdidas / totalRecibidas) * 100 : 0;

    const weightedEspera =
      totalRecibidas > 0
        ? linesList.reduce((acc, l) => acc + l.esperaMin * l.recibidas, 0) /
          totalRecibidas
        : 0;

    const weightedSla =
      totalRecibidas > 0
        ? linesList.reduce((acc, l) => acc + l.slaPct * l.recibidas, 0) /
          totalRecibidas
        : 0;

    const totalTimbresNoContestados = agentsList.reduce(
      (acc, a) => acc + a.perdidas,
      0
    );
    const sinMutualEfect =
      allWithoutMutualRec > 0
        ? (allWithoutMutualCon / allWithoutMutualRec) * 100
        : 92.7;

    return {
      monthlyChart,
      linesList,
      agentsList,
      totalRecibidas,
      totalContestadas,
      totalPerdidas,
      efectividadGlobal,
      abandonoGlobal,
      weightedEspera,
      weightedSla,
      totalTimbresNoContestados,
      allWithoutMutualRec,
      sinMutualEfect,
    };
  }, [selectedYear, selectedYears, selectedMonths, selectedLines]);

  const badgeColor = (pct: number) => {
    if (pct >= 85) {
      return {
        bar: 'bg-emerald-500',
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (pct >= 65) {
      return {
        bar: 'bg-amber-400',
        pill: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      bar: 'bg-rose-400',
      pill: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  };

  return (
    <div className="text-slate-800">
      {/* CABECERA COMPACTA Y ESTILIZADA EN 2 FILAS SIN DESBORDE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-5 py-3.5 mb-4 flex flex-col gap-3">
        {/* Fila 1: Título amplio en una sola línea + Switcher de Pestañas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-snug truncate">
                Tiempos de Digiturno y Gestión Contact Center
              </h1>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Control operativo de tiempos de atención en sedes y nivel de servicio telefónico
              </p>
              {/* Esta pantalla NO consulta el digiturno cada vez: lee un
                  archivo que hay que regenerar. Se dice de cuando es. */}
              <div className="mt-1.5">
                <FechaDelDato
                  fecha={(rawData as { updatedAt?: string }).updatedAt}
                  queEs="Datos"
                  avisaA={2}
                  alarmaA={5}
                  comoSeActualiza="hay que volver a extraer del digiturno y del PBX"
                />
              </div>
            </div>
          </div>

          {/* Switcher Pestañas */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('digiturno')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'digiturno'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeTab === 'digiturno' ? 'bg-white' : 'bg-slate-400'
                }`}
              />
              Digiturno
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'contact'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeTab === 'contact' ? 'bg-white' : 'bg-slate-400'
                }`}
              />
              Contact Center (PBX)
            </button>
          </div>
        </div>

        {/* Fila 2: Barra de filtros limpia dentro de la tarjeta */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">

          {/* Selector Rápido de 3 Vistas sincronizado con la multiselección */}
          {activeTab === 'contact' && (
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setSelectedLines(['506012', '506013', '506014', '506015'])}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  isAllSelected
                    ? 'bg-[#2B579A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas las líneas
              </button>
              <button
                type="button"
                onClick={() => setSelectedLines(['506012', '506013'])}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  isOnlyMutual
                    ? 'bg-[#2B579A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Solo Mutual Ser
              </button>
              <button
                type="button"
                onClick={() => setSelectedLines(['506014', '506015'])}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  isOnlyComercial
                    ? 'bg-[#2E9E6B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                PYP (Particular y Prepagada) y Ecopetrol
              </button>
            </div>
          )}

          {/* Filtro Multiselección de Sede (Digiturno) o Líneas (Contact Center) */}
          {activeTab === 'digiturno' ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSedeMenuOpen((o) => !o)}
                className="pl-2.5 pr-3 py-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 flex items-center gap-2 focus:outline-none transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-[#2B579A]" />
                <span>
                  {selectedSedes.length === 2
                    ? 'Sedes: Ambas (2)'
                    : `Sede: ${selectedSedes[0]}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {sedeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setSedeMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-30 p-2 space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Sedes</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSedes(['Sede 1', 'Sede 2'])}
                        className="text-[#2B579A] hover:underline lowercase font-semibold"
                      >
                        marcar ambas
                      </button>
                    </div>
                    {ALL_SEDES_OPTIONS.map((opt) => {
                      const checked = selectedSedes.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleSelectSede(opt.id)}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-[11.5px] transition-colors select-none ${
                            checked
                              ? 'bg-[#EEF4FF]/90 text-[#0F172A] font-semibold'
                              : 'text-slate-600 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#2B579A] pointer-events-none"
                          />
                          <span className="truncate">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setLineMenuOpen((o) => !o)}
                className="pl-2.5 pr-3 py-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 flex items-center gap-2 focus:outline-none transition-colors"
              >
                <Filter className="w-3 h-3 text-[#2B579A]" />
                <span>
                  {selectedLines.length === 4
                    ? 'Líneas: Todas (4)'
                    : selectedLines.length === 1
                    ? `Línea: ${
                        ALL_LINES_OPTIONS.find((o) => o.id === selectedLines[0])?.label ?? '1 seleccionada'
                      }`
                    : `Líneas: ${selectedLines.length} seleccionadas`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {lineMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setLineMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-30 p-2 space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Seleccionar una o varias</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLines(['506012', '506013', '506014', '506015'])}
                        className="text-[#2B579A] hover:underline lowercase font-semibold"
                      >
                        marcar todas
                      </button>
                    </div>
                    {ALL_LINES_OPTIONS.map((opt) => {
                      const checked = selectedLines.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleSelectLineOption(opt.id)}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-[11.5px] transition-colors select-none ${
                            checked
                              ? 'bg-[#EEF4FF]/90 text-[#0F172A] font-semibold'
                              : 'text-slate-600 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#2B579A] pointer-events-none"
                          />
                          <span className="truncate">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Filtro Multiselección de Año */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setYearMenuOpen((o) => !o)}
              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 focus:outline-none transition-colors"
            >
              <span>
                {selectedYears.length === 2
                  ? 'Años: 2025 y 2026'
                  : `Año: ${selectedYears[0] ?? '2026'}`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {yearMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setYearMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-30 p-2 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Años</span>
                    <button
                      type="button"
                      onClick={() => setSelectedYears(['2026', '2025'])}
                      className="text-[#2B579A] hover:underline lowercase font-semibold"
                    >
                      marcar ambos
                    </button>
                  </div>
                  {ALL_YEARS_OPTIONS.map((yr) => {
                    const checked = selectedYears.includes(yr);
                    return (
                      <div
                        key={yr}
                        onClick={() => toggleSelectYear(yr)}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-[11.5px] transition-colors select-none ${
                          checked
                            ? 'bg-[#EEF4FF]/90 text-[#0F172A] font-semibold'
                            : 'text-slate-600 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="w-3.5 h-3.5 rounded border-slate-300 text-[#2B579A] pointer-events-none"
                        />
                        <span>{yr}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Filtro Multiselección de Meses */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMonthMenuOpen((o) => !o)}
              className="pl-2.5 pr-3 py-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 flex items-center gap-2 focus:outline-none transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#2B579A]" />
              <span>
                {selectedMonths.length === MONTHS_ORDER.length
                  ? 'Meses: Todos (12)'
                  : selectedMonths.length === 1
                  ? `Mes: ${selectedMonths[0]}`
                  : selectedMonths.length <= 3
                  ? `Meses: ${selectedMonths.map((m) => m.slice(0, 3)).join(', ')}`
                  : `Meses: ${selectedMonths.length} seleccionados`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {monthMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMonthMenuOpen(false)}
                />
                <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-30 p-2.5 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Seleccionar uno o varios</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMonths([...MONTHS_ORDER])}
                      className="text-[#2B579A] hover:underline lowercase font-semibold"
                    >
                      marcar todos
                    </button>
                  </div>

                  {/* Atajos rápidos de meses */}
                  <div className="flex flex-wrap gap-1 pb-1.5 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedMonths(['Octubre'])}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-[#EEF4FF] text-[10px] font-semibold text-slate-700 hover:text-[#2B579A] transition-colors"
                    >
                      Solo Octubre
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMonths(['Septiembre', 'Octubre'])}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-[#EEF4FF] text-[10px] font-semibold text-slate-700 hover:text-[#2B579A] transition-colors"
                    >
                      Sep + Oct
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMonths(['Agosto', 'Septiembre', 'Octubre'])}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-[#EEF4FF] text-[10px] font-semibold text-slate-700 hover:text-[#2B579A] transition-colors"
                    >
                      Últ. 3 meses
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1 max-h-60 overflow-y-auto pr-0.5">
                    {MONTHS_ORDER.map((m) => {
                      const checked = selectedMonths.includes(m);
                      return (
                        <div
                          key={m}
                          onClick={() => toggleSelectMonth(m)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] transition-colors select-none ${
                            checked
                              ? 'bg-[#EEF4FF]/90 text-[#0F172A] font-semibold'
                              : 'text-slate-600 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#2B579A] pointer-events-none"
                          />
                          <span className="truncate">{m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          VISTA 1: CONTACT CENTER (PBX)
         ===================================================================== */}
      {activeTab === 'contact' ? (
        <div className="space-y-4">
          {/* 4 TARJETAS KPI DELICADAS (LETRA PEQUEÑA Y ESTILIZADA) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-500 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  LLAMADAS RECIBIDAS
                </span>
                <PhoneIncoming className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtNum(contactComputed.totalRecibidas)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Prom: {fmtNum(Math.max(1, contactComputed.totalRecibidas / 48))} llamadas/día · PYP y Ecopetrol:{' '}
                <span className="font-semibold text-slate-700">
                  {fmtNum(contactComputed.allWithoutMutualRec)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-500 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  LLAMADAS CONTESTADAS
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtNum(contactComputed.totalContestadas)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {fmtDec(contactComputed.efectividadGlobal)}% efectividad · PYP y Ecopetrol:{' '}
                <span className="font-semibold text-emerald-700">
                  {fmtDec(contactComputed.sinMutualEfect)}%
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-rose-400 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  LLAMADAS PERDIDAS
                </span>
                <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtNum(contactComputed.totalPerdidas)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {fmtDec(contactComputed.abandonoGlobal)}% perdidas ·{' '}
                {fmtNum(contactComputed.totalTimbresNoContestados)} por timbre no contestado
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-amber-400 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  NIVEL DE SERVICIO (SLA)
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtDec(contactComputed.weightedSla)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Espera prom: {fmtDec(contactComputed.weightedEspera)} min · PYP y Ecopetrol:{' '}
                <span className="font-semibold text-slate-700">0,5 min</span>
              </div>
            </div>
          </div>

          {/* GRÁFICO MENSUAL DE BARRAS DELGADAS CON DATOS ARRIBA */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600">
                Evolución Mensual de Llamadas ({selectedYear === 'Todos' ? '2026' : selectedYear})
              </span>
              <div className="flex items-center gap-4 text-[10px] font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  Recibidas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Contestadas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  Perdidas
                </span>
              </div>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contactComputed.monthlyChart}
                  margin={{ top: 32, right: 20, left: -8, bottom: 2 }}
                  barGap={18}
                  barCategoryGap="6%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94A3B8' }}
                    tickFormatter={(v: number) => fmtNum(v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '10px',
                      borderColor: '#E2E8F0',
                    }}
                  />
                  <Bar
                    dataKey="Recibidas"
                    fill="#5B67CA"
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                  >
                    <LabelList
                      dataKey="Recibidas"
                      position="top"
                      offset={10}
                      formatter={(v: number) => fmtNum(v)}
                      style={{ fontSize: '9px', fill: '#334155', fontWeight: 600 }}
                    />
                  </Bar>
                  <Bar
                    dataKey="Contestadas"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                  >
                    <LabelList
                      dataKey="Contestadas"
                      position="top"
                      offset={10}
                      formatter={(v: number) => fmtNum(v)}
                      style={{ fontSize: '9px', fill: '#065F46', fontWeight: 600 }}
                    />
                  </Bar>
                  <Bar
                    dataKey="Perdidas"
                    fill="#E57373"
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                  >
                    <LabelList
                      dataKey="Perdidas"
                      position="top"
                      offset={10}
                      formatter={(v: number) => fmtNum(v)}
                      style={{ fontSize: '9px', fill: '#991B1B', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLA DESPLEGABLE EN LETRA PEQUEÑA (11px) Y BARRAS DELGADAS DE 4px */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    <th className="text-left py-2.5 px-4">LÍNEA DE ATENCIÓN / AGENTE</th>
                    <th className="text-right py-2.5 px-3">RECIBIDAS / TIMB.</th>
                    <th className="text-right py-2.5 px-3">CONTESTADAS</th>
                    <th className="text-right py-2.5 px-3">PERDIDAS / NO CONT.</th>
                    <th className="text-right py-2.5 px-3">ESPERA PROM.</th>
                    <th className="text-right py-2.5 px-4 w-52">% EFECTIVIDAD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {contactComputed.linesList.map((line) => {
                    const isOpen = !!expandedLines[line.id];
                    const isComercial =
                      line.name.toLowerCase().includes('pyp') ||
                      line.name.toLowerCase().includes('prepagada') ||
                      line.name.toLowerCase().includes('refractiva');

                    // Agentes 100% reales que atendieron esta cola específica en Sonata PBX
                    const rawAgents: QueueAgentItem[] = line.agents || [];
                    const lineRecibidas = line.recibidas;
                    const lineContestadas = line.contestadas;
                    const linePerdidas = line.perdidas;
                    const lineEfectividad = line.efectividad;
                    const colors = badgeColor(lineEfectividad);

                    return (
                      <React.Fragment key={line.id}>
                        {/* FILA DE TÍTULO Y TOTALIZADOR DE LA LÍNEA */}
                        <tr
                          onClick={() => toggleLine(line.id)}
                          className={`cursor-pointer transition-colors border-l-4 ${
                            isComercial
                              ? 'bg-[#ECFDF5]/85 hover:bg-[#D1FAE5]/70 border-l-[#2E9E6B]'
                              : 'bg-[#EEF4FF]/90 hover:bg-[#DBEAFE]/75 border-l-[#2B579A]'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-bold text-[#0F172A] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-md bg-white border flex items-center justify-center shadow-2xs shrink-0 ${
                                  isComercial
                                    ? 'border-emerald-200 text-[#2E9E6B]'
                                    : 'border-blue-200 text-[#2B579A]'
                                }`}
                              >
                                {isOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.4]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.4]" />
                                )}
                              </span>
                              <span className="text-[12px] tracking-tight whitespace-nowrap">
                                {line.name}
                              </span>
                              <span
                                className={`ml-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold whitespace-nowrap border shrink-0 ${
                                  isComercial
                                    ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300/80'
                                    : 'bg-[#2B579A]/10 text-[#1E3A8A] border-[#2B579A]/20'
                                }`}
                              >
                                {rawAgents.length} agentes
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[11.5px] text-[#0F172A]">
                            {fmtNum(lineRecibidas)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[11.5px] text-[#0F172A]">
                            {fmtNum(lineContestadas)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[11.5px] text-[#0F172A]">
                            {fmtNum(linePerdidas)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[11.5px] text-slate-800">
                            {fmtDec(line.esperaMin)} min
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="w-28 bg-white/90 border border-slate-200/70 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`${colors.bar} h-1.5 rounded-full`}
                                  style={{
                                    width: `${Math.min(100, Math.max(4, lineEfectividad))}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.pill} min-w-[48px] text-center shadow-2xs`}
                              >
                                {fmtDec(lineEfectividad)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* FILAS DE AGENTES CON AVATAR EJECUTIVO DE USUARIO */}
                        {isOpen &&
                          rawAgents.map((ag) => {
                            const agEfec = ag.timbradas > 0 ? (ag.contestadas / ag.timbradas) * 100 : (ag.efectividad ?? 0);
                            const agColors = badgeColor(agEfec);
                            const statusDot =
                              agEfec >= 85
                                ? 'bg-emerald-500'
                                : agEfec >= 70
                                ? 'bg-amber-400'
                                : 'bg-rose-500';

                            return (
                              <tr
                                key={`${line.id}-${ag.id}`}
                                className="bg-white hover:bg-slate-50/70 text-slate-600 transition-colors"
                              >
                                <td className="py-2 pl-9 pr-4 text-[11px] font-medium text-slate-700">
                                  <div className="flex items-center gap-2.5">
                                    <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-[#EEF4FF] to-[#E0E7FF] border border-[#C7D2FE] flex items-center justify-center text-[#2B579A] shadow-2xs shrink-0">
                                      <User className="w-3.5 h-3.5 stroke-[2.2]" />
                                      <span
                                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white ${statusDot}`}
                                      />
                                    </div>
                                    <span className="font-semibold text-slate-800">{ag.name}</span>
                                    <span className="text-[9.5px] text-slate-400 font-normal hidden sm:inline">
                                      · Agente PBX
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-slate-700">
                                  {fmtNum(ag.timbradas)} timb.
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-slate-700">
                                  {fmtNum(ag.contestadas)}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-slate-700">
                                  {fmtNum(ag.perdidas)} no cont.
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500">
                                  {fmtDec(ag.duracionMin)} min
                                </td>
                                <td className="py-2 px-4">
                                  <div className="flex items-center justify-end gap-2.5">
                                    <div className="w-28 bg-slate-100 h-1 rounded-full overflow-hidden">
                                      <div
                                        className={`${agColors.bar} h-1 rounded-full`}
                                        style={{
                                          width: `${Math.min(100, Math.max(4, agEfec))}%`,
                                        }}
                                      />
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${agColors.pill} min-w-[48px] text-center`}
                                    >
                                      {fmtDec(agEfec)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}

                  {/* FOOTER TOTAL CONSOLIDADO */}
                  <tr className="bg-[#1E293B] font-bold text-white border-t-2 border-[#0F172A]">
                    <td className="py-2.5 px-4 text-[11.5px] tracking-wide uppercase">
                      TOTAL GENERAL CONSOLIDADO ({contactComputed.linesList.length} LÍNEAS)
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11.5px]">
                      {fmtNum(contactComputed.totalRecibidas)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11.5px]">
                      {fmtNum(contactComputed.totalContestadas)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11.5px]">
                      {fmtNum(contactComputed.totalPerdidas)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11.5px]">
                      {fmtDec(contactComputed.weightedEspera)} min
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-28 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`${
                              badgeColor(contactComputed.efectividadGlobal).bar
                            } h-1.5 rounded-full`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(4, contactComputed.efectividadGlobal)
                              )}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            badgeColor(contactComputed.efectividadGlobal).pill
                          } min-w-[48px] text-center`}
                        >
                          {fmtDec(contactComputed.efectividadGlobal)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           VISTA 2: DIGITURNO (SEDE 1 Y SEDE 2)
           ===================================================================== */
        <div className="space-y-4">
          {/* 4 TARJETAS KPI DELICADAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-500 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  TURNOS ATENDIDOS
                </span>
                <Users className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtNum(digiturnoComputed.totalTurnos)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Sede 1: {fmtNum(digiturnoComputed.totalTurnosS1)} (30,7%) · Sede 2:{' '}
                {fmtNum(digiturnoComputed.totalTurnosS2)} (69,3%)
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-amber-400 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  TIEMPO ESPERA EN SALA
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtDec(digiturnoComputed.totalEspera)} min
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {fmtDec(
                  (digiturnoComputed.totalEspera /
                    Math.max(1, digiturnoComputed.totalCiclo)) *
                    100
                )}
                % del ciclo total · S1: {fmtDec(digiturnoComputed.esperaS1)}m · S2:{' '}
                {fmtDec(digiturnoComputed.esperaS2)}m
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-500 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  TIEMPO EN ATENCIÓN
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtDec(digiturnoComputed.totalAtencion)} min
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {fmtDec(
                  (digiturnoComputed.totalAtencion /
                    Math.max(1, digiturnoComputed.totalCiclo)) *
                    100
                )}
                % del ciclo total · S1: {fmtDec(digiturnoComputed.atencionS1)}m · S2:{' '}
                {fmtDec(digiturnoComputed.atencionS2)}m
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-rose-400 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  CICLO TOTAL (5 PASOS)
                </span>
                <Activity className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtDec(digiturnoComputed.totalCiclo)} min
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Meta: 90 min · Cumplimiento: {fmtDec(digiturnoComputed.cumplGlobal)}%
              </div>
            </div>
          </div>

          {/* GRÁFICO MENSUAL DE BARRAS CON SUS DATOS ARRIBA */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600">
                Tiempo Total del Ciclo por Mes · Sede 1 vs. Sede 2 ({selectedYear === 'Todos' ? '2026' : selectedYear})
              </span>
              <div className="flex items-center gap-4 text-[10px] font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  Sede 1 (min)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Sede 2 (min)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                  Meta 90 min
                </span>
              </div>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={digiturnoComputed.monthlyChart}
                  margin={{ top: 32, right: 18, left: -8, bottom: 2 }}
                  barGap={16}
                  barCategoryGap="22%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 150]}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '10px',
                      borderColor: '#E2E8F0',
                    }}
                  />
                  <ReferenceLine
                    y={90}
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                  />
                  <Bar
                    dataKey="sede1"
                    name="Sede 1"
                    fill="#5B67CA"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  >
                    <LabelList
                      dataKey="sede1"
                      position="top"
                      offset={10}
                      formatter={(v: number) => `${v}m`}
                      style={{ fontSize: '9px', fill: '#334155', fontWeight: 600 }}
                    />
                  </Bar>
                  <Bar
                    dataKey="sede2"
                    name="Sede 2"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  >
                    <LabelList
                      dataKey="sede2"
                      position="top"
                      offset={10}
                      formatter={(v: number) => `${v}m`}
                      style={{ fontSize: '9px', fill: '#065F46', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLA DESPLEGABLE DE LOS 5 PASOS EN LETRA PEQUEÑA (11px) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="text-left py-2.5 px-4">ETAPA DEL RECORRIDO / SEDE</th>
                    <th className="text-right py-2.5 px-3">TURNOS</th>
                    <th className="text-right py-2.5 px-3">ESPERA</th>
                    <th className="text-right py-2.5 px-3">ATENCIÓN</th>
                    <th className="text-right py-2.5 px-3">TOTAL ETAPA</th>
                    <th className="text-right py-2.5 px-4 w-56">% CUMPLIMIENTO META</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {digiturnoComputed.rows.map((row) => {
                    const isOpen = !!expandedSteps[row.id];
                    const colors = badgeColor(row.cumpl);
                    const cS1 = badgeColor(row.sede1.cumpl);
                    const cS2 = badgeColor(row.sede2.cumpl);

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => toggleStep(row.id)}
                          className="bg-[#EEF4FF]/90 hover:bg-[#DBEAFE]/75 border-l-4 border-l-[#2B579A] cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 font-bold text-[#0F172A] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-white border border-blue-200 text-[#2B579A] flex items-center justify-center shadow-2xs shrink-0">
                                {isOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.4]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.4]" />
                                )}
                              </span>
                              <span className="text-[12px] tracking-tight whitespace-nowrap">{row.label}</span>
                              <span className="ml-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold whitespace-nowrap bg-[#2B579A]/10 text-[#1E3A8A] border border-[#2B579A]/20 shrink-0">
                                2 sedes
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {fmtNum(row.turnos)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {fmtDec(row.espera)} min
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {fmtDec(row.atencion)} min
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {fmtDec(row.total)} min
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="w-28 bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`${colors.bar} h-1 rounded-full`}
                                  style={{
                                    width: `${Math.min(100, Math.max(4, row.cumpl))}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors.pill} min-w-[46px] text-center`}
                              >
                                {fmtDec(row.cumpl)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isOpen && (
                          <>
                            <tr className="bg-white hover:bg-slate-50/40 text-slate-600">
                              <td className="py-2 pl-9 pr-4 text-[11px] font-medium text-slate-700">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#EEF4FF] to-[#E0E7FF] border border-[#C7D2FE] flex items-center justify-center text-[#2B579A] shadow-2xs shrink-0">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-semibold text-slate-800">Sede 1 · Principal</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                {fmtNum(row.sede1.turnos)}
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                {fmtDec(row.sede1.espera)} min
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                {fmtDec(row.sede1.atencion)} min
                              </td>
                              <td className="py-1.5 px-3 text-right font-medium text-slate-700">
                                {fmtDec(row.sede1.total)} min
                              </td>
                              <td className="py-1.5 px-4">
                                <div className="flex items-center justify-end gap-2.5">
                                  <div className="w-28 bg-slate-100 h-1 rounded-full overflow-hidden">
                                    <div
                                      className={`${cS1.bar} h-1 rounded-full`}
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(4, row.sede1.cumpl)
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cS1.pill} min-w-[46px] text-center`}
                                  >
                                    {fmtDec(row.sede1.cumpl)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr className="bg-white hover:bg-slate-50/40 text-slate-600">
                              <td className="py-2 pl-9 pr-4 text-[11px] font-medium text-slate-700">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-emerald-200 flex items-center justify-center text-[#2E9E6B] shadow-2xs shrink-0">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-semibold text-slate-800">Sede 2 · Consultorios</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                {fmtNum(row.sede2.turnos)}
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                {fmtDec(row.sede2.espera)} min
                              </td>
                              <td className="py-1.5 px-3 text-right">
                                {fmtDec(row.sede2.atencion)} min
                              </td>
                              <td className="py-1.5 px-3 text-right font-medium text-slate-700">
                                {fmtDec(row.sede2.total)} min
                              </td>
                              <td className="py-1.5 px-4">
                                <div className="flex items-center justify-end gap-2.5">
                                  <div className="w-28 bg-slate-100 h-1 rounded-full overflow-hidden">
                                    <div
                                      className={`${cS2.bar} h-1 rounded-full`}
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(4, row.sede2.cumpl)
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cS2.pill} min-w-[46px] text-center`}
                                  >
                                    {fmtDec(row.sede2.cumpl)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* FOOTER TOTAL */}
                  <tr className="bg-[#1E293B] font-bold text-white border-t-2 border-[#0F172A]">
                    <td className="py-2.5 px-4 text-[11.5px] tracking-wide uppercase">TOTAL GENERAL CICLO DEL PACIENTE</td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtNum(digiturnoComputed.totalTurnos)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtDec(digiturnoComputed.totalEspera)} min
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtDec(digiturnoComputed.totalAtencion)} min
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtDec(digiturnoComputed.totalCiclo)} min
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-28 bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div
                            className={`${
                              badgeColor(digiturnoComputed.cumplGlobal).bar
                            } h-1 rounded-full`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(4, digiturnoComputed.cumplGlobal)
                              )}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            badgeColor(digiturnoComputed.cumplGlobal).pill
                          } min-w-[46px] text-center`}
                        >
                          {fmtDec(digiturnoComputed.cumplGlobal)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
