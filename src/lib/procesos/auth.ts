import { redirect } from "next/navigation";
import { createSessionServerClient } from "@/lib/supabase/server";
import type { AppUser, Rol } from "@/lib/procesos/types";

/** El login pide "usuario" (no correo) — Supabase Auth necesita un
 * correo, así que internamente se arma uno sintético con este dominio.
 * Nunca se muestra al usuario ni se usa para enviar nada. */
export const PROCESOS_AUTH_DOMAIN = "procesos.ebenezer.local";

const USUARIO_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,48}[a-z0-9])?$/;

export function esUsuarioValido(usuario: string): boolean {
  return USUARIO_PATTERN.test(usuario);
}

export function usuarioToEmail(usuario: string): string {
  return `${usuario.trim().toLowerCase()}@${PROCESOS_AUTH_DOMAIN}`;
}

export function emailToUsuario(email: string): string {
  return email.endsWith(`@${PROCESOS_AUTH_DOMAIN}`)
    ? email.slice(0, -1 * (PROCESOS_AUTH_DOMAIN.length + 1))
    : email;
}

/** Perfil del usuario autenticado actual, o null si no hay sesión.
 * Lee de app_users a través del cliente de sesión (RLS ya limita cada
 * quien a ver su propia fila, salvo admins que ven todas). */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const supabase = createSessionServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_users")
    .select("id, nombre_completo, email, is_admin, activo")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    nombreCompleto: data.nombre_completo,
    email: data.email,
    isAdmin: data.is_admin,
    activo: data.activo,
  };
}

/** Para Server Components de página: exige sesión (el middleware ya
 * protege /procesos/**, esto es una segunda capa de defensa) y devuelve
 * el perfil. */
export async function requireAppUser(): Promise<AppUser> {
  const user = await getCurrentAppUser();
  if (!user) redirect("/procesos/login");
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireAppUser();
  if (!user.isAdmin) redirect("/procesos");
  return user;
}

/** Áreas donde el usuario tiene alguna asignación, con su rol en cada
 * una. Un admin no necesariamente tiene asignaciones — ve todo por
 * fuera de esto. */
export async function getMisAsignaciones(
  userId: string
): Promise<{ areaId: string; areaNombre: string; rol: Rol }[]> {
  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("area_asignaciones")
    .select("area_id, rol, areas(nombre)")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data.map((row: any) => ({
    areaId: row.area_id,
    areaNombre: row.areas?.nombre ?? "",
    rol: row.rol,
  }));
}
