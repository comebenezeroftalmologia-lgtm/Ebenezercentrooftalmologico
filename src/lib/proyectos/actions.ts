"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient, createSessionServerClient } from "@/lib/supabase/server";
import { requireModuloAccess } from "@/lib/auth";
import { BUCKET_ADJUNTOS, getMiembros } from "@/lib/proyectos/queries";
import { mensajeError } from "@/lib/proyectos/utils";
import type { Etiqueta, Miembro, Prioridad, Resultado, RolEspacio, TipoEstado } from "@/lib/proyectos/types";

// Todas las acciones corren con la sesión del usuario (llave anon + RLS):
// la base de datos es quien decide si puede hacerlo. Aquí solo se valida
// la forma de los datos y se traducen los errores.

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ROLES_VALIDOS: RolEspacio[] = ["propietario", "editor", "lector"];
const PRIORIDADES_VALIDAS: Prioridad[] = ["urgente", "alta", "normal", "baja"];
const TIPOS_ESTADO: TipoEstado[] = ["abierto", "activo", "cerrado"];
const COLOR = /^#[0-9a-fA-F]{6}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_JSON = 2_000_000;

async function contexto() {
  const user = await requireModuloAccess("proyectos");
  return { user, sb: createSessionServerClient() };
}

const fallo = (e: { code?: string; message?: string } | null | undefined) =>
  ({ ok: false as const, error: mensajeError(e) });
const invalido = (m: string) => ({ ok: false as const, error: m });

function refrescar() {
  revalidatePath("/proyectos", "layout");
}

function limpiarNombre(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s.length > 0 && s.length <= max ? s : null;
}

function esJsonDoc(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  try {
    return JSON.stringify(v).length <= MAX_JSON;
  } catch {
    return false;
  }
}

// =====================================================================
// Espacios y miembros
// =====================================================================
export async function crearEspacioAction(input: {
  nombre: string;
  color: string;
  privado: boolean;
}): Promise<Resultado<{ id: string }>> {
  const { sb, user } = await contexto();
  const nombre = limpiarNombre(input.nombre, 80);
  if (!nombre) return invalido("Escribe un nombre para el espacio.");
  if (!COLOR.test(input.color)) return invalido("Color no válido.");

  // El id se genera aquí y el insert no pide devolver la fila: así la política
  // de lectura no tiene que "ver" un espacio que acaba de nacer en esa misma
  // sentencia (el trigger de alta es quien crea la membresía del dueño).
  const id = randomUUID();
  const { error } = await sb
    .from("proy_espacios")
    .insert({ id, nombre, color: input.color, privado: !!input.privado, orden: Date.now(), created_by: user.id });
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id };
}

export async function actualizarEspacioAction(
  id: string,
  patch: { nombre?: string; color?: string; privado?: boolean }
): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Espacio no válido.");
  const cambios: Record<string, unknown> = {};
  if (patch.nombre !== undefined) {
    const n = limpiarNombre(patch.nombre, 80);
    if (!n) return invalido("El nombre no puede estar vacío.");
    cambios.nombre = n;
  }
  if (patch.color !== undefined) {
    if (!COLOR.test(patch.color)) return invalido("Color no válido.");
    cambios.color = patch.color;
  }
  if (patch.privado !== undefined) cambios.privado = !!patch.privado;
  if (Object.keys(cambios).length === 0) return { ok: true };

  const { data, error } = await sb.from("proy_espacios").update(cambios).eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para modificar este espacio.");
  refrescar();
  return { ok: true };
}

export async function eliminarEspacioAction(id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Espacio no válido.");
  const { data, error } = await sb.from("proy_espacios").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("Solo un propietario puede eliminar el espacio.");
  refrescar();
  return { ok: true };
}

export async function listarMiembrosAction(espacioId: string): Promise<Resultado<{ miembros: Miembro[] }>> {
  await contexto();
  if (!UUID.test(espacioId)) return invalido("Espacio no válido.");
  try {
    return { ok: true, miembros: await getMiembros(espacioId) };
  } catch (e) {
    return invalido(e instanceof Error ? e.message : "No se pudo cargar la lista de miembros.");
  }
}

export interface Candidato {
  id: string;
  nombre: string;
  email: string;
}

/** Personas con acceso al módulo que todavía no son miembros. Solo la
 * puede pedir un propietario del espacio (o un admin). */
