"use client";

import { useFormState, useFormStatus } from "react-dom";
import { crearProcesoAction } from "@/lib/procesos/actions";

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Creando…" : "Crear proceso"}
    </button>
  );
}

export function CrearProcesoForm({ areaId }: { areaId: string }) {
  const action = crearProcesoAction.bind(null, areaId);
  const [state, formAction] = useFormState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Nombre del proceso</label>
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
      {state.error && <p className="text-xs text-[#B3261E]">{state.error}</p>}
      <div>
        <BotonCrear />
      </div>
    </form>
  );
}
