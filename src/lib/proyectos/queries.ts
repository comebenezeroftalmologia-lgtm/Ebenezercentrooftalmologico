import { cache } from "react";
import type { JSONContent } from "@tiptap/react";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import type {
  Adjunto,
  Carpeta,
  Checklist,
  Comentario,
  DocResumen,
  EntradaActividad,
  Espacio,
  EspacioArbol,
  Estado,
  Etiqueta,
  Lista,
  Miembro,
  PaginaCompleta,
  PaginaResumen,
  RolEspacio,
  Tarea,
  TareaDetalle,
  Usuario,
} from "@/lib/proyectos/types";

import { BUCKET_ADJUNTOS } from "@/lib/proyectos/utils";
export { BUCKET_ADJUNTOS };

// --- Directorio de personas --------------------------------------------
// app_users solo es legible por su dueño o por un admin (RLS), pero para
// asignar tareas y mostrar quién hizo qué hace falta el nombre de los
// compañeros. Se lee con la llave de servicio, solo en el servidor, y solo
// se expone id + nombre (nunca el correo).
export const getDirectorio = cache(async (): Promise<Usuario[]> => {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("app_users")
    .select("id, nombre_completo")
    .order("nombre_completo");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id as string, nombre: r.nombre_completo as string }));
});

// --- Mapeos --------------------------------------------------------------
function mapEspacio(r: any, rol: RolEspacio): Espacio {
  return { id: r.id, nombre: r.nombre, color: r.color, privado: r.privado, orden: r.orden, rol };
}
function mapCarpeta(r: any): Carpeta {
  return { id: r.id, espacioId: r.espacio_id, nombre: r.nombre, orden: r.orden };
}
function mapEstado(r: any): Estado {
  return { id: r.id, listaId: r.lista_id, nombre: r.nombre, tipo: r.tipo, color: r.color, orden: r.orden };
}
function mapEtiqueta(r: any): Etiqueta {
  return { id: r.id, espacioId: r.espacio_id, nombre: r.nombre, color: r.color };
}

const COLUMNAS_TAREA =
  "id, lista_id, espacio_id, parent_id, nombre, estado_id, prioridad, fecha_inicio, fecha_limite, orden, created_at, completada_at, created_by, proy_tarea_asignados(user_id), proy_tarea_etiquetas(etiqueta_id)";

function mapTarea(r: any): Tarea {
  return {
    id: r.id,
    listaId: r.lista_id,
    parentId: r.parent_id,
    nombre: r.nombre,
    estadoId: r.estado_id,
    prioridad: r.prioridad,
    fechaInicio: r.fecha_inicio,
    fechaLimite: r.fecha_limite,
    orden: r.orden,
    createdAt: r.created_at,
    completadaAt: r.completada_at,
    asignados: (r.proy_tarea_asignados ?? []).map((a: any) => a.user_id),
    etiquetas: (r.proy_tarea_etiquetas ?? []).map((e: any) => e.etiqueta_id),
    subtareasTotal: 0,
    subtareasHechas: 0,
  };
}

/** Rellena el contador de subtareas de cada tarea raíz. */
function contarSubtareas(tareas: Tarea[], estados: Estado[]): Tarea[] {
  const cerrados = new Set(estados.filter((e) => e.tipo === "cerrado").map((e) => e.id));
  const total = new Map<string, number>();
  const hechas = new Map<string, number>();
  for (const t of tareas) {
    if (!t.parentId) continue;
    total.set(t.parentId, (total.get(t.parentId) ?? 0) + 1);
    if (cerrados.has(t.estadoId)) hechas.set(t.parentId, (hechas.get(t.parentId) ?? 0) + 1);
  }
  return tareas.map((t) => ({
    ...t,
    subtareasTotal: total.get(t.id) ?? 0,
    subtareasHechas: hechas.get(t.id) ?? 0,
  }));
}

async function rolEn(espacioId: string, userId: string, isAdmin: boolean, privado: boolean): Promise<RolEspacio> {
  if (isAdmin) return "propietario";
  const sb = createSessionServerClient();
  const { data } = await sb
    .from("proy_espacio_miembros")
    .select("rol")
    .eq("espacio_id", espacioId)
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.rol) return data.rol as RolEspacio;
  void privado;
  return "lector";
}

