"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, X } from "lucide-react";
import type { ServicioAgendadoLogRow } from "@/lib/types";
import { formatCOP, formatDateTime, formatNumber } from "@/lib/text";

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function ServiciosAgendadosButton({
  rows,
  serviceNames,
}: {
  rows: ServicioAgendadoLogRow[];
  serviceNames: Map<number, string>;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // `rows` trae TODO el historial acumulado (no está acotado al rango
  // de fechas del tablero) — los filtros de fecha de aquí abajo son
  // independientes y arrancan vacíos (sin restricción) para que el log
  // completo esté disponible de entrada.
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const serviceOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const r of rows) if (r.service_id) ids.add(r.service_id);
    return Array.from(ids)
      .map((id) => ({ id, name: serviceNames.get(id) ?? `Servicio ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [rows, serviceNames]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(search.trim());
    return rows.filter((r) => {
      if (serviceFilter && String(r.service_id ?? "") !== serviceFilter) return false;

      const day = r.entered_at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;

      if (query) {
        const haystack = normalizeText(
          [r.contact_name, r.contact_email, r.contact_phone].filter(Boolean).join(" ")
        );
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [rows, search, serviceFilter, dateFrom, dateTo]);

  const filtersActive = search.trim() !== "" || serviceFilter !== "" || dateFrom !== "" || dateTo !== "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-navy transition-colors duration-150 ease-eb-out hover:border-navy-20"
      >
        <CalendarCheck className="h-4 w-4 text-blue" strokeWidth={1.75} />
        Servicios Agendados
        <span className="ml-1 rounded-pill bg-blue-10 px-2 py-0.5 text-xs font-semibold text-blue">
          {formatNumber(rows.length)}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B1633]/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={panelRef}
            className="flex max-h-[85vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-eb-4"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-navy">Servicios Agendados</h2>
                <p className="text-xs text-ink-3">
                  Log acumulado de oportunidades que entraron a la etapa &quot;Servicio
                  Agendado&quot;. En Clientify esta información se pierde al cambiar de etapa;
                  aquí queda consolidada aunque el lead avance, se pierda o se reagende.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-ink-3 transition-colors duration-150 ease-eb-out hover:bg-line-2"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-b border-line bg-paper px-6 py-3">
              <div className="flex flex-col gap-1">
                <label className="eb-label text-[10px] text-ink-3">Buscar</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, email o teléfono"
                  className="w-56 rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="eb-label text-[10px] text-ink-3">Servicio</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
                >
                  <option value="">Todos los servicios</option>
                  {serviceOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="eb-label text-[10px] text-ink-3">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="eb-label text-[10px] text-ink-3">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
                />
              </div>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setServiceFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue transition-colors duration-150 ease-eb-out hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
              <p className="ml-auto text-xs text-ink-3">
                {formatNumber(filteredRows.length)} de {formatNumber(rows.length)} registro
                {rows.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="overflow-auto">
              {filteredRows.length === 0 ? (
                <p className="px-6 py-8 text-sm text-ink-3">
                  {rows.length === 0
                    ? "Sin registros de Servicio Agendado todavía."
                    : "Ningún registro coincide con los filtros."}
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-ink-3">
                    <tr className="border-b border-line">
                      <th className="px-6 py-3 font-medium">Fecha detectado</th>
                      <th className="px-4 py-3 font-medium">Contacto</th>
                      <th className="px-4 py-3 font-medium">Teléfono</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Servicio</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Canal</th>
                      <th className="px-4 py-3 font-medium">Etapa actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr key={r.id} className="border-b border-line-2">
                        <td className="whitespace-nowrap px-6 py-3 text-ink-2">
                          {formatDateTime(r.entered_at)}
                        </td>
                        <td className="px-4 py-3 text-ink-2">{r.contact_name ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                          {r.contact_phone ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-ink-2">{r.contact_email ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                          {r.service_id ? serviceNames.get(r.service_id) ?? "—" : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                          {r.value ? formatCOP(r.value) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                          {r.channel ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {r.current_stage ? (
                            <span className="rounded-pill bg-aqua-20 px-2 py-0.5 text-xs text-navy">
                              {r.current_stage}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-3">
                              {r.opportunity_id ? "—" : "Eliminada en Clientify"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
