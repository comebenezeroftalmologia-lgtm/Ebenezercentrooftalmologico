"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import {
  getAppUserById,
  getMisModulos,
  puedeAdministrarA,
  requireAdmin,
  requireAppUser,
  requireGestorUsuarios,
  rolesAsignables,
} from "@/lib/auth";
import type { ResultadoInvitacion, RolPlataforma } from "@/lib/procesos/types";
import { esModuloValido, MODULOS_TABLA_CLASICA, type Modulo } from "@/lib/modulos";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function obtenerSiteUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  if (envUrl && !/localhost|127\.0\.0\.1/i.test(envUrl)) return envUrl;
  try {
    const h = headers();
    const origin = h.get("origin")?.trim().replace(/\/+$/, "");
    if (origin && /^https?:\/\//i.test(origin)) return origin;
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  } catch {}
  return process.env.NODE_ENV === "production" ? "https://www.ebenezer-app.com" : envUrl || "http://localhost:3000";
}

async function buscarAuthUserPorEmail(admin: ReturnType<typeof createServiceClient>, email: string) {
  const target = email.trim().toLowerCase();
  for (let pagina = 1; pagina <= 25; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function guardarModulosUsuario(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  modulosInput: Modulo[],
  extraAppMeta?: Record<string, unknown>
): Promise<string | null> {
  const finales = Array.from(new Set(modulosInput.filter(esModuloValido)));

  const { error: delError } = await admin.from("modulo_accesos").delete().eq("user_id", userId);
  if (delError) return delError.message;

  if (finales.length > 0) {
    const { error: insError } = await admin
      .from("modulo_accesos")
      .insert(finales.map((modulo) => ({ user_id: userId, modulo })));

    if (insError) {
      // Si la restricción CHECK de Supabase aún no incluye los nuevos slugs, guardamos los clásicos en la tabla
      // y la lista completa exacta queda sincronizada en app_metadata.
      const clasicos = finales.filter((m) => MODULOS_TABLA_CLASICA.has(m));
      if (clasicos.length > 0) {
        const { error: fallbackErr } = await admin
          .from("modulo_accesos")
          .insert(clasicos.map((modulo) => ({ user_id: userId, modulo })));
        if (fallbackErr) return fallbackErr.message;
      }
    }
  }

  const previo = await admin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null }, error: null }));
  const metaActual = ((previo?.data?.user?.app_metadata ?? {}) as Record<string, unknown>);
  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...metaActual,
      modulos_v2: true,
      modulos_asignados: finales,
      ...(extraAppMeta ?? {}),
    },
  });
  if (metaErr) return metaErr.message;
  return null;
}

function dbForUser(user: { isAdmin: boolean }) {
  return user.isAdmin ? createServiceClient() : createSessionServerClient();
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

  const admin = createServiceClient();
  const { data: perfil } = await admin
    .from("app_users")
    .select("activo")
    .ilike("email", email)
    .maybeSingle();

  if (perfil && perfil.activo === false) {
    return { error: "Tu cuenta está desactivada. Comunícate con el administrador." };
  }

  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (/banned/i.test(error.message)) {
      return { error: "Tu cuenta está desactivada. Comunícate con el administrador." };
    }
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/");
}

export async function logoutAction() {
  const supabase = createSessionServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

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

  try {
    const admin = createServiceClient();
    const previo = await admin.auth.admin.getUserById(user.id);
    const metaActual = ((previo?.data?.user?.app_metadata ?? {}) as Record<string, unknown>);
    await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      app_metadata: { ...metaActual, clave_asignada: true },
    });
  } catch {}

  redirect("/");
}

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