export async function getMiembros(espacioId: string): Promise<Miembro[]> {
  const sb = createSessionServerClient();
  const [{ data, error }, directorio] = await Promise.all([
    sb.from("proy_espacio_miembros").select("user_id, rol").eq("espacio_id", espacioId),
    getDirectorio(),
  ]);
  if (error) throw new Error(error.message);
  const nombres = new Map(directorio.map((u) => [u.id, u.nombre]));
  const orden: Record<string, number> = { propietario: 0, editor: 1, lector: 2 };
  return (data ?? [])
    .map((m) => ({
      userId: m.user_id as string,
      nombre: nombres.get(m.user_id as string) ?? "Usuario",
      rol: m.rol as RolEspacio,
    }))
    .sort((a, b) => orden[a.rol] - orden[b.rol] || a.nombre.localeCompare(b.nombre, "es"));
}

// --- Árbol de la barra lateral ------------------------------------------
export const getArbol = cache(async (userId: string, isAdmin: boolean): Promise<EspacioArbol[]> => {
  const sb = createSessionServerClient();
  const [esp, mis, carp, lis, docs, cont] = await Promise.all([
    sb.from("proy_espacios").select("id, nombre, color, privado, orden").order("orden").order("nombre"),
    sb.from("proy_espacio_miembros").select("espacio_id, rol").eq("user_id", userId),
    sb.from("proy_carpetas").select("id, espacio_id, nombre, orden").order("orden").order("nombre"),
    sb.from("proy_listas").select("id, espacio_id, carpeta_id, nombre, orden").order("orden").order("nombre"),
    sb.from("proy_docs").select("id, espacio_id, carpeta_id, nombre, orden").order("orden").order("nombre"),
    sb.from("proy_listas_conteo").select("lista_id, abiertas"),
  ]);
  for (const r of [esp, mis, carp, lis, docs, cont]) {
    if (r.error) throw new Error(r.error.message);
  }

  const rolDe = new Map<string, RolEspacio>((mis.data ?? []).map((m) => [m.espacio_id as string, m.rol as RolEspacio]));
  const abiertas = new Map<string, number>((cont.data ?? []).map((c) => [c.lista_id as string, Number(c.abiertas)]));

  const mapLista = (r: any): Lista => ({
    id: r.id,
    espacioId: r.espacio_id,
    carpetaId: r.carpeta_id,
    nombre: r.nombre,
    orden: r.orden,
    abiertas: abiertas.get(r.id) ?? 0,
  });
  const mapDoc = (r: any): DocResumen => ({
    id: r.id,
    espacioId: r.espacio_id,
    carpetaId: r.carpeta_id,
    nombre: r.nombre,
    orden: r.orden,
  });

  return (esp.data ?? []).map((e) => {
    const rol: RolEspacio = isAdmin ? "propietario" : rolDe.get(e.id as string) ?? "lector";
    const listas = (lis.data ?? []).filter((l) => l.espacio_id === e.id).map(mapLista);
    const documentos = (docs.data ?? []).filter((d) => d.espacio_id === e.id).map(mapDoc);
    return {
      espacio: mapEspacio(e, rol),
      carpetas: (carp.data ?? [])
        .filter((c) => c.espacio_id === e.id)
        .map((c) => ({
          ...mapCarpeta(c),
          listas: listas.filter((l) => l.carpetaId === c.id),
          docs: documentos.filter((d) => d.carpetaId === c.id),
        })),
      listas: listas.filter((l) => !l.carpetaId),
      docs: documentos.filter((d) => !d.carpetaId),
    };
  });
});

// --- Lista (vistas Lista y Tablero) --------------------------------------
export interface DatosLista {
  lista: Lista;
  espacio: Espacio;
  carpeta: Carpeta | null;
  estados: Estado[];
  tareas: Tarea[];
  etiquetas: Etiqueta[];
  miembros: Miembro[];
  directorio: Usuario[];
}

