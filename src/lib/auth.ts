import { cache } from "react";
import { redirect } from "next/navigation";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import { esModuloValido, MODULOS, type Modulo } from "@/lib/modulos";
import type { AppUser, Rol, RolPlataforma } from "@/lib/procesos/types";

export function resolverModulosEfectivos(
  dbModulosRaw: string[],
  appMetadata?: Record<string, unknown> | null
): Modulo[] {
  const dbModulos = dbModulosRaw.filter(esModuloValido);
  if (appMetadata && appMetadata.modulos_v2 === true && Array.isArray(appMetadata.modulos_asignados)) {
    const metaModulos = appMetadata.modulos_asignados.map(String).filter(esModuloValido);
    return Array.from(new Set<Modulo>([...dbModulos, ...metaModulos]));
  }
  // Usuarios anteriores a la separación de slugs conservan lo que ya veían hasta que se edite su acceso.
  const legacy = new Set<Modulo>(dbModulos);
  if (legacy.has("frecuencias")) legacy.add("cartera_radicacion");
  if (legacy.has("venta_del_dia")) legacy.add("digiturno_contact");
  return Array.from(legacy);
}

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
    .select("id, nombre_completo, email, is_admin, rol, lider_id, es_gestor_conocimiento, activo")
    .eq("id", userId)
    .single()) as { data: any; error: any };

  if (error && /rol|lider_id|es_gestor/.test(String(error.message))) {
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
  const isAdmin = rol === "desarrollador" || rol === "administrador" || Boolean(data.is_admin);

  return {
    id: data.id,
    nombreCompleto: data.nombre_completo,
    email: data.email,
    isAdmin,
    rol,
    liderId: data.lider_id ?? null,
    esGestorConocimiento: data.es_gestor_conocimiento ?? false,
    activo: data.activo,
  };
});

export async function requireAppUser(): Promise<AppUser> {
  const user = await getCurrentAppUser();
  if (!user) redirect("/login");
  if (!user.activo) redirect("/login?desactivado=1");
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

/** Quien puede cargar/publicar conocimiento: gestores designados, administradores y desarrolladores. */
export function puedeGestionarConocimiento(user: Pick<AppUser, "isAdmin" | "esGestorConocimiento">): boolean {
  return user.isAdmin || user.esGestorConocimiento;
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
    .select("id, nombre_completo, email, is_admin, rol, lider_id, es_gestor_conocimiento, activo")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const rol = (data.rol ?? (data.is_admin ? "administrador" : "usuario_basico")) as RolPlataforma;
  return {
    id: data.id,
    nombreCompleto: data.nombre_completo,
    email: data.email,
    isAdmin: rol === "desarrollador" || rol === "administrador" || Boolean(data.is_admin),
    rol,
    liderId: data.lider_id ?? null,
    esGestorConocimiento: data.es_gestor_conocimiento ?? false,
    activo: data.activo,
  };
}

export const getMisModulos = cache(async (userId: string, isAdmin: boolean): Promise<Set<Modulo>> => {
  if (isAdmin) {
    return new Set(MODULOS.map((m) => m.slug));
  }
  const admin = createServiceClient();
  const [{ data, error }, authRes] = await Promise.all([
    admin.from("modulo_accesos").select("modulo").eq("user_id", userId),
    admin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null }, error: null })),
  ]);
  const dbRaw = !error && data ? data.map((r) => String(r.modulo)) : [];
  const appMeta = (authRes?.data?.user?.app_metadata ?? null) as Record<string, unknown> | null;
  return new Set(resolverModulosEfectivos(dbRaw, appMeta));
});

export async function requireModuloAccess(modulo: Modulo): Promise<AppUser> {
  const user = await requireAppUser();
  if (user.isAdmin) return user;
  const modulos = await getMisModulos(user.id, false);
  if (!modulos.has(modulo)) redirect("/");
  return user;
}

export async function requireAnyModuloAccess(permitidos: Modulo[]): Promise<AppUser> {
  const user = await requireAppUser();
  if (user.isAdmin) return user;
  const modulos = await getMisModulos(user.id, false);
  if (!permitidos.some((m) => modulos.has(m))) redirect("/");
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
