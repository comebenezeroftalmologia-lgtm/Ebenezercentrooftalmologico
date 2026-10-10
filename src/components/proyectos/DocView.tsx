"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { ChevronDown, ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import type { DatosDoc } from "@/lib/proyectos/queries";
import type { PaginaResumen } from "@/lib/proyectos/types";
import { crearPaginaAction, eliminarPaginaAction, guardarPaginaAction } from "@/lib/proyectos/actions";
import { fechaHora } from "@/lib/proyectos/utils";
import { Avatar, BotonSecundario, Modal, useAviso } from "@/components/proyectos/ui";
import { Editor } from "@/components/proyectos/Editor";
import { Migas } from "@/components/proyectos/Migas";

export function DocView({ datos }: { datos: DatosDoc }) {
  const { doc, espacio, carpeta, paginas, pagina, directorio } = datos;
  const aviso = useAviso();
  const router = useRouter();
  const puedeEditar = espacio.rol !== "lector";
  const nombres = useMemo(() => new Map(directorio.map((u) => [u.id, u.nombre])), [directorio]);
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());
  const [borrar, setBorrar] = useState<PaginaResumen | null>(null);
  const [, start] = useTransition();

  const hijas = useMemo(() => {
    const m = new Map<string | null, PaginaResumen[]>();
    for (const p of paginas) {
      const k = p.parentId;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [paginas]);

  function nueva(parentId: string | null) {
    start(async () => {
      const r = await crearPaginaAction(doc.id, parentId);
      if (!r.ok) return aviso(r.error);
      if (parentId) setPlegadas((s) => { const n = new Set(s); n.delete(parentId); return n; });
      router.push(`/proyectos/doc/${doc.id}?pagina=${r.id}`);
    });
  }

  function confirmarBorrar() {
    const p = borrar;
    if (!p) return;
    start(async () => {
      const r = await eliminarPaginaAction(p.id);
      if (!r.ok) return aviso(r.error);
      setBorrar(null);
      router.push(`/proyectos/doc/${doc.id}`);
    });
  }

  function Nodo({ p, nivel }: { p: PaginaResumen; nivel: number }) {
    const hs = hijas.get(p.id) ?? [];
    const plegada = plegadas.has(p.id);
    const activa = pagina?.id === p.id;
    return (
      <li>
        <div
          className={`group flex h-8 items-center gap-1 rounded-sm pr-1 ${activa ? "bg-blue-10" : "hover:bg-line-2"}`}
          style={{ paddingLeft: 4 + nivel * 16 }}
        >
          <button
            type="button"
            onClick={() => setPlegadas((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
            aria-label={plegada ? "Expandir" : "Contraer"}
            className={`flex h-5 w-4 shrink-0 items-center justify-center text-ink-3 ${hs.length === 0 ? "invisible" : ""}`}
          >
            {plegada ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <Link
            href={`/proyectos/doc/${doc.id}?pagina=${p.id}`}
            className="flex min-w-0 flex-1 items-center gap-1.5"
            aria-current={activa ? "page" : undefined}
          >
            <FileText className={`h-4 w-4 shrink-0 ${activa ? "text-blue" : "text-ink-3"}`} />
            <span className={`truncate text-[13px] ${activa ? "font-semibold text-ink" : "text-ink-2"}`}>{p.titulo || "Sin título"}</span>
          </Link>
          {puedeEditar && (
            <span className="flex shrink-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
              <button type="button" onClick={() => nueva(p.id)} aria-label={`Agregar subpágina a ${p.titulo}`} title="Agregar subpágina" className="rounded-xs p-1 text-ink-3 hover:bg-white hover:text-ink">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setBorrar(p)} aria-label={`Eliminar ${p.titulo}`} title="Eliminar página" className="rounded-xs p-1 text-ink-3 hover:bg-white hover:text-[#B42318]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
        {!plegada && hs.length > 0 && (
          <ul>
            {hs.map((h) => (
              <Nodo key={h.id} p={h} nivel={nivel + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const raices = hijas.get(null) ?? [];
  const cuentaHijas = (id: string): number => (hijas.get(id) ?? []).reduce((n, h) => n + 1 + cuentaHijas(h.id), 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white md:flex-row">
      {/* Páginas del documento */}
      <aside aria-label="Páginas" className="flex max-h-[38vh] w-full shrink-0 flex-col border-b border-line bg-ebbg md:max-h-none md:w-[260px] md:border-b-0 md:border-r">
        <div className="px-4 pb-2 pt-4">
          <Migas
            items={[
              { texto: espacio.nombre, href: `/proyectos/espacio/${espacio.id}`, color: espacio.color },
              ...(carpeta ? [{ texto: carpeta.nombre }] : []),
            ]}
          />
          <h1 className="mt-1 flex items-center gap-2 text-base font-bold text-ink">
            <FileText className="h-4 w-4 shrink-0 text-ink-3" />
            <span className="truncate">{doc.nombre}</span>
          </h1>
        </div>
        <div className="flex items-center justify-between px-4 pb-1 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-overline text-ink-3">Páginas</span>
          {puedeEditar && (
            <button type="button" onClick={() => nueva(null)} aria-label="Nueva página" title="Nueva página" className="rounded-sm p-1 text-ink-3 hover:bg-line-2 hover:text-ink">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {raices.map((p) => (
            <Nodo key={p.id} p={p} nivel={0} />
          ))}
          {raices.length === 0 && <li className="px-2 py-3 text-sm text-ink-3">Este documento no tiene páginas.</li>}
        </ul>
      </aside>

      {/* Editor */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {pagina ? (
          <PaginaEditor key={pagina.id} pagina={pagina} editable={puedeEditar} nombres={nombres} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-ink-3">Este documento aún no tiene páginas.</p>
            {puedeEditar && <BotonSecundario onClick={() => nueva(null)}>Crear la primera página</BotonSecundario>}
          </div>
        )}
      </div>

      {borrar && (
        <Modal
          titulo="Eliminar página"
          onCerrar={() => setBorrar(null)}
          pie={
            <>
              <BotonSecundario onClick={() => setBorrar(null)}>Cancelar</BotonSecundario>
              <button type="button" onClick={confirmarBorrar} className="rounded-sm bg-[#D92D20] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#B42318]">
                Eliminar
              </button>
            </>
          }
        >
          <p className="text-sm text-ink-2">
            Vas a eliminar <strong>{borrar.titulo}</strong>
            {cuentaHijas(borrar.id) > 0 ? ` y sus ${cuentaHijas(borrar.id)} subpágina(s)` : ""}. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}

function PaginaEditor({
  pagina,
  editable,
  nombres,
}: {
  pagina: NonNullable<DatosDoc["pagina"]>;
  editable: boolean;
  nombres: Map<string, string>;
}) {
  const aviso = useAviso();
  const [titulo, setTitulo] = useState(pagina.titulo);
  useEffect(() => setTitulo(pagina.titulo), [pagina.titulo]);
  const [estado, setEstado] = useState<"" | "guardando" | "guardado">("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendiente = useRef<JSONContent | null>(null);
  const [, start] = useTransition();

  async function volcar() {
    const contenido = pendiente.current;
    if (!contenido) return;
    pendiente.current = null;
    setEstado("guardando");
    const r = await guardarPaginaAction(pagina.id, { contenido });
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
    <article className="mx-auto max-w-[820px] px-8 pb-32 pt-10">
      <input
        value={titulo}
        readOnly={!editable}
        onChange={(e) => setTitulo(e.target.value)}
        onBlur={() => {
          const v = titulo.trim() || "Sin título";
          setTitulo(v);
          if (v !== pagina.titulo)
            start(async () => {
              const r = await guardarPaginaAction(pagina.id, { titulo: v });
              if (!r.ok) {
                setTitulo(pagina.titulo);
                aviso(r.error);
              }
            });
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="Título de la página"
        aria-label="Título de la página"
        maxLength={200}
        className="w-full rounded-sm border border-transparent bg-transparent px-1 text-[34px] font-bold leading-tight text-ink outline-none placeholder:text-ink-3 hover:border-line focus:border-blue"
      />
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3 px-1 text-xs text-ink-3">
        {pagina.colaboradores.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex">
              {pagina.colaboradores.slice(0, 4).map((id, i) => (
                <span key={id} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                  <Avatar id={id} nombre={nombres.get(id) ?? "Usuario"} size={20} ring />
                </span>
              ))}
            </span>
            {pagina.colaboradores.map((id) => nombres.get(id) ?? "Usuario").slice(0, 2).join(", ")}
            {pagina.colaboradores.length > 2 ? ` +${pagina.colaboradores.length - 2}` : ""}
          </span>
        )}
        <span>Editado {fechaHora(pagina.updatedAt)}</span>
        <span aria-live="polite" className="ml-auto">
          {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : ""}
        </span>
      </div>
      <Editor
        contenido={pagina.contenido}
        editable={editable}
        placeholder={editable ? "Empieza a escribir…" : "Esta página está vacía"}
        onCambio={(json) => {
          pendiente.current = json;
          setEstado("");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void volcar(), 900);
        }}
      />
    </article>
  );
}