export async function getLista(listaId: string, userId: string, isAdmin: boolean): Promise<DatosLista | null> {
  const sb = createSessionServerClient();
  const { data: l } = await sb
    .from("proy_listas")
    .select("id, espacio_id, carpeta_id, nombre, orden")
    .eq("id", listaId)
    .maybeSingle();
  if (!l) return null;

  const [esp, carp, est, tar, etq, miembros, directorio] = await Promise.all([
    sb.from("proy_espacios").select("id, nombre, color, privado, orden").eq("id", l.espacio_id).single(),
    l.carpeta_id
      ? sb.from("proy_carpetas").select("id, espacio_id, nombre, orden").eq("id", l.carpeta_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from("proy_estados").select("id, lista_id, nombre, tipo, color, orden").eq("lista_id", listaId).order("orden"),
    sb.from("proy_tareas").select(COLUMNAS_TAREA).eq("lista_id", listaId).order("orden").order("created_at"),
    sb.from("proy_etiquetas").select("id, espacio_id, nombre, color").eq("espacio_id", l.espacio_id).order("nombre"),
    getMiembros(l.espacio_id),
    getDirectorio(),
  ]);
  if (esp.error || !esp.data) return null;
  if (est.error) throw new Error(est.error.message);
  if (tar.error) throw new Error(tar.error.message);

  const rol = await rolEn(l.espacio_id, userId, isAdmin, esp.data.privado);
  const estados = (est.data ?? []).map(mapEstado);
  const tareas = contarSubtareas((tar.data ?? []).map(mapTarea), estados);

  return {
    lista: { id: l.id, espacioId: l.espacio_id, carpetaId: l.carpeta_id, nombre: l.nombre, orden: l.orden, abiertas: 0 },
    espacio: mapEspacio(esp.data, rol),
    carpeta: carp.data ? mapCarpeta(carp.data) : null,
    estados,
    tareas,
    etiquetas: (etq.data ?? []).map(mapEtiqueta),
    miembros,
    directorio,
  };
}

// --- Detalle de tarea ------------------------------------------------------
export interface DatosTarea {
  tarea: TareaDetalle;
  lista: Lista;
  espacio: Espacio;
  carpeta: Carpeta | null;
  estados: Estado[];
  etiquetas: Etiqueta[];
  miembros: Miembro[];
  directorio: Usuario[];
  padre: { id: string; nombre: string } | null;
}

export async function getTarea(tareaId: string, userId: string, isAdmin: boolean): Promise<DatosTarea | null> {
  const sb = createSessionServerClient();
  const { data: t } = await sb.from("proy_tareas").select(COLUMNAS_TAREA + ", descripcion").eq("id", tareaId).maybeSingle();
  if (!t) return null;
  const row = t as any;

  const [lis, esp, est, sub, chk, adj, com, act, etq, miembros, directorio, padre] = await Promise.all([
    sb.from("proy_listas").select("id, espacio_id, carpeta_id, nombre, orden").eq("id", row.lista_id).single(),
    sb.from("proy_espacios").select("id, nombre, color, privado, orden").eq("id", row.espacio_id).single(),
    sb.from("proy_estados").select("id, lista_id, nombre, tipo, color, orden").eq("lista_id", row.lista_id).order("orden"),
    sb.from("proy_tareas").select(COLUMNAS_TAREA).eq("parent_id", tareaId).order("orden").order("created_at"),
    sb
      .from("proy_checklists")
      .select("id, titulo, orden, proy_checklist_items(id, checklist_id, texto, hecho, orden)")
      .eq("tarea_id", tareaId)
      .order("orden"),
    sb.from("proy_adjuntos").select("id, nombre, storage_path, mime, tamano, created_at, created_by").eq("tarea_id", tareaId).order("created_at"),
    sb.from("proy_comentarios").select("id, user_id, texto, created_at, editado_at").eq("tarea_id", tareaId).order("created_at"),
    sb.from("proy_actividad").select("id, user_id, tipo, detalle, created_at").eq("tarea_id", tareaId).order("created_at"),
    sb.from("proy_etiquetas").select("id, espacio_id, nombre, color").eq("espacio_id", row.espacio_id).order("nombre"),
    getMiembros(row.espacio_id),
    getDirectorio(),
    row.parent_id
      ? sb.from("proy_tareas").select("id, nombre").eq("id", row.parent_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (lis.error || !lis.data || esp.error || !esp.data) return null;

  const rol = await rolEn(row.espacio_id, userId, isAdmin, esp.data.privado);
  const estados = (est.data ?? []).map(mapEstado);
  const carpetaRow = lis.data.carpeta_id
    ? (await sb.from("proy_carpetas").select("id, espacio_id, nombre, orden").eq("id", lis.data.carpeta_id).maybeSingle()).data
    : null;

  // URLs firmadas (1 h) para los adjuntos — el bucket es privado.
  const adjRows = (adj.data ?? []) as any[];
  const urls = new Map<string, string>();
  if (adjRows.length > 0) {
    const { data: firmadas } = await sb.storage
      .from(BUCKET_ADJUNTOS)
      .createSignedUrls(adjRows.map((a) => a.storage_path), 3600);
    for (const f of firmadas ?? []) {
      if (f.path && f.signedUrl) urls.set(f.path, f.signedUrl);
    }
  }
  const adjuntos: Adjunto[] = adjRows.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    mime: a.mime,
    tamano: a.tamano,
    createdAt: a.created_at,
    createdBy: a.created_by,
    url: urls.get(a.storage_path) ?? null,
  }));

  const checklists: Checklist[] = ((chk.data ?? []) as any[]).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    orden: c.orden,
    items: ((c.proy_checklist_items ?? []) as any[])
      .map((i) => ({ id: i.id, checklistId: i.checklist_id, texto: i.texto, hecho: i.hecho, orden: i.orden }))
      .sort((a, b) => a.orden - b.orden),
  }));

  const comentarios: Comentario[] = ((com.data ?? []) as any[]).map((c) => ({
    id: c.id,
    userId: c.user_id,
    texto: c.texto,
    createdAt: c.created_at,
    editadoAt: c.editado_at,
  }));
  const actividad: EntradaActividad[] = ((act.data ?? []) as any[]).map((a) => ({
    id: a.id,
    userId: a.user_id,
    tipo: a.tipo,
    detalle: a.detalle ?? {},
    createdAt: a.created_at,
  }));

  const subtareas = contarSubtareas((sub.data ?? []).map(mapTarea), estados);
  const base = mapTarea(row);

  return {
    tarea: {
      ...base,
      espacioId: row.espacio_id,
      descripcion: (row.descripcion ?? null) as JSONContent | null,
      createdBy: row.created_by,
      subtareas,
      subtareasTotal: subtareas.length,
      subtareasHechas: subtareas.filter((s) => estados.find((e) => e.id === s.estadoId)?.tipo === "cerrado").length,
      checklists,
      adjuntos,
      comentarios,
      actividad,
    },
    lista: {
      id: lis.data.id,
      espacioId: lis.data.espacio_id,
      carpetaId: lis.data.carpeta_id,
      nombre: lis.data.nombre,
      orden: lis.data.orden,
      abiertas: 0,
    },
    espacio: mapEspacio(esp.data, rol),
    carpeta: carpetaRow ? mapCarpeta(carpetaRow) : null,
    estados,
    etiquetas: (etq.data ?? []).map(mapEtiqueta),
    miembros,
    directorio,
    padre: padre.data ? { id: (padre.data as any).id, nombre: (padre.data as any).nombre } : null,
  };
}

