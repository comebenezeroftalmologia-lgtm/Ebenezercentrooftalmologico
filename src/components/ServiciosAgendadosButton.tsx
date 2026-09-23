"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, X } from "lucide-react";
import type { ServicioAgendadoLogRow } from "@/lib/types";
import { formatCOP, formatDateTime, formatNumber } from "@/lib/text";

export function ServiciosAgendadosButton({
  rows,
  serviceNames,
  from,
  to,
}: {
  rows: ServicioAgendadoLogRow[];
  serviceNames: Map<number, string>;
  from: string;
  to: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
            className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-eb-4"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-navy">Servicios Agendados</h2>
                <p className="text-xs text-ink-3">
                  Log acumulado de oportunidades que entraron a la etapa &quot;Servicio
                  Agendado&quot; entre {from} y {to} — {formatNumber(rows.length)} registro
                  {rows.length === 1 ? "" : "s"}. En Clientify esta información se pierde al
                  cambiar de etapa; aquí queda consolidada aunque el lead avance, se pierda o
                  se reagende.
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

            <div className="overflow-auto">
              {rows.length === 0 ? (
                <p className="px-6 py-8 text-sm text-ink-3">
                  Sin registros de Servicio Agendado para este rango de fechas.
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
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
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
