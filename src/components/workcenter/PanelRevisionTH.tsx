"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Check, RefreshCw } from "lucide-react";

/* ---------------------------------------------------------------------
   DATOS POR REVISAR — LA FRANJA DE ARRIBA
   Escrito el 08-11-2026.

   No tiene boton de "marcar como visto" a proposito. Un aviso que se
   apaga a mano termina apagado con el problema todavia ahi; eso es
   justo lo que veniamos arreglando. Este sale de la base: se apaga
   cuando el dato queda bien, no cuando alguien lo cierra.

   Cada linea es clickeable y lleva a la tabla con el documento ya
   escrito en el buscador, para no tener que ir a buscarlo a mano.
   --------------------------------------------------------------------- */

type Detalle = { texto: string; buscar?: string };
type Hallazgo = {
  id: string;
  titulo: string;
  gravedad: "alta" | "media" | "baja";
  tabla: string;
  queHacer: string;
  detalles: Detalle[];
};
type Respuesta = {
  ok: boolean;
  error?: string;
  total: number;
  porGravedad: { alta: number; media: number; baja: number };
  hallazgos: Hallazgo[];
};

const COLOR = {
  alta: { borde: "#FCA5A5", fondo: "#FEF2F2", texto: "#B91C1C", etiqueta: "Corregir" },
  media: { borde: "#FDE68A", fondo: "#FFFBEB", texto: "#B45309", etiqueta: "Revisar" },
  baja: { borde: "#C7D7F0", fondo: "#F8FAFF", texto: "#47597A", etiqueta: "Completar" },
} as const;

export function PanelRevisionTH({
  recargar,
  onIr,
}: {
  /** Sube cada vez que se guarda algo, para volver a calcular. */
  recargar: number;
  onIr: (tabla: string, buscar?: string) => void;
}) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [desplegado, setDesplegado] = useState<string | null>(null);

  const traer = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const r = await fetch("/api/talento-humano/revision", { cache: "no-store" });
      const j = (await r.json()) as Respuesta;
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setDatos(j);
    } catch (e) {
      // Un fallo no se pinta como "todo en orden".
      setFallo(e instanceof Error ? e.message : "No se pudo revisar la base.");
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { traer(); }, [traer, recargar]);

  if (cargando && !datos) {
    return (
      <div className="rounded-[12px] border border-[#E2EBF8] bg-[#F8FAFF] px-3.5 py-2.5 text-[12.5px] text-[#64748B]">
        Revisando la base…
      </div>
    );
  }

  if (fallo) {
    return (
      <div className="flex items-start gap-2 rounded-[12px] border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B91C1C]" />
        <div className="min-w-0 flex-1 text-[12.5px]">
          <p className="font-bold text-[#B91C1C]">No se pudo revisar la base.</p>
          <p className="mt-0.5 text-[#7F1D1D]">
            {fallo} — esto <strong>no</strong> significa que no haya pendientes: significa que no se pudo mirar.
          </p>
        </div>
        <button
          type="button"
          onClick={traer}
          className="shrink-0 rounded-md border border-[#FCA5A5] bg-white px-2 py-1 text-[11.5px] font-semibold text-[#B91C1C]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!datos) return null;

  if (datos.total === 0) {
    return (
      <div className="flex items-center gap-2 rounded-[12px] border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#166534]">
        <Check className="h-4 w-4 shrink-0" />
        No hay datos por revisar. Todo lo que la base puede comprobar está completo.
      </div>
    );
  }

  const g = datos.porGravedad;

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#E2EBF8] bg-white shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <AlertTriangle
          className={`h-4 w-4 shrink-0 ${g.alta ? "text-[#B91C1C]" : "text-[#B45309]"}`}
        />
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[13.5px] font-bold text-[#0E245E]">
            {datos.total} dato{datos.total === 1 ? "" : "s"} por revisar
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#64748B]">
            {[
              g.alta ? `${g.alta} por corregir` : null,
              g.media ? `${g.media} por revisar` : null,
              g.baja ? `${g.baja} por completar` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            {" · se recalcula cada vez que abre esta pantalla"}
          </p>
        </button>
        <button
          type="button"
          onClick={traer}
          title="Volver a revisar la base ahora"
          className="shrink-0 rounded-md p-1 text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#0E245E]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="shrink-0 rounded-md p-1 text-[#64748B] transition hover:bg-[#F1F5F9]"
          aria-label={abierto ? "Cerrar la lista" : "Ver la lista"}
        >
          {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {abierto && (
        <div className="border-t border-[#EEF3FB] p-2.5">
          <div className="flex flex-col gap-1.5">
            {datos.hallazgos.map((h) => {
              const c = COLOR[h.gravedad];
              const ab = desplegado === h.id;
              return (
                <div
                  key={h.id}
                  style={{ borderColor: c.borde, backgroundColor: c.fondo }}
                  className="rounded-[10px] border"
                >
                  <button
                    type="button"
                    onClick={() => setDesplegado(ab ? null : h.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <span
                      style={{ color: c.texto, borderColor: c.borde }}
                      className="shrink-0 rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    >
                      {c.etiqueta}
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-[#0E245E]">
                      {h.titulo}
                    </span>
                    <span
                      style={{ color: c.texto }}
                      className="shrink-0 text-[12.5px] font-bold tabular-nums"
                    >
                      {h.detalles.length}
                    </span>
                    {ab ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                    )}
                  </button>

                  {ab && (
                    <div className="border-t px-3 py-2" style={{ borderColor: c.borde }}>
                      <p className="mb-2 text-[11.5px] leading-relaxed" style={{ color: c.texto }}>
                        {h.queHacer}
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {h.detalles.slice(0, 60).map((d, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => onIr(h.tabla, d.buscar)}
                              className="w-full rounded px-1.5 py-1 text-left text-[12px] text-[#334155] transition hover:bg-white hover:text-[#0E245E]"
                            >
                              {d.texto}
                              <span className="ml-1.5 text-[10.5px] text-[#94A3B8]">→ abrir</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {h.detalles.length > 60 && (
                        <p className="mt-1.5 px-1.5 text-[11px] italic text-[#64748B]">
                          y {h.detalles.length - 60} más. Se muestran los primeros 60 para que la lista
                          siga siendo legible.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
