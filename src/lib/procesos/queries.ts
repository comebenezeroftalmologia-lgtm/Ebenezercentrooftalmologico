import { createServiceClient } from "@/lib/supabase/server";
import type { Modulo } from "@/lib/modulos";
import type {
  Actividad,
  AppUser,
  Area,
  AreaAsignacion,
  KpisTareas,
  Proceso,
  Tarea,
  TareaRelacionada,
} from "@/lib/procesos/types";

const AREA_SIAU_NOMBRE = "AtenciÃ³n al Usuario (SIAU)";
let siauSeedPromise: Promise<void> | null = null;

/**
 * Garantiza de forma idempotente que exista el Ã¡rea "AtenciÃ³n al Usuario (SIAU)"
 * y que tenga asignado a Pedro Herrera (o el administrador activo) como lÃ­der.
 */
async function ensureAreaSiauSeeded(): Promise<void> {
  if (siauSeedPromise) return siauSeedPromise;
  siauSeedPromise = (async () => {
    try {
      const admin = createServiceClient();
      const { data: allAreas } = await admin.from("areas").select("id, nombre");
      let siau = (allAreas ?? []).find(
        (a) =>
          a.nombre.toLowerCase() === AREA_SIAU_NOMBRE.toLowerCase() ||
          a.nombre.toLowerCase().includes("siau")
      );

      if (!siau) {
        const { data: inserted } = await admin
          .from("areas")
          .upsert({ nombre: AREA_SIAU_NOMBRE }, { onConflict: "nombre" })
          .select("id, nombre")
          .single();
        if (inserted) siau = inserted;
      }

      if (siau) {
        const { data: lideres } = await admin
          .from("area_asignaciones")
          .select("id")
          .eq("area_id", siau.id)
          .eq("rol", "lider");

        if (!lideres || lideres.length === 0) {
          const { data: pedro } = await admin
            .from("app_users")
            .select("id")
            .ilike("nombre_completo", "%pedro%")
            .eq("activo", true)
            .limit(1)
            .maybeSingle();

          let targetUserId = pedro?.id;
          if (!targetUserId) {
            const { data: fallbackAdmin } = await admin
              .from("app_users")
              .select("id")
              .eq("is_admin", true)
              .eq("activo", true)
              .limit(1)
              .maybeSingle();
            targetUserId = fallbackAdmin?.id;
          }

          if (targetUserId) {
            await admin.from("area_asignaciones").upsert(
              {
                area_id: siau.id,
                user_id: targetUserId,
                rol: "lider",
                asignado_por: targetUserId,
              },
              { onConflict: "area_id,user_id" }
            );
          }
        }
      }
    } catch {
      siauSeedPromise = null;
    }
  })();
  return siauSeedPromise;
}

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
  await ensureAreaSiauSeeded();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("areas").select("id, nombre").order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, nombre: r.nombre }));
}

export async function getArea(areaId: string): Promise<Area | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, nombre")
    .eq("id", areaId)
    .single();
  if (error || !data) return null;
  return { id: data.id, nombre: data.nombre };
}

export async function listAppUsers(): Promise<AppUser[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, nombre_completo, email, is_admin, activo")
    .order("nombre_completo");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAppUser);
}

