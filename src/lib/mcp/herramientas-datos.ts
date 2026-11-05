import { createServiceClient } from "@/lib/supabase/server";
import type { Resultado } from "@/lib/bot/acciones";
import type { Contexto, Herramienta } from "./tipos";

// Acceso a los datos de TODA la aplicación (todas las tablas de Supabase) con la service_role.
// Las lecturas están siempre disponibles; las escrituras exigen MCP_PERMITIR_ESCRITURA=true,
// confirmar=true y, para actualizar/eliminar, filtros explícitos y un tope de filas afectadas.
// Cada escritura queda registrada (mejor esfuerzo) en la tabla mcp_auditoria.

const escrituraHabilitada = () => process.env.MCP_PERMITIR_ESCRITURA === "true";
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const COLUMNAS_OK = /^[A-Za-z0-9_,*():!.\s]+$/;
const LIMITE_MAX = 500;
const TEXTO_MAX = 90_000;

// ---------------------------------------------------------------- esquema (OpenAPI de PostgREST)

type Columna = { type?: string; format?: string; description?: string };
type Tabla = { columnas: Record<string, Columna>; requeridas: string[] };
let cache: { tablas: Map<string, Tabla>; leido: number } | null = null;

async function esquema(): Promise<Map<string, Tabla> | null> {
  if (cache && Date.now() - cache.leido < 5 * 60_000) return cache.tablas;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return cache?.tablas ?? null;
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return cache?.tablas ?? null;
    const doc = (await res.json()) as { definitions?: Record<string, { properties?: Record<string, Columna>; required?: string[] }> };
    const tablas = new Map<string, Tabla>();
    for (const [nombre, def] of Object.entries(doc.definitions ?? {})) {
      tablas.set(nombre, { columnas: def.properties ?? {}, requeridas: def.required ?? [] });
    }
    if (tablas.size) cache = { tablas, leido: Date.now() };
    return tablas.size ? tablas : cache?.tablas ?? null;
  } catch {
    return cache?.tablas ?? null;
  }
}

async function comprobarTabla(nombre: unknown): Promise<Resultado | null> {
  if (typeof nombre !== "string" || !IDENT.test(nombre)) {
    return { status: 400, body: { error: "Nombre de tabla inválido." } };
  }
  const t = await esquema();
  if (t && !t.has(nombre)) {
    return { status: 404, body: { error: `La tabla "${nombre}" no existe.`, tablas: [...t.keys()].sort() } };
  }
  return null;
}

// ---------------------------------------------------------------- filtros

type Fb = { filter(columna: string, operador: string, valor: string): Fb };
type Filtro = { columna?: unknown; operador?: unknown; valor?: unknown };
const OPERADORES = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"]);

