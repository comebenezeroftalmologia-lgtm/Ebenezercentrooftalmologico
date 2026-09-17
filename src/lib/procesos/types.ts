export type Rol = "lider" | "colaborador";
export type EstadoTarea = "pendiente" | "en_progreso" | "completada" | "rechazada";

export interface AppUser {
  id: string;
  nombreCompleto: string;
  email: string;
  isAdmin: boolean;
  activo: boolean;
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
