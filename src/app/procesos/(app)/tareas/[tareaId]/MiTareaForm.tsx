"use client";

import { useFormState, useFormStatus } from "react-dom";
import { actualizarMiTareaAction } from "@/lib/procesos/actions";
import { ESTADO_LABELS, type EstadoTarea, type Tarea } from "@/lib/procesos/types";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

const ESTADOS: EstadoTarea[] = ["pendiente", "en_progreso", "completada"];

/** Vista para el colaborador responsable: solo puede tocar estado,
 * resultado e impacto al paciente de SU tarea — el resto (nombre,
 * descripción, responsable) lo define el líder. */
export function MiTareaForm({ tarea }: { tarea: Tarea }) {
  const action = actualizarMiTareaAction.bind(null, tarea.id);
  const [state, formAction] = useFormState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
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
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Resultado</label>
        <textarea
          name="resultado"
          rows={3}
          defaultValue={tarea.resultado ?? ""}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">¿Cómo impacta al paciente?</label>
        <textarea
          name="impactoPaciente"
          rows={3}
          defaultValue={tarea.impactoPaciente ?? ""}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      {state.error && <p className="text-xs text-[#B3261E]">{state.error}</p>}
      <div>
        <BotonGuardar />
      </div>
    </form>
  );
}
