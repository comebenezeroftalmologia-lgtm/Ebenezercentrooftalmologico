"use server";

import { revalidatePath } from "next/cache";
import { requireAppUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

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