// --- Documentos ---------------------------------------------------------------
export interface DatosDoc {
  doc: DocResumen & { updatedAt: string; createdBy: string | null };
  espacio: Espacio;
  carpeta: Carpeta | null;
  paginas: PaginaResumen[];
  pagina: PaginaCompleta | null;
  directorio: Usuario[];
}

function mapPagina(r: any): PaginaResumen {
  return {
    id: r.id,
    docId: r.doc_id,
    parentId: r.parent_id,
    titulo: r.titulo,
    orden: r.orden,
    createdBy: r.created_by,
    colaboradores: r.colaboradores ?? [],
    updatedAt: r.updated_at,
  };
}

export async function getDoc(docId: string, paginaId: string | undefined, userId: string, isAdmin: boolean): Promise<DatosDoc | null> {
  const sb = createSessionServerClient();
  const { data: d } = await sb
    .from("proy_docs")
    .select("id, espacio_id, carpeta_id, nombre, orden, created_by, updated_at")
    .eq("id", docId)
    .maybeSingle();
  if (!d) return null;

  const [esp, carp, pag, directorio] = await Promise.all([
    sb.from("proy_espacios").select("id, nombre, color, privado, orden").eq("id", d.espacio_id).single(),
    d.carpeta_id
      ? sb.from("proy_carpetas").select("id, espacio_id, nombre, orden").eq("id", d.carpeta_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb
      .from("proy_doc_paginas")
      .select("id, doc_id, parent_id, titulo, orden, created_by, colaboradores, updated_at")
      .eq("doc_id", docId)
      .order("orden")
      .order("created_at"),
    getDirectorio(),
  ]);
  if (esp.error || !esp.data) return null;
  if (pag.error) throw new Error(pag.error.message);

  const rol = await rolEn(d.espacio_id, userId, isAdmin, esp.data.privado);
  const paginas = (pag.data ?? []).map(mapPagina);
  const raices = paginas.filter((p) => !p.parentId);
  const elegida = paginas.find((p) => p.id === paginaId) ?? raices[0] ?? paginas[0] ?? null;

  let pagina: PaginaCompleta | null = null;
  if (elegida) {
    const { data: contenido } = await sb.from("proy_doc_paginas").select("contenido").eq("id", elegida.id).single();
    pagina = { ...elegida, contenido: (contenido?.contenido ?? null) as JSONContent | null };
  }

  return {
    doc: {
      id: d.id,
      espacioId: d.espacio_id,
      carpetaId: d.carpeta_id,
      nombre: d.nombre,
      orden: d.orden,
      updatedAt: d.updated_at,
      createdBy: d.created_by,
    },
    espacio: mapEspacio(esp.data, rol),
    carpeta: carp.data ? mapCarpeta(carp.data) : null,
    paginas,
    pagina,
    directorio,
  };
}

// --- Inicio: mis tareas pendientes ------------------------------------------
export interface MiTarea {
  id: string;
  nombre: string;
  fechaLimite: string | null;
  prioridad: Tarea["prioridad"];
  estado: { nombre: string; color: string };
  lista: { id: string; nombre: string };
  espacio: { id: string; nombre: string; color: string } | null;
}

export async function getMisTareas(userId: string): Promise<MiTarea[]> {
  const sb = createSessionServerClient();
  const { data, error } = await sb
    .from("proy_tarea_asignados")
    .select(
      "proy_tareas!inner(id, nombre, fecha_limite, prioridad, espacio_id, proy_estados!inner(nombre, color, tipo), proy_listas!inner(id, nombre))"
    )
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const filas = ((data ?? []) as any[])
    .map((r) => (Array.isArray(r.proy_tareas) ? r.proy_tareas[0] : r.proy_tareas))
    .filter((t) => t && t.proy_estados?.tipo !== "cerrado");

  const ids = Array.from(new Set(filas.map((t) => t.espacio_id as string)));
  const espacios = new Map<string, { id: string; nombre: string; color: string }>();
  if (ids.length > 0) {
    const { data: esp } = await sb.from("proy_espacios").select("id, nombre, color").in("id", ids);
    for (const e of esp ?? []) espacios.set(e.id as string, e as any);
  }

  const lista: MiTarea[] = filas.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    fechaLimite: t.fecha_limite,
    prioridad: t.prioridad,
    estado: { nombre: t.proy_estados.nombre, color: t.proy_estados.color },
    lista: { id: t.proy_listas.id, nombre: t.proy_listas.nombre },
    espacio: espacios.get(t.espacio_id) ?? null,
  }));
  // Primero lo que vence antes; sin fecha al final.
  return lista.sort((a, b) => {
    if (a.fechaLimite && b.fechaLimite) return a.fechaLimite.localeCompare(b.fechaLimite);
    if (a.fechaLimite) return -1;
    if (b.fechaLimite) return 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}
