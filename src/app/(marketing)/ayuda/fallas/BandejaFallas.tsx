"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarFallaAction } from "@/lib/ayuda/actions";
import type { Falla } from "@/lib/ayuda/queries";
import { ESTADO_FALLA, fechaFalla } from "./ListaFallas";

const GRAVEDAD_CLASE: Record<string, string> = {
  alta: "bg-[#FBEAE8] text-[#B3261E]",
  media: "bg-[#FEF3E2] text-[#B54708]",
  baja: "bg-line-2 text-ink-3",
};

function Fila({ f }: { f: Falla }) {
  const router = useRouter();
  const [estado, setEstado] = useState(f.estado);
  const [nota, setNota] = useState(f.notaDesarrollador ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cambiado = estado !== f.estado || nota !== (f.notaDesarrollador ?? "");

  function guardar() {
    setError(null);
    start(async () => {
      const r = await actualizarFallaAction(f.id, estado, nota);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <li className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-navy">{f.titulo}</p>
        <span className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${GRAVEDAD_CLASE[f.gravedad]}`}>{f.gravedad}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-3">
        {f.reportadaPor ?? "—"} · {fechaFalla(f.createdAt)}
        {f.modulo ? ` · ${f.modulo}` : ""}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{f.descripcion}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as Falla["estado"])}
          className="rounded-md border border-line bg-white px-2 py-1 text-xs text-ink"
        >
          {Object.entries(ESTADO_FALLA).map(([valor, { texto }]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={1000}
          placeholder="Nota para quien reportó (opcional)"
          className="min-w-[200px] flex-1 rounded-md border border-line px-2 py-1 text-xs text-ink"
        />
        <button
          type="button"
          disabled={pending || !cambiado}
          onClick={guardar}
          className="rounded-md bg-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-navy-90 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#B3261E]">{error}</p>}
    </li>
  );
}

export function BandejaFallas({ fallas }: { fallas: Falla[] }) {
  if (fallas.length === 0) {
    return <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">No hay fallas reportadas.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {fallas.map((f) => (
        <Fila key={f.id} f={f} />
      ))}
    </ul>
  );
}
