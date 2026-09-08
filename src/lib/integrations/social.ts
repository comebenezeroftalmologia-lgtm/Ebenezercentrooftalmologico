/**
 * Estadísticas de redes sociales — 100% Meta Graph API (Instagram
 * Business Insights + Facebook Page Insights), sin Metricool.
 *
 * Requisitos en el lado de Meta (todo dentro del mismo Business Manager
 * que ya usamos para Meta Ads):
 * - La cuenta de Instagram debe ser una cuenta "Business" o "Creator"
 *   vinculada a una Página de Facebook
 * - El access token necesita los permisos: `pages_read_engagement`,
 *   `instagram_basic`, `instagram_manage_insights`
 * - Se necesita el Instagram Business Account ID (se obtiene a partir
 *   del Facebook Page ID, ver getInstagramAccountId más abajo)
 */

const GRAPH_API_VERSION = "v21.0";

export interface SocialStatRow {
  platform: string;
  metric: string;
  date: string; // YYYY-MM-DD
  value: number;
}

async function graphFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN no configurado — ver .env.example");
  }
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Meta Graph API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Resuelve el Instagram Business Account ID a partir del Facebook Page ID (solo hace falta una vez, se guarda en env). */
export async function getInstagramAccountId(pageId: string): Promise<string | null> {
  const data = await graphFetch<{ instagram_business_account?: { id: string } }>(
    `/${pageId}`,
    { fields: "instagram_business_account" }
  );
  return data.instagram_business_account?.id ?? null;
}

/** Métricas diarias de la cuenta de Instagram (seguidores, alcance, impresiones). */
export async function fetchInstagramInsights({
  since,
  until,
}: {
  since: string; // unix timestamp en segundos, o YYYY-MM-DD
  until: string;
}): Promise<SocialStatRow[]> {
  const igAccountId = process.env.META_IG_ACCOUNT_ID;
  if (!igAccountId) {
    throw new Error("META_IG_ACCOUNT_ID no configurado — ver .env.example");
  }

  const data = await graphFetch<{
    data: { name: string; period: string; values: { value: number; end_time: string }[] }[];
  }>(`/${igAccountId}/insights`, {
    metric: "reach,impressions,profile_views",
    period: "day",
    since,
    until,
  });

  const rows: SocialStatRow[] = [];
  for (const metric of data.data) {
    for (const point of metric.values) {
      rows.push({
        platform: "instagram",
        metric: metric.name,
        date: point.end_time.slice(0, 10),
        value: point.value,
      });
    }
  }
  return rows;
}

/** Conteo actual de seguidores (no es una serie histórica, Meta solo da el valor de hoy). */
export async function fetchInstagramFollowerCount(): Promise<number | null> {
  const igAccountId = process.env.META_IG_ACCOUNT_ID;
  if (!igAccountId) return null;
  const data = await graphFetch<{ followers_count: number }>(`/${igAccountId}`, {
    fields: "followers_count",
  });
  return data.followers_count;
}
