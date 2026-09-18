"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import { requireAdmin, requireAppUser } from "@/lib/auth";
import type { Modulo } from "@/lib/modulos";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Error desconocido.";
}

// --- Login / logout ---------------------------------------------------

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa correo y contraseña." };
  }

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/");
}

export async function logoutAction() {
  const supabase = createSessionServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Primer login tras aceptar una invitación: la persona ya tiene
 * sesión (vino del link del correo vía /auth/callback), solo le falta
 * poner su propia contraseña. */
export async function establecerPasswordInicialAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const user = await requireAppUser();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  void user;
  redirect("/");
}

// Perfil (usuario ya autenticado, cambia su propia contraseña — se
// queda en /perfil viendo el resultado, no se redirige).
export async function cambiarPasswordAction(
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  await requireAppUser();
  const password = String(formData.get("password") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirmar) return { error: "Las contraseñas no coinciden." };

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { error: null, ok: true };
}

// "Olvidé mi contraseña" (sin sesión): manda el correo de
// recuperación. Supabase no revela si el correo existe o no — el
// mensaje es siempre el mismo, para no filtrar qué correos están
// registrados.
export async function solicitarRecuperacionAction(
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: "Ingresa un correo válido." };

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/restablecer-password`,
  });

  if (error) return { error: "No se pudo enviar el correo. Intenta de nuevo en unos minutos." };
  return { error: null, ok: true };
}

// --- Administración de usuarios (solo admin) ---------------------------

export async function invitarUsuarioAction(
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombreCompleto = String(formData.get("nombreCompleto") ?? "").trim();
  const isAdmin = formData.get("isAdmin") === "on";
  const modulos = formData.getAll("modulos").map(String) as Modulo[];

  if (!EMAIL_PATTERN.test(email)) return { error: "Correo inválido." };
  if (!nombreCompleto) return { error: "Falta el nombre completo." };

  const admin = createServiceClient();

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/invitacion`,
  });

  if (inviteError || !invited.user) {
    return { error: `No se pudo invitar: ${inviteError?.message ?? "error desconocido"}` };
  }

  const { error: profileError } = await admin.from("app_users").insert({
    id: invited.user.id,
    nombre_completo: nombreCompleto,
    email,
    is_admin: isAdmin,
  });

  if (profileError) {
    return { error: `Invitación enviada pero falló el perfil: ${profileError.message}` };
  }

  if (modulos.length > 0) {
    const { error: modulosError } = await admin
      .from("modulo_accesos")
      .insert(modulos.map((modulo) => ({ user_id: invited.user!.id, modulo })));
    if (modulosError) {
      return { error: `Invitación enviada pero falló el acceso a módulos: ${modulosError.message}` };
    }
  }

  revalidatePath("/usuarios");
  return { error: null, ok: true };
}

export async function actualizarAccesoUsuarioAction(
  userId: string,
  isAdmin: boolean,
  modulos: Modulo[]
) {
  await requireAdmin();
  const admin = createServiceClient();

  const { error: updateError } = await admin.from("app_users").update({ is_admin: isAdmin }).eq("id", userId);
  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await admin.from("modulo_accesos").delete().eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (modulos.length > 0) {
    const { error: insertError } = await admin
      .from("modulo_accesos")
      .insert(modulos.map((modulo) => ({ user_id: userId, modulo })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/usuarios");
}

export async function toggleActivoUsuarioAction(userId: string, activo: boolean) {
  await requireAdmin();
  const admin = createServiceClient();
  const { error } = await admin.from("app_users").update({ activo }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

export async function eliminarUsuarioAction(userId: string) {
  const yo = await requireAdmin();
  if (userId === yo.id) throw new Error("No puedes eliminar tu propia cuenta.");
  const admin = createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
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

// --- Áreas (solo admin) -------------------------------------------------

export async function crearAreaAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireAdmin();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Falta el nombre del área." };

  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("areas")
    .insert({ nombre })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un área con ese nombre." };
    return { error: error.message };
  }

  revalidatePath("/procesos/areas");
  redirect(`/procesos/areas/${data.id}`);
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
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const user = await requireAppUser();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const responsableUserId = String(formData.get("responsableUserId") ?? "").trim() || null;
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const impactoPaciente = String(formData.get("impactoPaciente") ?? "").trim() || null;
  const altoRiesgo = formData.get("altoRiesgo") === "on";
  const slaHorasRaw = String(formData.get("slaHoras") ?? "").trim();
  const slaHoras = slaHorasRaw ? Number(slaHorasRaw) : null;
  if (slaHoras !== null && (!Number.isFinite(slaHoras) || slaHoras <= 0)) {
    return { error: "El SLA debe ser un número de horas mayor a 0." };
  }
  // Relacionar con otra tarea (de cualquier área) desde el momento de
  // crear — mismo mecanismo que el panel "Tareas relacionadas" del
  // detalle, pero disponible ya en el formulario de creación.
  const relacionarConTareaId = String(formData.get("relacionarConTareaId") ?? "").trim() || null;
  const relacionarNota = String(formData.get("relacionarNota") ?? "").trim() || null;
  if (!nombre) return { error: "Falta el nombre de la tarea." };

  const supabase = createSessionServerClient();
  const { data, error } = await supabase
    .from("tareas")
    .insert({
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
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (relacionarConTareaId) {
    const { error: relError } = await supabase.from("tarea_relaciones").insert({
      tarea_id: data.id,
      tarea_relacionada_id: relacionarConTareaId,
      nota: relacionarNota,
      created_by: user.id,
    });
    if (relError) {
      revalidatePath(`/procesos/actividades/${actividadId}`);
      return { error: `La tarea se creó, pero no se pudo relacionar: ${relError.message}`, ok: true };
    }
  }

  revalidatePath(`/procesos/actividades/${actividadId}`);
  return { error: null, ok: true };
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
  const altoRiesgo = formData.get("altoRiesgo") === "on";
  const slaHorasRaw = String(formData.get("slaHoras") ?? "").trim();
  const slaHoras = slaHorasRaw ? Number(slaHorasRaw) : null;
  if (slaHoras !== null && (!Number.isFinite(slaHoras) || slaHoras <= 0)) {
    return { error: "El SLA debe ser un número de horas mayor a 0." };
  }
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
      alto_riesgo: altoRiesgo,
      sla_horas: slaHoras,
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

export async function buscarTareasParaRelacionarAction(query: string, excluirTareaId?: string) {
  await requireAppUser();
  const { buscarTareas } = await import("@/lib/procesos/queries");
  return buscarTareas(query, excluirTareaId);
}