export async function listarCandidatosAction(espacioId: string): Promise<Resultado<{ candidatos: Candidato[] }>> {
  const { sb, user } = await contexto();
  if (!UUID.test(espacioId)) return invalido("Espacio no válido.");

  if (!user.isAdmin) {
    const { data: yo } = await sb
      .from("proy_espacio_miembros")
      .select("rol")
      .eq("espacio_id", espacioId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (yo?.rol !== "propietario") return invalido("Solo un propietario puede invitar personas.");
  }

  const admin = createServiceClient();
  const [{ data: usuarios, error: e1 }, { data: accesos, error: e2 }, { data: miembros, error: e3 }] = await Promise.all([
    admin.from("app_users").select("id, nombre_completo, email, is_admin, activo").eq("activo", true),
    admin.from("modulo_accesos").select("user_id").eq("modulo", "proyectos"),
    admin.from("proy_espacio_miembros").select("user_id").eq("espacio_id", espacioId),
  ]);
  const err = e1 ?? e2 ?? e3;
  if (err) return fallo(err);

  const conAcceso = new Set((accesos ?? []).map((a) => a.user_id as string));
  const yaMiembros = new Set((miembros ?? []).map((m) => m.user_id as string));
  const candidatos = (usuarios ?? [])
    .filter((u) => (u.is_admin || conAcceso.has(u.id as string)) && !yaMiembros.has(u.id as string))
    .map((u) => ({ id: u.id as string, nombre: u.nombre_completo as string, email: u.email as string }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { ok: true, candidatos };
}

export async function agregarMiembroAction(espacioId: string, userId: string, rol: RolEspacio): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(espacioId) || !UUID.test(userId)) return invalido("Datos no válidos.");
  if (!ROLES_VALIDOS.includes(rol)) return invalido("Rol no válido.");
  const { error } = await sb.from("proy_espacio_miembros").insert({ espacio_id: espacioId, user_id: userId, rol });
  if (error) return fallo(error);
  refrescar();
  return { ok: true };
}

export async function cambiarRolMiembroAction(espacioId: string, userId: string, rol: RolEspacio): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(espacioId) || !UUID.test(userId)) return invalido("Datos no válidos.");
  if (!ROLES_VALIDOS.includes(rol)) return invalido("Rol no válido.");
  const { data, error } = await sb
    .from("proy_espacio_miembros")
    .update({ rol })
    .eq("espacio_id", espacioId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para cambiar roles.");
  refrescar();
  return { ok: true };
}

export async function quitarMiembroAction(espacioId: string, userId: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(espacioId) || !UUID.test(userId)) return invalido("Datos no válidos.");
  const { data, error } = await sb
    .from("proy_espacio_miembros")
    .delete()
    .eq("espacio_id", espacioId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para quitar miembros.");
  refrescar();
  return { ok: true };
}

// =====================================================================
// Carpetas, listas y documentos
// =====================================================================
export async function crearCarpetaAction(espacioId: string, nombreIn: string): Promise<Resultado<{ id: string }>> {
  const { sb, user } = await contexto();
  const nombre = limpiarNombre(nombreIn);
  if (!UUID.test(espacioId)) return invalido("Espacio no válido.");
  if (!nombre) return invalido("Escribe un nombre.");
  const { data, error } = await sb
    .from("proy_carpetas")
    .insert({ espacio_id: espacioId, nombre, orden: Date.now(), created_by: user.id })
    .select("id")
    .single();
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id: data.id };
}

export async function renombrarAction(
  tipo: "carpeta" | "lista" | "doc",
  id: string,
  nombreIn: string
): Promise<Resultado> {
  const { sb } = await contexto();
  const nombre = limpiarNombre(nombreIn);
  if (!UUID.test(id)) return invalido("Elemento no válido.");
  if (!nombre) return invalido("El nombre no puede estar vacío.");
  const tabla = { carpeta: "proy_carpetas", lista: "proy_listas", doc: "proy_docs" }[tipo];
  if (!tabla) return invalido("Tipo no válido.");
  const { data, error } = await sb.from(tabla).update({ nombre }).eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para renombrar esto.");
  refrescar();
  return { ok: true };
}

export async function eliminarElementoAction(tipo: "carpeta" | "lista" | "doc", id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Elemento no válido.");
  const tabla = { carpeta: "proy_carpetas", lista: "proy_listas", doc: "proy_docs" }[tipo];
  if (!tabla) return invalido("Tipo no válido.");
  const { data, error } = await sb.from(tabla).delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar esto.");
  refrescar();
  return { ok: true };
}

