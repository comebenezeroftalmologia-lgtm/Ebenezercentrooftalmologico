"use client";

import { useFormState, useFormStatus } from "react-dom";
import Image from "next/image";
import { solicitarRecuperacionAction } from "@/lib/procesos/actions";

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar link de recuperación"}
    </button>
  );
}

export default function RecuperarPasswordPage() {
  const [state, formAction] = useFormState(solicitarRecuperacionAction, { error: null });

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
          <h1 className="text-lg font-semibold text-navy">Recuperar contraseña</h1>
          <p className="mt-1 text-center text-xs text-ink-3">
            Escribe tu correo y te mandamos un link para crear una contraseña nueva.
          </p>
        </div>

        {state.ok ? (
          <p className="rounded-lg bg-green-10 px-3 py-3 text-center text-sm text-green">
            Si ese correo tiene una cuenta, te llegará un link para restablecer tu contraseña.
            Revisa tu bandeja de entrada (y spam).
          </p>
        ) : (
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

            {state.error && (
              <p className="rounded-lg bg-[#FBEAE8] px-3 py-2 text-xs text-[#B3261E]">
                {state.error}
              </p>
            )}

            <BotonEnviar />
          </form>
        )}

        <a
          href="/login"
          className="mt-4 block text-center text-xs text-ink-3 underline hover:text-blue"
        >
          Volver a iniciar sesión
        </a>
      </div>
    </div>
  );
}
