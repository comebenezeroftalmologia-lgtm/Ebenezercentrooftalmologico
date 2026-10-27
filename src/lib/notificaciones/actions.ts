"use server";

import { revalidatePath } from "next/cache";
import { requireAppUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { INFO_TIPO, TIPOS_NOTIFICACION, type TipoNotificacion } from "@/lib/notificaciones/tipos";

type Res = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function marcarLeidaAction(id: string): Promise<Res> {
  const user = await requireAppUser();
  if (!UUID.test(id)) return { ok: false, error: "Aviso no válido." };
  const admin = createServiceClient();
  const { error } = await admin
    .from("notificaciones")
    .update({ leida_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("leida_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function marcarTodasLeidasAction(): Promise<Res> {
  const user = await requireAppUser();
  const admin = createServiceClient();
  const { error } = await admin
    .from("notificaciones")
    .update({ leida_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("leida_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/notificaciones");
  return { ok: true };
}

export async function setPreferenciaAction(
  tipo: TipoNotificacion,
  canal: "enApp" | "email",
  valor: boolean
): Promise<Res> {
  const user = await requireAppUser();
  if (!TIPOS_NOTIFICACION.includes(tipo) || (canal !== "enApp" && canal !== "email")) {
    return { ok: false, error: "Preferencia no válida." };
  }
  const admin = createServiceClient();
  const { data: actual } = await admin
    .from("notificacion_preferencias")
    .select("en_app, email")
    .eq("user_id", user.id)
    .eq("tipo", tipo)
    .maybeSingle();
  const base = actual ?? { en_app: INFO_TIPO[tipo].porDefecto.enApp, email: INFO_TIPO[tipo].porDefecto.email };
  const { error } = await admin.from("notificacion_preferencias").upsert(
    {
      user_id: user.id,
      tipo,
      en_app: canal === "enApp" ? valor : base.en_app,
      email: canal === "email" ? valor : base.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tipo" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
