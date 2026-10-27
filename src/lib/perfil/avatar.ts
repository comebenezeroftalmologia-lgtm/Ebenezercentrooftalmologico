import { createServiceClient } from "@/lib/supabase/server";

export const BUCKET_AVATARES = "avatares";

/** Versión de la foto (para romper la caché del navegador al cambiarla). null = sin foto. */
export async function getAvatarVersion(userId: string): Promise<string | null> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("app_users")
    .select("avatar_path, avatar_updated_at")
    .eq("id", userId)
    .maybeSingle();
  // Si la migración 023 aún no corrió, la columna no existe: sin foto.
  if (error || !data?.avatar_path) return null;
  return data.avatar_updated_at ? String(new Date(data.avatar_updated_at).getTime()) : "1";
}

/** Documentos publicados o actualizados desde la última visita al Centro de Conocimiento. */
export async function contarNovedadesAyuda(userId: string): Promise<number> {
  const admin = createServiceClient();
  const { data: u, error } = await admin.from("app_users").select("ayuda_visto_at").eq("id", userId).maybeSingle();
  if (error || !u) return 0;
  if (!u.ayuda_visto_at) {
    // Primera vez: se parte de cero para no mostrar todo el catálogo como "nuevo".
    await admin.from("app_users").update({ ayuda_visto_at: new Date().toISOString() }).eq("id", userId);
    return 0;
  }
  const { count } = await admin
    .from("conocimiento_documentos")
    .select("id", { count: "exact", head: true })
    .eq("estado", "publicado")
    .gt("updated_at", u.ayuda_visto_at);
  return count ?? 0;
}

export async function marcarAyudaVista(userId: string): Promise<void> {
  const admin = createServiceClient();
  await admin.from("app_users").update({ ayuda_visto_at: new Date().toISOString() }).eq("id", userId);
}
