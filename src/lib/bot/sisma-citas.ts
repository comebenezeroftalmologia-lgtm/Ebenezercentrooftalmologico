import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Utilidades compartidas por los endpoints del bot de citas (voz y WhatsApp).

export function llaveBotValida(req: NextRequest): boolean {
  const esperada = process.env.BOT_API_KEY;
  const recibida = req.headers.get("x-bot-key");
  if (!esperada || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

const BASE = "https://api.centrooftalmologicoebenezer.com/node";

/** Llama al API ampliada de SISMA (JSON). Lanza Error con mensaje claro. */
export async function sismaNodeJson<T = unknown>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<{ status: number; data: T }> {
  const llave = process.env.SISMA_NODE_API_KEY;
  if (!llave) throw new Error("SIN_LLAVE");
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "X-Api-Key": llave,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const texto = await res.text();
  let data: unknown = texto;
  try {
    data = JSON.parse(texto);
  } catch {
    /* respuesta no JSON: se devuelve el texto */
  }
  return { status: res.status, data: data as T };
}

/** Valida fecha yyyy-MM-dd y hora HH:mm. */
export const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
export const HORA_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
