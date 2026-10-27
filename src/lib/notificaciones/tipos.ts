/** Tipos de aviso, compartidos por servidor y navegador. */

export const TIPOS_NOTIFICACION = [
  "tarea_asignada",
  "mencion",
  "comentario_tarea",
  "cambio_tarea",
  "fecha_limite",
  "espacio_compartido",
  "eliminacion_solicitud",
  "eliminacion_resuelta",
  "falla_nueva",
  "falla_actualizada",
] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

export type GrupoNotificacion = "Tareas" | "Espacios" | "Eliminaciones" | "Ayuda";

export const INFO_TIPO: Record<
  TipoNotificacion,
  {
    label: string;
    descripcion: string;
    grupo: GrupoNotificacion;
    /** Valores por defecto cuando la persona aún no ha elegido. */
    porDefecto: { enApp: boolean; email: boolean };
    /** Solo lo ven (y lo reciben) estos roles de plataforma. */
    soloRoles?: string[];
  }
> = {
  tarea_asignada: {
    label: "Me asignan una tarea",
    descripcion: "Cuando alguien te asigna o te agrega a una tarea.",
    grupo: "Tareas",
    porDefecto: { enApp: true, email: true },
  },
  mencion: {
    label: "Me mencionan con @",
    descripcion: "Cuando alguien te menciona en un comentario.",
    grupo: "Tareas",
    porDefecto: { enApp: true, email: true },
  },
  comentario_tarea: {
    label: "Comentarios en mis tareas",
    descripcion: "Comentarios de otras personas en tareas que creaste o que te asignaron.",
    grupo: "Tareas",
    porDefecto: { enApp: true, email: true },
  },
  cambio_tarea: {
    label: "Cambios en mis tareas",
    descripcion: "Cambios de estado, fecha límite o prioridad hechos por otra persona en tus tareas.",
    grupo: "Tareas",
    porDefecto: { enApp: true, email: false },
  },
  fecha_limite: {
    label: "Fechas límite",
    descripcion: "Aviso el día antes, el mismo día y el día después de que venza una tarea tuya.",
    grupo: "Tareas",
    porDefecto: { enApp: true, email: true },
  },
  espacio_compartido: {
    label: "Me comparten un espacio",
    descripcion: "Cuando te agregan como miembro de un espacio de Tareas.",
    grupo: "Espacios",
    porDefecto: { enApp: true, email: true },
  },
  eliminacion_solicitud: {
    label: "Solicitudes de eliminación por autorizar",
    descripcion: "Cuando alguien de tu equipo pide eliminar algo y necesita tu autorización.",
    grupo: "Eliminaciones",
    porDefecto: { enApp: true, email: true },
    soloRoles: ["desarrollador", "administrador", "lider"],
  },
  eliminacion_resuelta: {
    label: "Respuesta a mi solicitud de eliminación",
    descripcion: "Cuando tu líder autoriza o rechaza lo que pediste eliminar.",
    grupo: "Eliminaciones",
    porDefecto: { enApp: true, email: true },
  },
  falla_actualizada: {
    label: "Estado de mis reportes de falla",
    descripcion: "Cuando el equipo de desarrollo cambia el estado o responde un reporte tuyo.",
    grupo: "Ayuda",
    porDefecto: { enApp: true, email: true },
  },
  falla_nueva: {
    label: "Fallas nuevas reportadas",
    descripcion: "Cada vez que alguien reporta una falla en la plataforma.",
    grupo: "Ayuda",
    porDefecto: { enApp: true, email: true },
    soloRoles: ["desarrollador"],
  },
};

export const GRUPOS_NOTIFICACION: GrupoNotificacion[] = ["Tareas", "Espacios", "Eliminaciones", "Ayuda"];
