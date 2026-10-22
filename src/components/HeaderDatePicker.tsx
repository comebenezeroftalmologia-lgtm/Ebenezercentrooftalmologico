"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

const MESES_LARGOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_CABECERA = ["L", "M", "X", "J", "V", "S", "D"];

function hoyColombiaISO(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function HeaderDatePicker({
  fechaISO,
  fechaTexto,
  availableDates,
}: {
  fechaISO?: string;
  fechaTexto: string;
  availableDates?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hoyISO = useMemo(() => hoyColombiaISO(), []);
  const activeISO = fechaISO || hoyISO;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialParts = activeISO.split("-").map(Number);
  const [viewYear, setViewYear] = useState<number>(initialParts[0] || 2026);
  const [viewMonth, setViewMonth] = useState<number>((initialParts[1] || 10) - 1);

  useEffect(() => {
    const parts = (fechaISO || hoyISO).split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setViewYear(parts[0]);
      setViewMonth(parts[1] - 1);
    }
  }, [fechaISO, hoyISO]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const availableSet = useMemo(() => new Set(availableDates || []), [availableDates]);

  function selectDate(iso: string) {
    setOpen(false);
    const currentSearch = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(currentSearch);
    if (iso === hoyISO) {
      params.delete("fecha");
    } else {
      params.set("fecha", iso);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const startOffset = (firstDayOfMonth.getUTCDay() + 6) % 7;
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push({ day: d, iso: `${viewYear}-${mm}-${dd}` });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const esHoy = activeISO === hoyISO;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Haz clic para elegir la fecha a consultar"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
          open || !esHoy
            ? "border-[#2563EB] bg-white text-[#1D4ED8] shadow-[0_2px_8px_rgba(37,99,235,0.16)]"
            : "border-[#CBD9EE] bg-white/90 text-[#0E245E] shadow-[0_1px_3px_rgba(14,36,94,0.04)] hover:border-[#93C5FD] hover:bg-white"
        }`}
      >
        <Calendar className="h-3 w-3 text-[#1D58D8]" strokeWidth={2} />
        <span>{fechaTexto}</span>
        <ChevronDown
          className={`h-3 w-3 text-[#64748B] transition-transform duration-150 ${
            open ? "rotate-180 text-[#1D58D8]" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[268px] rounded-[14px] border border-[#CBD9EE] bg-white p-3.5 shadow-[0_12px_32px_-6px_rgba(14,36,94,0.22)]">
          <div className="mb-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2EBF8] text-[#0E245E] transition hover:bg-[#EFF6FF]"
              title="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[12.5px] font-bold text-[#0E245E]">
              {MESES_LARGOS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2EBF8] text-[#0E245E] transition hover:bg-[#EFF6FF]"
              title="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold text-[#64748B]">
            {DIAS_CABECERA.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarCells.map((cell, idx) => {
              if (!cell.day || !cell.iso) {
                return <div key={`empty-${idx}`} className="h-7" />;
              }
              const isSelected = cell.iso === activeISO;
              const isToday = cell.iso === hoyISO;
              const hasData = availableSet.size === 0 || availableSet.has(cell.iso);

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => selectDate(cell.iso!)}
                  className={`relative flex h-7 w-full items-center justify-center rounded-lg text-[11.5px] tabular-nums transition ${
                    isSelected
                      ? "bg-[#1D4ED8] font-extrabold text-white shadow-sm"
                      : isToday
                      ? "border border-[#2563EB] bg-[#EFF6FF] font-bold text-[#1D4ED8]"
                      : hasData
                      ? "font-semibold text-[#0E245E] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                      : "font-normal text-[#94A3B8] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EEF2F8] pt-2.5">
            <input
              type="date"
              value={activeISO}
              onChange={(e) => {
                if (e.target.value) selectDate(e.target.value);
              }}
              className="h-7 flex-1 rounded-lg border border-[#CBD9EE] px-2 text-[11px] font-semibold text-[#0E245E] outline-none focus:border-[#2563EB]"
            />
            <button
              type="button"
              onClick={() => selectDate(hoyISO)}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#EFF6FF] px-2.5 text-[11px] font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
            >
              <RotateCcw className="h-3 w-3" />
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
