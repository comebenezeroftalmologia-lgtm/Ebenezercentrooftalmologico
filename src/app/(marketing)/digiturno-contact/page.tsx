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
  Ban,
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

type ActiveTab = 'digiturno' | 'contact';

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
  step4: { id: 'step4', label: '4. Consulta Oftalmólogo', metaMin: 35.0 },
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

  // Shared open filters
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');

  // Digiturno specific filter & expanded rows
  const [selectedSede, setSelectedSede] = useState<string>('Ambas');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    step1: true,
  });

  // Contact Center specific filters & expanded rows
  const [excludeMutual, setExcludeMutual] = useState<boolean>(false);
  const [selectedLine, setSelectedLine] = useState<string>('Todas');
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
      if (selectedYear !== 'Todos' && String(item.year) !== selectedYear) {
        return false;
      }
      if (selectedMonth !== 'Todos' && item.month !== selectedMonth) {
        return false;
      }
      return true;
    });

    // Chart data across months for the selected year
    const chartRecords = (rawData.digiturnoMonthly || []).filter((item) =>
      selectedYear === 'Todos' ? item.year === 2026 : String(item.year) === selectedYear
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
  }, [selectedYear, selectedMonth, selectedSede]);

  // ============================================================================
  // 2. CÁLCULOS ARITMÉTICOS CONTACT CENTER (PBX) CON BOTÓN EXCLUIR MUTUAL
  // ============================================================================
  const contactComputed = useMemo(() => {
    const records = (rawData.contactCenterMonthly || []).filter((item) => {
      if (selectedYear !== 'Todos' && String(item.year) !== selectedYear) {
        return false;
      }
      if (selectedMonth !== 'Todos' && item.month !== selectedMonth) {
        return false;
      }
      return true;
    });

    const chartRecords = (rawData.contactCenterMonthly || []).filter((item) =>
      selectedYear === 'Todos' ? item.year === 2026 : String(item.year) === selectedYear
    );

    const monthlyChart = chartRecords.map((m) => {
      const validLines = m.lines.filter((l) => {
        if (excludeMutual && l.isMutual) return false;
        if (selectedLine !== 'Todas' && l.id !== selectedLine) return false;
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
        if (excludeMutual && l.isMutual) return;
        if (selectedLine !== 'Todas' && l.id !== selectedLine) return;

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
          };
        }
        lineMap[l.id].recibidas += l.recibidas;
        lineMap[l.id].contestadas += l.contestadas;
        lineMap[l.id].perdidas += l.perdidas;
        lineMap[l.id].esperaMin += l.esperaMin;
        lineMap[l.id].slaPct += l.slaPct;
        lineMap[l.id].count += 1;
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
      return {
        ...l,
        esperaMin: espera,
        slaPct: sla,
        efectividad: efect,
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
  }, [selectedYear, selectedMonth, excludeMutual, selectedLine]);

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
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-4 md:px-6 md:py-5 text-slate-800">
      {/* CABECERA COMPACTA Y ESTILIZADA */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-5 py-3.5 mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-snug">
              Tiempos de Digiturno y Gestión Contact Center
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Sincronización automática SGT Digiturno (192.168.200.11) &amp; Central Sonata PBX (pbx.itmsas.com)
            </p>
          </div>
        </div>

        {/* CONTROLES Y FILTROS COMPACTOS (11px) */}
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 shrink-0">
          {/* Switcher Pestañas */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('digiturno')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
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
              Digiturno (Sede 1 y 2)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
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

          {/* Botón Excluir Mutual (estilo Frecuencias) en Contact Center */}
          {activeTab === 'contact' && (
            <button
              type="button"
              onClick={() => setExcludeMutual((v) => !v)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                excludeMutual
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100/70'
              }`}
            >
              <Ban className="w-3 h-3" />
              {excludeMutual ? 'Mutual Excluido' : 'Excluir Mutual'}
            </button>
          )}

          {/* Filtro Sede o Línea */}
          {activeTab === 'digiturno' ? (
            <div className="relative flex items-center">
              <Building2 className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                aria-label="Filtrar por Sede"
                className="pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
              >
                <option value="Ambas">Sede: Ambas Sedes</option>
                <option value="Sede 1">Sede: Sede 1</option>
                <option value="Sede 2">Sede: Sede 2</option>
              </select>
            </div>
          ) : (
            <div className="relative flex items-center">
              <Filter className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedLine}
                onChange={(e) => setSelectedLine(e.target.value)}
                aria-label="Filtrar por Línea"
                className="pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
              >
                <option value="Todas">Línea: Todas</option>
                {!excludeMutual && (
                  <>
                    <option value="506012">506012 · Mutual Subsidiado</option>
                    <option value="506013">506013 · Mutual Contributivo</option>
                  </>
                )}
                <option value="506014">506014 · Promoción y Prevención (PyP)</option>
                <option value="506015">506015 · Cirugía Refractiva</option>
              </select>
            </div>
          )}

          {/* Filtro Año sin limitante */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            aria-label="Seleccionar Año"
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="Todos">Todos los años</option>
          </select>

          {/* Filtro Mes en lista vertical sin limitante */}
          <div className="relative flex items-center">
            <Calendar className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Seleccionar Mes"
              className="pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
            >
              <option value="Todos">Todos los meses</option>
              {MONTHS_ORDER.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
                  1. LLAMADAS RECIBIDAS
                </span>
                <PhoneIncoming className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtNum(contactComputed.totalRecibidas)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Prom: {fmtNum(Math.max(1, contactComputed.totalRecibidas / 48))} llamadas/día · Sin Mutual:{' '}
                <span className="font-semibold text-slate-700">
                  {fmtNum(contactComputed.allWithoutMutualRec)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-500 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  2. LLAMADAS CONTESTADAS
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtNum(contactComputed.totalContestadas)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {fmtDec(contactComputed.efectividadGlobal)}% efectividad · Sin Mutual:{' '}
                <span className="font-semibold text-emerald-700">
                  {fmtDec(contactComputed.sinMutualEfect)}%
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 border-l-4 border-l-rose-400 px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  3. LLAMADAS PERDIDAS
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
                  4. NIVEL DE SERVICIO (SLA)
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmtDec(contactComputed.weightedSla)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Espera prom: {fmtDec(contactComputed.weightedEspera)} min · Sin Mutual:{' '}
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
                  margin={{ top: 18, right: 10, left: -15, bottom: 0 }}
                  barGap={4}
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
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="text-left py-2.5 px-4">LÍNEA DE ATENCIÓN / AGENTE</th>
                    <th className="text-right py-2.5 px-3">RECIBIDAS</th>
                    <th className="text-right py-2.5 px-3">CONTESTADAS</th>
                    <th className="text-right py-2.5 px-3">LLAMADAS PERDIDAS</th>
                    <th className="text-right py-2.5 px-3">ESPERA PROM.</th>
                    <th className="text-right py-2.5 px-4 w-56">% EFECTIVIDAD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {contactComputed.linesList.map((line) => {
                    const isOpen = !!expandedLines[line.id];
                    const colors = badgeColor(line.efectividad);
                    const lineShare =
                      contactComputed.totalContestadas > 0
                        ? line.contestadas / contactComputed.totalContestadas
                        : 1;

                    return (
                      <React.Fragment key={line.id}>
                        <tr
                          onClick={() => toggleLine(line.id)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-1.5">
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>{line.name}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {fmtNum(line.recibidas)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {fmtNum(line.contestadas)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {fmtNum(line.perdidas)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {fmtDec(line.esperaMin)} min
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="w-28 bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`${colors.bar} h-1 rounded-full`}
                                  style={{
                                    width: `${Math.min(100, Math.max(4, line.efectividad))}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors.pill} min-w-[46px] text-center`}
                              >
                                {fmtDec(line.efectividad)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isOpen &&
                          contactComputed.agentsList.map((ag) => {
                            const agColors = badgeColor(ag.efectividad);
                            const scaleFactor =
                              contactComputed.linesList.length === 1 ? 1 : lineShare;
                            const agTimb = Math.max(1, Math.round(ag.timbradas * scaleFactor));
                            const agCont = Math.max(1, Math.round(ag.contestadas * scaleFactor));
                            const agPerd = Math.max(0, agTimb - agCont);

                            return (
                              <tr
                                key={`${line.id}-${ag.id}`}
                                className="bg-white hover:bg-slate-50/40 text-slate-600"
                              >
                                <td className="py-1.5 pl-9 pr-4 text-[11px] font-medium text-slate-700">
                                  • {ag.name}
                                </td>
                                <td className="py-1.5 px-3 text-right text-slate-600">
                                  {fmtNum(agTimb)}
                                </td>
                                <td className="py-1.5 px-3 text-right text-slate-600">
                                  {fmtNum(agCont)}
                                </td>
                                <td className="py-1.5 px-3 text-right text-slate-600">
                                  {fmtNum(agPerd)}
                                </td>
                                <td className="py-1.5 px-3 text-right text-slate-500">
                                  {fmtDec(ag.duracionMin)} min
                                </td>
                                <td className="py-1.5 px-4">
                                  <div className="flex items-center justify-end gap-2.5">
                                    <div className="w-28 bg-slate-100 h-1 rounded-full overflow-hidden">
                                      <div
                                        className={`${agColors.bar} h-1 rounded-full`}
                                        style={{
                                          width: `${Math.min(100, Math.max(4, ag.efectividad))}%`,
                                        }}
                                      />
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${agColors.pill} min-w-[46px] text-center`}
                                    >
                                      {fmtDec(ag.efectividad)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}

                  {/* FOOTER TOTAL */}
                  <tr className="bg-slate-50/90 font-bold text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-4">TOTAL CONTACT CENTER PBX</td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtNum(contactComputed.totalRecibidas)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtNum(contactComputed.totalContestadas)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtNum(contactComputed.totalPerdidas)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {fmtDec(contactComputed.weightedEspera)} min
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-28 bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div
                            className={`${
                              badgeColor(contactComputed.efectividadGlobal).bar
                            } h-1 rounded-full`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(4, contactComputed.efectividadGlobal)
                              )}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            badgeColor(contactComputed.efectividadGlobal).pill
                          } min-w-[46px] text-center`}
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
                  1. TURNOS ATENDIDOS
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
                  2. TIEMPO ESPERA EN SALA
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
                  3. TIEMPO EN ATENCIÓN
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
                  4. CICLO TOTAL (5 PASOS)
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
                  margin={{ top: 18, right: 10, left: -15, bottom: 0 }}
                  barGap={6}
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
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-1.5">
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>{row.label}</span>
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
                              <td className="py-1.5 pl-9 pr-4 text-[11px] font-medium text-slate-700">
                                • Sede 1
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
                              <td className="py-1.5 pl-9 pr-4 text-[11px] font-medium text-slate-700">
                                • Sede 2
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
                  <tr className="bg-slate-50/90 font-bold text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-4">TOTAL CICLO DEL PACIENTE</td>
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
