import type { JSONContent } from "@tiptap/react";

export type RolEspacio = "propietario" | "editor" | "lector";
export type Prioridad = "urgente" | "alta" | "normal" | "baja";
export type TipoEstado = "abierto" | "activo" | "cerrado";

export const ROLES: { value: RolEspacio; label: string; ayuda: string }[] = [
  { value: "propietario", label: "Propietario", ayuda: "Gestiona miembros y todo el contenido" },
  { value: "editor", label: "Editor", ayuda: "Crea y edita tareas, listas y documentos" },
  { value: "lector", label: "Lector", ayuda: "Solo puede ver" },
];

export const PRIORIDADES: { value: Prioridad; label: string; color: string }[] = [
  { value: "urgente", label: "Urgente", color: "#D92D20" },
  { value: "alta", label: "Alta", color: "#F79009" },
  { value: "normal", label: "Normal", color: "#3B6FF0" },
  { value: "baja", label: "Baja", color: "#98A2B3" },
];

export const COLORES_ESPACIO = [
  "#6B5CE7", "#0F2FF3", "#3B6FF0", "#0E9AA7", "#21814B", "#7CB518",
  "#F79009", "#E5484D", "#D6409F", "#8E4EC6", "#A1887F", "#667085",
];

export const COLORES_ESTADO = [
  "#9AA0B4", "#3B6FF0", "#7C5CFA", "#0E9AA7", "#21814B", "#F79009", "#E5484D", "#D6409F",
];

export interface Usuario {
  id: string;
  nombre: string;
}

export interface Espacio {
  id: string;
  nombre: string;
  color: string;
  privado: boolean;
  orden: number;
  /** Rol del usuario actual en este espacio. */
  rol: RolEspacio;
}

export interface Carpeta {
  id: string;
  espacioId: string;
  nombre: string;
  orden: number;
}

export interface Lista {
  id: string;
  espacioId: string;
  carpetaId: string | null;
  nombre: string;
  orden: number;
  /** Tareas (sin contar subtareas) que no están en un estado cerrado. */
  abiertas: number;
}

export interface DocResumen {
  id: string;
  espacioId: string;
  carpetaId: string | null;
  nombre: string;
  orden: number;
}

export interface CarpetaConHijos extends Carpeta {
  listas: Lista[];
  docs: DocResumen[];
}

export interface EspacioArbol {
  espacio: Espacio;
  carpetas: CarpetaConHijos[];
  /** Listas y documentos que cuelgan directamente del espacio. */
  listas: Lista[];
  docs: DocResumen[];
}

export interface Estado {
  id: string;
  listaId: string;
  nombre: string;
  tipo: TipoEstado;
  color: string;
  orden: number;
}

export interface Etiqueta {
  id: string;
  espacioId: string;
  nombre: string;
  color: string;
}

export interface Tarea {
  id: string;
  listaId: string;
  parentId: string | null;
  nombre: string;
  estadoId: string;
  prioridad: Prioridad | null;
  fechaInicio: string | null;
  fechaLimite: string | null;
  orden: number;
  createdAt: string;
  completadaAt: string | null;
  asignados: string[];
  etiquetas: string[];
  subtareasTotal: number;
  subtareasHechas: number;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  texto: string;
  hecho: boolean;
  orden: number;
}

export interface Checklist {
  id: string;
  titulo: string;
  orden: number;
  items: ChecklistItem[];
}

export interface Adjunto {
  id: string;
  nombre: string;
  mime: string | null;
  tamano: number | null;
  createdAt: string;
  createdBy: string | null;
  url: string | null;
}

export interface Comentario {
  id: string;
  userId: string | null;
  texto: string;
  createdAt: string;
  editadoAt: string | null;
}

export interface EntradaActividad {
  id: string;
  userId: string | null;
  tipo: string;
  detalle: Record<string, unknown>;
  createdAt: string;
}

export interface TareaDetalle extends Tarea {
  espacioId: string;
  descripcion: JSONContent | null;
  createdBy: string | null;
  subtareas: Tarea[];
  checklists: Checklist[];
  adjuntos: Adjunto[];
  comentarios: Comentario[];
  actividad: EntradaActividad[];
}

export interface PaginaResumen {
  id: string;
  docId: string;
  parentId: string | null;
  titulo: string;
  orden: number;
  createdBy: string | null;
  colaboradores: string[];
  updatedAt: string;
}

export interface PaginaCompleta extends PaginaResumen {
  contenido: JSONContent | null;
}

export interface Miembro {
  userId: string;
  nombre: string;
  rol: RolEspacio;
}

/** Resultado uniforme de las server actions. */
export type Resultado<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };
