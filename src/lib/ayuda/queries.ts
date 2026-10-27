import { createServiceClient } from "@/lib/supabase/server";

export interface DocumentoConocimiento {
  id: string;
  titulo: string;
  descripcion: string | null;
  proceso: string | null;
  codigo: string | null;
  version: string | null;
  esFormato: boolean;
  estado: "borrador" | "publicado" | "obsoleto";
  nombreArchivo: string;
  tamanoBytes: number | null;
  textoExtraido: boolean;
  createdAt: string;
  publicadoAt: string | null;
}

export async function listDocumentosConocimiento(): Promise<DocumentoConocimiento[]> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("conocimiento_documentos")
    .select(
      "id, titulo, descripcion, proceso, codigo, version, es_formato, estado, nombre_archivo, tamano_bytes, texto_extraido, created_at, publicado_at"
    )
    .order("created_at", { ascending: false });
  // Si la migración 020 aún no corrió, la tabla no existe.
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    proceso: r.proceso,
    codigo: r.codigo,
    version: r.version,
    esFormato: r.es_formato,
    estado: r.estado,
    nombreArchivo: r.nombre_archivo,
    tamanoBytes: r.tamano_bytes,
    textoExtraido: r.texto_extraido,
    createdAt: r.created_at,
    publicadoAt: r.publicado_at,
  }));
}

/** Formatos descargables publicados, para listarlos en el Centro de Conocimiento. */
export async function listFormatosPublicados(): Promise<{ id: string; titulo: string; codigo: string | null; proceso: string | null }[]> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("conocimiento_documentos")
    .select("id, titulo, codigo, proceso")
    .eq("estado", "publicado")
    .eq("es_formato", true)
    .order("titulo");
  return (data ?? []).map((r) => ({ id: r.id, titulo: r.titulo, codigo: r.codigo, proceso: r.proceso }));
}

export async function listPreguntasSinRespuesta(limite = 15): Promise<{ pregunta: string; veces: number; ultima: string }[]> {
  const admin = createServiceClient();
  const desde = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const { data } = await admin
    .from("ayuda_consultas")
    .select("pregunta, created_at")
    .eq("respondida", false)
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(300);
  const mapa = new Map<string, { pregunta: string; veces: number; ultima: string }>();
  for (const r of data ?? []) {
    const clave = String(r.pregunta).trim().toLowerCase();
    const previo = mapa.get(clave);
    if (previo) previo.veces += 1;
    else mapa.set(clave, { pregunta: String(r.pregunta).trim(), veces: 1, ultima: r.created_at });
  }
  return Array.from(mapa.values()).sort((a, b) => b.veces - a.veces).slice(0, limite);
}

export interface Falla {
  id: string;
  titulo: string;
  descripcion: string;
  modulo: string | null;
  gravedad: "baja" | "media" | "alta";
  estado: "nuevo" | "en_revision" | "resuelto" | "descartado";
  notaDesarrollador: string | null;
  createdAt: string;
  reportadaPor?: string;
}

function mapFalla(r: any): Falla {
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    modulo: r.modulo,
    gravedad: r.gravedad,
    estado: r.estado,
    notaDesarrollador: r.nota_desarrollador,
    createdAt: r.created_at,
    reportadaPor: r.app_users?.nombre_completo,
  };
}

export async function listMisFallas(userId: string): Promise<Falla[]> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("fallas_reportes")
    .select("id, titulo, descripcion, modulo, gravedad, estado, nota_desarrollador, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map(mapFalla);
}

export async function listTodasFallas(): Promise<Falla[]> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("fallas_reportes")
    .select("id, titulo, descripcion, modulo, gravedad, estado, nota_desarrollador, created_at, app_users(nombre_completo)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map(mapFalla);
}

export interface EventoHistorial {
  id: string;
  createdAt: string;
  accion: string;
  documentoId: string | null;
  documentoTitulo: string | null;
  documentoCodigo: string | null;
  documentoVersion: string | null;
  usuarioNombre: string;
  detalle: Record<string, any>;
}

export async function listHistorialConocimiento(limite = 300): Promise<EventoHistorial[]> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("conocimiento_historial")
    .select("id, created_at, accion, documento_id, documento_titulo, documento_codigo, documento_version, usuario_nombre, detalle")
    .order("created_at", { ascending: false })
    .limit(limite);
  return (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    accion: r.accion,
    documentoId: r.documento_id,
    documentoTitulo: r.documento_titulo,
    documentoCodigo: r.documento_codigo,
    documentoVersion: r.documento_version,
    usuarioNombre: r.usuario_nombre,
    detalle: (r.detalle ?? {}) as Record<string, any>,
  }));
}