export async function crearListaAction(
  espacioId: string,
  carpetaId: string | null,
  nombreIn: string
): Promise<Resultado<{ id: string }>> {
  const { sb, user } = await contexto();
  const nombre = limpiarNombre(nombreIn);
  if (!UUID.test(espacioId) || (carpetaId !== null && !UUID.test(carpetaId))) return invalido("Datos no válidos.");
  if (!nombre) return invalido("Escribe un nombre.");
  const { data, error } = await sb
    .from("proy_listas")
    .insert({ espacio_id: espacioId, carpeta_id: carpetaId, nombre, orden: Date.now(), created_by: user.id })
    .select("id")
    .single();
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id: data.id };
}

export async function crearDocAction(
  espacioId: string,
  carpetaId: string | null,
  nombreIn: string
): Promise<Resultado<{ id: string }>> {
  const { sb, user } = await contexto();
  const nombre = limpiarNombre(nombreIn);
  if (!UUID.test(espacioId) || (carpetaId !== null && !UUID.test(carpetaId))) return invalido("Datos no válidos.");
  if (!nombre) return invalido("Escribe un nombre.");
  const { data, error } = await sb
    .from("proy_docs")
    .insert({ espacio_id: espacioId, carpeta_id: carpetaId, nombre, orden: Date.now(), created_by: user.id })
    .select("id")
    .single();
  if (error) return fallo(error);
  // Todo documento nace con su primera página.
  const { error: e2 } = await sb
    .from("proy_doc_paginas")
    .insert({ doc_id: data.id, titulo: nombre, orden: Date.now(), created_by: user.id });
  if (e2) return fallo(e2);
  refrescar();
  return { ok: true, id: data.id };
}

// =====================================================================
// Páginas de documentos
// =====================================================================
export async function crearPaginaAction(
  docId: string,
  parentId: string | null,
  tituloIn?: string
): Promise<Resultado<{ id: string }>> {
  const { sb, user } = await contexto();
  if (!UUID.test(docId) || (parentId !== null && !UUID.test(parentId))) return invalido("Datos no válidos.");
  const titulo = limpiarNombre(tituloIn ?? "") ?? "Sin título";
  const { data, error } = await sb
    .from("proy_doc_paginas")
    .insert({ doc_id: docId, parent_id: parentId, titulo, orden: Date.now(), created_by: user.id })
    .select("id")
    .single();
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id: data.id };
}

/** Guarda título y/o contenido. El contenido NO refresca la página (se
 * llama mientras la persona escribe); el título sí, para actualizar el
 * árbol de páginas. */
export async function guardarPaginaAction(
  id: string,
  patch: { titulo?: string; contenido?: unknown }
): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Página no válida.");
  const cambios: Record<string, unknown> = {};
  if (patch.titulo !== undefined) {
    const t = limpiarNombre(patch.titulo, 200);
    cambios.titulo = t ?? "Sin título";
  }
  if (patch.contenido !== undefined) {
    if (!esJsonDoc(patch.contenido)) return invalido("El contenido es demasiado grande o no es válido.");
    cambios.contenido = patch.contenido;
  }
  if (Object.keys(cambios).length === 0) return { ok: true };
  const { data, error } = await sb.from("proy_doc_paginas").update(cambios).eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para editar esta página.");
  if (cambios.titulo !== undefined) refrescar();
  return { ok: true };
}

export async function eliminarPaginaAction(id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Página no válida.");
  const { data, error } = await sb.from("proy_doc_paginas").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar esta página.");
  refrescar();
  return { ok: true };
}

