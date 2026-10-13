"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ListaDestino } from "@/lib/proyectos/types";

const CLAVE_ULTIMA = "proyectos:ultima-lista-doc";

function leerUltima(): string {
  try {
    return window.localStorage.getItem(CLAVE_ULTIMA) ?? "";
  } catch {
    return "";
  }
}
function guardarUltima(id: string) {
  try {
    window.localStorage.setItem(CLAVE_ULTIMA, id);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

/**
 * Panel de «Crear tarea» sobre el texto seleccionado de un documento:
 * elige la lista, ajusta el nombre y crea. El texto pasa a ser un enlace a la tarea.
 */
export function PanelCrearTareaDoc({
  textoInicial,
  listas,
  onCrear,
  onCerrar,
}: {
  textoInicial: string;
  listas: ListaDestino[];
  /** Devuelve null si salió bien o el mensaje de error. */
  onCrear: (nombre: string, listaId: string) => Promise<string | null>;
  onCerrar: () => void;
}) {
  const [listaId, setListaId] = useState("");
  const [nombre, setNombre] = useState(textoInicial.slice(0, 300));
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const refNombre = useRef<HTMLInputElement>(null);

  // Recuerda la última lista usada (si todavía existe).
  useEffect(() => {
    const ultima = leerUltima();
    if (ultima && listas.some((l) => l.id === ultima)) setListaId(ultima);
  }, [listas]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const grupos = useMemo(() => {
    const m = new Map<string, { titulo: string; items: ListaDestino[] }>();
    for (const l of listas) {
      const g = m.get(l.espacioId) ?? { titulo: l.espacioNombre, items: [] };
      g.items.push(l);
      m.set(l.espacioId, g);
    }
    return [...m.values()];
  }, [listas]);

  async function crear() {
    const n = nombre.trim();
    if (!listaId || !n || creando) return;
    setCreando(true);
    setError(null);
    const e = await onCrear(n, listaId);
    if (e) {
      setCreando(false);
      return setError(e);
    }
    guardarUltima(listaId);
  }

  return (
    <div role="dialog" aria-label="Crear tarea" className="w-[340px] rounded-lg border border-line bg-white p-3 shadow-eb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">Crear tarea</span>
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mb-2 block">
        <span className="sr-only">Lista</span>
        <select
          autoFocus
          value={listaId}
          onChange={(e) => {
            setListaId(e.target.value);
            refNombre.current?.focus();
          }}
          aria-label="Lista de destino"
          className="w-full rounded-sm border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-blue"
        >
          <option value="" disabled>
            Seleccionar lista…
          </option>
          {grupos.map((g) => (
            <optgroup key={g.titulo} label={g.titulo}>
              {g.items.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.carpetaNombre ? `${l.carpetaNombre} / ${l.nombre}` : l.nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <label className="mb-2 block">
        <span className="sr-only">Nombre de la tarea</span>
        <input
          ref={refNombre}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void crear();
            }
          }}
          maxLength={300}
          aria-label="Nombre de la tarea"
          className="w-full rounded-sm border border-line px-2 py-1.5 text-sm outline-none focus:border-blue"
        />
      </label>

      {error && <p role="alert" className="mb-2 text-[12px] text-[#B42318]">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-ink-3">Quedará asignada a ti.</span>
        <button
          type="button"
          onClick={crear}
          disabled={!listaId || !nombre.trim() || creando}
          className="rounded-sm bg-blue px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creando ? "Creando…" : "Crear"}
        </button>
      </div>
    </div>
  );
}