function comillas(v: unknown): string {
  const s = String(v);
  return /[,()"\\\s]/.test(s) ? `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : s;
}

function aplicarFiltros<T>(q: T, filtros: unknown): { q: T; error?: string } {
  if (filtros === undefined || filtros === null) return { q };
  if (!Array.isArray(filtros)) return { q, error: "filtros debe ser una lista." };
  let actual = q as unknown as Fb;
  for (const f of filtros as Filtro[]) {
    const col = f?.columna;
    const op = f?.operador ?? "eq";
    if (typeof col !== "string" || !IDENT.test(col)) return { q, error: "Cada filtro necesita una columna válida." };
    if (typeof op !== "string" || !OPERADORES.has(op)) return { q, error: `Operador no permitido: ${String(op)}. Usa ${[...OPERADORES].join(", ")}.` };
    let valor: string;
    if (op === "in") {
      if (!Array.isArray(f.valor) || f.valor.length === 0) return { q, error: 'El operador "in" necesita una lista de valores.' };
      valor = `(${f.valor.map(comillas).join(",")})`;
    } else if (op === "is") {
      const v = String(f.valor);
      if (!["null", "true", "false"].includes(v)) return { q, error: 'El operador "is" solo acepta null, true o false.' };
      valor = v;
    } else {
      if (f.valor === undefined || f.valor === null) return { q, error: `Falta el valor del filtro sobre ${col}.` };
      valor = String(f.valor);
    }
    actual = actual.filter(col, op, valor);
  }
  return { q: actual as unknown as T };
}

const ESQUEMA_FILTROS = {
  type: "array",
  description:
    'Lista de filtros que se combinan con Y. Cada uno: {"columna":"estado","operador":"eq","valor":"AC"}. Operadores: eq, neq, gt, gte, lt, lte, like, ilike (usa % como comodín), is (valor null/true/false), in (valor = lista).',
  items: {
    type: "object",
    properties: {
      columna: { type: "string" },
      operador: { type: "string", enum: [...OPERADORES] },
      valor: {},
    },
    required: ["columna"],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------- utilidades

const recortar = (v: unknown): unknown => {
  const t = JSON.stringify(v);
  if (t.length <= TEXTO_MAX) return v;
  return { truncado: true, nota: "Resultado recortado: usa limite, columnas o filtros más estrechos.", vista_previa: t.slice(0, TEXTO_MAX) };
};

async function auditar(herramienta: string, tabla: string | null, detalle: Record<string, unknown>) {
  try {
    await createServiceClient().from("mcp_auditoria").insert({ herramienta, tabla, detalle });
  } catch {
    /* la auditoría no debe romper la operación (la tabla puede no existir todavía) */
  }
}

const exigirEscritura = (a: Record<string, unknown>): Resultado | null => {
  if (!escrituraHabilitada()) return { status: 403, body: { error: "La escritura por MCP está deshabilitada (MCP_PERMITIR_ESCRITURA)." } };
  if (a.confirmar !== true) return { status: 400, body: { error: "Falta confirmar=true: confirma explícitamente la operación." } };
  return null;
};

const errorDb = (e: { message: string; code?: string; details?: string; hint?: string }): Resultado => ({
  status: 400,
  body: { error: e.message, codigo: e.code, detalle: e.details, pista: e.hint },
});

const admin = () => createServiceClient();

// ---------------------------------------------------------------- herramientas

export const herramientasDatos: Herramienta[] = [
  {
    name: "listar_tablas",
    description:
      "Lista todas las tablas (y vistas) de la base de datos de la aplicación de Ebenezér, con su número de columnas. Úsala primero para saber qué datos existen: leads, cartera, frecuencias, proyectos, talento humano, notificaciones, etc.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { title: "Listar tablas", readOnlyHint: true, openWorldHint: false },
    run: async () => {
      const t = await esquema();
      if (!t) return { status: 502, body: { error: "No se pudo leer el esquema de la base de datos." } };
      const tablas = [...t.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([nombre, d]) => ({ tabla: nombre, columnas: Object.keys(d.columnas).length }));
      return { status: 200, body: { total: tablas.length, tablas } };
    },
  },
  {
    name: "describir_tabla",
    description: "Describe una tabla: nombre, tipo de cada columna y cuáles son obligatorias al insertar.",
    inputSchema: {
      type: "object",
      properties: { tabla: { type: "string" } },
      required: ["tabla"],
      additionalProperties: false,
    },
    annotations: { title: "Describir tabla", readOnlyHint: true, openWorldHint: false },
    run: async (a) => {
      const mal = await comprobarTabla(a.tabla);
      if (mal) return mal;
      const t = (await esquema())?.get(String(a.tabla));
      if (!t) return { status: 502, body: { error: "No se pudo leer el esquema de la base de datos." } };
      const columnas = Object.entries(t.columnas).map(([nombre, c]) => ({
        columna: nombre,
        tipo: c.format ?? c.type ?? null,
        obligatoria: t.requeridas.includes(nombre),
        nota: c.description ?? undefined,
      }));
      return { status: 200, body: { tabla: a.tabla, columnas } };
    },
  },
  {
    name: "consultar",
    description:
      "Consulta filas de una tabla de la aplicación (solo lectura). Admite columnas, filtros, orden, límite (máx. 500) y desplazamiento. Ejemplo: tabla=\"proy_tareas\", filtros=[{\"columna\":\"completada_at\",\"operador\":\"is\",\"valor\":\"null\"}].",
    inputSchema: {
      type: "object",
      properties: {
        tabla: { type: "string" },
        columnas: { type: "string", description: 'Columnas separadas por coma, o "*" (por defecto).' },
        filtros: ESQUEMA_FILTROS,
        ordenar: {
          type: "array",
          description: 'Orden: [{"columna":"created_at","descendente":true}].',
          items: {
            type: "object",
            properties: { columna: { type: "string" }, descendente: { type: "boolean" } },
            required: ["columna"],
            additionalProperties: false,
          },
        },
        limite: { type: "integer", description: "Filas a devolver (1–500, por defecto 50)." },
        desde: { type: "integer", description: "Fila desde la que empezar (para paginar)." },
      },
      required: ["tabla"],
      additionalProperties: false,
    },
    annotations: { title: "Consultar tabla", readOnlyHint: true, openWorldHint: false },
    run: async (a) => {
      const mal = await comprobarTabla(a.tabla);
      if (mal) return mal;
      const columnas = typeof a.columnas === "string" && a.columnas.trim() ? a.columnas.trim() : "*";
      if (!COLUMNAS_OK.test(columnas)) return { status: 400, body: { error: "columnas contiene caracteres no permitidos." } };
      const limite = Math.min(Math.max(Number(a.limite) || 50, 1), LIMITE_MAX);
      const desde = Math.max(Number(a.desde) || 0, 0);

      let q = admin().from(String(a.tabla)).select(columnas);
      const f = aplicarFiltros(q, a.filtros);
      if (f.error) return { status: 400, body: { error: f.error } };
      q = f.q;
      if (Array.isArray(a.ordenar)) {
        for (const o of a.ordenar as { columna?: unknown; descendente?: unknown }[]) {
          if (typeof o.columna !== "string" || !IDENT.test(o.columna)) return { status: 400, body: { error: "Columna de orden inválida." } };
          q = q.order(o.columna, { ascending: o.descendente !== true });
        }
      }
      const { data, error } = await q.range(desde, desde + limite - 1);
      if (error) return errorDb(error);
      return { status: 200, body: { tabla: a.tabla, devueltas: data.length, desde, filas: recortar(data) } };
    },
  },
  {
    name: "contar",
    description: "Cuenta las filas de una tabla que cumplen los filtros (solo lectura).",
    inputSchema: {
      type: "object",
      properties: { tabla: { type: "string" }, filtros: ESQUEMA_FILTROS },
      required: ["tabla"],
      additionalProperties: false,
    },
    annotations: { title: "Contar filas", readOnlyHint: true, openWorldHint: false },
    run: async (a) => {
      const mal = await comprobarTabla(a.tabla);
      if (mal) return mal;
      const f = aplicarFiltros(admin().from(String(a.tabla)).select("*", { count: "exact", head: true }), a.filtros);
      if (f.error) return { status: 400, body: { error: f.error } };
      const { count, error } = await f.q;
      if (error) return errorDb(error);
      return { status: 200, body: { tabla: a.tabla, total: count ?? 0 } };
    },
  },
  {
    name: "insertar",
    description:
      "Inserta filas en una tabla (hasta 200). Con en_conflicto hace upsert por esa(s) columna(s). Exige confirmar=true y que MCP_PERMITIR_ESCRITURA esté activa. Usa describir_tabla antes para conocer las columnas obligatorias.",
    inputSchema: {
      type: "object",
      properties: {
        tabla: { type: "string" },
        filas: { type: "array", items: { type: "object" }, description: "Filas a insertar (objetos columna→valor)." },
        en_conflicto: { type: "string", description: "Opcional: columna(s), separadas por coma, para actualizar si ya existe (upsert)." },
        confirmar: { type: "boolean", description: "Debe ser true." },
      },
      required: ["tabla", "filas", "confirmar"],
      additionalProperties: false,
    },
    annotations: { title: "Insertar filas", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    habilitada: escrituraHabilitada,
    run: async (a) => {
      const bloqueo = exigirEscritura(a);
      if (bloqueo) return bloqueo;
      const mal = await comprobarTabla(a.tabla);
      if (mal) return mal;
      const filas = a.filas;
      if (!Array.isArray(filas) || filas.length < 1 || filas.length > 200 || filas.some((x) => typeof x !== "object" || x === null || Array.isArray(x))) {
        return { status: 400, body: { error: "filas debe ser una lista de 1 a 200 objetos." } };
      }
      const tabla = String(a.tabla);
      const conflicto = typeof a.en_conflicto === "string" && a.en_conflicto.trim() ? a.en_conflicto.trim() : null;
      if (conflicto && !COLUMNAS_OK.test(conflicto)) return { status: 400, body: { error: "en_conflicto inválido." } };
      const base = admin().from(tabla);
      const { data, error } = conflicto
        ? await base.upsert(filas as Record<string, unknown>[], { onConflict: conflicto }).select()
        : await base.insert(filas as Record<string, unknown>[]).select();
      if (error) return errorDb(error);
      await auditar("insertar", tabla, { filas: data.length, en_conflicto: conflicto });
      return { status: 200, body: { tabla, insertadas: data.length, filas: recortar(data) } };
    },
  },
  {
    name: "actualizar",
    description:
      "Actualiza filas de una tabla. Exige filtros (nunca actualiza toda la tabla), confirmar=true y MCP_PERMITIR_ESCRITURA activa. Si los filtros alcanzan más filas que maximo_filas (por defecto 50) no hace nada y avisa cuántas son.",
    inputSchema: {
      type: "object",
      properties: {
        tabla: { type: "string" },
        valores: { type: "object", description: "Columnas a cambiar (columna→nuevo valor)." },
        filtros: { ...ESQUEMA_FILTROS, minItems: 1 },
        maximo_filas: { type: "integer", description: "Tope de filas que puede afectar (por defecto 50)." },
        confirmar: { type: "boolean", description: "Debe ser true." },
      },
      required: ["tabla", "valores", "filtros", "confirmar"],
      additionalProperties: false,
    },
    annotations: { title: "Actualizar filas", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    habilitada: escrituraHabilitada,
    run: async (a) => {
      const bloqueo = exigirEscritura(a);
      if (bloqueo) return bloqueo;
      const mal = await comprobarTabla(a.tabla);
      if (mal) return mal;
      const valores = a.valores;
      if (typeof valores !== "object" || valores === null || Array.isArray(valores) || Object.keys(valores).length === 0) {
        return { status: 400, body: { error: "valores debe ser un objeto con al menos una columna." } };
      }
      if (!Array.isArray(a.filtros) || a.filtros.length === 0) return { status: 400, body: { error: "actualizar exige al menos un filtro." } };
      const tabla = String(a.tabla);
      const tope = Math.max(Number(a.maximo_filas) || 50, 1);

      const previo = aplicarFiltros(admin().from(tabla).select("*", { count: "exact", head: true }), a.filtros);
      if (previo.error) return { status: 400, body: { error: previo.error } };
      const { count, error: errCount } = await previo.q;
      if (errCount) return errorDb(errCount);
      if ((count ?? 0) > tope) {
        return { status: 409, body: { error: `Los filtros alcanzan ${count} filas y el tope es ${tope}. No se cambió nada; ajusta los filtros o sube maximo_filas.`, coinciden: count } };
      }
      const f = aplicarFiltros(admin().from(tabla).update(valores as Record<string, unknown>), a.filtros);
      if (f.error) return { status: 400, body: { error: f.error } };
      const { data, error } = await f.q.select();
      if (error) return errorDb(error);
      await auditar("actualizar", tabla, { filtros: a.filtros, columnas: Object.keys(valores), filas_afectadas: data.length });
      return { status: 200, body: { tabla, actualizadas: data.length, filas: recortar(data) } };
    },
  },
  {
    name: "eliminar",
    description:
      "ELIMINA filas de una tabla (irreversible). Exige filtros (nunca vacía toda la tabla), confirmar=true y MCP_PERMITIR_ESCRITURA activa. Si los filtros alcanzan más filas que maximo_filas (por defecto 20) no borra nada y avisa. Devuelve las filas borradas.",
    inputSchema: {
      type: "object",
      properties: {
        tabla: { type: "string" },
        filtros: { ...ESQUEMA_FILTROS, minItems: 1 },
        maximo_filas: { type: "integer", description: "Tope de filas que puede borrar (por defecto 20)." },
        confirmar: { type: "boolean", description: "Debe ser true." },
      },
      required: ["tabla", "filtros", "confirmar"],
      additionalProperties: false,
    },
    annotations: { title: "Eliminar filas", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    habilitada: escrituraHabilitada,
    run: async (a) => {
      const bloqueo = exigirEscritura(a);
      if (bloqueo) return bloqueo;
      const mal = await comprobarTabla(a.tabla);
      if (mal) return mal;
      if (!Array.isArray(a.filtros) || a.filtros.length === 0) return { status: 400, body: { error: "eliminar exige al menos un filtro." } };
      const tabla = String(a.tabla);
      const tope = Math.max(Number(a.maximo_filas) || 20, 1);

      const previo = aplicarFiltros(admin().from(tabla).select("*", { count: "exact", head: true }), a.filtros);
      if (previo.error) return { status: 400, body: { error: previo.error } };
      const { count, error: errCount } = await previo.q;
      if (errCount) return errorDb(errCount);
      if ((count ?? 0) > tope) {
        return { status: 409, body: { error: `Los filtros alcanzan ${count} filas y el tope es ${tope}. No se borró nada; ajusta los filtros o sube maximo_filas.`, coinciden: count } };
      }
      const f = aplicarFiltros(admin().from(tabla).delete(), a.filtros);
      if (f.error) return { status: 400, body: { error: f.error } };
      const { data, error } = await f.q.select();
      if (error) return errorDb(error);
      await auditar("eliminar", tabla, { filtros: a.filtros, filas_afectadas: data.length });
      return { status: 200, body: { tabla, eliminadas: data.length, filas: recortar(data) } };
    },
  },
  {
    name: "ejecutar_sincronizacion",
    description:
      "Dispara ahora una sincronización de la aplicación: clientify (leads y oportunidades), meta_ads (gasto de campañas), social (Instagram/Facebook) o notificaciones (aviso diario de fechas límite). Normalmente corren solas por cron; úsala para refrescar datos o probar. Exige confirmar=true y MCP_PERMITIR_ESCRITURA activa.",
    inputSchema: {
      type: "object",
      properties: {
        tarea: { type: "string", enum: ["clientify", "meta_ads", "social", "notificaciones"] },
        confirmar: { type: "boolean", description: "Debe ser true." },
      },
      required: ["tarea", "confirmar"],
      additionalProperties: false,
    },
    annotations: { title: "Ejecutar sincronización", readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    habilitada: escrituraHabilitada,
    run: async (a, ctx: Contexto) => {
      const bloqueo = exigirEscritura(a);
      if (bloqueo) return bloqueo;
      const rutas: Record<string, string> = {
        clientify: "/api/sync/clientify",
        meta_ads: "/api/sync/meta-ads",
        social: "/api/sync/social",
        notificaciones: "/api/cron/notificaciones",
      };
      const ruta = rutas[String(a.tarea)];
      if (!ruta) return { status: 400, body: { error: "tarea inválida." } };
      const secreto = process.env.CRON_SECRET;
      if (!secreto) return { status: 503, body: { error: "CRON_SECRET no está configurado." } };
      try {
        const res = await fetch(`${ctx.origen}${ruta}`, {
          headers: { authorization: `Bearer ${secreto}` },
          cache: "no-store",
          signal: AbortSignal.timeout(55_000),
        });
        const texto = await res.text();
        let cuerpo: unknown = texto.slice(0, 2000);
        try {
          cuerpo = JSON.parse(texto);
        } catch {
          /* respuesta no JSON */
        }
        await auditar("ejecutar_sincronizacion", null, { tarea: a.tarea, status: res.status });
        return { status: res.ok ? 200 : 502, body: { tarea: a.tarea, status_http: res.status, respuesta: recortar(cuerpo) } };
      } catch (e) {
        return { status: 504, body: { error: e instanceof Error ? e.message : "No respondió a tiempo", tarea: a.tarea } };
      }
    },
  },
];
