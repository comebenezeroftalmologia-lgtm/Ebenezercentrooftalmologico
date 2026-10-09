"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Columns3,
  List as ListIcon,
  ListTree,
  Plus,
  Search,
  Settings2,
  Share2,
} from "lucide-react";
import type { DatosLista } from "@/lib/proyectos/queries";
import type { Estado, Prioridad, Tarea } from "@/lib/proyectos/types";
import {
  actualizarTareaAction,
  crearEtiquetaAction,
  crearTareaAction,
  moverTareaAction,
  setAsignadosAction,
  setEtiquetasTareaAction,
} from "@/lib/proyectos/actions";
import { estaVencida, etiquetaFecha, hoyISO, ordenEntre } from "@/lib/proyectos/utils";
import { AvatarStack, BotonSecundario, IconoBandera, useAviso } from "@/components/proyectos/ui";
import {
  EtiquetaChip,
  PildoraEstado,
  SelectorAsignados,
  SelectorEstado,
  SelectorFecha,
  SelectorPrioridad,
} from "@/components/proyectos/selectores";
import { EstadosModal } from "@/components/proyectos/EstadosModal";
import { CompartirModal } from "@/components/proyectos/CompartirModal";
import { PRIORIDADES } from "@/lib/proyectos/types";
import { Migas } from "@/components/proyectos/Migas";

type Vista = "lista" | "tablero";
const COLS = "md:grid-cols-[minmax(0,1fr)_132px_132px_104px]";

