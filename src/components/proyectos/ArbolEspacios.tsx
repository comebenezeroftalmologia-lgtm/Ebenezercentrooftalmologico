"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  List as ListIcon,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Pencil,
  Trash2,
  Palette,
} from "lucide-react";
import type { CarpetaConHijos, DocResumen, EspacioArbol, Lista } from "@/lib/proyectos/types";
import {
  crearCarpetaAction,
  crearDocAction,
  crearListaAction,
  eliminarElementoAction,
  eliminarEspacioAction,
  renombrarAction,
} from "@/lib/proyectos/actions";
import { BotonPrimario, BotonSecundario, Modal, Popover, useAviso } from "@/components/proyectos/ui";
import { EspacioModal } from "@/components/proyectos/CrearEspacioModal";
import { CompartirModal } from "@/components/proyectos/CompartirModal";
import { useListaActiva } from "@/components/proyectos/ProyectosShell";

type TipoNuevo = "lista" | "carpeta" | "doc";
interface Creando {
  espacioId: string;
  carpetaId: string | null;
  tipo: TipoNuevo;
}
type Renombrando = { tipo: "carpeta" | "lista" | "doc" | "espacio"; id: string } | null;
type Eliminando = { tipo: "carpeta" | "lista" | "doc" | "espacio"; id: string; nombre: string } | null;

const CLAVE_ABIERTOS = "proyectos:abiertos";

