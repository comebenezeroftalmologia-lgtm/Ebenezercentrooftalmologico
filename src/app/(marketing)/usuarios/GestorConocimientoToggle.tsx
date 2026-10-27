"use client";

import { useState, useTransition } from "react";
import { setGestorConocimientoAction } from "@/lib/ayuda/actions";

/** Permiso aparte: puede cargar y publicar documentos del Centro de Conocimiento. */
export function GestorConocimientoToggle({ userId, inicial }: { userId: string; inicial: boolean }) {
  const [valor, setValor] = useState(inicial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mb-3">
      <label className="flex items-center gap-2 text-xs text-ink-2">
        <input
          type="checkbox"
          checked={valor}
          disabled={pending}
          onChange={(e) => {
            const nuevo = e.target.checked;
            setValor(nuevo);
            setError(null);
            start(async () => {
              const r = await setGestorConocimientoAction(userId, nuevo);
              if (!r.ok) {
                setValor(!nuevo);
                setError(r.error);
              }
            });
          }}
          className="h-3.5 w-3.5 rounded border-line"
        />
        Gestiona el Centro de Conocimiento
      </label>
      {error && <p className="mt-1 text-[11px] text-[#B3261E]">{error}</p>}
    </div>
  );
}
