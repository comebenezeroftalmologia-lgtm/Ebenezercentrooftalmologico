"use server";

import { revalidatePath } from "next/cache";
import { requireGestorUsuarios } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ejecutarEliminacion, TABLAS_ELIMINABLES, type TipoEliminable } from "@/lib/solicitudes-eliminacion";
import type { AppUser } from "@/lib/procesos/types";

type Res = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Carga la solicitud y comprueba que `user` puede resolverla: un administrador,
 * el autorizador asignado o el líder actual del solicitante. */
async function cargarResoluble(user: AppUser, id: string) {
  if (!UUID.test(id)) return { error: "Solicitud no válida." as const };
  const admin = createServiceClient();
  const { data: sol } = await admin
    .from("solicitudes_eliminacion")
    .select("id, tipo, entidad_id, estado, autorizador_id, solicitante_id")
    .eq("id", id)
    .maybeSingle();
  if (!sol) return { error: "No se encontró la solicitud." as const };
  if (sol.estado !== "pendiente") return { error: "Esta solicitud ya fue resuelta." as const };

  let permitido = user.isAdmin || sol.autorizador_id === user.id;
  if (!permitido) {
    const { data: solicitante } = await admin
      .from("app_users")
      .select("lider_id")
      .eq("id", sol.solicitante_id)
      .maybeSingle();
    permitido = solicitante?.lider_id === user.id;
  }
  if (!permitido) return { error: "No tienes permiso para resolver esta solicitud." as const };
  return { sol, admin };
}

export async function aprobarSolicitudEliminacionAction(id: string): Promise<Res> {
  const user = await requireGestorUsuarios();
  const r = await cargarResoluble(user, id);
  if (!r.sol || !r.admin) return { ok: false, error: r.error ?? "No se pudo cargar la solicitud." };
  const { sol, admin } = r;

  if (!(sol.tipo in TABLAS_ELIMINABLES)) return { ok: false, error: "Tipo de solicitud no soportado." };
  let existia = true;
  try {
    existia = await ejecutarEliminacion(sol.tipo as TipoEliminable, sol.entidad_id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo eliminar." };
  }

  await admin
    .from("solicitudes_eliminacion")
    .update({
      estado: "aprobada",
      resuelta_por: user.id,
      resuelta_at: new Date().toISOString(),
      nota_resolucion: existia ? null : "El elemento ya no existía.",
    })
    .eq("id", id);

  revalidatePath("/usuarios");
  revalidatePath("/proyectos", "layout");
  return { ok: true };
}

export async function rechazarSolicitudEliminacionAction(id: string, nota: string): Promise<Res> {
  const user = await requireGestorUsuarios();
  const r = await cargarResoluble(user, id);
  if (!r.sol || !r.admin) return { ok: false, error: r.error ?? "No se pudo cargar la solicitud." };

  const { error } = await r.admin
    .from("solicitudes_eliminacion")
    .update({
      estado: "rechazada",
      resuelta_por: user.id,
      resuelta_at: new Date().toISOString(),
      nota_resolucion: nota.trim().slice(0, 500) || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/usuarios");
  return { ok: true };
}
