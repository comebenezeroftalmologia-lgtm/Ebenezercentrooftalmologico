"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Flag,
  ListChecks,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Users,
  X,
  Download,
  CornerDownRight,
} from "lucide-react";
import type { DatosTarea } from "@/lib/proyectos/queries";
import type { Checklist, Comentario, EntradaActividad, Prioridad } from "@/lib/proyectos/types";
import { PRIORIDADES } from "@/lib/proyectos/types";
import {
  actualizarTareaAction,
  crearChecklistAction,
  crearComentarioAction,
  crearEtiquetaAction,
  crearItemChecklistAction,
  crearTareaAction,
  editarComentarioAction,
  eliminarAdjuntoAction,
  eliminarChecklistAction,
  eliminarComentarioAction,
  eliminarItemChecklistAction,
  eliminarTareaAction,
  actualizarItemChecklistAction,
  registrarAdjuntoAction,
  renombrarChecklistAction,
  setAsignadosAction,
  setEtiquetasTareaAction,
} from "@/lib/proyectos/actions";
import { BUCKET_ADJUNTOS, MAX_BYTES_ADJUNTO, etiquetaFecha, fechaHora, formatoBytes, hoyISO } from "@/lib/proyectos/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Avatar, BotonPrimario, BotonSecundario, Modal, useAviso } from "@/components/proyectos/ui";
import {
  EtiquetaChip,
  PildoraEstado,
  SelectorAsignados,
  SelectorEstado,
  SelectorEtiquetas,
  SelectorFecha,
  SelectorPrioridad,
} from "@/components/proyectos/selectores";
import { Editor } from "@/components/proyectos/Editor";
import { Migas } from "@/components/proyectos/Migas";
import { MarcarListaActiva } from "@/components/proyectos/ProyectosShell";

type R = { ok: boolean; error?: string };

