import { createSessionServerClient } from "@/lib/supabase/server";
import type { Modulo } from "@/lib/modulos";
import type {
  Actividad,
  AppUser,
  Area,
  AreaAsignacion,
  Proceso,
  Tarea,
  TareaRelacionada,
} from "@/lib/procesos/types";

function mapAppUser(row: any): AppUser {
  return {
    id: row.id,
    nombreCompleto: row.nombre_completo,
    email: row.email,
    isAdmin: row.is_admin,
    activo: row.activo,
  };
}

export async function listAreas(): Promise<Area[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase.from("areas").select("id, nombre").order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, nombre: r.nombre }));
}

export async function getArea(areaId: string): Promise<Area | null> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, nombre")
    .eq("id", areaId)
    .single();
  if (error || !data) return null;
  return { id: data.id, nombre: data.nombre };
}

export async function listAppUsers(): Promise<AppUser[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, nombre_completo, email, is_admin, activo")
    .order("nombre_completo");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAppUser);
}

export async function listModuloAccesosPorUsuario(): Promise<Record<string, Modulo[]>> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase.from("modulo_accesos").select("user_id, modulo");
  if (error) throw new Error(error.message);
  const map: Record<string, Modulo[]> = {};
  for (const row of data ?? []) {
    const uid = (row as { user_id: string }).user_id;
    const modulo = (row as { modulo: Modulo }).modulo;
    if (!map[uid]) map[uid] = [];
    map[uid].push(modulo);
  }
  return map;
}

export async function listAsignacionesPorArea(areaId: string): Promise<AreaAsignacion[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("area_asignaciones")
    .select(
      "id, area_id, user_id, rol, app_users!area_asignaciones_user_id_fkey(id, nombre_completo, email, is_admin, activo)"
    )
    .eq("area_id", areaId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    areaId: row.area_id,
    userId: row.user_id,
    rol: row.rol,
    usuario: mapAppUser(row.app_users),
  }));
}

/** Todas las asignaciones del sistema, para construir el organigrama
 * completo (áreas × líder/colaboradores) en una sola consulta. */
export async function listTodasLasAsignaciones(): Promise<AreaAsignacion[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("area_asignaciones")
    .select(
      "id, area_id, user_id, rol, app_users!area_asignaciones_user_id_fkey(id, nombre_completo, email, is_admin, activo)"
    );
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    areaId: row.area_id,
    userId: row.user_id,
    rol: row.rol,
    usuario: mapAppUser(row.app_users),
  }));
}

export async function listProcesosPorArea(areaId: string): Promise<Proceso[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("procesos")
    .select("id, area_id, nombre, descripcion, created_at")
    .eq("area_id", areaId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    areaId: r.area_id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    createdAt: r.created_at,
  }));
}

export async function getProceso(
  procesoId: string
): Promise<(Proceso & { areaNombre: string }) | null> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("procesos")
    .select("id, area_id, nombre, descripcion, created_at, areas(nombre)")
    .eq("id", procesoId)
    .single();
  if (error || !data) return null;
  const row: any = data;
  return {
    id: row.id,
    areaId: row.area_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    createdAt: row.created_at,
    areaNombre: row.areas?.nombre ?? "",
  };
}

export async function listActividadesPorProceso(procesoId: string): Promise<Actividad[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("actividades")
    .select("id, proceso_id, nombre, descripcion, orden")
    .eq("proceso_id", procesoId)
    .order("orden");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    procesoId: r.proceso_id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    orden: r.orden,
  }));
}

export async function getActividad(
  actividadId: string
): Promise<(Actividad & { procesoNombre: string; areaId: string; areaNombre: string }) | null> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("actividades")
    .select("id, proceso_id, nombre, descripcion, orden, procesos(nombre, area_id, areas(nombre))")
    .eq("id", actividadId)
    .single();
  if (error || !data) return null;
  const row: any = data;
  return {
    id: row.id,
    procesoId: row.proceso_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    orden: row.orden,
    procesoNombre: row.procesos?.nombre ?? "",
    areaId: row.procesos?.area_id ?? "",
    areaNombre: row.procesos?.areas?.nombre ?? "",
  };
}

export async function listTareasPorActividad(actividadId: string): Promise<Tarea[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(
      "id, actividad_id, nombre, descripcion, responsable_user_id, resultado, impacto_paciente, estado, orden, app_users!tareas_responsable_user_id_fkey(id, nombre_completo, email, is_admin, activo)"
    )
    .eq("actividad_id", actividadId)
    .order("orden");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    actividadId: row.actividad_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    responsableUserId: row.responsable_user_id,
    responsable: row.app_users ? mapAppUser(row.app_users) : null,
    resultado: row.resultado,
    impactoPaciente: row.impacto_paciente,
    estado: row.estado,
    orden: row.orden,
  }));
}

