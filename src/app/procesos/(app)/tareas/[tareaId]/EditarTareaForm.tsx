"use client";

import { useFormState, useFormStatus } from "react-dom";
import { actualizarTareaAction } from "@/lib/procesos/actions";
import { ESTADO_LABELS, type EstadoTarea, type Tarea } from "@/lib/procesos/types";
import type { AppUser } from "@/lib/procesos/types";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}

const ESTADOS: EstadoTarea[] = ["pendiente", "en_progreso", "completada", "rechazada"];

export function EditarTareaForm({ tarea, responsablesPosibles }: { tarea: Tarea; responsablesPosibles: AppUser[] }) {
  const action = actualizarTareaAction.bind(null, tarea.id);
  const [state, formAction] = useFormState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Nombre de la tarea</label>
        <input
          name="nombre"
          type="text"
          defaultValue={tarea.nombre}
          required
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Descripción</label>
        <textarea
          name="descripcion"
          rows={2}
          defaultValue={tarea.descripcion ?? ""}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Responsable</label>
          <select
            name="responsableUserId"
            defaultValue={tarea.responsableUserId ?? ""}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          >
            <option value="">Sin asignar</option>
            {responsablesPosibles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Estado</label>
          <select
            name="estado"
            defaultValue={tarea.estado}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABELS[e]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Resultado esperado</label>
        <textarea
          name="resultado"
          rows={2}
          defaultValue={tarea.resultado ?? ""}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">¿Cómo impacta al paciente?</label>
        <textarea
          name="impactoPaciente"
          rows={2}
          defaultValue={tarea.impactoPaciente ?? ""}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            name="altoRiesgo"
            type="checkbox"
            defaultChecked={tarea.altoRiesgo}
            className="h-4 w-4 rounded border-line"
          />
          ¿Es de alto riesgo?
        </label>
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">SLA en horas (opcional)</label>
          <input
            name="slaHoras"
            type="number"
            min={1}
            step={1}
            defaultValue={tarea.slaHoras ?? ""}
            placeholder="Ej. 48"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>
      {state.error && <p className="text-xs text-[#B3261E]">{state.error}</p>}
      <div>
        <BotonGuardar />
      </div>
    </form>
  );
}