export async function solicitarRecuperacionAction(
  _prevState: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: "Ingresa un correo válido." };

  const siteUrl = obtenerSiteUrl();
  const supabase = createSessionServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/restablecer-password`,
  });

  if (error) return { error: "No se pudo enviar el correo. Intenta de nuevo en unos minutos." };
  return { error: null, ok: true };
}

// --- Administración de usuarios (solo admin) ---------------------------

export async function invitarUsuarioAction(
  _prevState: ResultadoInvitacion,
  formData: FormData
): Promise<ResultadoInvitacion> {
  const actor = await requireGestorUsuarios();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombreCompleto = String(formData.get("nombreCompleto") ?? "").trim();
  const rol = String(formData.get("rol") ?? "usuario_basico") as RolPlataforma;
  const passwordInicial = String(formData.get("passwordInicial") ?? "").trim();
  const esRolAdmin = rol === "desarrollador" || rol === "administrador";
  const modulos = esRolAdmin
    ? []
    : (Array.from(new Set(formData.getAll("modulos").map(String).filter(esModuloValido))) as Modulo[]);

  if (!EMAIL_PATTERN.test(email)) return { error: "Correo inválido." };
  if (!nombreCompleto) return { error: "Falta el nombre completo." };
  if (!rolesAsignables(actor).includes(rol)) {
    return { error: "No tienes permiso para crear usuarios con ese rol." };
  }
  if (passwordInicial.length > 0 && passwordInicial.length < 8) {
    return { error: "La contraseña inicial debe tener al menos 8 caracteres (o déjala vacía para enviar invitación por correo)." };
  }

  let liderId: string | null = null;
  if (rol === "usuario_basico") {
    if (actor.rol === "lider") {
      liderId = actor.id;
    } else {
      const rawLider = String(formData.get("liderId") ?? "").trim();
      if (rawLider) {
        const lider = await getAppUserById(rawLider);
        const rolValido =
          lider &&
          lider.activo &&
          (lider.rol === "lider" || lider.rol === "administrador" || lider.rol === "desarrollador");
        if (!rolValido) {
          return { error: "La persona seleccionada como líder no es válida o está desactivada." };
        }
        liderId = lider.id;
      }
    }
  }

  if (!actor.isAdmin) {
    const permitidos = await getMisModulos(actor.id, false);
    if (modulos.some((m) => !permitidos.has(m))) {
      return { error: "Solo puedes dar acceso a módulos que tú mismo tienes." };
    }
  }

  const admin = createServiceClient();

  const { data: yaEnDirectorio } = await admin
    .from("app_users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (yaEnDirectorio) {
    return {
      error: "Ese correo ya está incluido en el directorio de usuarios. Búscalo abajo para editar sus permisos o su contraseña.",
    };
  }

  let authUserId: string | null = null;
  let modo: "clave_directa" | "correo_enviado" | "link_manual" = "correo_enviado";
  let inviteLink: string | null = null;
  const siteUrl = obtenerSiteUrl();
  const redirectInvite = `${siteUrl}/auth/callback?next=/invitacion`;

  if (passwordInicial.length >= 8) {
    modo = "clave_directa";
    const { data: creado, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: passwordInicial,
      email_confirm: true,
      user_metadata: { nombre_completo: nombreCompleto },
      app_metadata: {
        modulos_v2: true,
        modulos_asignados: modulos,
        clave_asignada: true,
      },
    });

    if (createErr || !creado?.user) {
      const existente = await buscarAuthUserPorEmail(admin, email);
      if (!existente) {
        return { error: `No se pudo crear el usuario: ${createErr?.message ?? "error desconocido"}` };
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(existente.id, {
        password: passwordInicial,
        email_confirm: true,
        ban_duration: "none",
        user_metadata: { ...(existente.user_metadata ?? {}), nombre_completo: nombreCompleto },
      });
      if (updErr) return { error: `No se pudo activar la cuenta: ${updErr.message}` };
      authUserId = existente.id;
    } else {
      authUserId = creado.user.id;
    }
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectInvite,
      data: { nombre_completo: nombreCompleto },
    });

    if (!inviteError && invited?.user) {
      authUserId = invited.user.id;
      modo = "correo_enviado";
    } else {
      // Si el correo de Supabase está limitado por cuota o el correo ya existía en Auth sin perfil,
      // generamos un enlace directo de activación para que la inclusión nunca falle.
      const linkInvite = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo: redirectInvite, data: { nombre_completo: nombreCompleto } },
      });

      if (!linkInvite.error && linkInvite.data?.user) {
        authUserId = linkInvite.data.user.id;
        inviteLink = linkInvite.data.properties?.action_link ?? null;
        modo = "link_manual";
      } else {
        const linkRecovery = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: redirectInvite },
        });
        if (!linkRecovery.error && linkRecovery.data?.user) {
          authUserId = linkRecovery.data.user.id;
          inviteLink = linkRecovery.data.properties?.action_link ?? null;
          modo = "link_manual";
        } else {
          return {
            error: `No se pudo invitar (${inviteError?.message ?? linkInvite.error?.message ?? "error desconocido"}). Puedes escribir una Contraseña inicial arriba para crear la cuenta de inmediato.`,
          };
        }
      }
    }
  }

  const { error: profileError } = await admin.from("app_users").upsert(
    {
      id: authUserId!,
      nombre_completo: nombreCompleto,
      email,
      rol,
      is_admin: esRolAdmin,
      lider_id: liderId,
      activo: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { error: `Se creó la cuenta pero falló el perfil en directorio: ${profileError.message}` };
  }

  const modulosErr = await guardarModulosUsuario(admin, authUserId!, modulos, {
    clave_asignada: passwordInicial.length >= 8,
  });
  if (modulosErr) {
    return { error: `Usuario creado pero falló la asignación de módulos: ${modulosErr}` };
  }

  revalidatePath("/usuarios");
  return { error: null, ok: true, modo, inviteLink, emailCreado: email };
}

export async function reenviarInvitacionOLinkAction(
  userId: string,
  accion: "correo" | "link"
): Promise<{ ok: boolean; error?: string; link?: string | null; mensaje?: string }> {
  const actor = await requireGestorUsuarios();
  const objetivo = await getAppUserById(userId);
  if (!objetivo) return { ok: false, error: "Usuario no encontrado." };
  if (!puedeAdministrarA(actor, objetivo)) {
    return { ok: false, error: "No tienes permiso sobre esta persona." };
  }

  const admin = createServiceClient();
  const siteUrl = obtenerSiteUrl();
  const redirectInvite = `${siteUrl}/auth/callback?next=/invitacion`;

  if (accion === "correo") {
    const inv = await admin.auth.admin.inviteUserByEmail(objetivo.email, {
      redirectTo: redirectInvite,
      data: { nombre_completo: objetivo.nombreCompleto },
    });
    if (!inv.error) {
      return { ok: true, mensaje: `Correo de invitación enviado a ${objetivo.email}.` };
    }
    const supabase = createSessionServerClient();
    const rec = await supabase.auth.resetPasswordForEmail(objetivo.email, {
      redirectTo: redirectInvite,
    });
    if (!rec.error) {
      return { ok: true, mensaje: `Correo para activar contraseña enviado a ${objetivo.email}.` };
    }
  }

  // Generar enlace directo (cuando pide copiar link o como respaldo si el envío de correo falló)
  const genInvite = await admin.auth.admin.generateLink({
    type: "invite",
    email: objetivo.email,
    options: { redirectTo: redirectInvite },
  });
  if (!genInvite.error && genInvite.data?.properties?.action_link) {
    return {
      ok: true,
      link: genInvite.data.properties.action_link,
      mensaje: accion === "correo" ? "El servidor de correo limitó el envío; usa este enlace directo:" : undefined,
    };
  }

  const genRec = await admin.auth.admin.generateLink({
    type: "recovery",
    email: objetivo.email,
    options: { redirectTo: redirectInvite },
  });
  if (!genRec.error && genRec.data?.properties?.action_link) {
    return {
      ok: true,
      link: genRec.data.properties.action_link,
      mensaje: accion === "correo" ? "El servidor de correo limitó el envío; usa este enlace directo:" : undefined,
    };
  }

  return {
    ok: false,
    error: genRec.error?.message ?? genInvite.error?.message ?? "No se pudo generar el enlace.",
  };
}

export async function actualizarAccesoUsuarioAction(
  userId: string,
  rol: RolPlataforma,
  liderId: string | null,
  modulos: Modulo[]
) {
  const actor = await requireGestorUsuarios();
  const objetivo = await getAppUserById(userId);
  if (!objetivo) throw new Error("Usuario no encontrado.");
  if (!puedeAdministrarA(actor, objetivo)) throw new Error("No tienes permiso para editar a esta persona.");

  if (rol !== objetivo.rol) {
    if (userId === actor.id) throw new Error("No puedes cambiar tu propio rol.");
    if (!rolesAsignables(actor).includes(rol)) throw new Error("No tienes permiso para asignar ese rol.");
  }

  let nuevoLider: string | null = null;
  if (rol === "usuario_basico") {
    if (actor.rol === "lider") {
      nuevoLider = actor.id;
    } else if (liderId && liderId.trim()) {
      const lider = await getAppUserById(liderId.trim());
      const rolValido =
        lider &&
        lider.activo &&
        (lider.rol === "lider" || lider.rol === "administrador" || lider.rol === "desarrollador");
      if (!rolValido) throw new Error("La persona seleccionada como líder no es válida o está desactivada.");
      nuevoLider = lider.id;
    }
  }

  const esRolAdmin = rol === "desarrollador" || rol === "administrador";
  const admin = createServiceClient();

  const { error: updateError } = await admin
    .from("app_users")
    .update({ rol, is_admin: esRolAdmin, lider_id: nuevoLider })
    .eq("id", userId);
  if (updateError) throw new Error(updateError.message);

  // Si alguien deja de ser líder/admin, su equipo queda con autorización general hasta reasignar.
  if (
    (objetivo.rol === "lider" || objetivo.rol === "administrador" || objetivo.rol === "desarrollador") &&
    rol === "usuario_basico"
  ) {
    await admin.from("app_users").update({ lider_id: null }).eq("lider_id", userId);
  }

  const pedidos = esRolAdmin ? [] : Array.from(new Set(modulos.filter(esModuloValido)));
  let finales = pedidos;
  if (!actor.isAdmin && !esRolAdmin) {
    const permitidos = await getMisModulos(actor.id, false);
    const actualesSet = await getMisModulos(userId, false);
    const conservar = Array.from(actualesSet).filter((m) => !permitidos.has(m));
    finales = Array.from(new Set([...pedidos.filter((m) => permitidos.has(m)), ...conservar]));
  }

  const modErr = await guardarModulosUsuario(admin, userId, finales);
  if (modErr) throw new Error(modErr);

  revalidatePath("/usuarios");
  revalidatePath("/", "layout");
}

export async function toggleActivoUsuarioAction(userId: string, activo: boolean) {
  const actor = await requireGestorUsuarios();
  const objetivo = await getAppUserById(userId);
  if (!objetivo) throw new Error("Usuario no encontrado.");
  if (userId === actor.id) throw new Error("No puedes desactivar tu propia cuenta.");
  if (!puedeAdministrarA(actor, objetivo)) throw new Error("No tienes permiso sobre esta persona.");
  const admin = createServiceClient();
  const { error } = await admin.from("app_users").update({ activo }).eq("id", userId);
  if (error) throw new Error(error.message);
  await admin.auth.admin
    .updateUserById(userId, { ban_duration: activo ? "none" : "876000h" })
    .catch(() => {});
  revalidatePath("/usuarios");
}

export async function eliminarUsuarioAction(userId: string) {
  const yo = await requireAdmin();
  if (userId === yo.id) throw new Error("No puedes eliminar tu propia cuenta.");
  const objetivo = await getAppUserById(userId);
  if (!objetivo) throw new Error("Usuario no encontrado.");
  if (!puedeAdministrarA(yo, objetivo)) throw new Error("No tienes permiso para eliminar a esta persona.");
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
  const actor = await requireGestorUsuarios();
  const objetivo = await getAppUserById(userId);
  if (!objetivo) return { error: "Usuario no encontrado." };
  if (userId !== actor.id && !puedeAdministrarA(actor, objetivo)) {
    return { error: "No tienes permiso sobre esta persona." };
  }
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const admin = createServiceClient();
  const previo = await admin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null }, error: null }));
  const metaActual = ((previo?.data?.user?.app_metadata ?? {}) as Record<string, unknown>);
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    ban_duration: objetivo.activo ? "none" : "876000h",
    app_metadata: { ...metaActual, clave_asignada: true },
  });
  if (error) return { error: error.message };

  revalidatePath("/usuarios");
  return { error: null, ok: true };
}

// --- Ãreas (solo admin) -------------------------------------------------

export async function crearAreaAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  await requireAdmin();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Falta el nombre del área." };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("areas")
    .insert({ nombre })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un área con ese nombre." };
    return { error: error.message };
  }

  revalidatePath("/procesos");
  revalidatePath("/procesos/areas");
  redirect(`/procesos/areas/${data.id}`);
}

// --- Asignaciones de área (líder / colaborador) ------------------------

export async function asignarLiderAction(areaId: string, userId: string) {
  const admin = await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("area_asignaciones").insert({
    area_id: areaId,
    user_id: userId,
    rol: "lider",
    asignado_por: admin.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/procesos");
  revalidatePath(`/procesos/areas/${areaId}`);
  revalidatePath("/procesos/areas");
}

export async function asignarColaboradorAction(areaId: string, userId: string) {
  const user = await requireAppUser();
  const supabase = dbForUser(user);
  const { error } = await supabase.from("area_asignaciones").insert({
    area_id: areaId,
    user_id: userId,
    rol: "colaborador",
    asignado_por: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/procesos");
  revalidatePath(`/procesos/areas/${areaId}`);
}

export async function quitarAsignacionAction(asignacionId: string, areaId: string) {
  const user = await requireAppUser();
  const supabase = dbForUser(user);
  const { error } = await supabase.from("area_asignaciones").delete().eq("id", asignacionId);
  if (error) throw new Error(error.message);
  revalidatePath("/procesos");
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

  const supabase = dbForUser(user);
  const { data, error } = await supabase
    .from("procesos")
    .insert({ area_id: areaId, nombre, descripcion, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/procesos/areas/${areaId}`);
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

  const supabase = dbForUser(user);
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
  const user = await requireAppUser();
  const supabase = dbForUser(user);
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
  const relacionarConTareaId = String(formData.get("relacionarConTareaId") ?? "").trim() || null;
  const relacionarNota = String(formData.get("relacionarNota") ?? "").trim() || null;
  if (!nombre) return { error: "Falta el nombre de la tarea." };

  const supabase = dbForUser(user);
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
  const user = await requireAppUser();
  const supabase = dbForUser(user);
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
  const user = await requireAppUser();
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

// --- Búsqueda para relacionar tareas -----------------------------------

export async function buscarTareasParaRelacionarAction(query: string, excluirTareaId?: string) {
  await requireAppUser();
  const { buscarTareas } = await import("@/lib/procesos/queries");
  return buscarTareas(query, excluirTareaId);
}