// =====================================================================
// Estados de una lista
// =====================================================================
export async function crearEstadoAction(
  listaId: string,
  input: { nombre: string; tipo: TipoEstado; color: string }
): Promise<Resultado<{ id: string }>> {
  const { sb } = await contexto();
  const nombre = limpiarNombre(input.nombre, 40);
  if (!UUID.test(listaId)) return invalido("Lista no válida.");
  if (!nombre) return invalido("Escribe un nombre para el estado.");
  if (!TIPOS_ESTADO.includes(input.tipo) || !COLOR.test(input.color)) return invalido("Datos no válidos.");

  // Se inserta antes del primer estado "cerrado", para que COMPLETADA siga al final.
  const { data: existentes, error: e1 } = await sb
    .from("proy_estados")
    .select("tipo, orden")
    .eq("lista_id", listaId)
    .order("orden");
  if (e1) return fallo(e1);
  const lista = existentes ?? [];
  const idxCerrado = lista.findIndex((e) => e.tipo === "cerrado");
  let orden: number;
  if (input.tipo === "cerrado" || idxCerrado === -1) {
    orden = (lista.length ? lista[lista.length - 1].orden : 0) + 1000;
  } else {
    const despues = lista[idxCerrado].orden as number;
    const antes = idxCerrado > 0 ? (lista[idxCerrado - 1].orden as number) : despues - 2000;
    orden = (antes + despues) / 2;
  }

  const { data, error } = await sb
    .from("proy_estados")
    .insert({ lista_id: listaId, nombre, tipo: input.tipo, color: input.color, orden })
    .select("id")
    .single();
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id: data.id };
}

export async function actualizarEstadoAction(
  id: string,
  patch: { nombre?: string; color?: string; tipo?: TipoEstado }
): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Estado no válido.");
  const cambios: Record<string, unknown> = {};
  if (patch.nombre !== undefined) {
    const n = limpiarNombre(patch.nombre, 40);
    if (!n) return invalido("El nombre no puede estar vacío.");
    cambios.nombre = n;
  }
  if (patch.color !== undefined) {
    if (!COLOR.test(patch.color)) return invalido("Color no válido.");
    cambios.color = patch.color;
  }
  if (patch.tipo !== undefined) {
    if (!TIPOS_ESTADO.includes(patch.tipo)) return invalido("Tipo no válido.");
    cambios.tipo = patch.tipo;
  }
  if (Object.keys(cambios).length === 0) return { ok: true };
  const { data, error } = await sb.from("proy_estados").update(cambios).eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para editar estados.");
  refrescar();
  return { ok: true };
}

/** Elimina un estado moviendo antes sus tareas al estado `destinoId`. */
export async function eliminarEstadoAction(id: string, destinoId: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id) || !UUID.test(destinoId) || id === destinoId) return invalido("Datos no válidos.");

  const { data: estados, error: e0 } = await sb
    .from("proy_estados")
    .select("id, lista_id")
    .in("id", [id, destinoId]);
  if (e0) return fallo(e0);
  const origen = estados?.find((e) => e.id === id);
  const destino = estados?.find((e) => e.id === destinoId);
  if (!origen || !destino || origen.lista_id !== destino.lista_id) return invalido("El estado destino no es válido.");

  const { error: e1 } = await sb.from("proy_tareas").update({ estado_id: destinoId }).eq("estado_id", id);
  if (e1) return fallo(e1);
  const { data, error } = await sb.from("proy_estados").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar estados.");
  refrescar();
  return { ok: true };
}

// =====================================================================
// Tareas
// =====================================================================
export async function crearTareaAction(input: {
  listaId: string;
  nombre: string;
  estadoId?: string;
  parentId?: string | null;
  asignados?: string[];
  prioridad?: Prioridad | null;
  fechaLimite?: string | null;
}): Promise<Resultado<{ id: string }>> {
  const { sb, user } = await contexto();
  const nombre = limpiarNombre(input.nombre, 300);
  if (!UUID.test(input.listaId)) return invalido("Lista no válida.");
  if (!nombre) return invalido("Escribe un nombre para la tarea.");
  if (input.estadoId && !UUID.test(input.estadoId)) return invalido("Estado no válido.");
  if (input.parentId && !UUID.test(input.parentId)) return invalido("Tarea padre no válida.");
  if (input.prioridad && !PRIORIDADES_VALIDAS.includes(input.prioridad)) return invalido("Prioridad no válida.");
  if (input.fechaLimite && !FECHA.test(input.fechaLimite)) return invalido("Fecha no válida.");

  const fila: Record<string, unknown> = {
    lista_id: input.listaId,
    nombre,
    orden: Date.now(),
    created_by: user.id,
    parent_id: input.parentId ?? null,
    prioridad: input.prioridad ?? null,
    fecha_limite: input.fechaLimite ?? null,
  };
  if (input.estadoId) fila.estado_id = input.estadoId;

  const { data, error } = await sb.from("proy_tareas").insert(fila).select("id").single();
  if (error) return fallo(error);

  const asignados = (input.asignados ?? []).filter((u) => UUID.test(u));
  if (asignados.length > 0) {
    const { error: e2 } = await sb
      .from("proy_tarea_asignados")
      .insert(asignados.map((u) => ({ tarea_id: data.id, user_id: u })));
    if (e2) return fallo(e2);
  }
  refrescar();
  return { ok: true, id: data.id };
}

