import { redirect } from "next/navigation";
import { createSessionServerClient } from "@/lib/supabase/server";
import type { AppUser, Rol } from "@/lib/procesos/types";
import type { Modulo } from "@/lib/modulos";

/** Perfil del usuario autenticado actual, o null si no hay sesión. Lee
 * de app_users a través del cliente de sesión (RLS ya limita cada quien
 * a ver su propia fila, salvo admins que ven todas). Compartido por
 * todo el sitio: el dashboard de mercadeo y /procesos usan el mismo
 * login y la misma tabla de usuarios. */
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
 * protege todo el sitio salvo /login, esto es una segunda capa de
 * defensa) y devuelve el perfil. */
export async function requireAppUser(): Promise<AppUser> {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireAppUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

/** Módulos del dashboard de mercadeo a los que el usuario tiene acceso
 * — un admin los tiene todos implícitamente, sin fila en la tabla. */
export async function getMisModulos(userId: string, isAdmin: boolean): Promise<Set<Modulo>> {
  if (isAdmin) {
    const { MODULOS } = await import("@/lib/modulos");
    return new Set(MODULOS.map((m) => m.slug));
  }
  const supabase = createSessionServerClient();
  const { data, error } = await supabase.from("modulo_accesos").select("modulo").eq("user_id", userId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.modulo as Modulo));
}

/** Para el top de cada página de módulo del dashboard de mercadeo:
 * exige sesión Y acceso a ese módulo específico (o ser admin). */
export async function requireModuloAccess(modulo: Modulo): Promise<AppUser> {
  const user = await requireAppUser();
  if (user.isAdmin) return user;
  const modulos = await getMisModulos(user.id, false);
  if (!modulos.has(modulo)) redirect("/");
  return user;
}

/** Áreas del módulo de Procesos donde el usuario tiene alguna
 * asignación, con su rol en cada una. Un admin no necesariamente tiene
 * asignaciones — ve todo por fuera de esto. */
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