export async function listModuloAccesosPorUsuario(): Promise<Record<string, Modulo[]>> {
  const supabase = createServiceClient();
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
  await ensureAreaSiauSeeded();
  const supabase = createServiceClient();
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

export async function listTodasLasAsignaciones(): Promise<AreaAsignacion[]> {
  await ensureAreaSiauSeeded();
  const supabase = createServiceClient();
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
  const supabase = createServiceClient();
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
  const supabase = createServiceClient();
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
  const supabase = createServiceClient();
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
  const supabase = createServiceClient();
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

function mapTareaKpiFields(row: any) {
  return {
    altoRiesgo: row.alto_riesgo ?? false,
    slaHoras: row.sla_horas ?? null,
    iniciadoAt: row.iniciado_at ?? null,
    completadoAt: row.completado_at ?? null,
    rechazadaAt: row.rechazada_at ?? null,
    vecesRechazada: row.veces_rechazada ?? 0,
  };
}

export async function listTareasPorActividad(actividadId: string): Promise<Tarea[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(
      "id, actividad_id, nombre, descripcion, responsable_user_id, resultado, impacto_paciente, estado, orden, alto_riesgo, sla_horas, iniciado_at, completado_at, rechazada_at, veces_rechazada, app_users!tareas_responsable_user_id_fkey(id, nombre_completo, email, is_admin, activo)"
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
    ...mapTareaKpiFields(row),
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
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(
      "id, actividad_id, nombre, descripcion, responsable_user_id, resultado, impacto_paciente, estado, orden, alto_riesgo, sla_horas, iniciado_at, completado_at, rechazada_at, veces_rechazada, app_users!tareas_responsable_user_id_fkey(id, nombre_completo, email, is_admin, activo), actividades(nombre, proceso_id, procesos(nombre, area_id, areas(nombre)))"
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
    ...mapTareaKpiFields(row),
    actividadNombre: row.actividades?.nombre ?? "",
    procesoId: row.actividades?.proceso_id ?? "",
    procesoNombre: row.actividades?.procesos?.nombre ?? "",
    areaId: row.actividades?.procesos?.area_id ?? "",
    areaNombre: row.actividades?.procesos?.areas?.nombre ?? "",
  };
}

export async function listRelacionesDeTarea(tareaId: string): Promise<TareaRelacionada[]> {
  const supabase = createServiceClient();
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

export async function buscarTareas(
  query: string,
  excluirTareaId?: string
): Promise<{ id: string; nombre: string; procesoNombre: string; areaNombre: string }[]> {
  if (query.trim().length < 2) return [];
  const supabase = createServiceClient();
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
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(
      "id, actividad_id, nombre, descripcion, responsable_user_id, resultado, impacto_paciente, estado, orden, " +
        "alto_riesgo, sla_horas, iniciado_at, completado_at, rechazada_at, veces_rechazada, " +
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
    ...mapTareaKpiFields(row),
    actividadNombre: row.actividades?.nombre ?? "",
    procesoNombre: row.actividades?.procesos?.nombre ?? "",
    areaNombre: row.actividades?.procesos?.areas?.nombre ?? "",
  }));
}

// --- KPIs -----------------------------------------------------------

interface TareaParaKpi {
  areaId: string;
  estado: string;
  altoRiesgo: boolean;
  slaHoras: number | null;
  iniciadoAt: string | null;
  completadoAt: string | null;
  vecesRechazada: number;
}

function calcularKpis(tareas: TareaParaKpi[]): KpisTareas {
  const total = tareas.length;
  const activas = tareas.filter((t) => t.estado === "pendiente" || t.estado === "en_progreso").length;
  const completadas = tareas.filter((t) => t.estado === "completada").length;
  const rechazadas = tareas.filter((t) => t.vecesRechazada > 0).length;

  const altoRiesgo = tareas.filter((t) => t.altoRiesgo);
  const altoRiesgoMitigado = altoRiesgo.filter((t) => t.estado === "completada").length;

  const conSla = tareas.filter((t) => t.slaHoras != null && t.iniciadoAt && t.completadoAt);
  const cumplenSla = conSla.filter((t) => {
    const horas = (new Date(t.completadoAt!).getTime() - new Date(t.iniciadoAt!).getTime()) / 3_600_000;
    return horas <= (t.slaHoras as number);
  }).length;

  const conCiclo = tareas.filter((t) => t.iniciadoAt && t.completadoAt);
  const horasCiclo = conCiclo.map(
    (t) => (new Date(t.completadoAt!).getTime() - new Date(t.iniciadoAt!).getTime()) / 3_600_000
  );

  return {
    totalTareas: total,
    activas,
    completadas,
    rechazadas,
    altoRiesgoTotal: altoRiesgo.length,
    altoRiesgoMitigado,
    pctAltoRiesgoMitigado: altoRiesgo.length > 0 ? (altoRiesgoMitigado / altoRiesgo.length) * 100 : null,
    conSla: conSla.length,
    cumplenSla,
    pctCumplimientoSla: conSla.length > 0 ? (cumplenSla / conSla.length) * 100 : null,
    tasaRetrabajo: total > 0 ? (rechazadas / total) * 100 : null,
    conCiclo: conCiclo.length,
    tiempoCicloPromedioHoras:
      conCiclo.length > 0 ? horasCiclo.reduce((a, b) => a + b, 0) / conCiclo.length : null,
  };
}

async function listTareasParaKpis(): Promise<TareaParaKpi[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tareas")
    .select(
      "estado, alto_riesgo, sla_horas, iniciado_at, completado_at, veces_rechazada, actividades(procesos(area_id))"
    );
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    areaId: row.actividades?.procesos?.area_id ?? "",
    estado: row.estado,
    altoRiesgo: row.alto_riesgo ?? false,
    slaHoras: row.sla_horas ?? null,
    iniciadoAt: row.iniciado_at ?? null,
    completadoAt: row.completado_at ?? null,
    vecesRechazada: row.veces_rechazada ?? 0,
  }));
}

export async function getKpisPorArea(areaId: string): Promise<KpisTareas> {
  const tareas = await listTareasParaKpis();
  return calcularKpis(tareas.filter((t) => t.areaId === areaId));
}

export async function getKpisPorTodasLasAreas(): Promise<Map<string, KpisTareas>> {
  const [tareas, areas] = await Promise.all([listTareasParaKpis(), listAreas()]);
  const porArea = new Map<string, TareaParaKpi[]>();
  for (const t of tareas) {
    if (!t.areaId) continue;
    if (!porArea.has(t.areaId)) porArea.set(t.areaId, []);
    porArea.get(t.areaId)!.push(t);
  }
  const resultado = new Map<string, KpisTareas>();
  for (const area of areas) {
    const tareasDelArea = porArea.get(area.id) ?? [];
    resultado.set(area.id, calcularKpis(tareasDelArea));
  }
  return resultado;
}