export async function getTarea(tareaId: string): Promise<
  | (Tarea & {
      actividadNombre: string;
      procesoId: string;
      procesoNombre: string;
      areaId: string;
      areaNombre: string;
    })
  | null
> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(
      "id, actividad_id, nombre, descripcion, responsable_user_id, resultado, impacto_paciente, estado, orden, app_users!tareas_responsable_user_id_fkey(id, nombre_completo, email, is_admin, activo), actividades(nombre, proceso_id, procesos(nombre, area_id, areas(nombre)))"
    )
    .eq("id", tareaId)
    .single();
  if (error || !data) return null;
  const row: any = data;
  return {
    id: row.id,
    actividadId: row.actividad_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    responsableUserId: row.responsable_user_id,
    responsable: row.app_users ? mapAppUser(row.app_users) : null,
    resultado: row.resultado,
    impactoPaciente: row.impacto_paciente,
    estado: row.estado,
    orden: row.orden,
    actividadNombre: row.actividades?.nombre ?? "",
    procesoId: row.actividades?.proceso_id ?? "",
    procesoNombre: row.actividades?.procesos?.nombre ?? "",
    areaId: row.actividades?.procesos?.area_id ?? "",
    areaNombre: row.actividades?.procesos?.areas?.nombre ?? "",
  };
}

export async function listRelacionesDeTarea(tareaId: string): Promise<TareaRelacionada[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("tarea_relaciones")
    .select(
      "id, nota, tarea_id, tarea_relacionada_id, " +
        "origen:tareas!tarea_relaciones_tarea_id_fkey(id, nombre, actividades(nombre, procesos(nombre, areas(nombre)))), " +
        "destino:tareas!tarea_relaciones_tarea_relacionada_id_fkey(id, nombre, actividades(nombre, procesos(nombre, areas(nombre))))"
    )
    .or(`tarea_id.eq.${tareaId},tarea_relacionada_id.eq.${tareaId}`);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const esOrigen = row.tarea_id === tareaId;
    const otra = esOrigen ? row.destino : row.origen;
    return {
      relacionId: row.id,
      nota: row.nota,
      tarea: {
        id: otra.id,
        nombre: otra.nombre,
        actividadNombre: otra.actividades?.nombre ?? "",
        procesoNombre: otra.actividades?.procesos?.nombre ?? "",
        areaNombre: otra.actividades?.procesos?.areas?.nombre ?? "",
      },
    };
  });
}

/** Búsqueda de tareas por nombre, para el buscador de "relacionar con
 * tarea de otra área" — trae de cualquier área (la lectura de tareas es
 * abierta a todo autenticado, ver migración 006). */
export async function buscarTareas(
  query: string,
  excluirTareaId?: string
): Promise<{ id: string; nombre: string; procesoNombre: string; areaNombre: string }[]> {
  if (query.trim().length < 2) return [];
  const supabase = createSessionServerClient();
  let q = supabase
    .from("tareas")
    .select("id, nombre, actividades(procesos(nombre, areas(nombre)))")
    .ilike("nombre", `%${query.trim()}%`);
  if (excluirTareaId) q = q.neq("id", excluirTareaId);
  const { data, error } = await q.limit(15);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    nombre: row.nombre,
    procesoNombre: row.actividades?.procesos?.nombre ?? "",
    areaNombre: row.actividades?.procesos?.areas?.nombre ?? "",
  }));
}

export async function listMisTareas(userId: string): Promise<
  (Tarea & { actividadNombre: string; procesoNombre: string; areaNombre: string })[]
> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(
      "id, actividad_id, nombre, descripcion, responsable_user_id, resultado, impacto_paciente, estado, orden, " +
        "actividades(nombre, procesos(nombre, areas(nombre)))"
    )
    .eq("responsable_user_id", userId)
    .order("estado")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    actividadId: row.actividad_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    responsableUserId: row.responsable_user_id,
    responsable: null,
    resultado: row.resultado,
    impactoPaciente: row.impacto_paciente,
    estado: row.estado,
    orden: row.orden,
    actividadNombre: row.actividades?.nombre ?? "",
    procesoNombre: row.actividades?.procesos?.nombre ?? "",
    areaNombre: row.actividades?.procesos?.areas?.nombre ?? "",
  }));
}