export function ListaView({ datos, vista, yoId }: { datos: DatosLista; vista: Vista; yoId: string }) {
  const { lista, espacio, carpeta, estados, etiquetas, miembros, directorio } = datos;
  const aviso = useAviso();
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[]>(datos.tareas);
  useEffect(() => setTareas(datos.tareas), [datos.tareas]);

  const puedeEditar = espacio.rol !== "lector";
  const nombres = useMemo(() => new Map(directorio.map((u) => [u.id, u.nombre])), [directorio]);
  const etiquetaPorId = useMemo(() => new Map(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const cerrados = useMemo(() => new Set(estados.filter((e) => e.tipo === "cerrado").map((e) => e.id)), [estados]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroPersona, setFiltroPersona] = useState<string>("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todas");
  const [modalEstados, setModalEstados] = useState(false);
  const [compartir, setCompartir] = useState(false);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tareas.filter((t) => {
      if (q && !t.nombre.toLowerCase().includes(q)) return false;
      if (filtroPersona === "yo" && !t.asignados.includes(yoId)) return false;
      if (filtroPersona === "nadie" && t.asignados.length > 0) return false;
      if (filtroPersona !== "todos" && filtroPersona !== "yo" && filtroPersona !== "nadie" && !t.asignados.includes(filtroPersona)) return false;
      if (filtroPrioridad === "ninguna" && t.prioridad) return false;
      if (filtroPrioridad !== "todas" && filtroPrioridad !== "ninguna" && t.prioridad !== filtroPrioridad) return false;
      return true;
    });
  }, [tareas, busqueda, filtroPersona, filtroPrioridad, yoId]);

  const raices = filtradas.filter((t) => !t.parentId);
  const hijasDe = useMemo(() => {
    const m = new Map<string, Tarea[]>();
    for (const t of tareas) {
      if (!t.parentId) continue;
      m.set(t.parentId, [...(m.get(t.parentId) ?? []), t]);
    }
    return m;
  }, [tareas]);

  // --- Mutaciones optimistas -------------------------------------------
  const [, start] = useTransition();
  function mutar(id: string, patch: Partial<Tarea>, accion: () => Promise<{ ok: boolean; error?: string }>) {
    const antes = tareas;
    setTareas((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    start(async () => {
      const r = await accion();
      if (!r.ok) {
        setTareas(antes);
        aviso(r.error ?? "No se pudo guardar el cambio.");
      }
    });
  }

  const primerAbierto = estados.find((e) => e.tipo === "abierto") ?? estados[0];
  const primerCerrado = estados.find((e) => e.tipo === "cerrado");

  function alternarCompletada(t: Tarea) {
    if (!puedeEditar) return;
    const destino = cerrados.has(t.estadoId) ? primerAbierto : primerCerrado;
    if (!destino) return aviso("Esta lista no tiene un estado «Cerrado». Agrégalo en «Estados».");
    mutar(t.id, { estadoId: destino.id }, () => actualizarTareaAction(t.id, { estadoId: destino.id }));
  }

  async function crearTarea(estadoId: string, nombre: string): Promise<boolean> {
    const r = await crearTareaAction({ listaId: lista.id, nombre, estadoId });
    if (!r.ok) {
      aviso(r.error);
      return false;
    }
    return true;
  }

  async function crearEtiqueta(nombre: string, color: string) {
    const r = await crearEtiquetaAction(espacio.id, nombre, color);
    if (!r.ok) {
      aviso(r.error);
      return null;
    }
    router.refresh();
    return r.etiqueta;
  }

  const ctx: Ctx = {
    estados,
    nombres,
    miembros,
    etiquetas,
    etiquetaPorId,
    cerrados,
    puedeEditar,
    hijasDe,
    mutar,
    alternarCompletada,
    crearEtiqueta,
  };

  const hayFiltros = busqueda || filtroPersona !== "todos" || filtroPrioridad !== "todas";

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Encabezado */}
      <header className="border-b border-line px-6 pt-4">
        <Migas
          items={[
            { texto: espacio.nombre, href: `/proyectos/espacio/${espacio.id}`, color: espacio.color },
            ...(carpeta ? [{ texto: carpeta.nombre }] : []),
          ]}
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink">
            <ListIcon className="h-5 w-5 text-ink-3" />
            {lista.nombre}
          </h1>
          <div className="flex items-center gap-2">
            <BotonSecundario onClick={() => setCompartir(true)}>
              <Share2 className="h-4 w-4" /> Compartir
            </BotonSecundario>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1" role="tablist" aria-label="Vistas">
          {(
            [
              ["lista", "Lista", ListIcon],
              ["tablero", "Tablero", Columns3],
            ] as const
          ).map(([v, texto, Icono]) => (
            <Link
              key={v}
              role="tab"
              aria-selected={vista === v}
              href={`/proyectos/lista/${lista.id}${v === "lista" ? "" : `?vista=${v}`}`}
              replace
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
                vista === v ? "border-blue text-ink" : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              <Icono className="h-4 w-4" /> {texto}
            </Link>
          ))}
        </div>
      </header>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line-2 px-6 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar tareas"
            aria-label="Buscar tareas"
            className="w-52 rounded-sm border border-line py-1.5 pl-8 pr-2 text-[13px] outline-none focus:border-blue"
          />
        </div>
        <select
          value={filtroPersona}
          onChange={(e) => setFiltroPersona(e.target.value)}
          aria-label="Filtrar por responsable"
          className="rounded-sm border border-line bg-white px-2 py-1.5 text-[13px] outline-none focus:border-blue"
        >
          <option value="todos">Todos los responsables</option>
          <option value="yo">Mis tareas</option>
          <option value="nadie">Sin responsable</option>
          {miembros.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          aria-label="Filtrar por prioridad"
          className="rounded-sm border border-line bg-white px-2 py-1.5 text-[13px] outline-none focus:border-blue"
        >
          <option value="todas">Toda prioridad</option>
          {PRIORIDADES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="ninguna">Sin prioridad</option>
        </select>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setFiltroPersona("todos");
              setFiltroPrioridad("todas");
            }}
            className="text-[13px] text-blue hover:underline"
          >
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto">
          {puedeEditar && (
            <BotonSecundario onClick={() => setModalEstados(true)}>
              <Settings2 className="h-4 w-4" /> Estados
            </BotonSecundario>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="min-h-0 flex-1 overflow-auto">
        {vista === "lista" ? (
          <VistaLista ctx={ctx} raices={raices} crearTarea={crearTarea} hayFiltros={!!hayFiltros} />
        ) : (
          <VistaTablero
            ctx={ctx}
            raices={raices}
            todas={tareas}
            crearTarea={crearTarea}
            mutarMover={(id, estadoId, orden) =>
              mutar(id, { estadoId, orden }, () => moverTareaAction(id, estadoId, orden))
            }
          />
        )}
      </div>

      {modalEstados && <EstadosModal listaId={lista.id} estados={estados} onCerrar={() => setModalEstados(false)} />}
      {compartir && <CompartirModal espacio={espacio} yoId={yoId} onCerrar={() => setCompartir(false)} />}
    </div>
  );
}

// ===========================================================================
interface Ctx {
  estados: Estado[];
  nombres: Map<string, string>;
  miembros: DatosLista["miembros"];
  etiquetas: DatosLista["etiquetas"];
  etiquetaPorId: Map<string, DatosLista["etiquetas"][number]>;
  cerrados: Set<string>;
  puedeEditar: boolean;
  hijasDe: Map<string, Tarea[]>;
  mutar: (id: string, patch: Partial<Tarea>, accion: () => Promise<{ ok: boolean; error?: string }>) => void;
  alternarCompletada: (t: Tarea) => void;
  crearEtiqueta: (nombre: string, color: string) => Promise<DatosLista["etiquetas"][number] | null>;
}

// ---------------------------------------------------------------------------
// Vista Lista
// ---------------------------------------------------------------------------
function VistaLista({
  ctx,
  raices,
  crearTarea,
  hayFiltros,
}: {
  ctx: Ctx;
  raices: Tarea[];
  crearTarea: (estadoId: string, nombre: string) => Promise<boolean>;
  hayFiltros: boolean;
}) {
  const [plegados, setPlegados] = useState<Set<string>>(
    () => new Set(ctx.estados.filter((e) => e.tipo === "cerrado").map((e) => e.id))
  );
  const [agregandoEn, setAgregandoEn] = useState<string | null>(null);

  return (
    <div className="px-6 pb-16 pt-3">
      {ctx.estados.map((estado) => {
        const delGrupo = raices.filter((t) => t.estadoId === estado.id);
        const plegado = plegados.has(estado.id);
        return (
          <section key={estado.id} className="mb-5" aria-label={`Estado ${estado.nombre}`}>
            <div className={`grid grid-cols-[minmax(0,1fr)] items-center gap-x-2 border-b border-line-2 py-1.5 ${COLS}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPlegados((p) => {
                      const s = new Set(p);
                      if (s.has(estado.id)) s.delete(estado.id);
                      else s.add(estado.id);
                      return s;
                    })
                  }
                  aria-expanded={!plegado}
                  aria-label={plegado ? `Expandir ${estado.nombre}` : `Contraer ${estado.nombre}`}
                  className="rounded-xs p-0.5 text-ink-3 hover:bg-line-2"
                >
                  {plegado ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <PildoraEstado estado={estado} />
                <span className="text-xs font-medium text-ink-3">{delGrupo.length}</span>
                {ctx.puedeEditar && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlegados((p) => {
                        const s = new Set(p);
                        s.delete(estado.id);
                        return s;
                      });
                      setAgregandoEn(estado.id);
                    }}
                    className="ml-1 inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs text-ink-3 hover:bg-line-2 hover:text-ink"
                  >
                    <Plus className="h-3 w-3" /> Agregar tarea
                  </button>
                )}
              </div>
              <span className="hidden text-[11px] font-semibold uppercase tracking-overline text-ink-3 md:block">Responsable</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-overline text-ink-3 md:block">Fecha límite</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-overline text-ink-3 md:block">Prioridad</span>
            </div>

            {!plegado && (
              <div>
                {delGrupo.map((t) => (
                  <FilaTarea key={t.id} t={t} ctx={ctx} />
                ))}
                {delGrupo.length === 0 && agregandoEn !== estado.id && (
                  <p className="py-2 pl-8 text-xs text-ink-3">{hayFiltros ? "Ninguna tarea coincide con los filtros." : "Sin tareas en este estado."}</p>
                )}
                {agregandoEn === estado.id && (
                  <NuevaTarea
                    onCrear={(n) => crearTarea(estado.id, n)}
                    onCerrar={() => setAgregandoEn(null)}
                    placeholder="Nombre de la tarea y Enter"
                  />
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function NuevaTarea({
  onCrear,
  onCerrar,
  placeholder,
}: {
  onCrear: (nombre: string) => Promise<boolean>;
  onCerrar: () => void;
  placeholder: string;
}) {
  const [v, setV] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2 py-1.5 pl-6">
      <Circle className="h-4 w-4 shrink-0 text-line" />
      <input
        ref={ref}
        autoFocus
        value={v}
        disabled={ocupado}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        aria-label="Nombre de la nueva tarea"
        maxLength={300}
        onKeyDown={async (e) => {
          if (e.key === "Escape") onCerrar();
          if (e.key === "Enter" && v.trim()) {
            setOcupado(true);
            const ok = await onCrear(v);
            setOcupado(false);
            if (ok) {
              setV("");
              setTimeout(() => ref.current?.focus(), 0);
            }
          }
        }}
        onBlur={() => !v.trim() && onCerrar()}
        className="min-w-0 flex-1 rounded-xs border border-blue bg-white px-2 py-1 text-sm outline-none shadow-eb-focus"
      />
    </div>
  );
}

function FilaTarea({ t, ctx, nivel = 0 }: { t: Tarea; ctx: Ctx; nivel?: number }) {
  const [abierta, setAbierta] = useState(false);
  const hoy = hoyISO();
  const cerrada = ctx.cerrados.has(t.estadoId);
  const hijas = ctx.hijasDe.get(t.id) ?? [];
  const etqs = t.etiquetas.map((id) => ctx.etiquetaPorId.get(id)).filter(Boolean) as DatosLista["etiquetas"];

  return (
    <>
      <div
        className={`group grid grid-cols-[minmax(0,1fr)] items-center gap-x-2 border-b border-line-2 py-1 hover:bg-ebbg ${COLS}`}
        style={{ paddingLeft: nivel * 24 }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex w-5 shrink-0 justify-center">
            {hijas.length > 0 && (
              <button
                type="button"
                onClick={() => setAbierta((a) => !a)}
                aria-expanded={abierta}
                aria-label={abierta ? "Ocultar subtareas" : "Mostrar subtareas"}
                className="rounded-xs p-0.5 text-ink-3 hover:bg-line-2"
              >
                {abierta ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            )}
          </span>
          <SelectorEstado
            estados={ctx.estados}
            valor={t.estadoId}
            deshabilitado={!ctx.puedeEditar}
            variante="punto"
            onCambiar={(id) => ctx.mutar(t.id, { estadoId: id }, () => actualizarTareaAction(t.id, { estadoId: id }))}
          />
          <Link
            href={`/proyectos/tarea/${t.id}`}
            className={`min-w-0 truncate text-sm hover:text-blue ${cerrada ? "text-ink-3 line-through" : "text-ink"}`}
          >
            {t.nombre}
          </Link>
          {t.subtareasTotal > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-3" title="Subtareas">
              <ListTree className="h-3.5 w-3.5" />
              {t.subtareasHechas}/{t.subtareasTotal}
            </span>
          )}
          <span className="hidden shrink-0 items-center gap-1 lg:flex">
            {etqs.slice(0, 2).map((e) => (
              <EtiquetaChip key={e.id} etiqueta={e} />
            ))}
            {etqs.length > 2 && <span className="text-[11px] text-ink-3">+{etqs.length - 2}</span>}
          </span>
        </div>

        <div className="hidden md:block">
          <SelectorAsignados
            miembros={ctx.miembros}
            nombres={ctx.nombres}
            valor={t.asignados}
            deshabilitado={!ctx.puedeEditar}
            onCambiar={(ids) => ctx.mutar(t.id, { asignados: ids }, () => setAsignadosAction(t.id, ids))}
          />
        </div>
        <div className="hidden md:block">
          <SelectorFecha
            valor={t.fechaLimite}
            cerrada={cerrada}
            etiqueta="Fecha límite"
            deshabilitado={!ctx.puedeEditar}
            onCambiar={(f) => ctx.mutar(t.id, { fechaLimite: f }, () => actualizarTareaAction(t.id, { fechaLimite: f }))}
          />
        </div>
        <div className="hidden md:block">
          <SelectorPrioridad
            valor={t.prioridad}
            deshabilitado={!ctx.puedeEditar}
            onCambiar={(p: Prioridad | null) => ctx.mutar(t.id, { prioridad: p }, () => actualizarTareaAction(t.id, { prioridad: p }))}
          />
        </div>
      </div>
      {abierta && hijas.map((h) => <FilaTarea key={h.id} t={h} ctx={ctx} nivel={nivel + 1} />)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista Tablero
// ---------------------------------------------------------------------------
function VistaTablero({
  ctx,
  raices,
  todas,
  crearTarea,
  mutarMover,
}: {
  ctx: Ctx;
  raices: Tarea[];
  todas: Tarea[];
  crearTarea: (estadoId: string, nombre: string) => Promise<boolean>;
  mutarMover: (id: string, estadoId: string, orden: number) => void;
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<{ estadoId: string; indice: number } | null>(null);
  const [agregandoEn, setAgregandoEn] = useState<string | null>(null);
  const hoy = hoyISO();

  function indiceDesdeY(col: HTMLElement, y: number): number {
    const cards = Array.from(col.querySelectorAll<HTMLElement>("[data-card]")).filter(
      (c) => c.dataset.card !== arrastrando
    );
    let i = 0;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (y > r.top + r.height / 2) i++;
    }
    return i;
  }

  function soltar(estadoId: string, indice: number) {
    const id = arrastrando;
    setArrastrando(null);
    setSobre(null);
    if (!id) return;
    const destino = raices
      .filter((t) => t.estadoId === estadoId && t.id !== id)
      .sort((a, b) => a.orden - b.orden);
    const antes = indice > 0 ? destino[indice - 1]?.orden ?? null : null;
    const despues = destino[indice]?.orden ?? null;
    const orden = ordenEntre(antes, despues);
    const actual = todas.find((t) => t.id === id);
    if (actual && actual.estadoId === estadoId) {
      const mismoLugar = destino.findIndex((t) => t.orden > actual.orden);
      const posActual = mismoLugar === -1 ? destino.length : mismoLugar;
      if (posActual === indice) return;
    }
    mutarMover(id, estadoId, orden);
  }

  return (
    <div className="flex h-full items-start gap-3 overflow-x-auto px-6 py-4">
      {ctx.estados.map((estado) => {
        const delGrupo = raices.filter((t) => t.estadoId === estado.id).sort((a, b) => a.orden - b.orden);
        const marca = sobre?.estadoId === estado.id ? sobre.indice : null;
        return (
          <section
            key={estado.id}
            aria-label={`Columna ${estado.nombre}`}
            data-columna={estado.id}
            onDragOver={(e) => {
              if (!arrastrando) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              const idx = indiceDesdeY(e.currentTarget, e.clientY);
              setSobre((p) => (p && p.estadoId === estado.id && p.indice === idx ? p : { estadoId: estado.id, indice: idx }));
            }}
            onDrop={(e) => {
              e.preventDefault();
              soltar(estado.id, indiceDesdeY(e.currentTarget, e.clientY));
            }}
            className="flex w-[290px] shrink-0 flex-col rounded-md bg-ebbg"
          >
            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
              <PildoraEstado estado={estado} />
              <span className="text-xs font-medium text-ink-3">{delGrupo.length}</span>
              {ctx.puedeEditar && (
                <button
                  type="button"
                  onClick={() => setAgregandoEn(estado.id)}
                  aria-label={`Agregar tarea en ${estado.nombre}`}
                  className="ml-auto rounded-xs p-1 text-ink-3 hover:bg-line-2 hover:text-ink"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex min-h-[60px] flex-col gap-2 px-2 pb-2">
              {delGrupo.map((t, i) => (
                <div key={t.id}>
                  {marca === i && <Indicador />}
                  <Tarjeta
                    t={t}
                    ctx={ctx}
                    hoy={hoy}
                    arrastrando={arrastrando === t.id}
                    onArrastrar={() => setArrastrando(t.id)}
                    onSoltarFin={() => {
                      setArrastrando(null);
                      setSobre(null);
                    }}
                  />
                </div>
              ))}
              {marca === delGrupo.length && <Indicador />}
              {agregandoEn === estado.id && (
                <NuevaTarea
                  onCrear={(n) => crearTarea(estado.id, n)}
                  onCerrar={() => setAgregandoEn(null)}
                  placeholder="Nombre y Enter"
                />
              )}
              {ctx.puedeEditar && agregandoEn !== estado.id && (
                <button
                  type="button"
                  onClick={() => setAgregandoEn(estado.id)}
                  className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-xs text-ink-3 hover:bg-line-2 hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar tarea
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Indicador() {
  return <div className="my-1 h-1 rounded-pill bg-blue" aria-hidden />;
}

function Tarjeta({
  t,
  ctx,
  hoy,
  arrastrando,
  onArrastrar,
  onSoltarFin,
}: {
  t: Tarea;
  ctx: Ctx;
  hoy: string;
  arrastrando: boolean;
  onArrastrar: () => void;
  onSoltarFin: () => void;
}) {
  const router = useRouter();
  const cerrada = ctx.cerrados.has(t.estadoId);
  const prioridad = PRIORIDADES.find((p) => p.value === t.prioridad);
  const etqs = t.etiquetas.map((id) => ctx.etiquetaPorId.get(id)).filter(Boolean) as DatosLista["etiquetas"];
  const vencida = estaVencida(t.fechaLimite, cerrada, hoy);
  return (
    <article
      data-card={t.id}
      draggable={ctx.puedeEditar}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", t.id);
        onArrastrar();
      }}
      onDragEnd={onSoltarFin}
      className={`rounded-md border border-line bg-white p-3 shadow-eb-1 transition-shadow hover:shadow-eb-2 ${
        arrastrando ? "opacity-40" : ""
      } ${ctx.puedeEditar ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <Link
        href={`/proyectos/tarea/${t.id}`}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        className={`block text-sm font-medium hover:text-blue ${cerrada ? "text-ink-3 line-through" : "text-ink"}`}
      >
        {t.nombre}
      </Link>
      {etqs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {etqs.map((e) => (
            <EtiquetaChip key={e.id} etiqueta={e} />
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2.5 text-xs text-ink-3">
        {t.asignados.length > 0 ? (
          <AvatarStack ids={t.asignados} nombres={ctx.nombres} size={20} />
        ) : (
          <span className="h-5 w-5 rounded-pill border border-dashed border-ink-3" aria-label="Sin responsable" />
        )}
        {t.fechaLimite && (
          <span className={vencida ? "font-medium text-[#D92D20]" : ""}>{etiquetaFecha(t.fechaLimite, hoy)}</span>
        )}
        {prioridad && (
          <span title={prioridad.label}>
            <IconoBandera color={prioridad.color} size={14} />
          </span>
        )}
        {t.subtareasTotal > 0 && (
          <span className="ml-auto inline-flex items-center gap-1">
            <ListTree className="h-3.5 w-3.5" />
            {t.subtareasHechas}/{t.subtareasTotal}
          </span>
        )}
      </div>
    </article>
  );
}
