"use client";

import { useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { moverActividadAction } from "@/lib/procesos/actions";

export function MoverActividadButtons({
  actividadId,
  procesoId,
  esPrimero,
  esUltimo,
}: {
  actividadId: string;
  procesoId: string;
  esPrimero: boolean;
  esUltimo: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col">
      <button
        type="button"
        disabled={pending || esPrimero}
        onClick={() => startTransition(() => moverActividadAction(actividadId, procesoId, "arriba"))}
        className="rounded p-0.5 text-ink-3 hover:bg-line-2 disabled:opacity-30"
        aria-label="Subir"
      >
        <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        disabled={pending || esUltimo}
        onClick={() => startTransition(() => moverActividadAction(actividadId, procesoId, "abajo"))}
        className="rounded p-0.5 text-ink-3 hover:bg-line-2 disabled:opacity-30"
        aria-label="Bajar"
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
