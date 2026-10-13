"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor, type Editor as TipTapEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  CheckCircle2,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import type { EnlaceTarea, ListaDestino } from "@/lib/proyectos/types";
import { EnlaceTareaNode, EnlacesTareaContext } from "@/components/proyectos/EnlaceTarea";
import { PanelCrearTareaDoc } from "@/components/proyectos/PanelCrearTareaDoc";
import "./editor.css";

type RespuestaCrear = { ok: true; enlace: EnlaceTarea } | { ok: false; error: string };

interface Seleccion {
  from: number;
  to: number;
  texto: string;
  top: number;
  abajo: number;
  left: number;
}

/** Selección dentro de un mismo párrafo/título, con su posición en pantalla. */
function leerSeleccion(ed: TipTapEditor, rango?: { from: number; to: number }): Seleccion | null {
  const { from, to, empty, $from, $to } = ed.state.selection;
  const f = rango?.from ?? from;
  const t = rango?.to ?? to;
  if (!rango && (empty || !$from.sameParent($to) || !$from.parent.isTextblock)) return null;
  if (t > ed.state.doc.content.size) return null;
  const texto = ed.state.doc.textBetween(f, t, " ").replace(/\s+/g, " ").trim();
  if (!texto) return null;
  try {
    const a = ed.view.coordsAtPos(f);
    const b = ed.view.coordsAtPos(t);
    return { from: f, to: t, texto, top: Math.min(a.top, b.top), abajo: Math.max(a.bottom, b.bottom), left: a.left };
  } catch {
    return null;
  }
}

/** Editor de texto enriquecido (TipTap). El contenido se guarda como JSON;
 * nunca se inyecta HTML crudo, así que no hay riesgo de scripts. */
