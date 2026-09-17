"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import { esUsuarioValido, requireAdmin, requireAppUser, usuarioToEmail } from "@/lib/procesos/auth";

function errorMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Error desconocido.";
}

// --- Login / logout ---------------------------------------------------

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const usuario = String(formData.get("usuario") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!usuario || !password) {
    return { error: "Ingresa usuario y contraseña." };
  }

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usuarioToEmail(usuario),
    password,
  });

  if (error) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  redirect("/procesos");
}

export async function logoutAction() {
  const supabase = createSessionServerClient();
  await supabase.auth.signOut();
  redirect("/procesos/login");
}

// --- Administración de usuarios (solo admin) ---------------------------

export async function crearUsuarioAction(
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  await requireAdmin();

  const usuario = String(formData.get("usuario") ?? "").trim().toLowerCase();
  const nombreCompleto = String(formData.get("nombreCompleto") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isAdmin = formData.get("isAdmin") === "on";

  if (!esUsuarioValido(usuario)) {
    return {
      error: "Usuario inválido: solo minúsculas, números, punto, guion o guion bajo (sin espacios).",
    };
  }
  if (!nombreCompleto) return { error: "Falta el nombre completo." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const email = usuarioToEmail(usuario);
  const admin = createServiceClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: `No se pudo crear el usuario: ${createError?.message ?? "error desconocido"}` };
  }

  const { error: profileError } = await admin.from("app_users").insert({
    id: created.user.id,
    nombre_completo: nombreCompleto,
    email,
    is_admin: isAdmin,
  });

  if (profileError) {
    return { error: `Usuario creado pero falló el perfil: ${profileError.message}` };
  }

  revalidatePath("/procesos/usuarios");
  return { error: null, ok: true };
}

