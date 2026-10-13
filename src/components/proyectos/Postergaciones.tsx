"use client";

import { useState } from "react";
import { CalendarClock, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Postergacion } from "@/lib/proyectos/types";
import { eliminarPostergacionAction } from "@/lib/proyectos/actions";
import { etiquetaFecha, fechaHora, hoyISO } from "@/lib/proyectos/utils";
import { BotonPrimario, BotonSecundario, Modal, useAviso } from "@/components/proyectos/ui";

const textoVeces = (n: number) => (n === 1 ? "Postergada 1 vez" : `Postergada ${n} veces`);

/** Insignia compacta para filas de la lista y tarjetas del tablero. */
export function InsigniaPostergada({ veces }: { veces: number }) {
  if (veces <= 0) return null;
  return (
    <span
      title={textoVeces(veces)}
      aria-label={textoVeces(veces)}
      className="inline-flex items-center gap-0.5 rounded-xs bg-[#FFF4E5] px-1 py-0.5 text-[11px] font-semibold text-[#B54708]"
    >
      <RotateCcw className="h-3 w-3" aria-hidden />
      {veces}
    </span>
  );
}

/**
 * Ventana del acuerdo de nueva fecha. El motivo es obligatorio.
 *  · `nueva` con valor → fecha ya elegida (viene del selector de fecha).
 *  · `nueva === null`  → se está quitando la fecha límite.
 *  · `nueva === undefined` → el usuario elige la fecha aquí (botón "Acordar nueva fecha").
 */
export function DialogoPostergar({
  actual,
  nueva,
  veces,
  onConfirmar,
  onCancelar,
}: {
  actual: string;
  nueva: string | null | undefined;
  veces: number;
  onConfirmar: (nuevaFecha: string | null, motivo: string) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [fecha, setFecha] = useState<string>(nueva ?? "");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const elige = nueva === undefined;
  const hoy = hoyISO();
  const m = motivo.trim();

  async function confirmar() {
    if (m.length < 5) return setError("Escribe el motivo del acuerdo (mínimo 5 caracteres).");
    let destino: string | null = nueva ?? null;
    if (elige) {
      if (!fecha) return setError("Elige la nueva fecha.");
      if (fecha <= actual) return setError("La nueva fecha debe ser posterior a la actual.");
      destino = fecha;
    }
    setEnviando(true);
    setError(null);
    const e = await onConfirmar(destino, m);
    setEnviando(false);
    if (e) setError(e);
  }

  return (
    <Modal
      titulo="Acuerdo de nueva fecha"
      onCerrar={onCancelar}
      pie={
        <>
          <BotonSecundario onClick={onCancelar}>Cancelar</BotonSecundario>
          <BotonPrimario onClick={confirmar} disabled={enviando || m.length < 5}>
            Registrar acuerdo
          </BotonPrimario>
        </>
      }
    >
      <div className="space-y-3 text-sm text-ink-2">
        <p>
          Fecha límite actual: <b className="font-label font-bold text-ink">{etiquetaFecha(actual, hoy)}</b>
          {!elige && (
            <>
              {" "}→ nueva:{" "}
              <b className="font-label font-bold text-ink">{nueva ? etiquetaFecha(nueva, hoy) : "sin fecha"}</b>
            </>
          )}
        </p>
        {veces > 0 && (
          <p className="rounded-sm bg-[#FFF4E5] px-3 py-2 text-[13px] text-[#B54708]">
            Esta tarea ya se ha postergado {veces} {veces === 1 ? "vez" : "veces"}. Este acuerdo quedará en el historial y no se podrá borrar.
          </p>
        )}
        {elige && (
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-ink">Nueva fecha límite</span>
            <input
              type="date"
              value={fecha}
              min={actual}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-sm border border-line px-2 py-1.5 text-sm outline-none focus:border-blue"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold text-ink">Motivo del acuerdo (obligatorio)</span>
          <textarea
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="¿Por qué se mueve la fecha y quién la acordó?"
            className="w-full resize-y rounded-sm border border-line p-2 text-sm outline-none focus:border-blue focus:shadow-eb-focus"
          />
        </label>
        {error && <p role="alert" className="text-[13px] text-[#B42318]">{error}</p>}
      </div>
    </Modal>
  );
}

/** Sección "Acuerdos de nueva fecha" dentro de la tarea. */
export function SeccionPostergaciones({
  historial,
  fechaLimite,
  puedeEditar,
  esAdmin,
  nombreDe,
  onAcordar,
}: {
  historial: Postergacion[];
  fechaLimite: string | null;
  puedeEditar: boolean;
  esAdmin: boolean;
  nombreDe: (id: string | null) => string;
  onAcordar: () => void;
}) {
  const aviso = useAviso();
  const [borrando, setBorrando] = useState<string | null>(null);
  const hoy = hoyISO();
  if (historial.length === 0 && !(puedeEditar && fechaLimite)) return null;

  return (
    <section aria-label="Acuerdos de nueva fecha" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarClock className="h-4 w-4 text-ink-3" /> Acuerdos de nueva fecha
          {historial.length > 0 && <InsigniaPostergada veces={historial.length} />}
        </h2>
        {puedeEditar && fechaLimite && (
          <button
            type="button"
            onClick={onAcordar}
            className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs text-ink-3 hover:bg-line-2 hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" /> Acordar nueva fecha
          </button>
        )}
      </div>
      {historial.length === 0 ? (
        <p className="rounded-md border border-line px-3 py-2.5 text-sm text-ink-3">
          Sin postergaciones. Cada vez que la fecha límite se mueva hacia adelante quedará aquí con su motivo.
        </p>
      ) : (
        <ol className="divide-y divide-line-2 rounded-md border border-line">
          {historial.map((p, i) => (
            <li key={p.id} className="flex gap-3 px-3 py-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-[#FFF4E5] text-[11px] font-bold text-[#B54708]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-ink">
                  <span className="text-ink-3">{etiquetaFecha(p.fechaAnterior, hoy)}</span>
                  <span aria-hidden> → </span>
                  <b className="font-label font-bold">{p.fechaNueva ? etiquetaFecha(p.fechaNueva, hoy) : "sin fecha"}</b>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-ink-2">{p.motivo}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {nombreDe(p.userId)} · {fechaHora(p.createdAt)}
                </p>
              </div>
              {esAdmin && (
                <button
                  type="button"
                  aria-label="Borrar acuerdo (solo administradores)"
                  title="Borrar acuerdo (solo administradores)"
                  disabled={borrando === p.id}
                  onClick={async () => {
                    setBorrando(p.id);
                    const r = await eliminarPostergacionAction(p.id);
                    setBorrando(null);
                    if (!r.ok) aviso(r.error);
                  }}
                  className="h-fit rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-[#B42318] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
