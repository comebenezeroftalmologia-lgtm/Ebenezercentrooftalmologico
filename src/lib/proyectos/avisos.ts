import { createServiceClient } from "@/lib/supabase/server";
import { notificar } from "@/lib/notificaciones/notificar";
import type { AppUser } from "@/lib/procesos/types";

/** Avisos del módulo Tareas. Todo con llave de servicio y sin lanzar errores:
 * una notificación que falla nunca debe romper la acción que la originó. */

type Actor = Pick<AppUser, "id" | "nombreCompleto">;

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const actorDe = (a: Actor) => ({ id: a.id, nombre: a.nombreCompleto });
const urlTarea = (id: string) => `/proyectos/tarea/${id}`;
const recorte = (t: string, n = 160) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);

export function fechaLegible(iso: string | null | undefined): string {
  if (!iso) return "sin fecha";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

async function contextoTarea(tareaId: string) {
  const admin = createServiceClient();
  const [{ data: tarea }, { data: asig }] = await Promise.all([
    admin.from("proy_tareas").select("id, nombre, created_by, espacio_id").eq("id", tareaId).maybeSingle(),
    admin.from("proy_tarea_asignados").select("user_id").eq("tarea_id", tareaId),
  ]);
  if (!tarea) return null;
  return {
    admin,
    tarea: tarea as { id: string; nombre: string; created_by: string | null; espacio_id: string },
    asignados: (asig ?? []).map((a) => a.user_id as string),
  };
}

export async function avisarAsignacion(actor: Actor, tareaId: string, userIds: string[]) {
  try {
    if (userIds.length === 0) return;
    const ctx = await contextoTarea(tareaId);
    if (!ctx) return;
    await notificar(userIds, {
      tipo: "tarea_asignada",
      titulo: `${actor.nombreCompleto} te asignó una tarea`,
      cuerpo: ctx.tarea.nombre,
      url: urlTarea(tareaId),
      actor: actorDe(actor),
      entidadId: tareaId,
    });
  } catch (e) {
    console.error("[avisos] asignacion", e);
  }
}

export async function avisarComentario(actor: Actor, tareaId: string, texto: string, mencionesIn: unknown) {
  try {
    const ctx = await contextoTarea(tareaId);
    if (!ctx) return;

    // Menciones válidas: miembros del espacio cuyo @nombre sigue en el texto.
    const candidatos = Array.isArray(mencionesIn) ? mencionesIn.filter((u): u is string => typeof u === "string" && UUID.test(u)) : [];
    let menciones: string[] = [];
    if (candidatos.length > 0) {
      const { data: miembros } = await ctx.admin
        .from("proy_espacio_miembros")
        .select("user_id, app_users(nombre_completo)")
        .eq("espacio_id", ctx.tarea.espacio_id)
        .in("user_id", candidatos);
      menciones = (miembros ?? [])
        .filter((m: any) => m.app_users?.nombre_completo && texto.includes("@" + m.app_users.nombre_completo))
        .map((m: any) => m.user_id as string);
    }

    if (menciones.length > 0) {
      await notificar(menciones, {
        tipo: "mencion",
        titulo: `${actor.nombreCompleto} te mencionó en «${recorte(ctx.tarea.nombre, 80)}»`,
        cuerpo: recorte(texto),
        url: urlTarea(tareaId),
        actor: actorDe(actor),
        entidadId: tareaId,
      });
    }

    const interesados = [ctx.tarea.created_by, ...ctx.asignados].filter((u): u is string => !!u && !menciones.includes(u));
    await notificar(interesados, {
      tipo: "comentario_tarea",
      titulo: `${actor.nombreCompleto} comentó en «${recorte(ctx.tarea.nombre, 80)}»`,
      cuerpo: recorte(texto),
      url: urlTarea(tareaId),
      actor: actorDe(actor),
      entidadId: tareaId,
      agrupar: true,
    });
  } catch (e) {
    console.error("[avisos] comentario", e);
  }
}

export async function avisarCambioTarea(actor: Actor, tareaId: string, resumen: string) {
  try {
    if (!resumen) return;
    const ctx = await contextoTarea(tareaId);
    if (!ctx) return;
    const interesados = [ctx.tarea.created_by, ...ctx.asignados];
    await notificar(interesados, {
      tipo: "cambio_tarea",
      titulo: `${actor.nombreCompleto} actualizó «${recorte(ctx.tarea.nombre, 80)}»`,
      cuerpo: resumen,
      url: urlTarea(tareaId),
      actor: actorDe(actor),
      entidadId: tareaId,
      agrupar: true,
    });
  } catch (e) {
    console.error("[avisos] cambio", e);
  }
}

export async function avisarEspacioCompartido(actor: Actor, espacioId: string, userId: string) {
  try {
    const admin = createServiceClient();
    const { data: esp } = await admin.from("proy_espacios").select("nombre").eq("id", espacioId).maybeSingle();
    if (!esp) return;
    await notificar([userId], {
      tipo: "espacio_compartido",
      titulo: `${actor.nombreCompleto} te compartió el espacio «${esp.nombre}»`,
      url: `/proyectos/espacio/${espacioId}`,
      actor: actorDe(actor),
      entidadId: espacioId,
    });
  } catch (e) {
    console.error("[avisos] espacio", e);
  }
}

export async function nombreEstado(estadoId: string): Promise<string> {
  const admin = createServiceClient();
  const { data } = await admin.from("proy_estados").select("nombre").eq("id", estadoId).maybeSingle();
  return data?.nombre ?? "otro estado";
}
