"use client";

import { useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { moverTareaAction } from "@/lib/procesos/actions";

export function MoverTareaButtons({
  tareaId,
  actividadId,
  esPrimero,
  esUltimo,
}: {
  tareaId: string;
  actividadId: string;
  esPrimero: boolean;
  esUltimo: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col">
      <button
        type="button"
        disabled={pending || esPrimero}
        onClick={() => startTransition(() => moverTareaAction(tareaId, actividadId, "arriba"))}
        className="rounded p-0.5 text-ink-3 hover:bg-line-2 disabled:opacity-30"
        aria-label="Subir"
      >
        <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        disabled={pending || esUltimo}
        onClick={() => startTransition(() => moverTareaAction(tareaId, actividadId, "abajo"))}
        className="rounded p-0.5 text-ink-3 hover:bg-line-2 disabled:opacity-30"
        aria-label="Bajar"
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
