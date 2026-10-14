"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createServiceClient,
  createSessionServerClient,
} from "@/lib/supabase/server";
import { requireAdmin, requireAppUser } from "@/lib/auth";
import { MODULOS, type Modulo } from "@/lib/modulos";
import type { AppUser } from "@/lib/procesos/types";

/**
 * Si el usuario autenticado es Administrador en app_users, usamos el cliente
 * de servicio para evitar bloqueos por desfases en politicas RLS de Supabase.
 * Para lideres y colaboradores se mantiene el cliente de sesion con RLS.
 */
function dbForUser(user: AppUser) {
  return user.isAdmin ? createServiceClient() : createSessionServerClient();
}

// --- Auth: login / logout / cambio de contraseÃ±a --------------------

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "").trim();
  const destino =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (!email || !password) {
    return { error: "Escribe tu correo y contraseÃ±a." };
  }

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseÃ±a incorrectos." };
  }

  redirect(destino);
}

export async function logoutAction() {
  const supabase = createSessionServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setNewPasswordAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "La contraseÃ±a debe tener al menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "Las contraseÃ±as no coinciden." };
  }

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

// --- Admin: crear y administrar usuarios -----------------------------

function parseModulosFromForm(formData: FormData): Modulo[] {
  const raw = formData.getAll("modulos").map(String);
  const validIds = new Set<string>(MODULOS.map((m) => m.id));
  return raw.filter((v): v is Modulo => validIds.has(v));
}

export interface CrearUsuarioState {
  error: string | null;
  ok: boolean;
  credenciales?: {
    nombreCompleto: string;
    email: string;
    passwordTemporal: string;
  };
}

function generarPasswordTemporal(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let sufijo = "";
  for (let i = 0; i < 6; i++) {
    sufijo += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Ebenezer-${sufijo}`;
}

export async function crearUsuarioAction(
  _prevState: CrearUsuarioState,
  formData: FormData
): Promise<CrearUsuarioState> {
  await requireAdmin();

  const nombreCompleto = String(formData.get("nombreCompleto") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const isAdmin = formData.get("isAdmin") === "on";
  const passwordManual = String(formData.get("passwordTemporal") ?? "").trim();
  const modulos = parseModulosFromForm(formData);

  if (!nombreCompleto || !email) {
    return { error: "Falta el nombre completo o el correo.", ok: false };
  }
  if (passwordManual && passwordManual.length < 8) {
    return {
      error: "La contraseÃ±a temporal debe tener al menos 8 caracteres (o dÃ©jala vacÃ­a para generarla sola).",
      ok: false,
    };
  }

  const passwordTemporal = passwordManual || generarPasswordTemporal();
  const service = createServiceClient();

  const { data: created, error: createErr } =
    await service.auth.admin.createUser({
      email,
      password: passwordTemporal,
      email_confirm: true,
    });

  if (createErr || !created?.user) {
    return {
      error: createErr?.message ?? "No se pudo crear el usuario.",
      ok: false,
    };
  }

  const { error: profileErr } = await service.from("app_users").insert({
    id: created.user.id,
    nombre_completo: nombreCompleto,
    email,
    is_admin: isAdmin,
    activo: true,
  });

  if (profileErr) {
    return { error: profileErr.message, ok: false };
  }

  if (!isAdmin && modulos.length > 0) {
    const { error: accErr } = await service.from("modulo_accesos").insert(
      modulos.map((modulo) => ({ user_id: created.user.id, modulo }))
    );
    if (accErr) {
      return { error: accErr.message, ok: false };
    }
  }

  revalidatePath("/procesos/usuarios");
  return {
    error: null,
    ok: true,
    credenciales: { nombreCompleto, email, passwordTemporal },
  };
}

export async function resetearPasswordUsuarioAction(
  userId: string
): Promise<{ error: string | null; credenciales?: { email: string; nombreCompleto: string; passwordTemporal: string } }> {
  await requireAdmin();
  const service = createServiceClient();

  const { data: perfil } = await service
    .from("app_users")
    .select("nombre_completo, email")
    .eq("id", userId)
    .single();
  if (!perfil) {
    return { error: "Usuario no encontrado." };
  }

  const passwordTemporal = generarPasswordTemporal();
  const { error } = await service.auth.admin.updateUserById(userId, {
    password: passwordTemporal,
    email_confirm: true,
  });
  if (error) {
    return { error: error.message };
  }

  return {
    error: null,
    credenciales: {
      nombreCompleto: perfil.nombre_completo,
      email: perfil.email,
      passwordTemporal,
    },
  };
}

export async function toggleActivoUsuarioAction(userId: string, activo: boolean) {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service
    .from("app_users")
    .update({ activo })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/procesos/usuarios");
}

export async function actualizarAccesoUsuarioAction(
  userId: string,
  formData: FormData
) {
  const admin = await requireAdmin();
  const isAdmin = formData.get("isAdmin") === "on";
  const modulos = parseModulosFromForm(formData);

  if (userId === admin.id && !isAdmin) {
    throw new Error("No puedes quitarte el rol de administrador a ti mismo.");
  }

  const service = createServiceClient();

  const { error: updErr } = await service
    .from("app_users")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (updErr) throw new Error(updErr.message);

  const { error: delErr } = await service
    .from("modulo_accesos")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw new Error(delErr.message);

  if (!isAdmin && modulos.length > 0) {
    const { error: insErr } = await service.from("modulo_accesos").insert(
      modulos.map((modulo) => ({ user_id: userId, modulo }))
    );
    if (insErr) throw new Error(insErr.message);
  }

  revalidatePath("/procesos/usuarios");
}

// --- Ãreas y asignaciones (lÃ­der / colaborador) ----------------------

export async function crearAreaAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireAdmin();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribe el nombre del Ã¡rea." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("areas").insert({ nombre });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un Ã¡rea con ese nombre."
          : error.message,
    };
  }
  revalidatePath("/procesos/areas");
  revalidatePath("/procesos");
  return { error: null };
}

export async function asignarLiderAction(areaId: string, formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const supabase = createServiceClient();
  const { error } = await supabase.from("area_asignaciones").upsert(
    {
      area_id: areaId,
      user_id: userId,
      rol: "lider",
      asignado_por: admin.id,
    },
    { onConflict: "area_id,user_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/areas/${areaId}`);
  revalidatePath("/procesos/areas");
  revalidatePath("/procesos");
}

