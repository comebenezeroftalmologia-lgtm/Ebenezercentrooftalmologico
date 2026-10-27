import { createServiceClient } from "@/lib/supabase/server";
import { INFO_TIPO, TIPOS_NOTIFICACION, type TipoNotificacion } from "@/lib/notificaciones/tipos";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string | null;
  url: string | null;
  actorNombre: string | null;
  contador: number;
  leida: boolean;
  createdAt: string;
}

export async function listNotificaciones(userId: string, limite = 100): Promise<Notificacion[]> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("notificaciones")
    .select("id, tipo, titulo, cuerpo, url, actor_nombre, contador, leida_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limite);
  // Si la migración 022 aún no corrió, la tabla no existe.
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    tipo: r.tipo as TipoNotificacion,
    titulo: r.titulo,
    cuerpo: r.cuerpo,
    url: r.url,
    actorNombre: r.actor_nombre,
    contador: r.contador ?? 1,
    leida: !!r.leida_at,
    createdAt: r.created_at,
  }));
}

export async function contarSinLeer(userId: string): Promise<number> {
  const admin = createServiceClient();
  const { count, error } = await admin
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("leida_at", null);
  return error ? 0 : count ?? 0;
}

export type PreferenciasNotificacion = Record<TipoNotificacion, { enApp: boolean; email: boolean }>;

/** Preferencias de la persona, con los valores por defecto donde aún no eligió. */
export async function getPreferencias(userId: string): Promise<PreferenciasNotificacion> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("notificacion_preferencias")
    .select("tipo, en_app, email")
    .eq("user_id", userId);
  const guardadas = new Map((data ?? []).map((r) => [r.tipo as string, r]));
  const res = {} as PreferenciasNotificacion;
  for (const tipo of TIPOS_NOTIFICACION) {
    const g = guardadas.get(tipo);
    res[tipo] = g ? { enApp: g.en_app, email: g.email } : { ...INFO_TIPO[tipo].porDefecto };
  }
  return res;
}
