"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { restablecerPasswordAction } from "@/lib/procesos/actions";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue px-2.5 py-1 text-xs font-medium text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

export function RestablecerPasswordButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const action = restablecerPasswordAction.bind(null, userId);
  const [state, formAction] = useFormState(action, { error: null });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 ease-eb-out hover:border-navy-20"
      >
        <KeyRound className="h-3 w-3" strokeWidth={1.75} />
        Contraseña
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        name="password"
        type="text"
        placeholder="Nueva contraseña"
        minLength={8}
        required
        className="w-36 rounded-md border border-line px-2 py-1 text-xs text-ink"
      />
      <BotonGuardar />
      {state.error && <span className="text-xs text-[#B3261E]">{state.error}</span>}
      {state.ok && <span className="text-xs text-green">Guardada</span>}
    </form>
  );
}
