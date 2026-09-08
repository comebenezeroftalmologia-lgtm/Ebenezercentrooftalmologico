/**
 * Integración con Clientify API.
 *
 * Confirmado en la documentación pública (developer.clientify.com /
 * newapi.clientify.com): REST + JSON, autenticación por API key.
 *
 * PENDIENTE DE CONFIRMAR CONTIGO antes de dar por buena esta capa
 * (la documentación pública no expone el detalle sin estar logueado
 * con una cuenta Enterprise, así que estos son los puntos a validar
 * en cuanto tengas acceso):
 *   1. Header exacto de autenticación (suele ser `Authorization: Token <key>`
 *      o `Authorization: Api-Key <key>` — hay que confirmarlo).
 *   2. Nombre exacto del recurso de oportunidades (`/deals/` o `/opportunities/`)
 *      y de pipelines/etapas.
 *   3. Si el plan actual (Enterprise, según lo que habíamos anotado)
 *      ya tiene la API habilitada.
 *
 * Mientras tanto, esta función normaliza lo que sea que devuelva
 * Clientify hacia nuestro modelo `Opportunity` (ver lib/types.ts), así
 * que cuando confirmemos el shape real, el cambio queda contenido
 * aquí y no toca el resto de la app.
 */

import type { Pipeline } from "@/lib/types";

const DEFAULT_BASE_URL =
  process.env.CLIENTIFY_API_BASE_URL ?? "https://api.clientify.net/v1";

// Mapea el nombre del pipeline en Clientify -> nuestro enum interno.
// Ajustar estas 3 claves una vez confirmemos los nombres exactos de
// los pipelines en la cuenta de Ebenezer.
const PIPELINE_NAME_MAP: Record<string, Pipeline> = {
  "Campañas": "generacion_leads",
  "Generación de Clientes Potenciales": "generacion_leads",
  "Ordenamientos No Quirúrgicos": "ordenamientos_no_qx",
  "Ordenamientos Quirúrgicos": "ordenamientos_qx",
};

interface ClientifyDealRaw {
  id: string | number;
  pipeline_name: string;
  stage_name: string;
  amount?: number;
  contact_id?: string | number;
  source?: string;
  custom_fields?: Record<string, unknown>;
  created?: string;
  closed_date?: string | null;
  status?: string; // 'open' | 'won' | 'lost' (a confirmar valores exactos)
}

async function clientifyFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.CLIENTIFY_API_KEY;
  if (!apiKey) {
    throw new Error("CLIENTIFY_API_KEY no configurada — ver .env.example");
  }

  const res = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    headers: {
      Authorization: `Token ${apiKey}`, // TODO: confirmar formato exacto con soporte de Clientify
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Clientify API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchClientifyDeals(): Promise<ClientifyDealRaw[]> {
  // TODO: confirmar el nombre real del recurso y la paginación
  // (`?page=`, `?offset=`, o cursor). Se deja como GET simple por ahora.
  const data = await clientifyFetch<{ results: ClientifyDealRaw[] }>(
    "/deals/"
  );
  return data.results;
}

export function normalizeClientifyDeal(deal: ClientifyDealRaw) {
  const pipeline = PIPELINE_NAME_MAP[deal.pipeline_name];
  if (!pipeline) {
    // Pipeline que no es uno de los 3 que nos interesan (p.ej. PQRS,
    // Mutual-Flujo) — se ignora en la sincronización.
    return null;
  }

  return {
    id: String(deal.id),
    pipeline,
    stage: deal.stage_name,
    value: deal.amount ?? null,
    channel: deal.source ?? null,
    contact_id: deal.contact_id ? String(deal.contact_id) : null,
    created_at: deal.created ?? new Date().toISOString(),
    closed_at: deal.closed_date ?? null,
    status: (deal.status as "open" | "won" | "lost") ?? "open",
  };
}
