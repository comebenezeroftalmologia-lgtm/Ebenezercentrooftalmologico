"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { puedeGestionarConocimiento, requireAdmin, requireAppUser, requireDesarrollador } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { EXTENSIONES_PERMITIDAS, TAMANO_MAXIMO_BYTES, extensionDe, extraerTexto, partirEnFragmentos } from "@/lib/ayuda/extraer";

type Res<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const BUCKET = "conocimiento";
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function requireGestor() {
  const user = await requireAppUser();
  if (!puedeGestionarConocimiento(user)) throw new Error("No tienes permiso para gestionar el conocimiento.");
  return user;
}

const limpiar = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s ? s.slice(0, max) : null;
};

// --- Subida de documentos (directo a Storage, sin pasar por el servidor) ---

export async function prepararSubidaAction(input: {
  nombreArchivo: string;
  tamano: number;
}): Promise<Res<{ path: string; token: string }>> {
  try {
    await requireGestor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const ext = extensionDe(input.nombreArchivo);
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
    return { ok: false, error: `Formato no permitido (.${ext || "?"}). Usa PDF, Word, Excel, texto o imagen.` };
  }
  if (!(input.tamano > 0) || input.tamano > TAMANO_MAXIMO_BYTES) {
    return { ok: false, error: "El archivo debe pesar menos de 25 MB." };
  }
  const seguro = input.nombreArchivo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
  const path = `${randomUUID()}/${seguro}`;
  const admin = createServiceClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo preparar la subida." };
  return { ok: true, path, token: data.token };
}

