"use client";

import { useFormState, useFormStatus } from "react-dom";
import { cambiarPasswordAction } from "@/lib/procesos/actions";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Cambiar contraseña"}
    </button>
  );
}

export function CambiarPasswordForm() {
  const [state, formAction] = useFormState(cambiarPasswordAction, { error: null });

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Nueva contraseña</label>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Confirmar contraseña</label>
        <input
          name="confirmar"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-[#FBEAE8] px-3 py-2 text-xs text-[#B3261E]">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-10 px-3 py-2 text-xs text-green">
          Contraseña actualizada.
        </p>
      )}

      <div>
        <BotonGuardar />
      </div>
    </form>
  );
}
