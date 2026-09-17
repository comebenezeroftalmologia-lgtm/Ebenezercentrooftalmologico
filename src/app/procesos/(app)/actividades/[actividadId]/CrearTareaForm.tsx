"use client";

import { useFormState, useFormStatus } from "react-dom";
import { crearTareaAction } from "@/lib/procesos/actions";
import type { AppUser } from "@/lib/procesos/types";

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Creando…" : "Crear tarea"}
    </button>
  );
}

export function CrearTareaForm({
  actividadId,
  siguienteOrden,
  responsablesPosibles,
}: {
  actividadId: string;
  siguienteOrden: number;
  responsablesPosibles: AppUser[];
}) {
  const action = crearTareaAction.bind(null, actividadId, siguienteOrden);
  const [state, formAction] = useFormState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Nombre de la tarea</label>
        <input
          name="nombre"
          type="text"
          required
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Descripción (opcional)</label>
        <textarea
          name="descripcion"
          rows={2}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Responsable</label>
          <select
            name="responsableUserId"
            defaultValue=""
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
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Resultado esperado</label>
        <textarea
          name="resultado"
          rows={2}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">¿Cómo impacta al paciente?</label>
        <textarea
          name="impactoPaciente"
          rows={2}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      {state.error && <p className="text-xs text-[#B3261E]">{state.error}</p>}
      <div>
        <BotonCrear />
      </div>
    </form>
  );
}