export async function actualizarTareaAction(
  id: string,
  patch: {
    nombre?: string;
    estadoId?: string;
    prioridad?: Prioridad | null;
    fechaInicio?: string | null;
    fechaLimite?: string | null;
    descripcion?: unknown;
  }
): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Tarea no válida.");
  const cambios: Record<string, unknown> = {};

  if (patch.nombre !== undefined) {
    const n = limpiarNombre(patch.nombre, 300);
    if (!n) return invalido("El nombre no puede estar vacío.");
    cambios.nombre = n;
  }
  if (patch.estadoId !== undefined) {
    if (!UUID.test(patch.estadoId)) return invalido("Estado no válido.");
    cambios.estado_id = patch.estadoId;
  }
  if (patch.prioridad !== undefined) {
    if (patch.prioridad !== null && !PRIORIDADES_VALIDAS.includes(patch.prioridad)) return invalido("Prioridad no válida.");
    cambios.prioridad = patch.prioridad;
  }
  if (patch.fechaInicio !== undefined) {
    if (patch.fechaInicio !== null && !FECHA.test(patch.fechaInicio)) return invalido("Fecha no válida.");
    cambios.fecha_inicio = patch.fechaInicio;
  }
  if (patch.fechaLimite !== undefined) {
    if (patch.fechaLimite !== null && !FECHA.test(patch.fechaLimite)) return invalido("Fecha no válida.");
    cambios.fecha_limite = patch.fechaLimite;
  }
  if (patch.descripcion !== undefined) {
    if (patch.descripcion !== null && !esJsonDoc(patch.descripcion)) return invalido("La descripción no es válida.");
    cambios.descripcion = patch.descripcion;
  }
  if (Object.keys(cambios).length === 0) return { ok: true };

  const { data, error } = await sb.from("proy_tareas").update(cambios).eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para editar esta tarea.");
  // La descripción se guarda mientras se escribe: no refresca.
  if (Object.keys(cambios).some((k) => k !== "descripcion")) refrescar();
  return { ok: true };
}

/** Cambia de estado (y de posición) — usado al arrastrar en el Tablero. */
export async function moverTareaAction(id: string, estadoId: string, orden: number): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id) || !UUID.test(estadoId) || !Number.isFinite(orden)) return invalido("Datos no válidos.");
  const { data, error } = await sb
    .from("proy_tareas")
    .update({ estado_id: estadoId, orden })
    .eq("id", id)
    .select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para mover esta tarea.");
  refrescar();
  return { ok: true };
}

export async function eliminarTareaAction(id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Tarea no válida.");

  // Borra primero los archivos del almacenamiento (la tarea y sus subtareas).
  const { data: subs } = await sb.from("proy_tareas").select("id").eq("parent_id", id);
  const ids = [id, ...(subs ?? []).map((s) => s.id as string)];
  const { data: adj } = await sb.from("proy_adjuntos").select("storage_path").in("tarea_id", ids);
  const rutas = (adj ?? []).map((a) => a.storage_path as string);

  const { data, error } = await sb.from("proy_tareas").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar esta tarea.");
  if (rutas.length > 0) await sb.storage.from(BUCKET_ADJUNTOS).remove(rutas);
  refrescar();
  return { ok: true };
}

export async function setAsignadosAction(tareaId: string, userIds: string[]): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(tareaId) || !userIds.every((u) => UUID.test(u))) return invalido("Datos no válidos.");
  const deseados = new Set(userIds);

  const { data: actuales, error: e0 } = await sb.from("proy_tarea_asignados").select("user_id").eq("tarea_id", tareaId);
  if (e0) return fallo(e0);
  const hoy = new Set((actuales ?? []).map((a) => a.user_id as string));

  const agregar = [...deseados].filter((u) => !hoy.has(u));
  const quitar = [...hoy].filter((u) => !deseados.has(u));

  if (agregar.length > 0) {
    const { error } = await sb
      .from("proy_tarea_asignados")
      .insert(agregar.map((u) => ({ tarea_id: tareaId, user_id: u })));
    if (error) return fallo(error);
  }
  if (quitar.length > 0) {
    const { error } = await sb.from("proy_tarea_asignados").delete().eq("tarea_id", tareaId).in("user_id", quitar);
    if (error) return fallo(error);
  }
  refrescar();
  return { ok: true };
}

