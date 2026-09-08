/**
 * Integración con Meta Marketing API (Graph API).
 *
 * Confirmado en la documentación oficial de Meta for Developers:
 * - Autenticación: access_token de sistema (Business Manager > System Users)
 *   con permiso `ads_read` sobre la cuenta publicitaria.
 * - Endpoint: GET /{ad-account-id}/insights o /{campaign-id}/insights
 * - Campos relevantes: spend, impressions, clicks, actions (para leads),
 *   campaign_name, date_start/date_stop
 * - Se recomienda pedir por rangos de fecha cortos (no "lifetime") para
 *   evitar timeouts en cuentas con historial largo.
 *
 * Pendiente de confirmar contigo: META_AD_ACCOUNT_ID y el access token
 * de sistema (se genera una vez en Business Manager y no expira si es
 * un token de sistema, a diferencia de un token de usuario).
 */

const GRAPH_API_VERSION = "v21.0";

export interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  actions?: { action_type: string; value: string }[];
}

export async function fetchMetaAdInsights({
  since,
  until,
}: {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}): Promise<MetaInsightRow[]> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    throw new Error(
      "META_ACCESS_TOKEN / META_AD_ACCOUNT_ID no configurados — ver .env.example"
    );
  }

  const fields = [
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "actions",
  ].join(",");

  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/insights`
  );
  url.searchParams.set("fields", fields);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("time_increment", "1"); // desglosado por día
  url.searchParams.set("access_token", accessToken);

  const results: MetaInsightRow[] = [];
  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) {
      throw new Error(`Meta Graph API error ${res.status}: ${await res.text()}`);
    }
    const json: { data: MetaInsightRow[]; paging?: { next?: string } } =
      await res.json();
    results.push(...json.data);
    nextUrl = json.paging?.next ?? null;
  }

  return results;
}

/** Extrae el conteo de leads de un insight row (action_type suele ser "lead" o "onsite_conversion.lead_grouped") */
export function extractLeadsFromActions(row: MetaInsightRow): number {
  if (!row.actions) return 0;
  const leadAction = row.actions.find((a) =>
    a.action_type.toLowerCase().includes("lead")
  );
  return leadAction ? Number(leadAction.value) : 0;
}