export async function toggleActivoUsuarioAction(userId: string, activo: boolean) {
  await requireAdmin();
  const admin = createServiceClient();
  const { error } = await admin.from("app_users").update({ activo }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/procesos/usuarios");
}

// --- Asignaciones de área (líder / colaborador) ------------------------

export async function asignarLiderAction(areaId: string, userId: string) {
  const admin = await requireAdmin();
  const supabase = createSessionServerClient();
  const { error } = await supabase.from("area_asignaciones").insert({
    area_id: areaId,
    user_id: userId,
    rol: "lider",
    asignado_por: admin.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/areas/${areaId}`);
  revalidatePath("/procesos/areas");
}

export async function asignarColaboradorAction(areaId: string, userId: string) {
  const user = await requireAppUser();
  const supabase = createSessionServerClient();
  const { error } = await supabase.from("area_asignaciones").insert({
    area_id: areaId,
    user_id: userId,
    rol: "colaborador",
    asignado_por: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/areas/${areaId}`);
}

export async function quitarAsignacionAction(asignacionId: string, areaId: string) {
  await requireAppUser();
  const supabase = createSessionServerClient();
  const { error } = await supabase.from("area_asignaciones").delete().eq("id", asignacionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/areas/${areaId}`);
}

// --- Procesos / actividades / tareas ------------------------------------

export async function crearProcesoAction(
  areaId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  if (!nombre) return { error: "Falta el nombre del proceso." };

  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("procesos")
    .insert({ area_id: areaId, nombre, descripcion, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  redirect(`/procesos/procesos/${data.id}`);
}

export async function crearActividadAction(
  procesoId: string,
  siguienteOrden: number,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  if (!nombre) return { error: "Falta el nombre de la actividad." };

  const supabase = createSessionServerClient();
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
  actividadId: string,
  procesoId: string,
  direccion: "arriba" | "abajo"
) {
  await requireAppUser();
  const supabase = createSessionServerClient();
  const { data: actividades, error } = await supabase
    .from("actividades")
    .select("id, orden")
    .eq("proceso_id", procesoId)
    .order("orden");
  if (error || !actividades) throw new Error(error?.message ?? "No se pudo leer el orden.");

  const idx = actividades.findIndex((a) => a.id === actividadId);
  const swapIdx = direccion === "arriba" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= actividades.length) return;

  const a = actividades[idx];
  const b = actividades[swapIdx];
  await supabase.from("actividades").update({ orden: b.orden }).eq("id", a.id);
  await supabase.from("actividades").update({ orden: a.orden }).eq("id", b.id);

  revalidatePath(`/procesos/procesos/${procesoId}`);
}

export async function crearTareaAction(
  actividadId: string,
  siguienteOrden: number,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const responsableUserId = String(formData.get("responsableUserId") ?? "").trim() || null;
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const impactoPaciente = String(formData.get("impactoPaciente") ?? "").trim() || null;
  if (!nombre) return { error: "Falta el nombre de la tarea." };

  const supabase = createSessionServerClient();
  const { error } = await supabase.from("tareas").insert({
    actividad_id: actividadId,
    nombre,
    descripcion,
    responsable_user_id: responsableUserId,
    resultado,
    impacto_paciente: impactoPaciente,
    orden: siguienteOrden,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/procesos/actividades/${actividadId}`);
  return { error: null };
}

export async function moverTareaAction(
  tareaId: string,
  actividadId: string,
  direccion: "arriba" | "abajo"
) {
  await requireAppUser();
  const supabase = createSessionServerClient();
  const { data: tareas, error } = await supabase
    .from("tareas")
    .select("id, orden")
    .eq("actividad_id", actividadId)
    .order("orden");
  if (error || !tareas) throw new Error(error?.message ?? "No se pudo leer el orden.");

  const idx = tareas.findIndex((t) => t.id === tareaId);
  const swapIdx = direccion === "arriba" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= tareas.length) return;

  const a = tareas[idx];
  const b = tareas[swapIdx];
  await supabase.from("tareas").update({ orden: b.orden }).eq("id", a.id);
  await supabase.from("tareas").update({ orden: a.orden }).eq("id", b.id);

  revalidatePath(`/procesos/actividades/${actividadId}`);
}

export async function actualizarTareaAction(
  tareaId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const responsableUserId = String(formData.get("responsableUserId") ?? "").trim() || null;
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const impactoPaciente = String(formData.get("impactoPaciente") ?? "").trim() || null;
  const estado = String(formData.get("estado") ?? "pendiente");
  if (!nombre) return { error: "Falta el nombre de la tarea." };

  const supabase = createSessionServerClient();
  const { error } = await supabase
    .from("tareas")
    .update({
      nombre,
      descripcion,
      responsable_user_id: responsableUserId,
      resultado,
      impacto_paciente: impactoPaciente,
      estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tareaId);
  if (error) return { error: error.message };

  revalidatePath(`/procesos/tareas/${tareaId}`);
  return { error: null };
}

/** Colaborador actualizando SOLO su propia tarea (resultado/estado) —
 * RLS ya lo limita a filas donde responsable_user_id = auth.uid(), esto
 * es solo la acción de UI equivalente con menos campos expuestos. */
export async function actualizarMiTareaAction(
  tareaId: string,
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireAppUser();
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const impactoPaciente = String(formData.get("impactoPaciente") ?? "").trim() || null;
  const estado = String(formData.get("estado") ?? "pendiente");

  const supabase = createSessionServerClient();
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
  const supabase = createSessionServerClient();
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
  await requireAppUser();
  const supabase = createSessionServerClient();
  const { error } = await supabase.from("tarea_relaciones").delete().eq("id", relacionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/procesos/tareas/${tareaId}`);
}

// --- Búsqueda para relacionar tareas -----------------------------------

export async function buscarTareasParaRelacionarAction(query: string, excluirTareaId: string) {
  await requireAppUser();
  const { buscarTareas } = await import("@/lib/procesos/queries");
  return buscarTareas(query, excluirTareaId);
}

export async function restablecerPasswordAction(
  userId: string,
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  return { error: null, ok: true };
}
