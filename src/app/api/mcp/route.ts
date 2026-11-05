import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { agendarCita, consultarCupos, validarAfiliado, type Resultado } from "@/lib/bot/acciones";

// Servidor MCP (Model Context Protocol) del bot de citas de Ebenezér.
// Transporte "Streamable HTTP" sin estado: cada POST es un mensaje JSON-RPC y se responde
// con JSON. Sin dependencias externas. Herramientas:
//   validar_afiliado  – ¿es afiliado activo de MutualSer? (lee la base sincronizada del Sheet)
//   consultar_cupos   – cupos libres reales de SISMA para una fecha
//   agendar_cita      – crea una cita REAL en SISMA; solo existe si MCP_PERMITIR_AGENDAR=true
// Autenticación: llave propia MCP_API_KEY (distinta de BOT_API_KEY), por uno de estos medios:
//   Authorization: Bearer <llave>   |   x-mcp-key: <llave>   |   ?key=<llave> en la URL
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const VERSIONES = ["2025-06-18", "2025-03-26", "2024-11-05"];
const INFO = { name: "ebenezer-citas", version: "1.0.0" };

function llaveValida(req: NextRequest): boolean {
  const esperada = process.env.MCP_API_KEY;
  if (!esperada) return false;
  const auth = req.headers.get("authorization") ?? "";
  const recibida =
    (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "") ||
    req.headers.get("x-mcp-key") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  if (!recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

const agendarHabilitado = () => process.env.MCP_PERMITIR_AGENDAR === "true";

function herramientas() {
  const lista: Record<string, unknown>[] = [
    {
      name: "validar_afiliado",
      description:
        "Valida si una persona es afiliada activa de MutualSer subsidiado, por número de documento. Devuelve afiliado, activo, nombre de pila, régimen, municipio de afiliación, en_cobertura y accion_sugerida (continuar, no_aplica o derivar_humano). Consulta la base sincronizada desde el Google Sheet.",
      inputSchema: {
        type: "object",
        properties: { documento: { type: "string", description: "Número de documento, solo dígitos, sin puntos." } },
        required: ["documento"],
        additionalProperties: false,
      },
      annotations: { title: "Validar afiliado MutualSer", readOnlyHint: true, openWorldHint: false },
    },
    {
      name: "consultar_cupos",
      description:
        "Consulta en SISMA los cupos de agenda para una fecha (consulta de oftalmología general primera vez, asunto 10). Devuelve médicos y horarios en formato 24 horas; solo los horarios con libre=true se pueden agendar. Solo lectura.",
      inputSchema: {
        type: "object",
        properties: {
          fecha: { type: "string", description: "Fecha en formato aaaa-mm-dd." },
          codMedico: { type: "integer", description: "Opcional: código de un médico para filtrar." },
          idEspecialidad: { type: "integer", description: "Opcional: id de especialidad para filtrar." },
        },
        required: ["fecha"],
        additionalProperties: false,
      },
      annotations: { title: "Consultar cupos SISMA", readOnlyHint: true, openWorldHint: true },
    },
  ];
  if (agendarHabilitado()) {
    lista.push({
      name: "agendar_cita",
      description:
        "CREA UNA CITA REAL en SISMA para un paciente que ya existe (no crea pacientes). Usar solo después de que la persona haya confirmado expresamente día, hora y médico, y de haber consultado los cupos. Si ya tiene una cita pendiente ese día no agenda otra. Debe enviarse confirmado=true.",
      inputSchema: {
        type: "object",
        properties: {
          documento: { type: "string", description: "Documento del paciente, solo dígitos." },
          codMedico: { type: "integer", description: "Código del médico del cupo elegido (campo medico.codigo)." },
          fecha: { type: "string", description: "Fecha aaaa-mm-dd del cupo elegido." },
          hora: { type: "string", description: "Hora HH:mm en 24 horas del cupo elegido." },
          idAsunto: { type: "integer", description: "Asunto de la cita. Por defecto 10 (consulta general primera vez)." },
          observacion: { type: "string", description: "Opcional: nota para la cita (máx. 200 caracteres)." },
          confirmado: { type: "boolean", description: "Debe ser true: indica que la persona confirmó la cita." },
        },
        required: ["documento", "codMedico", "fecha", "hora", "confirmado"],
        additionalProperties: false,
      },
      annotations: { title: "Agendar cita en SISMA", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    });
  }
  return lista;
}

async function ejecutar(nombre: string, args: Record<string, unknown>): Promise<Resultado> {
  switch (nombre) {
    case "validar_afiliado":
      return validarAfiliado(args.documento, "mcp");
    case "consultar_cupos":
      return consultarCupos({
        fecha: String(args.fecha ?? ""),
        codMedico: args.codMedico as number | string | undefined,
        idEspecialidad: args.idEspecialidad as number | string | undefined,
      });
    case "agendar_cita":
      if (!agendarHabilitado()) return { status: 403, body: { error: "El agendamiento por MCP está deshabilitado." } };
      if (args.confirmado !== true) {
        return { status: 400, body: { error: "Falta confirmado=true: la persona debe confirmar la cita antes de agendarla." } };
      }
      return agendarCita({
        documento: String(args.documento ?? ""),
        codMedico: args.codMedico as number | string | undefined,
        idAsunto: args.idAsunto as number | string | undefined,
        fecha: String(args.fecha ?? ""),
        hora: String(args.hora ?? ""),
        observacion: typeof args.observacion === "string" ? args.observacion : undefined,
        canal: "mcp",
      });
    default:
      return { status: 404, body: { error: `Herramienta desconocida: ${nombre}` } };
  }
}

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fallo = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Devuelve la respuesta JSON-RPC, o null si el mensaje es una notificación (sin id). */
async function manejar(m: Rpc): Promise<Record<string, unknown> | null> {
  const esNotificacion = m.id === undefined || m.id === null;
  if (typeof m.method !== "string") return esNotificacion ? null : fallo(m.id, -32600, "Solicitud inválida");
  if (esNotificacion) return null; // notifications/initialized, notifications/cancelled, etc.

  switch (m.method) {
    case "initialize": {
      const pedida = String(m.params?.protocolVersion ?? "");
      return ok(m.id, {
        protocolVersion: VERSIONES.includes(pedida) ? pedida : VERSIONES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: INFO,
        instructions:
          "Herramientas del portal de citas del Centro Oftalmológico Ebenezér para afiliados de MutualSer subsidiado. Primero valida al afiliado, luego consulta cupos reales de SISMA. Nunca inventes horarios.",
      });
    }
    case "ping":
      return ok(m.id, {});
    case "tools/list":
      return ok(m.id, { tools: herramientas() });
    case "tools/call": {
      const nombre = String(m.params?.name ?? "");
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>;
      if (!herramientas().some((h) => h.name === nombre)) return fallo(m.id, -32602, `Herramienta desconocida: ${nombre}`);
      try {
        const r = await ejecutar(nombre, args);
        return ok(m.id, { content: [{ type: "text", text: JSON.stringify(r.body) }], isError: r.status >= 400 });
      } catch {
        return ok(m.id, { content: [{ type: "text", text: JSON.stringify({ error: "Error interno ejecutando la herramienta" }) }], isError: true });
      }
    }
    default:
      return fallo(m.id, -32601, `Método no soportado: ${m.method}`);
  }
}

export async function POST(req: NextRequest) {
  if (!llaveValida(req)) {
    return NextResponse.json(fallo(null, -32001, "No autorizado"), { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json(fallo(null, -32700, "JSON inválido"), { status: 400 });
  }

  if (Array.isArray(cuerpo)) {
    const respuestas = (await Promise.all(cuerpo.map((m) => manejar(m as Rpc)))).filter(Boolean);
    return respuestas.length ? NextResponse.json(respuestas) : new NextResponse(null, { status: 202 });
  }
  const r = await manejar(cuerpo as Rpc);
  return r ? NextResponse.json(r) : new NextResponse(null, { status: 202 });
}

// Sin canal SSE de servidor→cliente: el transporte es solo POST.
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
