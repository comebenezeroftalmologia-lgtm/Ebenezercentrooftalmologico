import { redirect } from "next/navigation";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import type { AppUser, Rol } from "@/lib/procesos/types";
import type { Modulo } from "@/lib/modulos";

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

export async function requireModuloAccess(modulo: Modulo): Promise<AppUser> {
  const user = await requireAppUser();
  if (user.isAdmin) return user;
  const modulos = await getMisModulos(user.id, false);
  if (!modulos.has(modulo)) redirect("/");
  return user;
}

export async function getMisAsignaciones(
  userId: string
): Promise<{ areaId: string; areaNombre: string; rol: Rol }[]> {
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