export async function setEtiquetasTareaAction(tareaId: string, etiquetaIds: string[]): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(tareaId) || !etiquetaIds.every((u) => UUID.test(u))) return invalido("Datos no válidos.");
  const deseadas = new Set(etiquetaIds);

  const { data: actuales, error: e0 } = await sb.from("proy_tarea_etiquetas").select("etiqueta_id").eq("tarea_id", tareaId);
  if (e0) return fallo(e0);
  const hoy = new Set((actuales ?? []).map((a) => a.etiqueta_id as string));
  const agregar = [...deseadas].filter((u) => !hoy.has(u));
  const quitar = [...hoy].filter((u) => !deseadas.has(u));

  if (agregar.length > 0) {
    const { error } = await sb
      .from("proy_tarea_etiquetas")
      .insert(agregar.map((e) => ({ tarea_id: tareaId, etiqueta_id: e })));
    if (error) return fallo(error);
  }
  if (quitar.length > 0) {
    const { error } = await sb.from("proy_tarea_etiquetas").delete().eq("tarea_id", tareaId).in("etiqueta_id", quitar);
    if (error) return fallo(error);
  }
  refrescar();
  return { ok: true };
}

export async function crearEtiquetaAction(
  espacioId: string,
  nombreIn: string,
  color: string
): Promise<Resultado<{ etiqueta: Etiqueta }>> {
  const { sb } = await contexto();
  const nombre = limpiarNombre(nombreIn, 40);
  if (!UUID.test(espacioId)) return invalido("Espacio no válido.");
  if (!nombre) return invalido("Escribe un nombre para la etiqueta.");
  if (!COLOR.test(color)) return invalido("Color no válido.");
  const { data, error } = await sb
    .from("proy_etiquetas")
    .insert({ espacio_id: espacioId, nombre, color })
    .select("id, espacio_id, nombre, color")
    .single();
  if (error) return fallo(error);
  refrescar();
  return {
    ok: true,
    etiqueta: { id: data.id, espacioId: data.espacio_id, nombre: data.nombre, color: data.color },
  };
}

// =====================================================================
// Listas de control (checklists)
// =====================================================================
export async function crearChecklistAction(tareaId: string, tituloIn?: string): Promise<Resultado<{ id: string }>> {
  const { sb } = await contexto();
  if (!UUID.test(tareaId)) return invalido("Tarea no válida.");
  const titulo = limpiarNombre(tituloIn ?? "") ?? "Lista de control";
  const { data, error } = await sb
    .from("proy_checklists")
    .insert({ tarea_id: tareaId, titulo, orden: Date.now() })
    .select("id")
    .single();
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id: data.id };
}

export async function renombrarChecklistAction(id: string, tituloIn: string): Promise<Resultado> {
  const { sb } = await contexto();
  const titulo = limpiarNombre(tituloIn);
  if (!UUID.test(id) || !titulo) return invalido("Datos no válidos.");
  const { data, error } = await sb.from("proy_checklists").update({ titulo }).eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para editar esto.");
  refrescar();
  return { ok: true };
}

export async function eliminarChecklistAction(id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Datos no válidos.");
  const { data, error } = await sb.from("proy_checklists").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar esto.");
  refrescar();
  return { ok: true };
}

export async function crearItemChecklistAction(checklistId: string, textoIn: string): Promise<Resultado<{ id: string }>> {
  const { sb } = await contexto();
  const texto = limpiarNombre(textoIn, 300);
  if (!UUID.test(checklistId) || !texto) return invalido("Escribe el texto del elemento.");
  const { data, error } = await sb
    .from("proy_checklist_items")
    .insert({ checklist_id: checklistId, texto, orden: Date.now() })
    .select("id")
    .single();
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id: data.id };
}

export async function actualizarItemChecklistAction(
  id: string,
  patch: { hecho?: boolean; texto?: string }
): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Datos no válidos.");
  const cambios: Record<string, unknown> = {};
  if (patch.hecho !== undefined) cambios.hecho = !!patch.hecho;
  if (patch.texto !== undefined) {
    const t = limpiarNombre(patch.texto, 300);
    if (!t) return invalido("El texto no puede estar vacío.");
    cambios.texto = t;
  }
  if (Object.keys(cambios).length === 0) return { ok: true };
  const { data, error } = await sb.from("proy_checklist_items").update(cambios).eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para editar esto.");
  refrescar();
  return { ok: true };
}