export function TareaDetalleView({ datos, yoId }: { datos: DatosTarea; yoId: string }) {
  const { tarea, lista, espacio, carpeta, estados, etiquetas, miembros, directorio, padre } = datos;
  const aviso = useAviso();
  const router = useRouter();
  const [, start] = useTransition();
  const puedeEditar = espacio.rol !== "lector";
  const nombres = useMemo(() => new Map(directorio.map((u) => [u.id, u.nombre])), [directorio]);
  const nombreDe = (id: string | null) => (id ? nombres.get(id) ?? "Alguien" : "Alguien");
  const cerrados = useMemo(() => new Set(estados.filter((e) => e.tipo === "cerrado").map((e) => e.id)), [estados]);

  // Campos locales (optimistas), resincronizados cuando el servidor devuelve datos nuevos.
  const [nombre, setNombre] = useState(tarea.nombre);
  const [estadoId, setEstadoId] = useState(tarea.estadoId);
  const [prioridad, setPrioridad] = useState<Prioridad | null>(tarea.prioridad);
  const [inicio, setInicio] = useState(tarea.fechaInicio);
  const [limite, setLimite] = useState(tarea.fechaLimite);
  const [asignados, setAsignados] = useState(tarea.asignados);
  const [etqIds, setEtqIds] = useState(tarea.etiquetas);
  useEffect(() => {
    setNombre(tarea.nombre);
    setEstadoId(tarea.estadoId);
    setPrioridad(tarea.prioridad);
    setInicio(tarea.fechaInicio);
    setLimite(tarea.fechaLimite);
    setAsignados(tarea.asignados);
    setEtqIds(tarea.etiquetas);
  }, [tarea]);

  function guardar<T>(set: (v: T) => void, antes: T, nuevo: T, accion: () => Promise<R>) {
    set(nuevo);
    start(async () => {
      const r = await accion();
      if (!r.ok) {
        set(antes);
        aviso(r.error ?? "No se pudo guardar el cambio.");
      }
    });
  }

  const hoy = hoyISO();
  const cerrada = cerrados.has(estadoId);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const etiquetasTarea = etqIds.map((id) => etiquetas.find((e) => e.id === id)).filter(Boolean) as typeof etiquetas;

  async function crearEtiqueta(n: string, c: string) {
    const r = await crearEtiquetaAction(espacio.id, n, c);
    if (!r.ok) {
      aviso(r.error);
      return null;
    }
    router.refresh();
    return r.etiqueta;
  }

  async function borrarTarea() {
    setBorrando(true);
    const r = await eliminarTareaAction(tarea.id);
    if (!r.ok) {
      setBorrando(false);
      return aviso(r.error);
    }
    router.push(padre ? `/proyectos/tarea/${padre.id}` : `/proyectos/lista/${lista.id}`);
  }

  const fila = "grid grid-cols-[130px_minmax(0,1fr)] items-center gap-2 py-1.5 text-sm";
  const etiquetaFila = "flex items-center gap-2 text-[13px] text-ink-3";

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <MarcarListaActiva listaId={lista.id} />

      {/* Columna principal */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-6 pb-24 pt-4">
          <div className="flex items-start justify-between gap-3">
            <Migas
              items={[
                { texto: espacio.nombre, href: `/proyectos/espacio/${espacio.id}`, color: espacio.color },
                ...(carpeta ? [{ texto: carpeta.nombre }] : []),
                { texto: lista.nombre, href: `/proyectos/lista/${lista.id}` },
                ...(padre ? [{ texto: padre.nombre, href: `/proyectos/tarea/${padre.id}` }] : []),
              ]}
            />
            <div className="flex shrink-0 items-center gap-1">
              {puedeEditar && (
                <button
                  type="button"
                  onClick={() => setConfirmarBorrar(true)}
                  aria-label="Eliminar tarea"
                  title="Eliminar tarea"
                  className="rounded-sm p-1.5 text-ink-3 hover:bg-line-2 hover:text-[#B42318]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <Link
                href={padre ? `/proyectos/tarea/${padre.id}` : `/proyectos/lista/${lista.id}`}
                aria-label="Cerrar tarea"
                title="Cerrar"
                className="rounded-sm p-1.5 text-ink-3 hover:bg-line-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Título */}
          <input
            value={nombre}
            readOnly={!puedeEditar}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => {
              const v = nombre.trim();
              if (!v) return setNombre(tarea.nombre);
              if (v !== tarea.nombre) start(async () => {
                const r = await actualizarTareaAction(tarea.id, { nombre: v });
                if (!r.ok) {
                  setNombre(tarea.nombre);
                  aviso(r.error);
                }
              });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="Nombre de la tarea"
            maxLength={300}
            className="mt-3 w-full rounded-sm border border-transparent bg-transparent px-1 py-1 text-[26px] font-bold leading-tight text-ink outline-none hover:border-line focus:border-blue focus:shadow-eb-focus"
          />

          {/* Propiedades */}
          <section aria-label="Propiedades" className="mt-3 grid gap-x-10 md:grid-cols-2">
            <div>
              <div className={fila}>
                <span className={etiquetaFila}><CheckCircle2 className="h-4 w-4" /> Estado</span>
                <div>
                  <SelectorEstado
                    estados={estados}
                    valor={estadoId}
                    deshabilitado={!puedeEditar}
                    onCambiar={(id) => guardar(setEstadoId, estadoId, id, () => actualizarTareaAction(tarea.id, { estadoId: id }))}
                  />
                </div>
              </div>
              <div className={fila}>
                <span className={etiquetaFila}><Users className="h-4 w-4" /> Responsables</span>
                <div>
                  <SelectorAsignados
                    miembros={miembros}
                    nombres={nombres}
                    valor={asignados}
                    conNombres
                    deshabilitado={!puedeEditar}
                    onCambiar={(ids) => guardar(setAsignados, asignados, ids, () => setAsignadosAction(tarea.id, ids))}
                  />
                </div>
              </div>
              <div className={fila}>
                <span className={etiquetaFila}><Flag className="h-4 w-4" /> Prioridad</span>
                <div>
                  <SelectorPrioridad
                    valor={prioridad}
                    conTexto
                    deshabilitado={!puedeEditar}
                    onCambiar={(p) => guardar(setPrioridad, prioridad, p, () => actualizarTareaAction(tarea.id, { prioridad: p }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className={fila}>
                <span className={etiquetaFila}><Calendar className="h-4 w-4" /> Fechas</span>
                <div className="flex flex-wrap items-center gap-1 text-ink-3">
                  <SelectorFecha
                    valor={inicio}
                    etiqueta="Fecha de inicio"
                    conIcono={false}
                    vacioTexto="Inicio"
                    deshabilitado={!puedeEditar}
                    onCambiar={(f) => guardar(setInicio, inicio, f, () => actualizarTareaAction(tarea.id, { fechaInicio: f }))}
                  />
                  <span aria-hidden>→</span>
                  <SelectorFecha
                    valor={limite}
                    cerrada={cerrada}
                    etiqueta="Fecha límite"
                    conIcono={false}
                    vacioTexto="Límite"
                    deshabilitado={!puedeEditar}
                    onCambiar={(f) => guardar(setLimite, limite, f, () => actualizarTareaAction(tarea.id, { fechaLimite: f }))}
                  />
                </div>
              </div>
              <div className={fila}>
                <span className={etiquetaFila}><Tag className="h-4 w-4" /> Etiquetas</span>
                <div>
                  <SelectorEtiquetas
                    etiquetas={etiquetas}
                    valor={etqIds}
                    deshabilitado={!puedeEditar}
                    onCrear={crearEtiqueta}
                    onCambiar={(ids) => guardar(setEtqIds, etqIds, ids, () => setEtiquetasTareaAction(tarea.id, ids))}
                  />
                </div>
              </div>
              <div className={fila}>
                <span className={etiquetaFila}><Pencil className="h-4 w-4" /> Creada</span>
                <span className="text-[13px] text-ink-2">{fechaHora(tarea.createdAt)}{tarea.createdBy ? ` · ${nombreDe(tarea.createdBy)}` : ""}</span>
              </div>
            </div>
          </section>
          {etiquetasTarea.length > 0 && <span className="sr-only">{etiquetasTarea.map((e) => e.nombre).join(", ")}</span>}

          <hr className="my-5 border-line-2" />

          <Descripcion tareaId={tarea.id} inicial={tarea.descripcion} editable={puedeEditar} />

          <Subtareas datos={datos} puedeEditar={puedeEditar} nombres={nombres} />
          <Checklists tareaId={tarea.id} checklists={tarea.checklists} puedeEditar={puedeEditar} />
          <Adjuntos datos={datos} puedeEditar={puedeEditar} nombreDe={nombreDe} />
        </div>
      </div>

      {/* Actividad */}
      <aside
        aria-label="Actividad"
        className="flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-t border-line bg-ebbg md:max-h-none md:w-[360px] md:border-l md:border-t-0"
      >
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Actividad</h2>
        </div>
        <Actividad
          tareaId={tarea.id}
          actividad={tarea.actividad}
          comentarios={tarea.comentarios}
          yoId={yoId}
          esPropietario={espacio.rol === "propietario"}
          puedeComentar={puedeEditar}
          nombres={nombres}
          hoy={hoy}
        />
      </aside>

      {confirmarBorrar && (
        <Modal
          titulo="Eliminar tarea"
          onCerrar={() => setConfirmarBorrar(false)}
          pie={
            <>
              <BotonSecundario onClick={() => setConfirmarBorrar(false)}>Cancelar</BotonSecundario>
              <button
                type="button"
                onClick={borrarTarea}
                disabled={borrando}
                className="rounded-sm bg-[#D92D20] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#B42318] disabled:opacity-50"
              >
                Eliminar
              </button>
            </>
          }
        >
          <p className="text-sm text-ink-2">
            Vas a eliminar <strong>{tarea.nombre}</strong>, sus subtareas, comentarios y adjuntos. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Descripción (autoguardado)
// ---------------------------------------------------------------------------
function Descripcion({ tareaId, inicial, editable }: { tareaId: string; inicial: JSONContent | null; editable: boolean }) {
  const aviso = useAviso();
  const [estado, setEstado] = useState<"" | "guardando" | "guardado">("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendiente = useRef<JSONContent | null>(null);

  async function volcar() {
    const contenido = pendiente.current;
    if (!contenido) return;
    pendiente.current = null;
    setEstado("guardando");
    const r = await actualizarTareaAction(tareaId, { descripcion: contenido });
    if (!r.ok) {
      setEstado("");
      return aviso(r.error);
    }
    setEstado("guardado");
  }

  useEffect(() => {
    const alSalir = () => {
      if (pendiente.current) void volcar();
    };
    window.addEventListener("beforeunload", alSalir);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      if (timer.current) clearTimeout(timer.current);
      if (pendiente.current) void volcar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-label="Descripción" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FileText className="h-4 w-4 text-ink-3" /> Descripción
        </h2>
        <span className="text-xs text-ink-3" aria-live="polite">
          {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : ""}
        </span>
      </div>
      <div className={`rounded-md border border-line px-3 py-2 ${editable ? "focus-within:border-blue focus-within:shadow-eb-focus" : "bg-ebbg"}`}>
        <Editor
          contenido={inicial}
          editable={editable}
          compacto
          placeholder={editable ? "Agrega una descripción… usa la barra para dar formato" : "Sin descripción"}
          onCambio={(json) => {
            pendiente.current = json;
            setEstado("");
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => void volcar(), 900);
          }}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Subtareas
// ---------------------------------------------------------------------------
function Subtareas({ datos, puedeEditar, nombres }: { datos: DatosTarea; puedeEditar: boolean; nombres: Map<string, string> }) {
  const { tarea, estados, lista } = datos;
  const aviso = useAviso();
  const [v, setV] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const cerrados = new Set(estados.filter((e) => e.tipo === "cerrado").map((e) => e.id));
  const primerAbierto = estados.find((e) => e.tipo === "abierto") ?? estados[0];
  const primerCerrado = estados.find((e) => e.tipo === "cerrado");
  const [, start] = useTransition();

  if (tarea.parentId && tarea.subtareas.length === 0 && !mostrar) {
    // Las subtareas no anidan más: una subtarea no puede tener subtareas.
    return null;
  }

  async function crear() {
    const n = v.trim();
    if (!n || ocupado) return;
    setOcupado(true);
    const r = await crearTareaAction({ listaId: lista.id, nombre: n, parentId: tarea.id });
    setOcupado(false);
    if (!r.ok) return aviso(r.error);
    setV("");
  }

  function alternar(id: string, esCerrada: boolean) {
    const destino = esCerrada ? primerAbierto : primerCerrado;
    if (!destino) return aviso("Esta lista no tiene un estado «Cerrado».");
    start(async () => {
      const r = await actualizarTareaAction(id, { estadoId: destino.id });
      if (!r.ok) aviso(r.error);
    });
  }

  const total = tarea.subtareas.length;
  const hechas = tarea.subtareas.filter((s) => cerrados.has(s.estadoId)).length;

  return (
    <section aria-label="Subtareas" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CornerDownRight className="h-4 w-4 text-ink-3" /> Subtareas
          {total > 0 && <span className="text-xs font-normal text-ink-3">{hechas}/{total}</span>}
        </h2>
        {puedeEditar && !tarea.parentId && (
          <button type="button" onClick={() => setMostrar(true)} className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs text-ink-3 hover:bg-line-2 hover:text-ink">
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        )}
      </div>
      {total > 0 && (
        <div className="mb-2 h-1.5 overflow-hidden rounded-pill bg-line-2" aria-hidden>
          <div className="h-full bg-green transition-all" style={{ width: `${(hechas / total) * 100}%` }} />
        </div>
      )}
      <ul className="divide-y divide-line-2 rounded-md border border-line">
        {tarea.subtareas.map((s) => {
          const esCerrada = cerrados.has(s.estadoId);
          const est = estados.find((e) => e.id === s.estadoId);
          return (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                disabled={!puedeEditar}
                onClick={() => alternar(s.id, esCerrada)}
                aria-label={esCerrada ? "Marcar como pendiente" : "Marcar como completada"}
                className="shrink-0 text-ink-3 hover:text-green disabled:cursor-default"
              >
                {esCerrada ? <CheckCircle2 className="h-4 w-4 text-green" /> : <Circle className="h-4 w-4" />}
              </button>
              <Link href={`/proyectos/tarea/${s.id}`} className={`min-w-0 flex-1 truncate text-sm hover:text-blue ${esCerrada ? "text-ink-3 line-through" : "text-ink"}`}>
                {s.nombre}
              </Link>
              {s.fechaLimite && <span className="text-xs text-ink-3">{etiquetaFecha(s.fechaLimite)}</span>}
              {s.asignados.slice(0, 2).map((id) => (
                <Avatar key={id} id={id} nombre={nombres.get(id) ?? "Usuario"} size={20} />
              ))}
              {est && <PildoraEstado estado={est} tamano="sm" />}
            </li>
          );
        })}
        {total === 0 && !mostrar && <li className="px-3 py-2.5 text-sm text-ink-3">Sin subtareas.</li>}
        {(mostrar || total > 0) && puedeEditar && !tarea.parentId && (
          <li className="flex items-center gap-2 px-3 py-2">
            <Plus className="h-4 w-4 shrink-0 text-ink-3" />
            <input
              autoFocus={mostrar}
              value={v}
              onChange={(e) => setV(e.target.value)}
              placeholder="Agregar subtarea y Enter"
              aria-label="Nueva subtarea"
              maxLength={300}
              disabled={ocupado}
              onKeyDown={(e) => {
                if (e.key === "Enter") void crear();
                if (e.key === "Escape") {
                  setV("");
                  setMostrar(false);
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </li>
        )}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Listas de control
// ---------------------------------------------------------------------------
function Checklists({ tareaId, checklists: inicial, puedeEditar }: { tareaId: string; checklists: Checklist[]; puedeEditar: boolean }) {
  const aviso = useAviso();
  const [lista, setLista] = useState(inicial);
  useEffect(() => setLista(inicial), [inicial]);
  const [, start] = useTransition();

  const correr = (fn: () => Promise<R>, revertir?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        revertir?.();
        aviso(r.error ?? "No se pudo guardar el cambio.");
      }
    });

  return (
    <section aria-label="Listas de control" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ListChecks className="h-4 w-4 text-ink-3" /> Lista de control
        </h2>
        {puedeEditar && (
          <button
            type="button"
            onClick={() => correr(() => crearChecklistAction(tareaId))}
            className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs text-ink-3 hover:bg-line-2 hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva lista de control
          </button>
        )}
      </div>
      {lista.length === 0 && <p className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-ink-3">Sin listas de control.</p>}
      <div className="space-y-4">
        {lista.map((c) => {
          const hechos = c.items.filter((i) => i.hecho).length;
          return (
            <div key={c.id} className="rounded-md border border-line p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  defaultValue={c.titulo}
                  readOnly={!puedeEditar}
                  aria-label="Título de la lista de control"
                  maxLength={120}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v) e.target.value = c.titulo;
                    else if (v !== c.titulo) correr(() => renombrarChecklistAction(c.id, v));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="min-w-0 flex-1 rounded-xs border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink outline-none hover:border-line focus:border-blue"
                />
                <span className="text-xs text-ink-3">{hechos}/{c.items.length}</span>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={() => correr(() => eliminarChecklistAction(c.id))}
                    aria-label="Eliminar lista de control"
                    className="rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-[#B42318]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {c.items.length > 0 && (
                <div className="mb-2 h-1 overflow-hidden rounded-pill bg-line-2" aria-hidden>
                  <div className="h-full bg-green transition-all" style={{ width: `${(hechos / c.items.length) * 100}%` }} />
                </div>
              )}
              <ul>
                {c.items.map((i) => (
                  <li key={i.id} className="group flex items-center gap-2 rounded-xs px-1 py-1 hover:bg-ebbg">
                    <input
                      type="checkbox"
                      checked={i.hecho}
                      disabled={!puedeEditar}
                      aria-label={i.texto}
                      onChange={(e) => {
                        const hecho = e.target.checked;
                        const previo = lista;
                        setLista((l) =>
                          l.map((x) => (x.id === c.id ? { ...x, items: x.items.map((y) => (y.id === i.id ? { ...y, hecho } : y)) } : x))
                        );
                        correr(() => actualizarItemChecklistAction(i.id, { hecho }), () => setLista(previo));
                      }}
                      className="h-4 w-4 shrink-0 accent-blue"
                    />
                    <input
                      defaultValue={i.texto}
                      readOnly={!puedeEditar}
                      aria-label="Texto del elemento"
                      maxLength={300}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) e.target.value = i.texto;
                        else if (v !== i.texto) correr(() => actualizarItemChecklistAction(i.id, { texto: v }));
                      }}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${i.hecho ? "text-ink-3 line-through" : "text-ink"}`}
                    />
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => correr(() => eliminarItemChecklistAction(i.id))}
                        aria-label="Eliminar elemento"
                        className="rounded-xs p-0.5 text-ink-3 opacity-0 hover:text-[#B42318] focus:opacity-100 group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {puedeEditar && <NuevoItem checklistId={c.id} onError={aviso} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NuevoItem({ checklistId, onError }: { checklistId: string; onError: (m: string) => void }) {
  const [v, setV] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-1 flex items-center gap-2 px-1 py-1">
      <Plus className="h-4 w-4 shrink-0 text-ink-3" />
      <input
        ref={ref}
        value={v}
        disabled={ocupado}
        onChange={(e) => setV(e.target.value)}
        placeholder="Agregar elemento y Enter"
        aria-label="Nuevo elemento de la lista de control"
        maxLength={300}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && v.trim()) {
            setOcupado(true);
            const r = await crearItemChecklistAction(checklistId, v);
            setOcupado(false);
            if (!r.ok) return onError(r.error);
            setV("");
            setTimeout(() => ref.current?.focus(), 0);
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adjuntos
// ---------------------------------------------------------------------------
function nombreSeguro(n: string): string {
  return n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "archivo";
}

function Adjuntos({ datos, puedeEditar, nombreDe }: { datos: DatosTarea; puedeEditar: boolean; nombreDe: (id: string | null) => string }) {
  const { tarea } = datos;
  const aviso = useAviso();
  const [subiendo, setSubiendo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, start] = useTransition();
  const router = useRouter();

  async function subir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    const sb = createBrowserSupabaseClient();
    for (const f of Array.from(archivos)) {
      if (f.size > MAX_BYTES_ADJUNTO) {
        aviso(`«${f.name}» pesa más de ${formatoBytes(MAX_BYTES_ADJUNTO)}.`);
        continue;
      }
      setSubiendo((n) => n + 1);
      const ruta = `${tarea.espacioId}/${tarea.id}/${crypto.randomUUID()}-${nombreSeguro(f.name)}`;
      const { error } = await sb.storage.from(BUCKET_ADJUNTOS).upload(ruta, f, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
      if (error) {
        aviso(`No se pudo subir «${f.name}»: ${error.message}`);
        setSubiendo((n) => n - 1);
        continue;
      }
      const r = await registrarAdjuntoAction(tarea.id, { path: ruta, nombre: f.name, mime: f.type || null, tamano: f.size });
      setSubiendo((n) => n - 1);
      if (!r.ok) aviso(r.error);
    }
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section aria-label="Adjuntos" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Paperclip className="h-4 w-4 text-ink-3" /> Adjuntos
          {tarea.adjuntos.length > 0 && <span className="text-xs font-normal text-ink-3">{tarea.adjuntos.length}</span>}
        </h2>
        {puedeEditar && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              data-testid="input-adjuntos"
              onChange={(e) => void subir(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs text-ink-3 hover:bg-line-2 hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" /> Subir archivo
            </button>
          </>
        )}
      </div>
      {subiendo > 0 && (
        <p className="mb-2 flex items-center gap-2 text-sm text-ink-3">
          <Loader2 className="h-4 w-4 animate-spin" /> Subiendo…
        </p>
      )}
      {tarea.adjuntos.length === 0 && subiendo === 0 && (
        <p className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-ink-3">Sin adjuntos.</p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {tarea.adjuntos.map((a) => {
          const esImagen = (a.mime ?? "").startsWith("image/");
          return (
            <li key={a.id} className="group flex items-center gap-3 rounded-md border border-line p-2">
              {esImagen && a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="h-10 w-10 shrink-0 rounded-xs object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-line-2 text-ink-3">
                  <FileText className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={a.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-ink hover:text-blue"
                >
                  {a.nombre}
                </a>
                <p className="truncate text-xs text-ink-3">
                  {formatoBytes(a.tamano)} · {nombreDe(a.createdBy)} · {fechaHora(a.createdAt)}
                </p>
              </div>
              {a.url && (
                <a href={a.url} download={a.nombre} aria-label={`Descargar ${a.nombre}`} className="rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-ink">
                  <Download className="h-4 w-4" />
                </a>
              )}
              {puedeEditar && (
                <button
                  type="button"
                  aria-label={`Eliminar ${a.nombre}`}
                  onClick={() =>
                    start(async () => {
                      const r = await eliminarAdjuntoAction(a.id);
                      if (!r.ok) aviso(r.error);
                    })
                  }
                  className="rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-[#B42318]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Actividad y comentarios
// ---------------------------------------------------------------------------
type Evento = { tipo: "act"; fecha: string; a: EntradaActividad } | { tipo: "com"; fecha: string; c: Comentario };

function Actividad({
  tareaId,
  actividad,
  comentarios,
  yoId,
  esPropietario,
  puedeComentar,
  nombres,
  hoy,
}: {
  tareaId: string;
  actividad: EntradaActividad[];
  comentarios: Comentario[];
  yoId: string;
  esPropietario: boolean;
  puedeComentar: boolean;
  nombres: Map<string, string>;
  hoy: string;
}) {
  const aviso = useAviso();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEdit, setTextoEdit] = useState("");
  const finRef = useRef<HTMLDivElement>(null);
  const [, start] = useTransition();

  const eventos: Evento[] = useMemo(
    () =>
      [
        ...actividad.map((a) => ({ tipo: "act" as const, fecha: a.createdAt, a })),
        ...comentarios.map((c) => ({ tipo: "com" as const, fecha: c.createdAt, c })),
      ].sort((x, y) => x.fecha.localeCompare(y.fecha)),
    [actividad, comentarios]
  );

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [eventos.length]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const r = await crearComentarioAction(tareaId, t);
    setEnviando(false);
    if (!r.ok) return aviso(r.error);
    setTexto("");
  }

  const nom = (id: string | null) => (id ? nombres.get(id) ?? "Alguien" : "Alguien");
  const fmtFecha = (f: unknown) => (typeof f === "string" && f ? etiquetaFecha(f, hoy) : "sin fecha");
  const prioLabel = (p: unknown) => PRIORIDADES.find((x) => x.value === p)?.label ?? "ninguna";

  function describir(a: EntradaActividad): React.ReactNode {
    const d = a.detalle as Record<string, unknown>;
    switch (a.tipo) {
      case "creada":
        return "creó esta tarea";
      case "nombre":
        return <>cambió el nombre de «{String(d.de)}» a «{String(d.a)}»</>;
      case "estado":
        return <>cambió el estado de <b className="font-label font-bold text-ink">{String(d.de)}</b> a <b className="font-label font-bold text-ink">{String(d.a)}</b></>;
      case "prioridad":
        return <>cambió la prioridad de <b className="font-label font-bold text-ink">{prioLabel(d.de)}</b> a <b className="font-label font-bold text-ink">{prioLabel(d.a)}</b></>;
      case "fecha_inicio":
        return <>cambió la fecha de inicio de <b className="font-label font-bold text-ink">{fmtFecha(d.de)}</b> a <b className="font-label font-bold text-ink">{fmtFecha(d.a)}</b></>;
      case "fecha_limite":
        return <>cambió la fecha límite de <b className="font-label font-bold text-ink">{fmtFecha(d.de)}</b> a <b className="font-label font-bold text-ink">{fmtFecha(d.a)}</b></>;
      case "asignado":
        return <>asignó a <b className="font-label font-bold text-ink">{nom(String(d.usuario))}</b></>;
      case "desasignado":
        return <>quitó a <b className="font-label font-bold text-ink">{nom(String(d.usuario))}</b> de la tarea</>;
      default:
        return a.tipo;
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {eventos.map((ev) =>
          ev.tipo === "act" ? (
            <div key={`a-${ev.a.id}`} className="flex gap-2 text-[13px] leading-snug text-ink-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-navy-20" aria-hidden />
              <p className="min-w-0 flex-1">
                <b className="font-label font-bold text-ink">{nom(ev.a.userId)}</b> {describir(ev.a)}
                <span className="ml-1.5 text-[11px] text-ink-3">{fechaHora(ev.a.createdAt)}</span>
              </p>
            </div>
          ) : (
            <div key={`c-${ev.c.id}`} className="rounded-md border border-line bg-white p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Avatar id={ev.c.userId ?? "x"} nombre={nom(ev.c.userId)} size={22} />
                <span className="text-[13px] font-semibold text-ink">{nom(ev.c.userId)}</span>
                <span className="text-[11px] text-ink-3">
                  {fechaHora(ev.c.createdAt)}
                  {ev.c.editadoAt ? " · editado" : ""}
                </span>
                {(ev.c.userId === yoId || esPropietario) && editando !== ev.c.id && (
                  <span className="ml-auto flex gap-0.5">
                    {ev.c.userId === yoId && (
                      <button
                        type="button"
                        aria-label="Editar comentario"
                        onClick={() => {
                          setEditando(ev.c.id);
                          setTextoEdit(ev.c.texto);
                        }}
                        className="rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Eliminar comentario"
                      onClick={() =>
                        start(async () => {
                          const r = await eliminarComentarioAction(ev.c.id);
                          if (!r.ok) aviso(r.error);
                        })
                      }
                      className="rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-[#B42318]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
              {editando === ev.c.id ? (
                <div>
                  <textarea
                    value={textoEdit}
                    onChange={(e) => setTextoEdit(e.target.value)}
                    rows={3}
                    aria-label="Editar comentario"
                    className="w-full resize-y rounded-sm border border-line p-2 text-sm outline-none focus:border-blue"
                  />
                  <div className="mt-1.5 flex justify-end gap-2">
                    <BotonSecundario onClick={() => setEditando(null)}>Cancelar</BotonSecundario>
                    <BotonPrimario
                      disabled={!textoEdit.trim()}
                      onClick={() =>
                        start(async () => {
                          const r = await editarComentarioAction(ev.c.id, textoEdit);
                          if (!r.ok) return aviso(r.error);
                          setEditando(null);
                        })
                      }
                    >
                      Guardar
                    </BotonPrimario>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{ev.c.texto}</p>
              )}
            </div>
          )
        )}
        <div ref={finRef} />
      </div>

      <div className="border-t border-line bg-white p-3">
        {puedeComentar ? (
          <>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              rows={2}
              maxLength={5000}
              placeholder="Escribe un comentario…"
              aria-label="Escribe un comentario"
              className="w-full resize-none rounded-sm border border-line p-2 text-sm outline-none focus:border-blue focus:shadow-eb-focus"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-ink-3">Ctrl + Enter para enviar</span>
              <BotonPrimario onClick={enviar} disabled={!texto.trim() || enviando}>
                Comentar
              </BotonPrimario>
            </div>
          </>
        ) : (
          <p className="text-xs text-ink-3">Solo lectura: no puedes comentar en este espacio.</p>
        )}
      </div>
    </>
  );
}
