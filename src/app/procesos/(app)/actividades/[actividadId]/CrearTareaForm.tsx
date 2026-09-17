"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Link2, Search, X } from "lucide-react";
import { buscarTareasParaRelacionarAction, crearTareaAction } from "@/lib/procesos/actions";
import type { AppUser } from "@/lib/procesos/types";

type Resultado = { id: string; nombre: string; procesoNombre: string; areaNombre: string };

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
    >
      {pending ? "Creando…" : "Crear tarea"}
    </button>
  );
}

export function CrearTareaForm({
  actividadId,
  siguienteOrden,
  responsablesPosibles,
}: {
  actividadId: string;
  siguienteOrden: number;
  responsablesPosibles: AppUser[];
}) {
  const action = crearTareaAction.bind(null, actividadId, siguienteOrden);
  const [state, formAction] = useFormState(action, { error: null });
  const formRef = useRef<HTMLFormElement>(null);

  // Relacionar con otra tarea (de cualquier área) desde este mismo
  // formulario, sin tener que guardar primero y entrar al detalle.
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [seleccionada, setSeleccionada] = useState<Resultado | null>(null);
  const [nota, setNota] = useState("");
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const r = await buscarTareasParaRelacionarAction(query);
        setResultados(r);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Cada envío exitoso limpia el formulario — sin esto, los campos se
  // quedaban con lo último escrito y parecía que no se podía agregar
  // una segunda tarea (aunque sí se creaba, solo que no era obvio).
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setQuery("");
      setResultados([]);
      setSeleccionada(null);
      setNota("");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Nombre de la tarea</label>
        <input
          name="nombre"
          type="text"
          required
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Descripción (opcional)</label>
        <textarea
          name="descripcion"
          rows={2}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Responsable</label>
          <select
            name="responsableUserId"
            defaultValue=""
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          >
            <option value="">Sin asignar</option>
            {responsablesPosibles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">Resultado esperado</label>
        <textarea
          name="resultado"
          rows={2}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div>
        <label className="eb-label mb-1 block text-[11px] text-ink-3">¿Cómo impacta al paciente?</label>
        <textarea
          name="impactoPaciente"
          rows={2}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>

      <div className="rounded-lg border border-line-2 bg-paper p-3">
        <p className="eb-label mb-2 flex items-center gap-1.5 text-[11px] text-ink-3">
          <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          Relacionar con otra tarea (opcional)
        </p>

        <input type="hidden" name="relacionarConTareaId" value={seleccionada?.id ?? ""} />
        <input type="hidden" name="relacionarNota" value={nota} />

        {seleccionada ? (
          <div className="flex items-start justify-between gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-ink-2">{seleccionada.nombre}</p>
              <p className="text-xs text-ink-3">
                {seleccionada.areaNombre} · {seleccionada.procesoNombre}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSeleccionada(null)}
              className="rounded p-1 text-ink-3 hover:bg-[#FBEAE8] hover:text-[#B3261E]"
              aria-label="Quitar relación"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
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
        )}

        {!seleccionada && resultados.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-line bg-white p-2 shadow-sm">
            {resultados.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSeleccionada(r);
                    setQuery("");
                    setResultados([]);
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink-2 hover:bg-line-2"
                >
                  <span className="font-medium">{r.nombre}</span>
                  <span className="text-ink-3"> — {r.areaNombre} · {r.procesoNombre}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!seleccionada && !buscando && query.trim().length >= 2 && resultados.length === 0 && (
          <p className="mt-2 text-xs text-ink-3">Sin resultados.</p>
        )}

        {seleccionada && (
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota sobre esta relación (opcional)"
            rows={2}
            className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
        )}
      </div>

      {state.error && <p className="text-xs text-[#B3261E]">{state.error}</p>}
      {state.ok && <p className="text-xs text-green">Tarea creada — puedes agregar otra.</p>}
      <div>
        <BotonCrear />
      </div>
    </form>
  );
}
