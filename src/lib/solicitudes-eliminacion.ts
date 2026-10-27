import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import { BUCKET_ADJUNTOS } from "@/lib/proyectos/utils";
import { idsAutorizadores, notificar } from "@/lib/notificaciones/notificar";
import type { AppUser } from "@/lib/procesos/types";

/** Qué se puede eliminar con autorización del líder, y en qué tabla vive. */
export const TABLAS_ELIMINABLES = {
  espacio: "proy_espacios",
  carpeta: "proy_carpetas",
  lista: "proy_listas",
  doc: "proy_docs",
  tarea: "proy_tareas",
} as const;

export type TipoEliminable = keyof typeof TABLAS_ELIMINABLES;

export const TIPO_LABEL: Record<string, string> = {
  espacio: "Espacio",
  carpeta: "Carpeta",
  lista: "Lista",
  doc: "Documento",
  tarea: "Tarea",
};

export type RespuestaSolicitud = { ok: true; solicitada: true } | { ok: false; error: string };

/** Un Usuario Básico no borra: deja una solicitud para su líder (o, si no
 * tiene líder, para un administrador). La lee con su propia sesión, así que
 * solo puede pedir eliminar lo que ya puede ver. */
export async function solicitarEliminacion(
  user: AppUser,
  sb: ReturnType<typeof createSessionServerClient>,
  tipo: TipoEliminable,
  id: string
): Promise<RespuestaSolicitud> {
  const tabla = TABLAS_ELIMINABLES[tipo];
  const { data: entidad } = await sb.from(tabla).select("id, nombre").eq("id", id).maybeSingle();
  if (!entidad) return { ok: false, error: "No se encontró lo que quieres eliminar." };

  const admin = createServiceClient();
  const { data: previa } = await admin
    .from("solicitudes_eliminacion")
    .select("id")
    .eq("tipo", tipo)
    .eq("entidad_id", id)
    .eq("solicitante_id", user.id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (previa) return { ok: true, solicitada: true };

  const { error } = await admin.from("solicitudes_eliminacion").insert({
    tipo,
    entidad_id: id,
    entidad_nombre: String(entidad.nombre ?? "Sin nombre"),
    solicitante_id: user.id,
    autorizador_id: user.liderId,
  });
  if (error) return { ok: false, error: "No se pudo enviar la solicitud: " + error.message };

  await notificar(await idsAutorizadores(user.liderId), {
    tipo: "eliminacion_solicitud",
    titulo: `${user.nombreCompleto} pidió eliminar ${TIPO_LABEL[tipo]?.toLowerCase() ?? tipo}`,
    cuerpo: String(entidad.nombre ?? ""),
    url: "/usuarios",
    actor: { id: user.id, nombre: user.nombreCompleto },
  });
  return { ok: true, solicitada: true };
}

/** Borra de verdad (con llave de servicio) lo que se aprobó. Devuelve false si ya no existía. */
export async function ejecutarEliminacion(tipo: TipoEliminable, id: string): Promise<boolean> {
  const admin = createServiceClient();
  let rutas: string[] = [];
  if (tipo === "tarea") {
    const { data: subs } = await admin.from("proy_tareas").select("id").eq("parent_id", id);
    const ids = [id, ...(subs ?? []).map((s) => s.id as string)];
    const { data: adj } = await admin.from("proy_adjuntos").select("storage_path").in("tarea_id", ids);
    rutas = (adj ?? []).map((a) => a.storage_path as string);
  }
  const { data, error } = await admin.from(TABLAS_ELIMINABLES[tipo]).delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (rutas.length > 0) await admin.storage.from(BUCKET_ADJUNTOS).remove(rutas);
  return !!data && data.length > 0;
}
