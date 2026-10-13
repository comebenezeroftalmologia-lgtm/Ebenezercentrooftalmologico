"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { Node, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, type NodeViewProps } from "@tiptap/react";
import type { EnlaceTarea as DatosEnlace } from "@/lib/proyectos/types";
import { Avatar } from "@/components/proyectos/ui";

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Datos en vivo de las tareas enlazadas (estado, responsables) y nombres de personas. */
export interface ContextoEnlaces {
  enlaces: Record<string, DatosEnlace>;
  nombres: Map<string, string>;
}
export const EnlacesTareaContext = createContext<ContextoEnlaces>({ enlaces: {}, nombres: new Map() });

function VistaEnlaceTarea({ node }: NodeViewProps) {
  const { enlaces, nombres } = useContext(EnlacesTareaContext);
  const id = String(node.attrs.tareaId ?? "");
  const datos = UUID.test(id) ? enlaces[id] : undefined;
  const nombre = datos?.nombre ?? String(node.attrs.nombre ?? "");

  if (!UUID.test(id)) {
    return (
      <NodeViewWrapper as="span" className="eb-enlace-tarea" contentEditable={false}>
        {nombre}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="eb-enlace-tarea" contentEditable={false} data-enlace-tarea={id}>
      <Link
        href={`/proyectos/tarea/${id}`}
        draggable={false}
        className="eb-enlace-tarea__nombre"
        title="Abrir la tarea"
      >
        {nombre}
      </Link>
      {datos ? (
        <>
          {datos.estado && (
            <span className="eb-enlace-tarea__estado" style={{ background: datos.estado.color }}>
              {datos.estado.nombre}
            </span>
          )}
          {datos.asignados.slice(0, 2).map((uid) => (
            <span key={uid} className="eb-enlace-tarea__avatar">
              <Avatar id={uid} nombre={nombres.get(uid) ?? "Usuario"} size={18} />
            </span>
          ))}
        </>
      ) : (
        <span className="eb-enlace-tarea__estado eb-enlace-tarea__estado--sin" title="No existe o no tienes acceso">
          sin acceso
        </span>
      )}
    </NodeViewWrapper>
  );
}

/**
 * Texto convertido en tarea: aparece subrayado, con el estado y el responsable de
 * la tarea, y abre la tarea al hacer clic. En el JSON solo se guarda el id (y el
 * nombre de respaldo): el estado y los responsables se leen en vivo.
 */
export const EnlaceTareaNode = Node.create({
  name: "enlaceTarea",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      tareaId: { default: null },
      nombre: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-enlace-tarea]" }];
  },

  renderHTML({ node }) {
    return ["span", mergeAttributes({ "data-enlace-tarea": node.attrs.tareaId }), String(node.attrs.nombre ?? "")];
  },

  renderText({ node }) {
    return String(node.attrs.nombre ?? "");
  },

  addNodeView() {
    return ReactNodeViewRenderer(VistaEnlaceTarea);
  },
});
