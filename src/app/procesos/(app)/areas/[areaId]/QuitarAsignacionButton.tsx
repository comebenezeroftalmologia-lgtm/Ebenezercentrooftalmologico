"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { quitarAsignacionAction } from "@/lib/procesos/actions";

export function QuitarAsignacionButton({ asignacionId, areaId }: { asignacionId: string; areaId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => quitarAsignacionAction(asignacionId, areaId))}
      className="rounded-md p-1 text-ink-3 transition-colors duration-150 ease-eb-out hover:bg-[#FBEAE8] hover:text-[#B3261E] disabled:opacity-60"
      aria-label="Quitar"
      title="Quitar"
    >
      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}
