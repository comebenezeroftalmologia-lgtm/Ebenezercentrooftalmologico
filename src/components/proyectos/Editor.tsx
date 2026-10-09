"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
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
import "./editor.css";

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
}: {
  contenido: JSONContent | null;
  onCambio?: (json: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  compacto?: boolean;
  barra?: boolean;
  claseContenido?: string;
  autoFocus?: boolean;
}) {
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;

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
    ],
    content: contenido ?? undefined,
    // ProseMirror crea los `attrs` sin prototipo; Next no deja pasar eso a una
    // server action. Un viaje por JSON lo convierte en objetos planos.
    onUpdate: ({ editor }) => onCambioRef.current?.(JSON.parse(JSON.stringify(editor.getJSON())) as JSONContent),
  });

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
      <EditorContent editor={editor} className={claseContenido} />
    </div>
  );
}
