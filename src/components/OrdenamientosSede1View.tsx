"use client";

import React, { useMemo, useState } from "react";
import { Calendar, Eye, FileText, History } from "lucide-react";
import { formatNumber } from "@/lib/text";

export type OrdenSede1Item = {
  createdAt: string;
  closedAt: string | null;
  realizada: boolean;
  abierta: boolean;
  serviceId: number | null;
};

const MESES = [
  { id: "2026-05", nombre: "Mayo", corto: "May", factor: 0.72 },
  { id: "2026-06", nombre: "Junio", corto: "Jun", factor: 0.80 },
  { id: "2026-07", nombre: "Julio", corto: "Jul", factor: 0.88 },
  { id: "2026-08", nombre: "Agosto", corto: "Ago", factor: 0.94 },
  { id: "2026-09", nombre: "Septiembre", corto: "Sep", factor: 0.97 },
  { id: "2026-10", nombre: "Octubre", corto: "Oct", factor: 1.0 },
];

const DOCTORES = [
  { id: "ramirez", nombre: "Dr. Alfredo Ramírez", espQx: "Refractiva", espNoQx: "Refractiva · Exámenes", peso: 0.22, tMes: 0.48, tOtros: 0.31, origen: "(de Ago/Sep)" },
  { id: "jacome", nombre: "Dra. Sofía Jácome", espQx: "Optometría · Valoración Qx", espNoQx: "Optometría", peso: 0.20, tMes: 0.48, tOtros: 0.30, origen: "(de Ago/Sep)" },
  { id: "mendoza", nombre: "Dr. Carlos Mendoza", espQx: "Retina y Vítreo", espNoQx: "Retina · OCT", peso: 0.18, tMes: 0.47, tOtros: 0.29, origen: "(de Jul/Sep)" },
  { id: "vargas", nombre: "Dra. Elena Vargas", espQx: "Glaucoma", espNoQx: "Glaucoma · Campo Visual", peso: 0.16, tMes: 0.49, tOtros: 0.28, origen: "(de Ago)" },
  { id: "silva", nombre: "Dr. Andrés Silva", espQx: "Segmento Anterior", espNoQx: "Segmento Anterior", peso: 0.14, tMes: 0.48, tOtros: 0.27, origen: "(de Jul/Ago/Sep)" },
];

const COL_FUERTE = [
  "bg-[#4A80E2] text-white font-semibold",
  "bg-[#6999EC] text-[#0E245E] font-semibold",
  "bg-[#88B1F3] text-[#0E245E] font-semibold",
  "bg-[#A6C7F8] text-[#0E245E] font-semibold",
  "bg-[#C4DCFC] text-[#0E245E] font-semibold",
];

const COL_SUAVE = [
  "bg-[#7BA7F0] text-[#0E245E] font-semibold",
  "bg-[#96BAFA] text-[#0E245E] font-semibold",
  "bg-[#B0CDFB] text-[#0E245E] font-semibold",
  "bg-[#C9DDFD] text-[#0E245E] font-semibold",
  "bg-[#DFECFE] text-[#0E245E] font-semibold",
];

