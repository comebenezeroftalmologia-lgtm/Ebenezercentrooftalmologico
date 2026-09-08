/**
 * Integración con Clientify API — verificada contra la cuenta real de
 * Ebenezer el 2026-09-08.
 *
 * Confirmado en vivo (ya no son suposiciones):
 * - Base URL: https://api.clientify.com/v1
 * - Auth: header `Authorization: Token <api_key>`
 * - Recurso de oportunidades: `/deals/` (no "opportunities"), paginado
 *   estilo DRF (`count`, `next`, `previous`, `results`)
 * - Filtro por pipeline: `?pipeline_id=<id>` (OJO: `?pipeline=<id>` y
 *   `?pipeline__id=<id>` NO filtran, Clientify los ignora silenciosamente
 *   y devuelve todo sin filtrar — hay que usar `pipeline_id`)
 * - Los 3 pipelines que nos interesan, con sus IDs reales:
 *     106113 = Campañas            -> generacion_leads
 *     132406 = Ordenamientos Quirurgicos    -> ordenamientos_qx
 *     134626 = Ordenamientos No Quirurgicos -> ordenamientos_no_qx
 * - Cada pipeline expone su lista de etapas completa (ordenadas por
 *   `position`) en GET /deals/pipelines/{id}/
 * - Código de estado del deal (`status`): 1=Open, 2=Expired, 3=Won, 4=Lost
 *   (Expired se trata como cerrado/perdido para el cálculo de tiempo de
 *   cierre — es un deal que caducó sin gestionarse, ajustar si Ebenezer
 *   lo quiere tratar distinto)
 * - El campo "Servicio" (Cataratas / Cx Refractiva / Ojo Seco) casi
 *   nunca viene en `custom_fields` (solo ~5% de los deals de Campañas
 *   tienen ahí un campo "Tipo de Servicio", con valores distintos como
 *   "Cirugía Refractiva"/"Oftalmología General"). La señal real y
 *   consistente es el PREFIJO del nombre del deal, ej. "Cx Refractiva -
 *   Rafael", "Cataratas - Cindy", "Ojo Seco - ...". Confirmado sobre
 *   1564 deals de Campañas: 1340 Cx Refractiva, 110 Cataratas, 50 Ojo
 *   Seco, más variantes con typos (Catarata, Cx cataratas, etc.) que se
 *   normalizan aquí.
 */

import type { Pipeline } from "@/lib/types";

const BASE_URL =
  process.env.CLIENTIFY_API_BASE_URL ?? "https://api.clientify.com/v1";

// IDs reales de pipeline en la cuenta de Clientify de Ebenezer.
export const CLIENTIFY_PIPELINE_IDS: Record<Pipeline, number> = {
  generacion_leads: 106113, // Campañas
  ordenamientos_qx: 132406, // Ordenamientos Quirurgicos
  ordenamientos_no_qx: 134626, // Ordenamientos No Quirurgicos
};

const STATUS_MAP: Record<number, "open" | "won" | "lost"> = {
  1: "open",
  2: "lost", // Expired
  3: "won",
  4: "lost",
};

// Normaliza el prefijo del nombre del deal a uno de los 3 servicios.
// Devuelve null si no matchea ninguno (leads genéricos tipo "Lead (Ads)").
export function extractServiceFromDealName(name: string): string | null {
  const prefix = name.split(/\s+-\s+/)[0]?.trim().toLowerCase() ?? "";
  if (prefix.startsWith("cx refractiva") || prefix.startsWith("refractiva")) {
    return "Cx Refractiva";
  }
  if (prefix.includes("catarata")) {
    // cubre "Cataratas", "Catarata", "Cx Cataratas", "Cx Catarata", "Cx cataratas"
    return "Cataratas";
  }
  if (prefix.includes("ojo seco")) {
    return "Ojo Seco";
  }
  return null;
}

interface ClientifyDealRaw {
  id: number;
  name: string;
  amount: string;
  status: number;
  status_desc: string;
  pipeline: string; // URL
  pipeline_desc: string;
  pipeline_stage: string; // URL
  pipeline_stage_desc: string;
  contact: string | null;
  contact_name: string | null;
  contact_medium: string | null;
  custom_fields: { id: number; field: string; value: string }[];
  created: string;
  actual_closed_date: string | null;
  expected_closed_date: string | null;
}

interface ClientifyDealsPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: ClientifyDealRaw[];
}

async function clientifyFetch<T>(url: string): Promise<T> {
  const apiKey = process.env.CLIENTIFY_API_KEY;
  if (!apiKey) {
    throw new Error("CLIENTIFY_API_KEY no configurada — ver .env.example");
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Clientify API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

/** Trae TODOS los deals de un pipeline, paginando hasta el final. */
export async function fetchClientifyDealsForPipeline(
  pipeline: Pipeline
): Promise<ClientifyDealRaw[]> {
  const pipelineId = CLIENTIFY_PIPELINE_IDS[pipeline];
  let url: string | null = `${BASE_URL}/deals/?pipeline_id=${pipelineId}&page_size=100`;
  const all: ClientifyDealRaw[] = [];

  while (url) {
    const page: ClientifyDealsPage = await clientifyFetch<ClientifyDealsPage>(url);
    all.push(...page.results);
    url = page.next;
  }

  return all;
}

export function normalizeClientifyDeal(deal: ClientifyDealRaw, pipeline: Pipeline) {
  return {
    id: `clientify-${deal.id}`,
    pipeline,
    stage: deal.pipeline_stage_desc,
    service_name: extractServiceFromDealName(deal.name), // se resuelve a service_id en el sync route
    value: deal.amount ? Number(deal.amount) : null,
    channel: deal.contact_medium,
    contact_id: deal.contact,
    created_at: deal.created,
    closed_at: deal.actual_closed_date,
    status: STATUS_MAP[deal.status] ?? "open",
    raw: deal,
  };
}

/** Trae las etapas de un pipeline en orden (para pintar el embudo aunque no haya oportunidades abiertas en todas). */
export async function fetchClientifyPipelineStages(pipeline: Pipeline) {
  const pipelineId = CLIENTIFY_PIPELINE_IDS[pipeline];
  const data = await clientifyFetch<{
    stages: { name: string; position: number }[];
  }>(`${BASE_URL}/deals/pipelines/${pipelineId}/`);
  return data.stages.sort((a, b) => a.position - b.position);
}
