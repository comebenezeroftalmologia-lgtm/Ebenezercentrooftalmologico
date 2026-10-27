import { cache } from "react";
import { redirect } from "next/navigation";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import { MODULOS, type Modulo } from "@/lib/modulos";
import type { AppUser, Rol, RolPlataforma } from "@/lib/procesos/types";

export const getCurrentAppUser = cache(async (): Promise<AppUser | null> => {
  const supabase = createSessionServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userId = session?.user?.id;
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  }
  if (!userId) return null;

  const admin = createServiceClient();
  let { data, error } = (await admin
    .from("app_users")
    .select("id, nombre_completo, email, is_admin, rol, lider_id, activo")
    .eq("id", userId)
    .single()) as { data: any; error: any };

  // Si la migración 019 (roles) aún no se ha corrido, las columnas nuevas no
  // existen: se cae al esquema anterior en vez de sacar a todos de la plataforma.
  if (error && /rol|lider_id/.test(String(error.message))) {
    const legacy = await admin
      .from("app_users")
      .select("id, nombre_completo, email, is_admin, activo")
      .eq("id", userId)
      .single();
    data = legacy.data;
    error = legacy.error;
  }

  if (error || !data) return null;

  const rol: RolPlataforma = data.rol ?? (data.is_admin ? "administrador" : "usuario_basico");

  return {
    id: data.id,
    nombreCompleto: data.nombre_completo,
    email: data.email,
    isAdmin: data.is_admin,
    rol,
    liderId: data.lider_id ?? null,
    activo: data.activo,
  };
});

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

/** Solo el rol Desarrollador (cambia roles de administradores, bandeja de fallas, config técnica). */
export async function requireDesarrollador(): Promise<AppUser> {
  const user = await requireAppUser();
  if (user.rol !== "desarrollador") redirect("/");
  return user;
}

/** ¿Puede entrar a /usuarios? Desarrollador, administrador y líder. */
export function puedeGestionarUsuarios(user: Pick<AppUser, "rol">): boolean {
  return user.rol === "desarrollador" || user.rol === "administrador" || user.rol === "lider";
}

export async function requireGestorUsuarios(): Promise<AppUser> {
  const user = await requireAppUser();
  if (!puedeGestionarUsuarios(user)) redirect("/");
  return user;
}

/** Roles que `actor` puede asignar al invitar o editar a otra persona. */
export function rolesAsignables(actor: Pick<AppUser, "rol">): RolPlataforma[] {
  if (actor.rol === "desarrollador") return ["desarrollador", "administrador", "lider", "usuario_basico"];
  if (actor.rol === "administrador") return ["lider", "usuario_basico"];
  if (actor.rol === "lider") return ["usuario_basico"];
  return [];
}

/** ¿Puede `actor` editar, desactivar o restablecer la contraseña de `objetivo`? */
export function puedeAdministrarA(
  actor: Pick<AppUser, "id" | "rol">,
  objetivo: Pick<AppUser, "id" | "rol" | "liderId">
): boolean {
  if (actor.rol === "desarrollador") return true;
  if (actor.rol === "administrador") return objetivo.rol === "lider" || objetivo.rol === "usuario_basico";
  if (actor.rol === "lider") return objetivo.rol === "usuario_basico" && objetivo.liderId === actor.id;
  return false;
}

/** Cargar un usuario por id (sin filtrar por sesión) para validar permisos sobre él. */
export async function getAppUserById(id: string): Promise<AppUser | null> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("app_users")
    .select("id, nombre_completo, email, is_admin, rol, lider_id, activo")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    nombreCompleto: data.nombre_completo,
    email: data.email,
    isAdmin: data.is_admin,
    rol: (data.rol ?? (data.is_admin ? "administrador" : "usuario_basico")) as RolPlataforma,
    liderId: data.lider_id ?? null,
    activo: data.activo,
  };
}

export const getMisModulos = cache(async (userId: string, isAdmin: boolean): Promise<Set<Modulo>> => {
  if (isAdmin) {
    return new Set(MODULOS.map((m) => m.slug));
  }
  const admin = createServiceClient();
  const { data, error } = await admin.from("modulo_accesos").select("modulo").eq("user_id", userId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.modulo as Modulo));
});

export async function requireModuloAccess(modulo: Modulo): Promise<AppUser> {
  const user = await requireAppUser();
  if (user.isAdmin) return user;
  const modulos = await getMisModulos(user.id, false);
  if (!modulos.has(modulo)) redirect("/");
  return user;
}

export const getMisAsignaciones = cache(
  async (userId: string): Promise<{ areaId: string; areaNombre: string; rol: Rol }[]> => {
    const supabase = createServiceClient();
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
);