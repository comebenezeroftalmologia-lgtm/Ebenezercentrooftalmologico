"use client";

import { useTransition } from "react";
import { toggleActivoUsuarioAction } from "@/lib/procesos/actions";

export function ToggleActivoButton({ userId, activo }: { userId: string; activo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleActivoUsuarioAction(userId, !activo))}
      className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 ease-eb-out hover:border-navy-20 disabled:opacity-60"
    >
      {activo ? "Desactivar" : "Activar"}
    </button>
  );
}
