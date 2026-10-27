"use server";

import { revalidatePath } from "next/cache";
import { requireAppUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { BUCKET_AVATARES, marcarAyudaVista } from "@/lib/perfil/avatar";

export async function actualizarMiPerfilAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAppUser();
    const nombreCompleto = String(formData.get("nombreCompleto") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!nombreCompleto) {
      return { ok: false, error: "El nombre completo es obligatorio." };
    }
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Ingresa un correo electrónico válido." };
    }

    const admin = createServiceClient();
    const { error } = await admin
      .from("app_users")
      .update({
        nombre_completo: nombreCompleto,
        email,
      })
      .eq("id", user.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    if (email !== user.email.toLowerCase()) {
      await admin.auth.admin.updateUserById(user.id, { email });
    }

    revalidatePath("/perfil");
    revalidatePath("/");
    revalidatePath("/procesos");
    revalidatePath("/proyectos");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar perfil." };
  }
}

const MAX_AVATAR_BYTES = 600 * 1024;

/** Sube la foto de perfil. El navegador ya la entrega recortada y comprimida (JPEG ~256 px). */
export async function subirAvatarAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAppUser();
    const archivo = formData.get("foto");
    if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elige una imagen." };
    if (archivo.size > MAX_AVATAR_BYTES) return { ok: false, error: "La imagen es demasiado pesada." };
    const bytes = Buffer.from(await archivo.arrayBuffer());
    // Firma JPEG (FF D8 FF): el cliente siempre convierte a JPEG; evita subir cualquier otra cosa.
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
      return { ok: false, error: "Formato de imagen no válido." };
    }

    const admin = createServiceClient();
    const ruta = `${user.id}/${Date.now()}.jpg`;
    const { error: upErr } = await admin.storage
      .from(BUCKET_AVATARES)
      .upload(ruta, bytes, { contentType: "image/jpeg", upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const { data: previo } = await admin.from("app_users").select("avatar_path").eq("id", user.id).maybeSingle();
    const { error } = await admin
      .from("app_users")
      .update({ avatar_path: ruta, avatar_updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      await admin.storage.from(BUCKET_AVATARES).remove([ruta]);
      return { ok: false, error: error.message };
    }
    if (previo?.avatar_path) await admin.storage.from(BUCKET_AVATARES).remove([previo.avatar_path]);

    revalidatePath("/perfil");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir la foto." };
  }
}

export async function quitarAvatarAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAppUser();
    const admin = createServiceClient();
    const { data: previo } = await admin.from("app_users").select("avatar_path").eq("id", user.id).maybeSingle();
    const { error } = await admin
      .from("app_users")
      .update({ avatar_path: null, avatar_updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    if (previo?.avatar_path) await admin.storage.from(BUCKET_AVATARES).remove([previo.avatar_path]);
    revalidatePath("/perfil");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo quitar la foto." };
  }
}

/** Marca como vistas las novedades de Ayuda (apaga el globito rojo). */
export async function marcarAyudaVistaAction(): Promise<void> {
  try {
    const user = await requireAppUser();
    await marcarAyudaVista(user.id);
  } catch {
    // best-effort
  }
}
