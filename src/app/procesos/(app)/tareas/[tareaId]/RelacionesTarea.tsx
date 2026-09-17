"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, Search, X } from "lucide-react";
import {
  buscarTareasParaRelacionarAction,
  crearRelacionTareaAction,
  eliminarRelacionTareaAction,
} from "@/lib/procesos/actions";
import type { TareaRelacionada } from "@/lib/procesos/types";

type Resultado = { id: string; nombre: string; procesoNombre: string; areaNombre: string };

export function RelacionesTarea({
  tareaId,
  relacionesIniciales,
}: {
  tareaId: string;
  relacionesIniciales: TareaRelacionada[];
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await buscarTareasParaRelacionarAction(query, tareaId);
        setResultados(r);
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tareaId]);

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
        <Link2 className="h-4 w-4 text-blue" strokeWidth={1.75} />
        Tareas relacionadas
      </h3>

      <ul className="mb-4 flex flex-col gap-2">
        {relacionesIniciales.map((r) => (
          <li
            key={r.relacionId}
            className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
          >
            <a href={`/procesos/tareas/${r.tarea.id}`} className="text-ink-2 hover:underline">
              <span className="font-medium">{r.tarea.nombre}</span>
              <span className="text-ink-3"> — {r.tarea.areaNombre} · {r.tarea.procesoNombre}</span>
            </a>
            <button
              type="button"
              onClick={() =>
                startTransition(() => eliminarRelacionTareaAction(r.relacionId, tareaId))
              }
              className="rounded p-1 text-ink-3 hover:bg-[#FBEAE8] hover:text-[#B3261E]"
              aria-label="Quitar relación"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </li>
        ))}
        {relacionesIniciales.length === 0 && (
          <li className="text-sm text-ink-3">Sin tareas relacionadas todavía.</li>
        )}
      </ul>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.75} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar una tarea de otra área para relacionar…"
          className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm text-ink"
        />
      </div>
      {error && <p className="mt-2 text-xs text-[#B3261E]">{error}</p>}
      {resultados.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-line bg-white p-2 shadow-sm">
          {resultados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    try {
                      await crearRelacionTareaAction(tareaId, r.id, null);
                      setQuery("");
                      setResultados([]);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "No se pudo relacionar.");
                    }
                  })
                }
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink-2 hover:bg-line-2"
              >
                <span className="font-medium">{r.nombre}</span>
                <span className="text-ink-3"> — {r.areaNombre} · {r.procesoNombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
