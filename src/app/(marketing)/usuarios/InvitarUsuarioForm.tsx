"use client";

import { useFormState, useFormStatus } from "react-dom";
import { invitarUsuarioAction } from "@/lib/procesos/actions";
import { MODULOS } from "@/lib/modulos";

function BotonInvitar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Invitando…" : "Invitar usuario"}
    </button>
  );
}

export function InvitarUsuarioForm() {
  const [state, formAction] = useFormState(invitarUsuarioAction, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Correo</label>
          <input
            name="email"
            type="email"
            required
            placeholder="persona@correo.com"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input name="isAdmin" type="checkbox" className="h-4 w-4 rounded border-line" />
            Administrador
          </label>
        </div>
      </div>

      <div>
        <p className="eb-label mb-2 block text-[11px] text-ink-3">Acceso a módulos</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => (
            <label key={m.slug} className="flex items-center gap-2 text-sm text-ink-2">
              <input
                name="modulos"
                type="checkbox"
                value={m.slug}
                className="h-4 w-4 rounded border-line"
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-[#FBEAE8] px-3 py-2 text-xs text-[#B3261E]">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-10 px-3 py-2 text-xs text-green">
          Invitación enviada. La persona recibirá un correo para crear su contraseña.
        </p>
      )}

      <div>
        <BotonInvitar />
      </div>
    </form>
  );
}
