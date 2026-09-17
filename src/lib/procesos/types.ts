export type Rol = "lider" | "colaborador";
export type EstadoTarea = "pendiente" | "en_progreso" | "completada";

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
};
