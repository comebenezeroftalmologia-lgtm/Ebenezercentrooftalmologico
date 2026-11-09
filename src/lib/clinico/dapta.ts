import type { Canal } from "./tipos";

/** Envío de recordatorios a Dapta. Un flow de Dapta por canal, cada uno con su webhook:
 *   DAPTA_WEBHOOK_LLAMADA   → flow que llama con el agente de voz
 *   DAPTA_WEBHOOK_WHATSAPP  → flow que envía el WhatsApp
 * Si el flow exige llave, se manda como "Authorization: Bearer <DAPTA_WEBHOOK_KEY>". */

export function urlDapta(canal: Canal): string | null {
  const u = canal === "llamada" ? process.env.DAPTA_WEBHOOK_LLAMADA : process.env.DAPTA_WEBHOOK_WHATSAPP;
  return u && /^https:\/\//i.test(u.trim()) ? u.trim() : null;
}

export interface RespuestaDapta {
  ok: boolean;
  status: number;
  cuerpo: unknown;
  error?: string;
}

export async function enviarADapta(canal: Canal, payload: unknown, tiempoMs = 12_000): Promise<RespuestaDapta> {
  const url = urlDapta(canal);
  if (!url) return { ok: false, status: 0, cuerpo: null, error: `Falta configurar DAPTA_WEBHOOK_${canal === "llamada" ? "LLAMADA" : "WHATSAPP"}` };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), tiempoMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.DAPTA_WEBHOOK_KEY ? { Authorization: `Bearer ${process.env.DAPTA_WEBHOOK_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: ctl.signal,
      cache: "no-store",
    });
    const texto = await res.text();
    let cuerpo: unknown = texto.slice(0, 2000);
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      /* respuesta que no es JSON: se guarda el texto */
    }
    return res.ok ? { ok: true, status: res.status, cuerpo } : { ok: false, status: res.status, cuerpo, error: `Dapta respondió ${res.status}` };
  } catch (e) {
    const abortado = e instanceof Error && e.name === "AbortError";
    return { ok: false, status: 0, cuerpo: null, error: abortado ? "Dapta no respondió a tiempo" : e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}