function leerAbiertos(): Set<string> {
  try {
    const raw = localStorage.getItem(CLAVE_ABIERTOS);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function guardarAbiertos(s: Set<string>) {
  try {
    localStorage.setItem(CLAVE_ABIERTOS, JSON.stringify([...s]));
  } catch {
    /* sin almacenamiento: el árbol simplemente no recuerda su estado */
  }
}

export function ArbolEspacios({
  arbol,
  yoId,
  onNuevoEspacio,
}: {
  arbol: EspacioArbol[];
  yoId: string;
  onNuevoEspacio: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const aviso = useAviso();
  const listaActivaForzada = useListaActiva();
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [listoLS, setListoLS] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState<Creando | null>(null);
  const [renombrando, setRenombrando] = useState<Renombrando>(null);
  const [eliminando, setEliminando] = useState<Eliminando>(null);
  const [editandoEspacio, setEditandoEspacio] = useState<string | null>(null);
  const [compartiendo, setCompartiendo] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  useEffect(() => {
    setAbiertos(leerAbiertos());
    setListoLS(true);
  }, []);

  // Activo según la URL
  const activo = useMemo(() => {
    const m = pathname.match(/^\/proyectos\/(lista|doc|espacio)\/([0-9a-f-]{36})/);
    if (m) return { tipo: m[1], id: m[2] };
    if (listaActivaForzada) return { tipo: "lista", id: listaActivaForzada };
    return null;
  }, [pathname, listaActivaForzada]);

  // Abre la cadena del elemento activo (espacio y carpeta).
  useEffect(() => {
    if (!activo) return;
    let espacioId: string | null = null;
    let carpetaId: string | null = null;
    for (const e of arbol) {
      if (activo.tipo === "espacio" && e.espacio.id === activo.id) espacioId = e.espacio.id;
      const todas: { id: string; carpetaId: string | null }[] =
        activo.tipo === "lista"
          ? [...e.listas, ...e.carpetas.flatMap((c) => c.listas)]
          : activo.tipo === "doc"
          ? [...e.docs, ...e.carpetas.flatMap((c) => c.docs)]
          : [];
      const hit = todas.find((x) => x.id === activo.id);
      if (hit) {
        espacioId = e.espacio.id;
        carpetaId = hit.carpetaId;
      }
    }
    if (!espacioId) return;
    setAbiertos((prev) => {
      const sig = new Set(prev);
      sig.add(espacioId!);
      if (carpetaId) sig.add(carpetaId);
      if (sig.size === prev.size) return prev;
      if (listoLS) guardarAbiertos(sig);
      return sig;
    });
  }, [activo, arbol, listoLS]);

  function alternar(id: string) {
    setAbiertos((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      guardarAbiertos(sig);
      return sig;
    });
  }
  function abrir(id: string) {
    setAbiertos((prev) => {
      if (prev.has(id)) return prev;
      const sig = new Set(prev);
      sig.add(id);
      guardarAbiertos(sig);
      return sig;
    });
  }

  function iniciarCreacion(c: Creando) {
    abrir(c.espacioId);
    if (c.carpetaId) abrir(c.carpetaId);
    setCreando(c);
  }

  function confirmarCreacion(nombre: string) {
    const c = creando;
    setCreando(null);
    if (!c || !nombre.trim()) return;
    start(async () => {
      const r =
        c.tipo === "lista"
          ? await crearListaAction(c.espacioId, c.carpetaId, nombre)
          : c.tipo === "doc"
          ? await crearDocAction(c.espacioId, c.carpetaId, nombre)
          : await crearCarpetaAction(c.espacioId, nombre);
      if (!r.ok) return aviso(r.error);
      if (c.tipo === "lista") router.push(`/proyectos/lista/${r.id}`);
      else if (c.tipo === "doc") router.push(`/proyectos/doc/${r.id}`);
      else abrir(r.id);
    });
  }

  function confirmarRenombre(nuevo: string) {
    const r = renombrando;
    setRenombrando(null);
    if (!r || !nuevo.trim()) return;
    start(async () => {
      if (r.tipo === "espacio") return; // se edita con su modal
      const res = await renombrarAction(r.tipo, r.id, nuevo);
      if (!res.ok) aviso(res.error);
    });
  }

  function confirmarEliminar() {
    const e = eliminando;
    if (!e) return;
    start(async () => {
      const res = e.tipo === "espacio" ? await eliminarEspacioAction(e.id) : await eliminarElementoAction(e.tipo, e.id);
      if (!res.ok) return aviso(res.error);
      setEliminando(null);
      const url = pathname;
      if (url.includes(e.id) || e.tipo === "espacio" || e.tipo === "carpeta") router.push("/proyectos");
    });
  }

  const q = busqueda.trim().toLowerCase();
  const coincide = (n: string) => !q || n.toLowerCase().includes(q);

  const filas = arbol.map((e) => {
    const carpetas = e.carpetas
      .map((c) => ({
        ...c,
        listas: c.listas.filter((l) => !q || coincide(l.nombre) || coincide(c.nombre)),
        docs: c.docs.filter((d) => !q || coincide(d.nombre) || coincide(c.nombre)),
      }))
      .filter((c) => !q || coincide(c.nombre) || c.listas.length > 0 || c.docs.length > 0);
    const listas = e.listas.filter((l) => coincide(l.nombre));
    const docs = e.docs.filter((d) => coincide(d.nombre));
    const visible = !q || coincide(e.espacio.nombre) || carpetas.length > 0 || listas.length > 0 || docs.length > 0;
    return { e, carpetas, listas, docs, visible };
  });

  const espacioEditar = arbol.find((x) => x.espacio.id === editandoEspacio)?.espacio;
  const espacioCompartir = arbol.find((x) => x.espacio.id === compartiendo)?.espacio;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar en espacios"
            className="w-full rounded-sm border border-line bg-white py-1.5 pl-8 pr-2 text-[13px] outline-none placeholder:text-ink-3 focus:border-blue"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-overline text-ink-3">Espacios</span>
        <button
          type="button"
          onClick={onNuevoEspacio}
          aria-label="Nuevo espacio"
          title="Nuevo espacio"
          className="rounded-sm p-1 text-ink-3 hover:bg-line-2 hover:text-ink"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label="Espacios" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {arbol.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="text-sm text-ink-3">Aún no hay espacios.</p>
            <BotonPrimario className="mt-3" onClick={onNuevoEspacio}>
              <Plus className="h-4 w-4" /> Crear espacio
            </BotonPrimario>
          </div>
        )}
        {q && filas.every((f) => !f.visible) && <p className="px-2 py-4 text-sm text-ink-3">Sin resultados.</p>}

        {filas
          .filter((f) => f.visible)
          .map(({ e, carpetas, listas, docs }) => {
            const { espacio } = e;
            const expandido = !!q || abiertos.has(espacio.id);
            const puedeEditar = espacio.rol !== "lector";
            const esActivoEspacio = activo?.tipo === "espacio" && activo.id === espacio.id;
            return (
              <div key={espacio.id} className="mb-0.5">
                <Fila
                  activo={esActivoEspacio}
                  sangria={0}
                  acciones={
                    <Acciones
                      puedeEditar={puedeEditar}
                      esPropietario={espacio.rol === "propietario"}
                      esEspacio
                      onNuevo={(tipo) => iniciarCreacion({ espacioId: espacio.id, carpetaId: null, tipo })}
                      onRenombrar={() => setEditandoEspacio(espacio.id)}
                      onCompartir={() => setCompartiendo(espacio.id)}
                      onEliminar={() => setEliminando({ tipo: "espacio", id: espacio.id, nombre: espacio.nombre })}
                    />
                  }
                >
                  <button
                    type="button"
                    onClick={() => alternar(espacio.id)}
                    aria-label={expandido ? "Contraer" : "Expandir"}
                    aria-expanded={expandido}
                    className="flex h-5 w-4 shrink-0 items-center justify-center text-ink-3"
                  >
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandido ? "rotate-90" : ""}`} />
                  </button>
                  <Link
                    href={`/proyectos/espacio/${espacio.id}`}
                    onClick={() => abrir(espacio.id)}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs text-[11px] font-bold text-white"
                      style={{ background: espacio.color }}
                    >
                      {espacio.nombre[0]?.toUpperCase()}
                    </span>
                    <span className="truncate text-[13px] font-semibold text-ink">{espacio.nombre}</span>
                    {espacio.privado && <Lock className="h-3 w-3 shrink-0 text-ink-3" aria-label="Privado" />}
                  </Link>
                </Fila>

                {expandido && (
                  <div>
                    {creando?.espacioId === espacio.id && !creando.carpetaId && (
                      <FilaNueva tipo={creando.tipo} sangria={1} onOk={confirmarCreacion} onCancelar={() => setCreando(null)} />
                    )}

                    {carpetas.map((c) => (
                      <CarpetaNodo
                        key={c.id}
                        carpeta={c}
                        puedeEditar={puedeEditar}
                        activo={activo}
                        expandido={!!q || abiertos.has(c.id)}
                        alternar={() => alternar(c.id)}
                        creando={creando?.carpetaId === c.id ? creando : null}
                        renombrando={renombrando}
                        onNuevo={(tipo) => iniciarCreacion({ espacioId: espacio.id, carpetaId: c.id, tipo })}
                        onConfirmarNuevo={confirmarCreacion}
                        onCancelarNuevo={() => setCreando(null)}
                        onRenombrar={() => setRenombrando({ tipo: "carpeta", id: c.id })}
                        onConfirmarRenombre={confirmarRenombre}
                        onCancelarRenombre={() => setRenombrando(null)}
                        onEliminar={() => setEliminando({ tipo: "carpeta", id: c.id, nombre: c.nombre })}
                        onRenombrarHijo={(tipo, id) => setRenombrando({ tipo, id })}
                        onEliminarHijo={(tipo, id, nombre) => setEliminando({ tipo, id, nombre })}
                      />
                    ))}

                    {listas.map((l) => (
                      <HojaLista
                        key={l.id}
                        lista={l}
                        sangria={1}
                        activo={activo?.tipo === "lista" && activo.id === l.id}
                        puedeEditar={puedeEditar}
                        renombrando={renombrando?.tipo === "lista" && renombrando.id === l.id}
                        onRenombrar={() => setRenombrando({ tipo: "lista", id: l.id })}
                        onConfirmarRenombre={confirmarRenombre}
                        onCancelarRenombre={() => setRenombrando(null)}
                        onEliminar={() => setEliminando({ tipo: "lista", id: l.id, nombre: l.nombre })}
                      />
                    ))}
                    {docs.map((d) => (
                      <HojaDoc
                        key={d.id}
                        doc={d}
                        sangria={1}
                        activo={activo?.tipo === "doc" && activo.id === d.id}
                        puedeEditar={puedeEditar}
                        renombrando={renombrando?.tipo === "doc" && renombrando.id === d.id}
                        onRenombrar={() => setRenombrando({ tipo: "doc", id: d.id })}
                        onConfirmarRenombre={confirmarRenombre}
                        onCancelarRenombre={() => setRenombrando(null)}
                        onEliminar={() => setEliminando({ tipo: "doc", id: d.id, nombre: d.nombre })}
                      />
                    ))}

                    {carpetas.length === 0 && listas.length === 0 && docs.length === 0 && !creando && !q && (
                      <p className="py-1 pl-9 pr-2 text-xs text-ink-3">
                        {puedeEditar ? "Vacío — usa «+» para crear una lista, carpeta o documento." : "Este espacio está vacío."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      {espacioEditar && <EspacioModal espacio={espacioEditar} onCerrar={() => setEditandoEspacio(null)} />}
      {espacioCompartir && (
        <CompartirModal espacio={espacioCompartir} yoId={yoId} onCerrar={() => setCompartiendo(null)} />
      )}
      {eliminando && (
        <Modal
          titulo={`Eliminar ${etiquetaTipo(eliminando.tipo)}`}
          onCerrar={() => setEliminando(null)}
          pie={
            <>
              <BotonSecundario onClick={() => setEliminando(null)}>Cancelar</BotonSecundario>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={pendiente}
                className="rounded-sm bg-[#D92D20] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#B42318] disabled:opacity-50"
              >
                Eliminar
              </button>
            </>
          }
        >
          <p className="text-sm text-ink-2">
            Vas a eliminar <strong>{eliminando.nombre}</strong>
            {eliminando.tipo === "espacio" && " y todo lo que contiene (carpetas, listas, tareas y documentos)"}
            {eliminando.tipo === "carpeta" && " y todo lo que contiene (listas, tareas y documentos)"}
            {eliminando.tipo === "lista" && " con todas sus tareas"}
            {eliminando.tipo === "doc" && " con todas sus páginas"}. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}

function etiquetaTipo(t: string) {
  return { espacio: "espacio", carpeta: "carpeta", lista: "lista", doc: "documento" }[t] ?? "elemento";
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------
function Fila({
  activo,
  sangria,
  children,
  acciones,
}: {
  activo: boolean;
  sangria: number;
  children: React.ReactNode;
  acciones?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative flex h-8 items-center gap-1 rounded-sm pr-1 ${
        activo ? "bg-blue-10" : "hover:bg-line-2"
      }`}
      style={{ paddingLeft: 4 + sangria * 16 }}
    >
      {children}
      {acciones && (
        <span className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {acciones}
        </span>
      )}
    </div>
  );
}

function Acciones({
  puedeEditar,
  esPropietario,
  esEspacio,
  onNuevo,
  onRenombrar,
  onCompartir,
  onEliminar,
}: {
  puedeEditar: boolean;
  esPropietario?: boolean;
  esEspacio?: boolean;
  onNuevo?: (t: TipoNuevo) => void;
  onRenombrar: () => void;
  onCompartir?: () => void;
  onEliminar: () => void;
}) {
  const item = "flex w-full items-center gap-2 rounded-xs px-2.5 py-1.5 text-left text-[13px] text-ink-2 hover:bg-line-2";
  return (
    <>
      {puedeEditar && onNuevo && (
        <Popover
          ancho={200}
          alinear="derecha"
          boton={({ alternar }) => (
            <button
              type="button"
              onClick={alternar}
              aria-label="Crear…"
              title="Crear…"
              className="rounded-xs p-1 text-ink-3 hover:bg-white hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        >
          {(cerrar) => (
            <div role="menu">
              <button role="menuitem" className={item} onClick={() => { cerrar(); onNuevo("lista"); }}>
                <ListIcon className="h-4 w-4" /> Lista
              </button>
              {esEspacio && (
                <button role="menuitem" className={item} onClick={() => { cerrar(); onNuevo("carpeta"); }}>
                  <Folder className="h-4 w-4" /> Carpeta
                </button>
              )}
              <button role="menuitem" className={item} onClick={() => { cerrar(); onNuevo("doc"); }}>
                <FileText className="h-4 w-4" /> Documento
              </button>
            </div>
          )}
        </Popover>
      )}
      {(puedeEditar || onCompartir) && (
        <Popover
          ancho={210}
          alinear="derecha"
          boton={({ alternar }) => (
            <button
              type="button"
              onClick={alternar}
              aria-label="Más opciones"
              title="Más opciones"
              className="rounded-xs p-1 text-ink-3 hover:bg-white hover:text-ink"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
        >
          {(cerrar) => (
            <div role="menu">
              {puedeEditar && (
                <button role="menuitem" className={item} onClick={() => { cerrar(); onRenombrar(); }}>
                  {esEspacio ? <Palette className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {esEspacio ? "Editar espacio" : "Renombrar"}
                </button>
              )}
              {onCompartir && (
                <button role="menuitem" className={item} onClick={() => { cerrar(); onCompartir(); }}>
                  <Share2 className="h-4 w-4" /> Compartir
                </button>
              )}
              {puedeEditar && (!esEspacio || esPropietario) && (
                <button
                  role="menuitem"
                  className={`${item} !text-[#B42318]`}
                  onClick={() => { cerrar(); onEliminar(); }}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              )}
            </div>
          )}
        </Popover>
      )}
    </>
  );
}

function InputInline({
  inicial = "",
  placeholder,
  onOk,
  onCancelar,
}: {
  inicial?: string;
  placeholder?: string;
  onOk: (v: string) => void;
  onCancelar: () => void;
}) {
  const [v, setV] = useState(inicial);
  const hecho = useRef(false);
  const fin = (ok: boolean) => {
    if (hecho.current) return;
    hecho.current = true;
    if (ok) onOk(v);
    else onCancelar();
  };
  return (
    <input
      autoFocus
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") fin(true);
        if (e.key === "Escape") fin(false);
      }}
      onBlur={() => fin(v.trim().length > 0)}
      maxLength={200}
      className="min-w-0 flex-1 rounded-xs border border-blue bg-white px-1.5 py-0.5 text-[13px] outline-none shadow-eb-focus"
    />
  );
}

function FilaNueva({
  tipo,
  sangria,
  onOk,
  onCancelar,
}: {
  tipo: TipoNuevo;
  sangria: number;
  onOk: (v: string) => void;
  onCancelar: () => void;
}) {
  const Icono = tipo === "lista" ? ListIcon : tipo === "carpeta" ? Folder : FileText;
  return (
    <div className="flex h-8 items-center gap-2 pr-1" style={{ paddingLeft: 4 + sangria * 16 + 20 }}>
      <Icono className="h-4 w-4 shrink-0 text-ink-3" />
      <InputInline
        placeholder={tipo === "lista" ? "Nombre de la lista" : tipo === "carpeta" ? "Nombre de la carpeta" : "Nombre del documento"}
        onOk={onOk}
        onCancelar={onCancelar}
      />
    </div>
  );
}

function CarpetaNodo(props: {
  carpeta: CarpetaConHijos;
  puedeEditar: boolean;
  activo: { tipo: string; id: string } | null;
  expandido: boolean;
  alternar: () => void;
  creando: Creando | null;
  renombrando: Renombrando;
  onNuevo: (t: TipoNuevo) => void;
  onConfirmarNuevo: (v: string) => void;
  onCancelarNuevo: () => void;
  onRenombrar: () => void;
  onConfirmarRenombre: (v: string) => void;
  onCancelarRenombre: () => void;
  onEliminar: () => void;
  onRenombrarHijo: (tipo: "lista" | "doc", id: string) => void;
  onEliminarHijo: (tipo: "lista" | "doc", id: string, nombre: string) => void;
}) {
  const { carpeta: c, expandido, puedeEditar } = props;
  const renombrando = props.renombrando?.tipo === "carpeta" && props.renombrando.id === c.id;
  const Icono = expandido ? FolderOpen : Folder;
  return (
    <div>
      <Fila
        activo={false}
        sangria={1}
        acciones={
          <Acciones
            puedeEditar={puedeEditar}
            onNuevo={props.onNuevo}
            onRenombrar={props.onRenombrar}
            onEliminar={props.onEliminar}
          />
        }
      >
        <button
          type="button"
          onClick={props.alternar}
          aria-expanded={expandido}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform ${expandido ? "rotate-90" : ""}`} />
          <Icono className="h-4 w-4 shrink-0 text-ink-3" />
          {renombrando ? (
            <InputInline inicial={c.nombre} onOk={props.onConfirmarRenombre} onCancelar={props.onCancelarRenombre} />
          ) : (
            <span className="truncate text-[13px] text-ink-2">{c.nombre}</span>
          )}
        </button>
      </Fila>
      {expandido && (
        <div>
          {props.creando && (
            <FilaNueva tipo={props.creando.tipo} sangria={2} onOk={props.onConfirmarNuevo} onCancelar={props.onCancelarNuevo} />
          )}
          {c.listas.map((l) => (
            <HojaLista
              key={l.id}
              lista={l}
              sangria={2}
              activo={props.activo?.tipo === "lista" && props.activo.id === l.id}
              puedeEditar={puedeEditar}
              renombrando={props.renombrando?.tipo === "lista" && props.renombrando.id === l.id}
              onRenombrar={() => props.onRenombrarHijo("lista", l.id)}
              onConfirmarRenombre={props.onConfirmarRenombre}
              onCancelarRenombre={props.onCancelarRenombre}
              onEliminar={() => props.onEliminarHijo("lista", l.id, l.nombre)}
            />
          ))}
          {c.docs.map((d) => (
            <HojaDoc
              key={d.id}
              doc={d}
              sangria={2}
              activo={props.activo?.tipo === "doc" && props.activo.id === d.id}
              puedeEditar={puedeEditar}
              renombrando={props.renombrando?.tipo === "doc" && props.renombrando.id === d.id}
              onRenombrar={() => props.onRenombrarHijo("doc", d.id)}
              onConfirmarRenombre={props.onConfirmarRenombre}
              onCancelarRenombre={props.onCancelarRenombre}
              onEliminar={() => props.onEliminarHijo("doc", d.id, d.nombre)}
            />
          ))}
          {c.listas.length === 0 && c.docs.length === 0 && !props.creando && (
            <p className="py-1 text-xs text-ink-3" style={{ paddingLeft: 4 + 2 * 16 + 20 }}>
              Carpeta vacía
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function HojaLista({
  lista,
  sangria,
  activo,
  puedeEditar,
  renombrando,
  onRenombrar,
  onConfirmarRenombre,
  onCancelarRenombre,
  onEliminar,
}: {
  lista: Lista;
  sangria: number;
  activo: boolean;
  puedeEditar: boolean;
  renombrando: boolean;
  onRenombrar: () => void;
  onConfirmarRenombre: (v: string) => void;
  onCancelarRenombre: () => void;
  onEliminar: () => void;
}) {
  return (
    <Fila activo={activo} sangria={sangria} acciones={puedeEditar ? <Acciones puedeEditar onRenombrar={onRenombrar} onEliminar={onEliminar} /> : undefined}>
      {renombrando ? (
        <span className="flex min-w-0 flex-1 items-center gap-2 pl-5">
          <ListIcon className="h-4 w-4 shrink-0 text-ink-3" />
          <InputInline inicial={lista.nombre} onOk={onConfirmarRenombre} onCancelar={onCancelarRenombre} />
        </span>
      ) : (
        <Link href={`/proyectos/lista/${lista.id}`} className="flex min-w-0 flex-1 items-center gap-2 pl-5" aria-current={activo ? "page" : undefined}>
          <ListIcon className={`h-4 w-4 shrink-0 ${activo ? "text-blue" : "text-ink-3"}`} />
          <span className={`truncate text-[13px] ${activo ? "font-semibold text-ink" : "text-ink-2"}`}>{lista.nombre}</span>
          {lista.abiertas > 0 && <span className="ml-auto shrink-0 pr-1 text-[11px] text-ink-3 group-hover:hidden">{lista.abiertas}</span>}
        </Link>
      )}
    </Fila>
  );
}

function HojaDoc({
  doc,
  sangria,
  activo,
  puedeEditar,
  renombrando,
  onRenombrar,
  onConfirmarRenombre,
  onCancelarRenombre,
  onEliminar,
}: {
  doc: DocResumen;
  sangria: number;
  activo: boolean;
  puedeEditar: boolean;
  renombrando: boolean;
  onRenombrar: () => void;
  onConfirmarRenombre: (v: string) => void;
  onCancelarRenombre: () => void;
  onEliminar: () => void;
}) {
  return (
    <Fila activo={activo} sangria={sangria} acciones={puedeEditar ? <Acciones puedeEditar onRenombrar={onRenombrar} onEliminar={onEliminar} /> : undefined}>
      {renombrando ? (
        <span className="flex min-w-0 flex-1 items-center gap-2 pl-5">
          <FileText className="h-4 w-4 shrink-0 text-ink-3" />
          <InputInline inicial={doc.nombre} onOk={onConfirmarRenombre} onCancelar={onCancelarRenombre} />
        </span>
      ) : (
        <Link href={`/proyectos/doc/${doc.id}`} className="flex min-w-0 flex-1 items-center gap-2 pl-5" aria-current={activo ? "page" : undefined}>
          <FileText className={`h-4 w-4 shrink-0 ${activo ? "text-blue" : "text-ink-3"}`} />
          <span className={`truncate text-[13px] ${activo ? "font-semibold text-ink" : "text-ink-2"}`}>{doc.nombre}</span>
        </Link>
      )}
    </Fila>
  );
}