export async function asignarColaboradorAction(
  areaId: string,
  formData: FormData
) {
  const user = await requireAppUser();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const supabase = dbForUser(user);
  const { error } = await supabase.from("area_asignaciones").upsert(
    {
      area_id: areaId,
      user_id: userId,
      rol: "colaborador",
      asignado_por: user.id,
    },
    { onConflict: "area_id,user_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/areas/${areaId}`);
  revalidatePath("/procesos");
}

export async function quitarAsignacionAction(
  asignacionId: string,
  areaId: string
) {
  const user = await requireAppUser();
  const supabase = dbForUser(user);
  const { error } = await supabase
    .from("area_asignaciones")
    .delete()
    .eq("id", asignacionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/areas/${areaId}`);
  revalidatePath("/procesos/areas");
  revalidatePath("/procesos");
}

// --- Procesos, actividades, tareas ----------------------------------

export async function crearProcesoAction(
  areaId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  if (!nombre) return { error: "Escribe el nombre del proceso." };

  const supabase = dbForUser(user);
  const { data, error } = await supabase
    .from("procesos")
    .insert({ area_id: areaId, nombre, descripcion, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/procesos/areas/${areaId}`);
  revalidatePath("/procesos");
  redirect(`/procesos/procesos/${data.id}`);
}

export async function crearActividadAction(
  procesoId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  if (!nombre) return { error: "Escribe el nombre de la actividad." };

  const supabase = dbForUser(user);
  const { data: ultima } = await supabase
    .from("actividades")
    .select("orden")
    .eq("proceso_id", procesoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const siguienteOrden = (ultima?.orden ?? 0) + 1;

  const { error } = await supabase.from("actividades").insert({
    proceso_id: procesoId,
    nombre,
    descripcion,
    orden: siguienteOrden,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/procesos/procesos/${procesoId}`);
  return { error: null };
}

export async function moverActividadAction(
  procesoId: string,
  actividadId: string,
  direccion: "arriba" | "abajo"
) {
  const user = await requireAppUser();
  const supabase = dbForUser(user);
  const { data: lista } = await supabase
    .from("actividades")
    .select("id, orden")
    .eq("proceso_id", procesoId)
    .order("orden");
  if (!lista) return;

  const idx = lista.findIndex((a) => a.id === actividadId);
  const vecinoIdx = direccion === "arriba" ? idx - 1 : idx + 1;
  if (idx < 0 || vecinoIdx < 0 || vecinoIdx >= lista.length) return;

  const actual = lista[idx];
  const vecino = lista[vecinoIdx];
  await supabase.from("actividades").update({ orden: vecino.orden }).eq("id", actual.id);
  await supabase.from("actividades").update({ orden: actual.orden }).eq("id", vecino.id);
  revalidatePath(`/procesos/procesos/${procesoId}`);
}

export async function crearTareaAction(
  actividadId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const responsableUserId = String(formData.get("responsableUserId") ?? "") || null;
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const impactoPaciente = String(formData.get("impactoPaciente") ?? "").trim() || null;
  const altoRiesgo = formData.get("altoRiesgo") === "on";
  const slaRaw = String(formData.get("slaHoras") ?? "").trim();
  const slaHoras = slaRaw ? Number(slaRaw) : null;
  if (slaHoras != null && (!Number.isFinite(slaHoras) || slaHoras <= 0)) {
    return { error: "El tiempo objetivo (SLA) debe ser un nÃºmero mayor a 0." };
  }
  if (!nombre) return { error: "Escribe el nombre de la tarea." };

  const supabase = dbForUser(user);
  const { data: ultima } = await supabase
    .from("tareas")
    .select("orden")
    .eq("actividad_id", actividadId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const siguienteOrden = (ultima?.orden ?? 0) + 1;

  const { error } = await supabase.from("tareas").insert({
    actividad_id: actividadId,
    nombre,
    descripcion,
    responsable_user_id: responsableUserId,
    resultado,
    impacto_paciente: impactoPaciente,
    alto_riesgo: altoRiesgo,
    sla_horas: slaHoras,
    orden: siguienteOrden,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/procesos/actividades/${actividadId}`);
  return { error: null };
}

export async function moverTareaAction(
  actividadId: string,
  tareaId: string,
  direccion: "arriba" | "abajo"
) {
  const user = await requireAppUser();
  const supabase = dbForUser(user);
  const { data: lista } = await supabase
    .from("tareas")
    .select("id, orden")
    .eq("actividad_id", actividadId)
    .order("orden");
  if (!lista) return;

  const idx = lista.findIndex((t) => t.id === tareaId);
  const vecinoIdx = direccion === "arriba" ? idx - 1 : idx + 1;
  if (idx < 0 || vecinoIdx < 0 || vecinoIdx >= lista.length) return;

  const actual = lista[idx];
  const vecino = lista[vecinoIdx];
  await supabase.from("tareas").update({ orden: vecino.orden }).eq("id", actual.id);
  await supabase.from("tareas").update({ orden: actual.orden }).eq("id", vecino.id);
  revalidatePath(`/procesos/actividades/${actividadId}`);
}

export async function actualizarTareaAction(
  tareaId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const responsableUserId = String(formData.get("responsableUserId") ?? "") || null;
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const impactoPaciente = String(formData.get("impactoPaciente") ?? "").trim() || null;
  const estado = String(formData.get("estado") ?? "pendiente");
  const altoRiesgo = formData.get("altoRiesgo") === "on";
  const slaRaw = String(formData.get("slaHoras") ?? "").trim();
  const slaHoras = slaRaw ? Number(slaRaw) : null;
  if (slaHoras != null && (!Number.isFinite(slaHoras) || slaHoras <= 0)) {
    return { error: "El tiempo objetivo (SLA) debe ser un nÃºmero mayor a 0." };
  }
  if (!nombre) return { error: "Falta el nombre de la tarea." };

  const supabase = dbForUser(user);
  const { error } = await supabase
    .from("tareas")
    .update({
      nombre,
      descripcion,
      responsable_user_id: responsableUserId,
      resultado,
      impacto_paciente: impactoPaciente,
      estado,
      alto_riesgo: altoRiesgo,
      sla_horas: slaHoras,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tareaId);
  if (error) return { error: error.message };

  revalidatePath(`/procesos/tareas/${tareaId}`);
  return { error: null };
}

export async function actualizarMiTareaAction(
  tareaId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const impactoPaciente = String(formData.get("impactoPaciente") ?? "").trim() || null;
  const estado = String(formData.get("estado") ?? "pendiente");

  const supabase = dbForUser(user);
  const { error } = await supabase
    .from("tareas")
    .update({ resultado, impacto_paciente: impactoPaciente, estado, updated_at: new Date().toISOString() })
    .eq("id", tareaId);
  if (error) return { error: error.message };

  revalidatePath(`/procesos/tareas/${tareaId}`);
  revalidatePath("/procesos/mis-tareas");
  return { error: null };
}

export async function crearRelacionTareaAction(
  tareaId: string,
  tareaRelacionadaId: string,
  nota: string | null
) {
  const user = await requireAppUser();
  if (tareaId === tareaRelacionadaId) throw new Error("Una tarea no puede relacionarse consigo misma.");
  const supabase = dbForUser(user);
  const { error } = await supabase.from("tarea_relaciones").insert({
    tarea_id: tareaId,
    tarea_relacionada_id: tareaRelacionadaId,
    nota,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/tareas/${tareaId}`);
}

export async function eliminarRelacionTareaAction(relacionId: string, tareaId: string) {
  const user = await requireAppUser();
  const supabase = dbForUser(user);
  const { error } = await supabase.from("tarea_relaciones").delete().eq("id", relacionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/tareas/${tareaId}`);
}

// --- BÃºsqueda para relacionar tareas -----------------------------------

export async function buscarTareasParaRelacionarAction(query: string, excluirTareaId?: string) {
  await requireAppUser();
  const { buscarTareas } = await import("@/lib/procesos/queries");
  return buscarTareas(query, excluirTareaId);
}