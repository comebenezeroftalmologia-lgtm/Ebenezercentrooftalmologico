"use client";

import { useFormState, useFormStatus } from "react-dom";
import { crearUsuarioAction } from "@/lib/procesos/actions";

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Creando…" : "Crear usuario"}
    </button>
  );
}

export function CrearUsuarioForm() {
  const [state, formAction] = useFormState(crearUsuarioAction, { error: null });

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Nombre completo</label>
        <input
          name="nombreCompleto"
          type="text"
          required
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Usuario</label>
        <input
          name="usuario"
          type="text"
          required
          placeholder="ej. faber.dearco"
          pattern="[a-z0-9._-]+"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Contraseña temporal</label>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div className="flex items-end gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input name="isAdmin" type="checkbox" className="h-4 w-4 rounded border-line" />
          Administrador
        </label>
      </div>

      {state.error && (
        <p className="sm:col-span-2 lg:col-span-4 rounded-lg bg-[#FBEAE8] px-3 py-2 text-xs text-[#B3261E]">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="sm:col-span-2 lg:col-span-4 rounded-lg bg-green-10 px-3 py-2 text-xs text-green">
          Usuario creado.
        </p>
      )}

      <div className="sm:col-span-2 lg:col-span-4">
        <BotonCrear />
      </div>
    </form>
  );
}
