"use client";

import { useState } from "react";
import { Calendar, Check, Flag, Plus, Tag, X } from "lucide-react";
import { Avatar, IconoBandera, Popover } from "@/components/proyectos/ui";
import {
  COLORES_ESTADO,
  PRIORIDADES,
  type Estado,
  type Etiqueta,
  type Miembro,
  type Prioridad,
} from "@/lib/proyectos/types";
import { estaVencida, etiquetaFecha, hoyISO } from "@/lib/proyectos/utils";

const itemCls = "flex w-full items-center gap-2 rounded-xs px-2.5 py-1.5 text-left text-[13px] text-ink-2 hover:bg-line-2";

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
export function PildoraEstado({ estado, tamano = "md" }: { estado: Estado; tamano?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xs font-bold uppercase tracking-wide text-white ${
        tamano === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
      }`}
      style={{ background: estado.color }}
    >
      {estado.nombre}
    </span>
  );
}

/** Círculo de color (con visto si el estado es «cerrado»), como en ClickUp. */
export function PuntoEstado({ estado }: { estado: Estado }) {
  return (
    <span
      className="flex h-[18px] w-[18px] items-center justify-center rounded-pill border-2"
      style={{ borderColor: estado.color, background: estado.tipo === "cerrado" ? estado.color : "transparent" }}
      aria-hidden
    >
      {estado.tipo === "cerrado" ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2l2.4 2.4 4.6-5" /></svg>
      ) : estado.tipo === "activo" ? (
        <span className="h-1.5 w-1.5 rounded-pill" style={{ background: estado.color }} />
      ) : null}
    </span>
  );
}

export function SelectorEstado({
  estados,
  valor,
  onCambiar,
  deshabilitado,
  tamano,
  variante = "pildora",
}: {
  estados: Estado[];
  valor: string;
  onCambiar: (id: string) => void;
  deshabilitado?: boolean;
  tamano?: "sm" | "md";
  variante?: "pildora" | "punto";
}) {
  const actual = estados.find((e) => e.id === valor) ?? estados[0];
  if (!actual) return null;
  return (
    <Popover
      ancho={200}
      boton={({ alternar }) => (
        <button
          type="button"
          disabled={deshabilitado}
          onClick={alternar}
          aria-label={`Estado: ${actual.nombre}`}
          title={actual.nombre}
          className="rounded-xs focus:outline-none focus-visible:shadow-eb-focus disabled:cursor-default"
        >
          {variante === "punto" ? <PuntoEstado estado={actual} /> : <PildoraEstado estado={actual} tamano={tamano} />}
        </button>
      )}
    >
      {(cerrar) => (
        <div role="listbox" aria-label="Estados">
          {estados.map((e) => (
            <button
              key={e.id}
              role="option"
              aria-selected={e.id === valor}
              className={itemCls}
              onClick={() => {
                cerrar();
                if (e.id !== valor) onCambiar(e.id);
              }}
            >
              <span className="h-2.5 w-2.5 rounded-pill" style={{ background: e.color }} />
              <span className="flex-1 truncate">{e.nombre}</span>
              {e.id === valor && <Check className="h-3.5 w-3.5 text-blue" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Prioridad
// ---------------------------------------------------------------------------
export function SelectorPrioridad({
  valor,
  onCambiar,
  deshabilitado,
  conTexto = false,
}: {
  valor: Prioridad | null;
  onCambiar: (p: Prioridad | null) => void;
  deshabilitado?: boolean;
  conTexto?: boolean;
}) {
  const actual = PRIORIDADES.find((p) => p.value === valor);
  return (
    <Popover
      ancho={180}
      boton={({ alternar }) => (
        <button
          type="button"
          disabled={deshabilitado}
          onClick={alternar}
          aria-label={`Prioridad: ${actual?.label ?? "ninguna"}`}
          title={actual?.label ?? "Prioridad"}
          className="inline-flex items-center gap-1.5 rounded-xs px-1 py-0.5 text-[13px] hover:bg-line-2 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {actual ? <IconoBandera color={actual.color} size={15} /> : <Flag className="h-3.5 w-3.5 text-ink-3" />}
          {conTexto && <span className={actual ? "text-ink" : "text-ink-3"}>{actual?.label ?? "Vacío"}</span>}
        </button>
      )}
    >
      {(cerrar) => (
        <div role="listbox" aria-label="Prioridad">
          {PRIORIDADES.map((p) => (
            <button key={p.value} role="option" aria-selected={p.value === valor} className={itemCls} onClick={() => { cerrar(); onCambiar(p.value); }}>
              <IconoBandera color={p.color} size={15} /> <span className="flex-1">{p.label}</span>
              {p.value === valor && <Check className="h-3.5 w-3.5 text-blue" />}
            </button>
          ))}
          {valor && (
            <button className={`${itemCls} border-t border-line-2`} onClick={() => { cerrar(); onCambiar(null); }}>
              <X className="h-3.5 w-3.5" /> Quitar prioridad
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Fecha
// ---------------------------------------------------------------------------
function sumarDias(iso: string, dias: number): string {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + dias));
  return d.toISOString().slice(0, 10);
}

export function SelectorFecha({
  valor,
  onCambiar,
  deshabilitado,
  cerrada = false,
  etiqueta = "Fecha",
  conIcono = true,
  vacioTexto,
}: {
  valor: string | null;
  onCambiar: (f: string | null) => void;
  deshabilitado?: boolean;
  cerrada?: boolean;
  etiqueta?: string;
  conIcono?: boolean;
  vacioTexto?: string;
}) {
  const hoy = hoyISO();
  const vencida = estaVencida(valor, cerrada, hoy);
  return (
    <Popover
      ancho={230}
      boton={({ alternar }) => (
        <button
          type="button"
          disabled={deshabilitado}
          onClick={alternar}
          aria-label={`${etiqueta}: ${valor ? etiquetaFecha(valor, hoy) : "sin fecha"}`}
          className={`inline-flex items-center gap-1.5 rounded-xs px-1 py-0.5 text-[13px] hover:bg-line-2 disabled:cursor-default disabled:hover:bg-transparent ${
            valor ? (vencida ? "font-medium text-[#D92D20]" : "text-ink") : "text-ink-3"
          }`}
        >
          {conIcono && <Calendar className="h-3.5 w-3.5" />}
          {valor ? etiquetaFecha(valor, hoy) : vacioTexto ?? ""}
        </button>
      )}
    >
      {(cerrar) => (
        <div>
          <p className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-overline text-ink-3">{etiqueta}</p>
          <input
            type="date"
            value={valor ?? ""}
            onChange={(e) => {
              onCambiar(e.target.value || null);
            }}
            aria-label={etiqueta}
            className="mb-1 w-full rounded-sm border border-line px-2 py-1.5 text-sm outline-none focus:border-blue"
          />
          {[
            ["Hoy", hoy],
            ["Mañana", sumarDias(hoy, 1)],
            ["En una semana", sumarDias(hoy, 7)],
          ].map(([t, f]) => (
            <button key={t} className={itemCls} onClick={() => { cerrar(); onCambiar(f); }}>
              {t}
            </button>
          ))}
          {valor && (
            <button className={`${itemCls} border-t border-line-2`} onClick={() => { cerrar(); onCambiar(null); }}>
              <X className="h-3.5 w-3.5" /> Quitar fecha
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Responsables
// ---------------------------------------------------------------------------
export function SelectorAsignados({
  miembros,
  nombres,
  valor,
  onCambiar,
  deshabilitado,
  conNombres = false,
}: {
  miembros: Miembro[];
  nombres: Map<string, string>;
  valor: string[];
  onCambiar: (ids: string[]) => void;
  deshabilitado?: boolean;
  conNombres?: boolean;
}) {
  const [q, setQ] = useState("");
  // Los asignados que ya no son miembros se siguen mostrando (para poder quitarlos).
  const idsLista = Array.from(new Set([...miembros.map((m) => m.userId), ...valor]));
  const lista = idsLista
    .map((id) => ({ id, nombre: nombres.get(id) ?? "Usuario" }))
    .filter((p) => p.nombre.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Popover
      ancho={240}
      boton={({ alternar }) => (
        <button
          type="button"
          disabled={deshabilitado}
          onClick={alternar}
          aria-label="Responsables"
          className="inline-flex items-center gap-1.5 rounded-xs px-1 py-0.5 hover:bg-line-2 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {valor.length === 0 ? (
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-pill border border-dashed border-ink-3 text-ink-3">
              <Plus className="h-3 w-3" />
            </span>
          ) : conNombres ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {valor.map((id) => (
                <span key={id} className="inline-flex items-center gap-1.5 text-[13px] text-ink">
                  <Avatar id={id} nombre={nombres.get(id) ?? "Usuario"} size={20} />
                  {nombres.get(id) ?? "Usuario"}
                </span>
              ))}
            </span>
          ) : (
            <span className="inline-flex items-center">
              {valor.slice(0, 3).map((id, i) => (
                <span key={id} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                  <Avatar id={id} nombre={nombres.get(id) ?? "Usuario"} size={22} ring />
                </span>
              ))}
              {valor.length > 3 && (
                <span className="ml-1 text-[11px] font-semibold text-ink-3">+{valor.length - 3}</span>
              )}
            </span>
          )}
        </button>
      )}
    >
      {() => (
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar persona…"
            aria-label="Buscar persona"
            className="mb-1 w-full rounded-sm border border-line px-2 py-1.5 text-[13px] outline-none focus:border-blue"
          />
          <div className="max-h-56 overflow-y-auto" role="listbox" aria-multiselectable="true" aria-label="Responsables">
            {lista.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-3">Sin personas. Agrega miembros al espacio desde «Compartir».</p>}
            {lista.map((p) => {
              const marcado = valor.includes(p.id);
              return (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={marcado}
                  className={itemCls}
                  onClick={() => onCambiar(marcado ? valor.filter((x) => x !== p.id) : [...valor, p.id])}
                >
                  <Avatar id={p.id} nombre={p.nombre} size={20} />
                  <span className="flex-1 truncate">{p.nombre}</span>
                  {marcado && <Check className="h-3.5 w-3.5 text-blue" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Etiquetas
// ---------------------------------------------------------------------------
export function EtiquetaChip({ etiqueta, onQuitar }: { etiqueta: Etiqueta; onQuitar?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: `${etiqueta.color}24`, color: etiqueta.color }}
    >
      {etiqueta.nombre}
      {onQuitar && (
        <button type="button" onClick={onQuitar} aria-label={`Quitar etiqueta ${etiqueta.nombre}`} className="opacity-70 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function SelectorEtiquetas({
  etiquetas,
  valor,
  onCambiar,
  onCrear,
  deshabilitado,
}: {
  etiquetas: Etiqueta[];
  valor: string[];
  onCambiar: (ids: string[]) => void;
  onCrear: (nombre: string, color: string) => Promise<Etiqueta | null>;
  deshabilitado?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtradas = etiquetas.filter((e) => e.nombre.toLowerCase().includes(q.trim().toLowerCase()));
  const existeExacta = etiquetas.some((e) => e.nombre.toLowerCase() === q.trim().toLowerCase());
  const seleccionadas = etiquetas.filter((e) => valor.includes(e.id));

  return (
    <Popover
      ancho={240}
      boton={({ alternar }) => (
        <button
          type="button"
          disabled={deshabilitado}
          onClick={alternar}
          aria-label="Etiquetas"
          className="inline-flex flex-wrap items-center gap-1 rounded-xs px-1 py-0.5 text-[13px] hover:bg-line-2 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {seleccionadas.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-ink-3">
              <Tag className="h-3.5 w-3.5" /> Vacío
            </span>
          ) : (
            seleccionadas.map((e) => <EtiquetaChip key={e.id} etiqueta={e} />)
          )}
        </button>
      )}
    >
      {() => (
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && q.trim() && !existeExacta) {
                const color = COLORES_ESTADO[etiquetas.length % COLORES_ESTADO.length];
                const nueva = await onCrear(q.trim(), color);
                if (nueva) {
                  onCambiar([...valor, nueva.id]);
                  setQ("");
                }
              }
            }}
            placeholder="Buscar o crear etiqueta…"
            aria-label="Buscar o crear etiqueta"
            className="mb-1 w-full rounded-sm border border-line px-2 py-1.5 text-[13px] outline-none focus:border-blue"
          />
          <div className="max-h-52 overflow-y-auto" role="listbox" aria-multiselectable="true" aria-label="Etiquetas">
            {filtradas.map((e) => {
              const marcado = valor.includes(e.id);
              return (
                <button
                  key={e.id}
                  role="option"
                  aria-selected={marcado}
                  className={itemCls}
                  onClick={() => onCambiar(marcado ? valor.filter((x) => x !== e.id) : [...valor, e.id])}
                >
                  <span className="h-2.5 w-2.5 rounded-pill" style={{ background: e.color }} />
                  <span className="flex-1 truncate">{e.nombre}</span>
                  {marcado && <Check className="h-3.5 w-3.5 text-blue" />}
                </button>
              );
            })}
            {q.trim() && !existeExacta && (
              <button
                className={`${itemCls} text-blue`}
                onClick={async () => {
                  const color = COLORES_ESTADO[etiquetas.length % COLORES_ESTADO.length];
                  const nueva = await onCrear(q.trim(), color);
                  if (nueva) {
                    onCambiar([...valor, nueva.id]);
                    setQ("");
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Crear «{q.trim()}»
              </button>
            )}
            {filtradas.length === 0 && !q.trim() && <p className="px-2.5 py-2 text-xs text-ink-3">Escribe para crear la primera etiqueta.</p>}
          </div>
        </div>
      )}
    </Popover>
  );
}
