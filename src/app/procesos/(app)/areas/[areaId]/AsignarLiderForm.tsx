"use client";

import { useState, useTransition } from "react";
import { asignarLiderAction } from "@/lib/procesos/actions";
import type { AppUser } from "@/lib/procesos/types";

export function AsignarLiderForm({ areaId, candidatos }: { areaId: string; candidatos: AppUser[] }) {
  const [userId, setUserId] = useState(candidatos[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (candidatos.length === 0) {
    return <p className="text-xs text-ink-3">No hay más usuarios disponibles para asignar.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
      >
        {candidatos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombreCompleto}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await asignarLiderAction(areaId, userId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo asignar.");
            }
          })
        }
        className="rounded-lg bg-blue px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
      >
        Asignar líder
      </button>
      {error && <p className="text-xs text-[#B3261E]">{error}</p>}
    </div>
  );
}
