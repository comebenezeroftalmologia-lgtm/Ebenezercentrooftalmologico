"use client";

import { useFormState, useFormStatus } from "react-dom";
import Image from "next/image";
import { loginAction } from "@/lib/procesos/actions";

function BotonEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, { error: null });

  return (
    <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-eb-4">
      <div className="mb-6 flex flex-col items-center">
        <Image
          src="/brand/logo/logo-oscuro.png"
          alt="Ebenezer"
          width={64}
          height={64}
          className="mb-3 h-16 w-16 object-contain"
        />
        <h1 className="text-lg font-semibold text-navy">Ebenezer</h1>
        <p className="mt-1 text-xs text-ink-3">Tableros y procesos internos</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="eb-label mb-1 block text-[11px] text-ink-3">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="eb-label mb-1 block text-[11px] text-ink-3">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        </div>

        {state.error && (
          <p className="rounded-lg bg-[#FBEAE8] px-3 py-2 text-xs text-[#B3261E]">{state.error}</p>
        )}

        <BotonEntrar />

        <a
          href="/recuperar-password"
          className="text-center text-xs text-ink-3 underline hover:text-blue"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </form>
    </div>
  );
}
