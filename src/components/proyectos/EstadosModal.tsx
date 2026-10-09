"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BotonPrimario, Modal, Popover, useAviso } from "@/components/proyectos/ui";
import { COLORES_ESTADO, type Estado, type TipoEstado } from "@/lib/proyectos/types";
import {
  actualizarEstadoAction,
  crearEstadoAction,
  eliminarEstadoAction,
} from "@/lib/proyectos/actions";

const TIPOS: { value: TipoEstado; label: string }[] = [
  { value: "abierto", label: "Sin empezar" },
  { value: "activo", label: "En curso" },
  { value: "cerrado", label: "Cerrado" },
];

function Color({ valor, onCambiar }: { valor: string; onCambiar: (c: string) => void }) {
  return (
    <Popover
      ancho={168}
      claseWrapper="flex"
      boton={({ alternar }) => (
        <button
          type="button"
          onClick={alternar}
          aria-label="Cambiar color"
          className="h-5 w-5 shrink-0 rounded-pill ring-offset-2 hover:ring-2 hover:ring-line"
          style={{ background: valor }}
        />
      )}
    >
      {(cerrar) => (
        <div className="grid grid-cols-4 gap-2 p-1.5">
          {COLORES_ESTADO.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              className="h-6 w-6 rounded-pill"
              style={{ background: c }}
              onClick={() => {
                cerrar();
                onCambiar(c);
              }}
            />
          ))}
        </div>
      )}
    </Popover>
  );
}

export function EstadosModal({
  listaId,
  estados,
  onCerrar,
}: {
  listaId: string;
  estados: Estado[];
  onCerrar: () => void;
}) {
  const aviso = useAviso();
  const [pendiente, start] = useTransition();
  const [nuevo, setNuevo] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoEstado>("activo");
  const [borrando, setBorrando] = useState<string | null>(null);
  const [destino, setDestino] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) aviso(r.error ?? "No se pudo completar la acción.");
    });

  return (
    <Modal titulo="Estados de la lista" onCerrar={onCerrar} ancho={520}>
      <p className="mb-3 text-sm text-ink-3">
        Los estados son las etapas por las que pasa una tarea. «Cerrado» marca la tarea como terminada.
      </p>
      <ul className="mb-4 space-y-1.5">
        {estados.map((e) => (
          <li key={e.id} className="rounded-md border border-line px-2.5 py-2">
            <div className="flex items-center gap-2">
              <Color valor={e.color} onCambiar={(c) => run(() => actualizarEstadoAction(e.id, { color: c }))} />
              <input
                defaultValue={e.nombre}
                maxLength={40}
                aria-label={`Nombre del estado ${e.nombre}`}
                onBlur={(ev) => {
                  const v = ev.target.value.trim();
                  if (v && v !== e.nombre) run(() => actualizarEstadoAction(e.id, { nombre: v }));
                  else ev.target.value = e.nombre;
                }}
                onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                className="min-w-0 flex-1 rounded-xs border border-transparent px-1.5 py-1 text-sm font-medium uppercase outline-none hover:border-line focus:border-blue"
              />
              <select
                value={e.tipo}
                onChange={(ev) => run(() => actualizarEstadoAction(e.id, { tipo: ev.target.value as TipoEstado }))}
                aria-label={`Tipo del estado ${e.nombre}`}
                className="rounded-xs border border-line bg-white px-1.5 py-1 text-xs outline-none focus:border-blue"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={estados.length <= 1}
                onClick={() => {
                  setBorrando(e.id);
                  setDestino(estados.find((x) => x.id !== e.id)?.id ?? "");
                }}
                aria-label={`Eliminar estado ${e.nombre}`}
                className="rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-[#B42318] disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {borrando === e.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm bg-line-2 px-2.5 py-2 text-xs text-ink-2">
                Mover sus tareas a
                <select
                  value={destino}
                  onChange={(ev) => setDestino(ev.target.value)}
                  className="rounded-xs border border-line bg-white px-1.5 py-1 outline-none"
                  aria-label="Estado destino"
                >
                  {estados
                    .filter((x) => x.id !== e.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nombre}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={pendiente || !destino}
                  onClick={() => {
                    run(() => eliminarEstadoAction(e.id, destino));
                    setBorrando(null);
                  }}
                  className="rounded-xs bg-[#D92D20] px-2 py-1 font-semibold text-white disabled:opacity-50"
                >
                  Eliminar estado
                </button>
                <button type="button" onClick={() => setBorrando(null)} className="text-ink-3 hover:text-ink">
                  Cancelar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          maxLength={40}
          placeholder="Nuevo estado"
          aria-label="Nombre del nuevo estado"
          onKeyDown={(e) => {
            if (e.key === "Enter" && nuevo.trim()) {
              run(() => crearEstadoAction(listaId, { nombre: nuevo, tipo: nuevoTipo, color: COLORES_ESTADO[estados.length % COLORES_ESTADO.length] }));
              setNuevo("");
            }
          }}
          className="min-w-0 flex-1 rounded-sm border border-line px-3 py-2 text-sm outline-none focus:border-blue"
        />
        <select
          value={nuevoTipo}
          onChange={(e) => setNuevoTipo(e.target.value as TipoEstado)}
          aria-label="Tipo del nuevo estado"
          className="rounded-sm border border-line bg-white px-2 py-2 text-sm outline-none focus:border-blue"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <BotonPrimario
          disabled={pendiente || !nuevo.trim()}
          onClick={() => {
            run(() => crearEstadoAction(listaId, { nombre: nuevo, tipo: nuevoTipo, color: COLORES_ESTADO[estados.length % COLORES_ESTADO.length] }));
            setNuevo("");
          }}
        >
          <Plus className="h-4 w-4" /> Agregar
        </BotonPrimario>
      </div>
    </Modal>
  );
}