export async function eliminarItemChecklistAction(id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Datos no válidos.");
  const { data, error } = await sb.from("proy_checklist_items").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar esto.");
  refrescar();
  return { ok: true };
}

// =====================================================================
// Comentarios
// =====================================================================
export async function crearComentarioAction(tareaId: string, textoIn: string): Promise<Resultado<{ id: string }>> {
  const { sb, user } = await contexto();
  const texto = typeof textoIn === "string" ? textoIn.trim() : "";
  if (!UUID.test(tareaId)) return invalido("Tarea no válida.");
  if (!texto) return invalido("Escribe un comentario.");
  if (texto.length > 5000) return invalido("El comentario es demasiado largo (máximo 5.000 caracteres).");
  const { data, error } = await sb
    .from("proy_comentarios")
    .insert({ tarea_id: tareaId, texto, user_id: user.id })
    .select("id")
    .single();
  if (error) return fallo(error);
  refrescar();
  return { ok: true, id: data.id };
}

export async function editarComentarioAction(id: string, textoIn: string): Promise<Resultado> {
  const { sb } = await contexto();
  const texto = typeof textoIn === "string" ? textoIn.trim() : "";
  if (!UUID.test(id) || !texto || texto.length > 5000) return invalido("Comentario no válido.");
  const { data, error } = await sb
    .from("proy_comentarios")
    .update({ texto, editado_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("Solo puedes editar tus propios comentarios.");
  refrescar();
  return { ok: true };
}

export async function eliminarComentarioAction(id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Comentario no válido.");
  const { data, error } = await sb.from("proy_comentarios").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar este comentario.");
  refrescar();
  return { ok: true };
}

// =====================================================================
// Adjuntos (el archivo lo sube el navegador directo a Storage; aquí solo
// se registra, comprobando que la ruta corresponde a esta tarea)
// =====================================================================
export async function registrarAdjuntoAction(
  tareaId: string,
  archivo: { path: string; nombre: string; mime: string | null; tamano: number | null }
): Promise<Resultado> {
  const { sb, user } = await contexto();
  if (!UUID.test(tareaId)) return invalido("Tarea no válida.");

  const { data: t, error: e0 } = await sb.from("proy_tareas").select("espacio_id").eq("id", tareaId).maybeSingle();
  if (e0) return fallo(e0);
  if (!t) return invalido("Tarea no encontrada.");
  if (typeof archivo.path !== "string" || !archivo.path.startsWith(`${t.espacio_id}/${tareaId}/`)) {
    return invalido("Ruta de archivo no válida.");
  }
  const nombre = limpiarNombre(archivo.nombre, 255);
  if (!nombre) return invalido("Nombre de archivo no válido.");

  const { error } = await sb.from("proy_adjuntos").insert({
    tarea_id: tareaId,
    nombre,
    storage_path: archivo.path,
    mime: archivo.mime ? String(archivo.mime).slice(0, 120) : null,
    tamano: Number.isFinite(archivo.tamano) ? archivo.tamano : null,
    created_by: user.id,
  });
  if (error) {
    // No dejar el archivo huérfano en el almacenamiento.
    await sb.storage.from(BUCKET_ADJUNTOS).remove([archivo.path]);
    return fallo(error);
  }
  refrescar();
  return { ok: true };
}

export async function eliminarAdjuntoAction(id: string): Promise<Resultado> {
  const { sb } = await contexto();
  if (!UUID.test(id)) return invalido("Adjunto no válido.");
  const { data: a, error: e0 } = await sb.from("proy_adjuntos").select("storage_path").eq("id", id).maybeSingle();
  if (e0) return fallo(e0);
  if (!a) return invalido("Adjunto no encontrado.");
  const { data, error } = await sb.from("proy_adjuntos").delete().eq("id", id).select("id");
  if (error) return fallo(error);
  if (!data || data.length === 0) return invalido("No tienes permiso para eliminar este adjunto.");
  await sb.storage.from(BUCKET_ADJUNTOS).remove([a.storage_path as string]);
  refrescar();
  return { ok: true };
}