export async function registrarDocumentoAction(input: {
  path: string;
  nombreArchivo: string;
  mime: string;
  tamano: number;
  titulo: string;
  descripcion?: string;
  proceso?: string;
  codigo?: string;
  version?: string;
  esFormato: boolean;
}): Promise<Res<{ id: string; fragmentos: number }>> {
  let user;
  try {
    user = await requireGestor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const titulo = limpiar(input.titulo, 200);
  if (!titulo) return { ok: false, error: "Escribe un título para el documento." };

  const admin = createServiceClient();
  const { data: blob, error: dlError } = await admin.storage.from(BUCKET).download(input.path);
  if (dlError || !blob) return { ok: false, error: "No se encontró el archivo subido. Intenta de nuevo." };

  const buffer = Buffer.from(await blob.arrayBuffer());
  const texto = await extraerTexto(buffer, input.nombreArchivo);
  const fragmentos = partirEnFragmentos(texto);

  const { data: doc, error } = await admin
    .from("conocimiento_documentos")
    .insert({
      titulo,
      descripcion: limpiar(input.descripcion, 1000),
      proceso: limpiar(input.proceso, 120),
      codigo: limpiar(input.codigo, 60),
      version: limpiar(input.version, 30),
      es_formato: !!input.esFormato,
      storage_path: input.path,
      nombre_archivo: input.nombreArchivo.slice(0, 200),
      mime: input.mime?.slice(0, 120) ?? null,
      tamano_bytes: input.tamano,
      texto_extraido: fragmentos.length > 0,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !doc) return { ok: false, error: error?.message ?? "No se pudo registrar el documento." };

  // El título, el código y la descripción también son buscables: van como primer fragmento.
  const cabecera = [titulo, input.codigo, input.proceso, input.descripcion].filter(Boolean).join(" — ");
  const filas = [cabecera, ...fragmentos].map((t, i) => ({ documento_id: doc.id, orden: i, texto: t }));
  for (let i = 0; i < filas.length; i += 100) {
    const { error: fError } = await admin.from("conocimiento_fragmentos").insert(filas.slice(i, i + 100));
    if (fError) {
      await admin.from("conocimiento_documentos").delete().eq("id", doc.id);
      return { ok: false, error: "No se pudo indexar el texto: " + fError.message };
    }
  }

  revalidatePath("/ayuda/conocimiento/gestionar");
  return { ok: true, id: doc.id, fragmentos: fragmentos.length };
}

export async function cambiarEstadoDocumentoAction(
  id: string,
  estado: "borrador" | "publicado" | "obsoleto"
): Promise<Res> {
  try {
    await requireGestor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!UUID.test(id)) return { ok: false, error: "Documento no válido." };
  const admin = createServiceClient();

  const { data: doc } = await admin.from("conocimiento_documentos").select("codigo").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, error: "No se encontró el documento." };

  const { error } = await admin
    .from("conocimiento_documentos")
    .update({
      estado,
      updated_at: new Date().toISOString(),
      publicado_at: estado === "publicado" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Una versión nueva reemplaza a la anterior: mismo código => la anterior queda obsoleta.
  if (estado === "publicado" && doc.codigo) {
    await admin
      .from("conocimiento_documentos")
      .update({ estado: "obsoleto", updated_at: new Date().toISOString() })
      .eq("codigo", doc.codigo)
      .eq("estado", "publicado")
      .neq("id", id);
  }

  revalidatePath("/ayuda/conocimiento/gestionar");
  return { ok: true };
}

export async function eliminarDocumentoAction(id: string): Promise<Res> {
  try {
    await requireGestor();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!UUID.test(id)) return { ok: false, error: "Documento no válido." };
  const admin = createServiceClient();
  const { data: doc } = await admin.from("conocimiento_documentos").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, error: "No se encontró el documento." };

  const { error } = await admin.from("conocimiento_documentos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await admin.storage.from(BUCKET).remove([doc.storage_path]);

  revalidatePath("/ayuda/conocimiento/gestionar");
  return { ok: true };
}

/** URL firmada de 5 minutos para descargar el original. Cualquier usuario activo
 * descarga documentos publicados; los borradores/obsoletos, solo los gestores. */
export async function urlDescargaAction(id: string): Promise<Res<{ url: string }>> {
  const user = await requireAppUser();
  if (!UUID.test(id)) return { ok: false, error: "Documento no válido." };
  const admin = createServiceClient();
  const { data: doc } = await admin
    .from("conocimiento_documentos")
    .select("storage_path, nombre_archivo, estado")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { ok: false, error: "No se encontró el documento." };
  if (doc.estado !== "publicado" && !puedeGestionarConocimiento(user)) {
    return { ok: false, error: "Este documento no está publicado." };
  }
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300, {
    download: doc.nombre_archivo,
  });
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo generar la descarga." };
  return { ok: true, url: data.signedUrl };
}

export async function setGestorConocimientoAction(userId: string, valor: boolean): Promise<Res> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Solo un administrador puede dar este permiso." };
  }
  if (!UUID.test(userId)) return { ok: false, error: "Usuario no válido." };
  const admin = createServiceClient();
  const { error } = await admin.from("app_users").update({ es_gestor_conocimiento: valor }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/usuarios");
  return { ok: true };
}

// --- Reporte de fallas ---------------------------------------------------

export async function reportarFallaAction(input: {
  titulo: string;
  descripcion: string;
  modulo?: string;
  gravedad: "baja" | "media" | "alta";
}): Promise<Res> {
  const user = await requireAppUser();
  const titulo = limpiar(input.titulo, 160);
  const descripcion = typeof input.descripcion === "string" ? input.descripcion.trim().slice(0, 4000) : "";
  if (!titulo) return { ok: false, error: "Escribe un título corto de la falla." };
  if (!descripcion) return { ok: false, error: "Cuéntanos qué pasó." };
  const gravedad = ["baja", "media", "alta"].includes(input.gravedad) ? input.gravedad : "media";

  const admin = createServiceClient();
  const { error } = await admin.from("fallas_reportes").insert({
    user_id: user.id,
    titulo,
    descripcion,
    modulo: limpiar(input.modulo, 80),
    gravedad,
  });
  if (error) return { ok: false, error: "No se pudo enviar el reporte: " + error.message };
  revalidatePath("/ayuda/fallas");
  return { ok: true };
}

export async function actualizarFallaAction(
  id: string,
  estado: "nuevo" | "en_revision" | "resuelto" | "descartado",
  nota: string
): Promise<Res> {
  try {
    await requireDesarrollador();
  } catch {
    return { ok: false, error: "Solo el Desarrollador puede gestionar las fallas." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Reporte no válido." };
  const admin = createServiceClient();
  const { error } = await admin
    .from("fallas_reportes")
    .update({
      estado,
      nota_desarrollador: limpiar(nota, 1000),
      resuelto_at: estado === "resuelto" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ayuda/fallas");
  return { ok: true };
}
