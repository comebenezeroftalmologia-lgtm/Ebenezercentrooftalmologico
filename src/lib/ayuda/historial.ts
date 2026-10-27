import type { createServiceClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/procesos/types";

export type AccionHistorial =
  | "subida"
  | "edicion"
  | "publicacion"
  | "vuelta_a_borrador"
  | "obsoleto"
  | "obsoleto_por_nueva_version"
  | "eliminacion"
  | "permiso_gestor_otorgado"
  | "permiso_gestor_retirado";

export const ACCION_LABEL: Record<AccionHistorial, string> = {
  subida: "Subió un documento (borrador)",
  edicion: "Editó los datos",
  publicacion: "Publicó",
  vuelta_a_borrador: "Devolvió a borrador",
  obsoleto: "Marcó como obsoleto",
  obsoleto_por_nueva_version: "Quedó obsoleto por una versión nueva",
  eliminacion: "Eliminó el documento",
  permiso_gestor_otorgado: "Dio permiso de gestor",
  permiso_gestor_retirado: "Retiró el permiso de gestor",
};

/** Agrega una fila al historial (solo se puede insertar; la base impide editarlo o borrarlo).
 * Devuelve el mensaje de error si no se pudo registrar. */
export async function registrarHistorial(
  admin: ReturnType<typeof createServiceClient>,
  actor: Pick<AppUser, "id" | "nombreCompleto" | "email">,
  evento: {
    accion: AccionHistorial;
    documento?: { id: string; titulo: string | null; codigo: string | null; version: string | null } | null;
    detalle?: Record<string, unknown>;
  }
): Promise<string | null> {
  const { error } = await admin.from("conocimiento_historial").insert({
    accion: evento.accion,
    documento_id: evento.documento?.id ?? null,
    documento_titulo: evento.documento?.titulo ?? null,
    documento_codigo: evento.documento?.codigo ?? null,
    documento_version: evento.documento?.version ?? null,
    usuario_id: actor.id,
    usuario_nombre: actor.nombreCompleto,
    usuario_email: actor.email,
    detalle: evento.detalle ?? {},
  });
  return error ? error.message : null;
}