export function Editor({
  contenido,
  onCambio,
  editable = true,
  placeholder = "Escribe aquí…",
  compacto = false,
  barra = true,
  claseContenido = "",
  autoFocus = false,
  enlaces,
  nombres,
  listasDestino,
  onCrearTarea,
}: {
  contenido: JSONContent | null;
  onCambio?: (json: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  compacto?: boolean;
  barra?: boolean;
  claseContenido?: string;
  autoFocus?: boolean;
  /** Tareas enlazadas en el texto (estado y responsables en vivo). */
  enlaces?: Record<string, EnlaceTarea>;
  nombres?: Map<string, string>;
  /** Con `onCrearTarea` y `listasDestino`, al seleccionar texto aparece «Crear tarea». */
  listasDestino?: ListaDestino[];
  onCrearTarea?: (nombre: string, listaId: string) => Promise<RespuestaCrear>;
}) {
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;

  // --- Barra flotante «Crear tarea» sobre el texto seleccionado ---------------
  const puedeCrearTarea = editable && !!onCrearTarea && !!listasDestino && listasDestino.length > 0;
  const puedeCrearRef = useRef(puedeCrearTarea);
  puedeCrearRef.current = puedeCrearTarea;
  const [sel, setSel] = useState<Seleccion | null>(null);
  const [panel, setPanel] = useState(false);
  const panelRef = useRef(false);
  panelRef.current = panel;
  const arrastrando = useRef(false);
  const ctxEnlaces = useMemo(
    () => ({ enlaces: enlaces ?? {}, nombres: nombres ?? new Map<string, string>() }),
    [enlaces, nombres]
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: !editable,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      EnlaceTareaNode,
    ],
    content: contenido ?? undefined,
    // ProseMirror crea los `attrs` sin prototipo; Next no deja pasar eso a una
    // server action. Un viaje por JSON lo convierte en objetos planos.
    onUpdate: ({ editor }) => onCambioRef.current?.(JSON.parse(JSON.stringify(editor.getJSON())) as JSONContent),
    onSelectionUpdate: ({ editor }) => {
      if (panelRef.current || arrastrando.current) return;
      setSel(puedeCrearRef.current ? leerSeleccion(editor) : null);
    },
    onBlur: () => {
      if (!panelRef.current) setSel(null);
    },
  });

  // La barra aparece al soltar el ratón (no mientras se arrastra) y sigue al texto al hacer scroll.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const abajo = () => {
      arrastrando.current = true;
    };
    const arriba = () => {
      if (!arrastrando.current) return;
      arrastrando.current = false;
      if (!panelRef.current) setSel(puedeCrearRef.current ? leerSeleccion(editor) : null);
    };
    const mover = () => {
      setSel((actual) => (actual ? leerSeleccion(editor, { from: actual.from, to: actual.to }) ?? actual : actual));
    };
    dom.addEventListener("mousedown", abajo);
    window.addEventListener("mouseup", arriba);
    window.addEventListener("scroll", mover, true);
    window.addEventListener("resize", mover);
    return () => {
      dom.removeEventListener("mousedown", abajo);
      window.removeEventListener("mouseup", arriba);
      window.removeEventListener("scroll", mover, true);
      window.removeEventListener("resize", mover);
    };
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return <div className={`eb-editor ${compacto ? "eb-compacto" : ""} min-h-[2em]`} />;
  }

  const btn = (activo: boolean) =>
    `rounded-xs p-1.5 transition-colors ${activo ? "bg-navy text-white" : "text-ink-2 hover:bg-line-2"}`;

  function enlace() {
    const previo = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Dirección del enlace (https://…)", previo ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url.trim())) return;
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className={`eb-editor ${compacto ? "eb-compacto" : ""} ${editable ? "" : "eb-solo-lectura"}`}>
      {editable && barra && (
        <div role="toolbar" aria-label="Formato" className="mb-2 flex flex-wrap items-center gap-0.5 rounded-md border border-line bg-white p-1">
          <button type="button" aria-label="Título 1" title="Título 1" className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></button>
          <button type="button" aria-label="Título 2" title="Título 2" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></button>
          <button type="button" aria-label="Título 3" title="Título 3" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></button>
          <span className="mx-1 h-4 w-px bg-line" />
          <button type="button" aria-label="Negrita" title="Negrita (Ctrl+B)" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
          <button type="button" aria-label="Cursiva" title="Cursiva (Ctrl+I)" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
          <button type="button" aria-label="Subrayado" title="Subrayado (Ctrl+U)" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></button>
          <button type="button" aria-label="Tachado" title="Tachado" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></button>
          <button type="button" aria-label="Código" title="Código" className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-4 w-4" /></button>
          <button type="button" aria-label="Enlace" title="Enlace" className={btn(editor.isActive("link"))} onClick={enlace}><Link2 className="h-4 w-4" /></button>
          <span className="mx-1 h-4 w-px bg-line" />
          <button type="button" aria-label="Lista con viñetas" title="Lista con viñetas" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></button>
          <button type="button" aria-label="Lista numerada" title="Lista numerada" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></button>
          <button type="button" aria-label="Lista de tareas" title="Lista de tareas" className={btn(editor.isActive("taskList"))} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></button>
          <button type="button" aria-label="Cita" title="Cita" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></button>
          <button type="button" aria-label="Separador" title="Separador" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></button>
        </div>
      )}
      <EnlacesTareaContext.Provider value={ctxEnlaces}>
        <EditorContent editor={editor} className={claseContenido} />
      </EnlacesTareaContext.Provider>

      {puedeCrearTarea && sel && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              zIndex: 70,
              top: sel.top >= 64 ? sel.top - 48 : sel.abajo + 8,
              left: Math.max(8, Math.min(sel.left, window.innerWidth - 348)),
            }}
            // No le quita el foco ni la selección al editor, salvo en los campos del panel.
            onMouseDown={(e) => {
              if (!(e.target as HTMLElement).closest("input, textarea, select")) e.preventDefault();
            }}
          >
            {panel ? (
              <PanelCrearTareaDoc
                textoInicial={sel.texto}
                listas={listasDestino!}
                onCerrar={() => {
                  setPanel(false);
                  editor.chain().focus().run();
                }}
                onCrear={async (nombre, listaId) => {
                  const r = await onCrearTarea!(nombre, listaId);
                  if (!r.ok) return r.error;
                  const actual = editor.state.doc.textBetween(sel.from, sel.to, " ").replace(/\s+/g, " ").trim();
                  const nodo = { type: "enlaceTarea", attrs: { tareaId: r.enlace.id, nombre: r.enlace.nombre } };
                  // Reemplaza el texto elegido; si alguien lo cambió mientras tanto, lo inserta al final de la selección.
                  const rango = actual === sel.texto ? { from: sel.from, to: sel.to } : { from: sel.to, to: sel.to };
                  editor.chain().focus().insertContentAt(rango, nodo).run();
                  setPanel(false);
                  setSel(null);
                  return null;
                }}
              />
            ) : (
              <div role="toolbar" aria-label="Texto seleccionado" className="flex items-center gap-0.5 rounded-md border border-line bg-white p-1 shadow-eb-3">
                <button type="button" aria-label="Negrita" title="Negrita" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
                <button type="button" aria-label="Cursiva" title="Cursiva" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
                <button type="button" aria-label="Subrayado" title="Subrayado" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></button>
                <button type="button" aria-label="Tachado" title="Tachado" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></button>
                <span className="mx-1 h-4 w-px bg-line" />
                <button
                  type="button"
                  aria-label="Crear tarea con el texto seleccionado"
                  title="Crear tarea"
                  onClick={() => setPanel(true)}
                  className="inline-flex items-center gap-1.5 rounded-xs px-2 py-1.5 text-[13px] font-semibold text-blue hover:bg-blue-10"
                >
                  <CheckCircle2 className="h-4 w-4" /> Crear tarea
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
