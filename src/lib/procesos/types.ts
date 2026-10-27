export type Rol = "lider" | "colaborador";
export type EstadoTarea = "pendiente" | "en_progreso" | "completada" | "rechazada";

/** Rol global de plataforma (distinto de `Rol`, que es el rol dentro de un área). */
export type RolPlataforma = "desarrollador" | "administrador" | "lider" | "usuario_basico";

export const ROLES_PLATAFORMA: { valor: RolPlataforma; label: string; descripcion: string }[] = [
  {
    valor: "desarrollador",
    label: "Desarrollador",
    descripcion: "Todos los permisos, cambia roles de administradores y ve la bandeja de fallas.",
  },
  { valor: "administrador", label: "Administrador", descripcion: "Todos los permisos operativos." },
  {
    valor: "lider",
    label: "Líder",
    descripcion: "Ve sus áreas o módulos asignados, invita personas y autoriza eliminaciones de su equipo.",
  },
  {
    valor: "usuario_basico",
    label: "Usuario Básico",
    descripcion: "Ve sus áreas o módulos asignados. Para eliminar necesita la autorización de su líder.",
  },
];

export function rolLabel(rol: RolPlataforma): string {
  return ROLES_PLATAFORMA.find((r) => r.valor === rol)?.label ?? rol;
}

export interface AppUser {
  id: string;
  nombreCompleto: string;
  email: string;
  /** Derivado del rol: true para desarrollador y administrador. */
  isAdmin: boolean;
  rol: RolPlataforma;
  /** Líder directo (solo usuarios básicos). */
  liderId: string | null;
  /** Puede cargar y publicar documentos del Centro de Conocimiento. */
  esGestorConocimiento: boolean;
  activo: boolean;
}

/** Estado real de acceso según Supabase Auth: si la persona ya entró alguna vez
 * o la invitación sigue sin usarse. */
export interface EstadoAcceso {
  invitadoAt: string | null;
  ultimoIngreso: string | null;
}

export interface Area {
  id: string;
  nombre: string;
}

export interface AreaAsignacion {
  id: string;
  areaId: string;
  userId: string;
  rol: Rol;
  usuario: AppUser;
}

export interface Proceso {
  id: string;
  areaId: string;
  nombre: string;
  descripcion: string | null;
  createdAt: string;
}

export interface Actividad {
  id: string;
  procesoId: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface Tarea {
  id: string;
  actividadId: string;
  nombre: string;
  descripcion: string | null;
  responsableUserId: string | null;
  responsable: AppUser | null;
  resultado: string | null;
  impactoPaciente: string | null;
  estado: EstadoTarea;
  orden: number;
  /** Catálogo fijo de KPIs (fase 1): el líder marca esto al crear o
   * editar la tarea; iniciadoAt/completadoAt/rechazadaAt/vecesRechazada
   * los llena solo un trigger de la base de datos al cambiar `estado`. */
  altoRiesgo: boolean;
  slaHoras: number | null;
  iniciadoAt: string | null;
  completadoAt: string | null;
  rechazadaAt: string | null;
  vecesRechazada: number;
}

export interface TareaRelacionada {
  relacionId: string;
  tarea: {
    id: string;
    nombre: string;
    actividadNombre: string;
    procesoNombre: string;
    areaNombre: string;
  };
  nota: string | null;
}

export const ESTADO_LABELS: Record<EstadoTarea, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
  rechazada: "Rechazada",
};

/** Los KPIs calculados a partir de un conjunto de tareas (por área, o
 * de toda la organización) — ver calcularKpis() en queries.ts. */
export interface KpisTareas {
  totalTareas: number;
  activas: number;
  completadas: number;
  rechazadas: number;
  altoRiesgoTotal: number;
  altoRiesgoMitigado: number;
  pctAltoRiesgoMitigado: number | null;
  conSla: number;
  cumplenSla: number;
  pctCumplimientoSla: number | null;
  tasaRetrabajo: number | null;
  conCiclo: number;
  tiempoCicloPromedioHoras: number | null;
}
