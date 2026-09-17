"use client";

import { useFormState, useFormStatus } from "react-dom";
import Image from "next/image";
import { establecerPasswordInicialAction } from "@/lib/procesos/actions";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Crear contraseña"}
    </button>
  );
}

export default function InvitacionPage() {
  const [state, formAction] = useFormState(establecerPasswordInicialAction, { error: null });

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-eb-4">
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/brand/logo/logo-oscuro.png"
            alt="Ebenezer"
            width={64}
            height={64}
            className="mb-3 h-16 w-16 object-contain"
          />
          <h1 className="text-lg font-semibold text-navy">Bienvenido a Ebenezer</h1>
          <p className="mt-1 text-center text-xs text-ink-3">
            Crea tu contraseña para terminar de activar tu cuenta.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="eb-label mb-1 block text-[11px] text-ink-3">
              Nueva contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-[#FBEAE8] px-3 py-2 text-xs text-[#B3261E]">
              {state.error}
            </p>
          )}

          <BotonGuardar />
        </form>
      </div>
    </div>
  );
}