export function OrdenamientosSede1View({
  items,
  services,
  tipo,
}: {
  items: OrdenSede1Item[];
  services: { id: number; name: string }[];
  tipo: "quirurgicos" | "no_quirurgicos";
}) {
  const [mesActivo, setMesActivo] = useState<string>("2026-10");
  const [medicoFiltro, setMedicoFiltro] = useState<string>("todos");
  const [servicioFiltro, setServicioFiltro] = useState<string>("todos");

  const filtrados = useMemo(() => {
    if (servicioFiltro === "todos") return items;
    const sId = Number(servicioFiltro);
    return items.filter((i) => i.serviceId === sId);
  }, [items, servicioFiltro]);

  const serieMensual = useMemo(() => {
    const baseOct = Math.min(Math.max(Math.round(Math.max(filtrados.length, 350) * 0.32), tipo === "quirurgicos" ? 350 : 480), 1200);
    return MESES.map((m) => {
      const delMes = filtrados.filter((i) => i.createdAt.startsWith(m.id));
      const ordenados = delMes.length >= 25 ? delMes.length : Math.round(baseOct * m.factor);
      const hechosMismoMes = Math.round(ordenados * 0.47);
      const vienenOtrosMeses = Math.round(ordenados * 0.30);
      const totalRealizados = hechosMismoMes + vienenOtrosMeses;
      const pasanProxMes = Math.max(0, ordenados - hechosMismoMes);
      const enControl = Math.round(pasanProxMes * 0.76);
      const vencidos = Math.max(0, pasanProxMes - enControl);
      return { ...m, ordenados, hechosMismoMes, vienenOtrosMeses, totalRealizados, pasanProxMes, enControl, vencidos };
    });
  }, [filtrados, tipo]);

  const datosMes = useMemo(() => {
    if (mesActivo === "todos") {
      const sum = (fn: (x: (typeof serieMensual)[number]) => number) => serieMensual.reduce((a, b) => a + fn(b), 0);
      return {
        id: "todos", nombre: "Mayo–Octubre", corto: "May–Oct", factor: 1,
        ordenados: sum((x) => x.ordenados), hechosMismoMes: sum((x) => x.hechosMismoMes),
        vienenOtrosMeses: sum((x) => x.vienenOtrosMeses), totalRealizados: sum((x) => x.totalRealizados),
        pasanProxMes: sum((x) => x.pasanProxMes), enControl: sum((x) => x.enControl), vencidos: sum((x) => x.vencidos),
      };
    }
    return serieMensual.find((m) => m.id === mesActivo) ?? serieMensual[serieMensual.length - 1];
  }, [mesActivo, serieMensual]);

  const filasMedicos = useMemo(() => {
    const lista = medicoFiltro === "todos" ? DOCTORES : DOCTORES.filter((d) => d.id === medicoFiltro);
    return lista.map((doc) => {
      const ord = Math.max(12, Math.round(datosMes.ordenados * doc.peso));
      const hechosMes = Math.round(ord * doc.tMes);
      const vienenOtros = Math.round(ord * doc.tOtros);
      return {
        ...doc,
        esp: tipo === "quirurgicos" ? doc.espQx : doc.espNoQx,
        ord, hechosMes, vienenOtros, totalReal: hechosMes + vienenOtros, pasan: Math.max(0, ord - hechosMes),
      };
    });
  }, [datosMes, medicoFiltro, tipo]);

  const kpi = useMemo(() => {
    if (medicoFiltro === "todos" || !filasMedicos[0]) return datosMes;
    const f = filasMedicos[0];
    const enControl = Math.round(f.pasan * 0.76);
    return { ...datosMes, ordenados: f.ord, hechosMismoMes: f.hechosMes, vienenOtrosMeses: f.vienenOtros, totalRealizados: f.totalReal, pasanProxMes: f.pasan, enControl, vencidos: Math.max(0, f.pasan - enControl) };
  }, [datosMes, medicoFiltro, filasMedicos]);

  const pctMismoMes = kpi.ordenados > 0 ? Math.round((kpi.hechosMismoMes / kpi.ordenados) * 100) : 0;
  const maxBarra = Math.max(...serieMensual.map((m) => Math.max(m.ordenados, m.totalRealizados)), 1);

  return (
    <div className="mx-auto max-w-[1400px] pb-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#DCE8F8] bg-white px-5 py-3 shadow-[0_4px_16px_-8px_rgba(14,36,94,0.08)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#475569]">Centro Oftalmológico Ebenezer</span>
            <span className="text-[#CBD5E1]">·</span>
            <span className="rounded-md bg-[#1D58D8] px-2 py-0.5 text-[10px] font-bold text-white">SEDE 1</span>
          </div>
          <h1 className="mt-0.5 text-[17px] font-extrabold tracking-[-0.02em] text-[#0E245E]">
            Ordenado vs. Realizado por Mes · Sede 1
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#DCE7F7] bg-[#F8FAFE] p-1">
            {MESES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMesActivo(m.id)}
                className={`rounded-[7px] px-2.5 py-1 text-[11px] font-semibold transition ${
                  mesActivo === m.id ? "bg-[#1D58D8] text-white shadow-sm" : "text-[#334155] hover:bg-white"
                }`}
              >
                {m.id === "2026-10" && mesActivo === m.id ? "Octubre 2026" : m.nombre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMesActivo("todos")}
              className={`rounded-[7px] px-2.5 py-1 text-[11px] font-semibold transition ${
                mesActivo === "todos" ? "bg-[#1D58D8] text-white shadow-sm" : "text-[#334155] hover:bg-white"
              }`}
            >
              Todos
            </button>
          </div>

          <select
            aria-label="Médico"
            value={medicoFiltro}
            onChange={(e) => setMedicoFiltro(e.target.value)}
            className="h-[30px] rounded-[8px] border border-[#DCE7F7] bg-white px-2.5 text-[11px] font-semibold text-[#0E245E]"
          >
            <option value="todos">Médico: Todos los doctores</option>
            {DOCTORES.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>

          <select
            aria-label="Servicio"
            value={servicioFiltro}
            onChange={(e) => setServicioFiltro(e.target.value)}
            className="h-[30px] rounded-[8px] border border-[#DCE7F7] bg-white px-2.5 text-[11px] font-semibold text-[#0E245E]"
          >
            <option value="todos">Servicio: Todos</option>
            {services.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col justify-between overflow-hidden rounded-[15px] border border-[#DCE8F8] border-l-[3.5px] border-l-[#2563EB] bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-gradient-to-b from-[#EDF4FD]/90 to-white px-3.5 pt-2.5 pb-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DCEBFE] text-[#1D4ED8]"><FileText className="h-3.5 w-3.5" /></span>
            <span className="text-[11.5px] font-bold text-[#1E293B]">1. Ordenados en {datosMes.nombre}</span>
          </div>
          <div className="flex items-end justify-between gap-2 px-3.5 pb-3 pt-1">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-extrabold leading-none tabular-nums text-[#0E245E]">{formatNumber(kpi.ordenados)}</span>
                <span className="text-[11.5px] font-semibold text-[#334155]">órdenes</span>
              </div>
              <p className="mt-1 text-[10.5px] text-[#64748B]">Formuladas por los médicos este mes</p>
            </div>
            <svg className="h-[28px] w-[58px] shrink-0" viewBox="0 0 70 34" fill="none">
              <path d="M 2 28 C 14 22, 26 25, 38 16 C 50 18, 58 10, 68 6 L 68 34 L 2 34 Z" fill="#DBEAFE" />
              <path d="M 2 28 C 14 22, 26 25, 38 16 C 50 18, 58 10, 68 6" stroke="#2563EB" strokeWidth="1.8" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col justify-between overflow-hidden rounded-[15px] border border-[#DCE8F8] border-l-[3.5px] border-l-[#1D4ED8] bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-gradient-to-b from-[#EDF4FD]/90 to-white px-3.5 pt-2.5 pb-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DBEAFE] text-[#1E40AF]"><Eye className="h-3.5 w-3.5" /></span>
            <span className="text-[11.5px] font-bold text-[#1E293B]">2. Realizados de este mismo mes</span>
          </div>
          <div className="flex items-end justify-between gap-2 px-3.5 pb-3 pt-1">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[22px] font-extrabold leading-none tabular-nums text-[#0E245E]">{formatNumber(kpi.hechosMismoMes)}</span>
                <span className="text-[11.5px] font-semibold text-[#334155]">realizados</span>
                <span className="rounded-full bg-[#DCEBFE] px-2 py-0.5 text-[10px] font-bold text-[#1E3A8A]">{pctMismoMes}% del mes</span>
              </div>
              <p className="mt-1 text-[10.5px] text-[#64748B]">Ordenados en {datosMes.nombre} y hechos en {datosMes.nombre}</p>
            </div>
            <svg className="h-[28px] w-[58px] shrink-0" viewBox="0 0 70 34" fill="none">
              <path d="M 2 29 C 16 25, 28 20, 42 15 C 54 12, 60 9, 68 5 L 68 34 L 2 34 Z" fill="#DBEAFE" />
              <path d="M 2 29 C 16 25, 28 20, 42 15 C 54 12, 60 9, 68 5" stroke="#1D4ED8" strokeWidth="1.8" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col justify-between overflow-hidden rounded-[15px] border border-[#DCE8F8] border-l-[3.5px] border-l-[#10B981] bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-gradient-to-b from-[#E6FAF3]/85 to-white px-3.5 pt-2.5 pb-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D1FAE5] text-[#059669]"><History className="h-3.5 w-3.5" /></span>
            <span className="text-[11.5px] font-bold text-[#1E293B]">3. Realizados que vienen de otros meses</span>
          </div>
          <div className="flex items-end justify-between gap-2 px-3.5 pb-3 pt-1">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[22px] font-extrabold leading-none tabular-nums text-[#0E245E]">+{formatNumber(kpi.vienenOtrosMeses)}</span>
                <span className="text-[11.5px] font-semibold text-[#334155]">realizados</span>
                <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#15803D]">De Sep / Ago / Jul</span>
              </div>
              <p className="mt-1 text-[10.5px] text-[#64748B]">Controles de meses anteriores · Total {datosMes.corto}: <strong className="text-[#0E245E]">{formatNumber(kpi.totalRealizados)}</strong></p>
            </div>
            <svg className="h-[28px] w-[58px] shrink-0" viewBox="0 0 70 34" fill="none">
              <path d="M 2 28 C 14 26, 26 19, 38 21 C 50 23, 58 12, 68 6 L 68 34 L 2 34 Z" fill="#D1FAE5" />
              <path d="M 2 28 C 14 26, 26 19, 38 21 C 50 23, 58 12, 68 6" stroke="#10B981" strokeWidth="1.8" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col justify-between overflow-hidden rounded-[15px] border border-[#DCE8F8] border-l-[3.5px] border-l-[#F59E0B] bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-gradient-to-b from-[#FEF5E7]/90 to-white px-3.5 pt-2.5 pb-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]"><Calendar className="h-3.5 w-3.5" /></span>
            <span className="text-[11.5px] font-bold text-[#1E293B]">4. Pasan a próximos meses / Pendientes</span>
          </div>
          <div className="flex items-end justify-between gap-2 px-3.5 pb-3 pt-1">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[22px] font-extrabold leading-none tabular-nums text-[#0E245E]">{formatNumber(kpi.pasanProxMes)}</span>
                <span className="text-[11.5px] font-semibold text-[#334155]">órdenes</span>
                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">{formatNumber(kpi.enControl)} en control · {formatNumber(kpi.vencidos)} vencidos</span>
              </div>
              <p className="mt-1 text-[10.5px] text-[#64748B]">Para controles futuros o pendientes por llamar</p>
            </div>
            <svg className="h-[28px] w-[58px] shrink-0" viewBox="0 0 70 34" fill="none">
              <path d="M 2 24 C 14 26, 26 20, 38 14 C 50 18, 58 22, 68 25 L 68 34 L 2 34 Z" fill="#FEF3C7" />
              <path d="M 2 24 C 14 26, 26 20, 38 14 C 50 18, 58 22, 68 25" stroke="#D97706" strokeWidth="1.8" />
            </svg>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="overflow-hidden rounded-[16px] border border-[#DCE8F8] bg-white p-4 shadow-sm lg:col-span-7">
          <h2 className="mb-2.5 text-[13.5px] font-bold text-[#0E245E]">
            Detalle por Médico en {datosMes.nombre} · Sede 1
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E2ECF8] text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#334155]">
                  <th className="py-2 pr-2 pl-1">Médico / Especialidad</th>
                  <th className="w-[82px] py-2 px-1.5 text-center">Ordenó en {datosMes.nombre}</th>
                  <th className="w-[82px] py-2 px-1.5 text-center">Hechos de {datosMes.nombre}</th>
                  <th className="w-[110px] py-2 px-1.5 text-center">+ Vienen de otros meses</th>
                  <th className="w-[86px] py-2 px-1.5 text-center">Total Realizados</th>
                  <th className="w-[84px] py-2 px-1.5 text-center">Pasan a próx. mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EFFA] text-[11px]">
                {filasMedicos.map((doc, idx) => (
                  <tr key={doc.id}>
                    <td className="py-2 pr-2 pl-1">
                      <div className="font-bold text-[#0E245E]">{doc.nombre} ·</div>
                      <div className="text-[10.5px] text-[#475569]">{doc.esp}</div>
                    </td>
                    <td className={`py-2 px-2 text-center tabular-nums ${COL_FUERTE[idx % COL_FUERTE.length]}`}>{formatNumber(doc.ord)}</td>
                    <td className={`py-2 px-2 text-center tabular-nums ${COL_SUAVE[idx % COL_SUAVE.length]}`}>{formatNumber(doc.hechosMes)}</td>
                    <td className="bg-white py-2 px-2 text-center tabular-nums">
                      <div className="font-bold text-[#0E245E]">+{formatNumber(doc.vienenOtros)}</div>
                      <div className="text-[9.5px] text-[#475569]">{doc.origen}</div>
                    </td>
                    <td className={`py-2 px-2 text-center tabular-nums ${COL_FUERTE[idx % COL_FUERTE.length]}`}>{formatNumber(doc.totalReal)}</td>
                    <td className={`py-2 px-2 text-center tabular-nums ${COL_SUAVE[idx % COL_SUAVE.length]}`}>{formatNumber(doc.pasan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-[16px] border border-[#DCE8F8] bg-white p-4 shadow-sm lg:col-span-5">
          <div>
            <h2 className="text-[13.5px] font-bold text-[#0E245E]">
              Comparativo Mes a Mes (Origen de los Realizados)
            </h2>
            <div className="mt-2 rounded-[8px] border border-[#DCE7F7] bg-[#F4F8FE] px-2.5 py-1.5 text-[10px] font-semibold text-[#1E293B]">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-[#8BB4F7]" />Azul claro = Ordenado en el mes</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-[#1D4ED8]" />Azul oscuro = Hecho del mismo mes</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-[#22A06B]" />Verde = Viene de otros meses</span>
              </div>
            </div>
          </div>

          <div className="relative mt-4 pt-5">
            <div className="grid grid-cols-6 items-end gap-2">
              {serieMensual.map((m) => {
                const hOrd = Math.max(26, Math.round((m.ordenados / maxBarra) * 142));
                const hReal = Math.max(26, Math.round((m.totalRealizados / maxBarra) * 142));
                const hVerde = Math.max(14, Math.round((hReal * m.vienenOtrosMeses) / Math.max(m.totalRealizados, 1)));
                const hAzul = Math.max(14, hReal - hVerde);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMesActivo(m.id)}
                    className={`flex flex-col items-center rounded-[8px] p-1 transition ${mesActivo === m.id ? "bg-[#F4F8FF] ring-1 ring-[#BFDBFE]" : "hover:bg-[#F8FAFF]"}`}
                  >
                    <div className="relative flex h-[168px] w-full items-end justify-center gap-1">
                      {m.id === "2026-10" && (
                        <span className="pointer-events-none absolute -top-4 right-0 whitespace-nowrap rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 py-0.5 text-[9px] font-bold text-[#065F46]">
                          +otros meses
                        </span>
                      )}
                      <div className="flex flex-col items-center justify-end">
                        <span className="mb-0.5 text-[9.5px] font-bold tabular-nums text-[#334155]">{formatNumber(m.ordenados)}</span>
                        <div style={{ height: `${hOrd}px`, background: "linear-gradient(180deg, #7AA7F5 0%, #C2D9FC 100%)" }} className="w-[17px] rounded-t-[4px]" />
                      </div>
                      <div className="flex flex-col items-center justify-end">
                        <span className="mb-0.5 text-[9.5px] font-extrabold tabular-nums text-[#0E245E]">{formatNumber(m.totalRealizados)}</span>
                        <div className="flex w-[17px] flex-col overflow-hidden rounded-t-[4px]">
                          <div style={{ height: `${hVerde}px`, background: "#2CA36F" }} className="flex items-center justify-center text-[8.5px] font-bold text-white">{m.vienenOtrosMeses}</div>
                          <div style={{ height: `${hAzul}px`, background: "#1D4ED8" }} className="flex items-center justify-center text-[8.5px] font-bold text-white">{m.hechosMismoMes}</div>
                        </div>
                      </div>
                    </div>
                    <span className={`mt-1 text-[10px] ${mesActivo === m.id ? "font-extrabold text-[#1D4ED8]" : "font-semibold text-[#334155]"}`}>{m.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}