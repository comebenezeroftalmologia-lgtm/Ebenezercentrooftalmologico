import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { herramientasBot } from "@/lib/mcp/herramientas-bot";
import { herramientasDatos } from "@/lib/mcp/herramientas-datos";
import type { Herramienta } from "@/lib/mcp/tipos";

// Servidor MCP (Model Context Protocol) de la plataforma de Ebenezér.
// Transporte "Streamable HTTP" sin estado: cada POST es un mensaje JSON-RPC y se responde con
// JSON. Sin dependencias externas. Las herramientas viven en src/lib/mcp/:
//   herramientas-bot.ts    validar_afiliado, consultar_cupos, agendar_cita (SISMA)
//   herramientas-datos.ts  listar_tablas, describir_tabla, consultar, contar, insertar,
//                          actualizar, eliminar, ejecutar_sincronizacion (toda la aplicación)
// Autenticación: llave propia MCP_API_KEY (distinta de BOT_API_KEY), por uno de estos medios:
//   Authorization: Bearer <llave>   |   x-mcp-key: <llave>   |   ?key=<llave> en la URL
// Interruptores (variables de entorno): MCP_PERMITIR_ESCRITURA=true activa insertar/actualizar/
// eliminar/sincronizar; MCP_PERMITIR_AGENDAR=true activa agendar_cita.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const VERSIONES = ["2025-06-18", "2025-03-26", "2024-11-05"];
const INFO = { name: "ebenezer-plataforma", version: "2.0.0" };

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

const activas = (): Herramienta[] => [...herramientasBot, ...herramientasDatos].filter((h) => !h.habilitada || h.habilitada());

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fallo = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Devuelve la respuesta JSON-RPC, o null si el mensaje es una notificación (sin id). */
async function manejar(m: Rpc, origen: string): Promise<Record<string, unknown> | null> {
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
          "Plataforma del Centro Oftalmológico Ebenezér (tableros de mercadeo, cartera, frecuencias, procesos, proyectos, talento humano y bot de citas). Empieza con listar_tablas y describir_tabla para conocer los datos. Los datos incluyen información de pacientes y de personal: trátalos con confidencialidad. Antes de insertar, actualizar o eliminar, confirma con la persona qué se va a cambiar.",
      });
    }
    case "ping":
      return ok(m.id, {});
    case "tools/list":
      return ok(m.id, {
        tools: activas().map((h) => ({ name: h.name, description: h.description, inputSchema: h.inputSchema, annotations: h.annotations })),
      });
    case "tools/call": {
      const nombre = String(m.params?.name ?? "");
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>;
      const h = activas().find((x) => x.name === nombre);
      if (!h) return fallo(m.id, -32602, `Herramienta desconocida o deshabilitada: ${nombre}`);
      try {
        const r = await h.run(args, { origen });
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
  const origen = req.nextUrl.origin;

  if (Array.isArray(cuerpo)) {
    const respuestas = (await Promise.all(cuerpo.map((m) => manejar(m as Rpc, origen)))).filter(Boolean);
    return respuestas.length ? NextResponse.json(respuestas) : new NextResponse(null, { status: 202 });
  }
  const r = await manejar(cuerpo as Rpc, origen);
  return r ? NextResponse.json(r) : new NextResponse(null, { status: 202 });
}

// Sin canal SSE de servidor→cliente: el transporte es solo POST.
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
