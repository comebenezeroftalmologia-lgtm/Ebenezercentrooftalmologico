/**
 * Estadísticas de redes sociales — 100% Meta Graph API (Instagram
 * Business Insights), sin Metricool. Verificado en vivo contra la
 * cuenta real @ebenezeroftalmo (IG Business Account ID confirmado:
 * 17841402278847170, resuelto desde la página de Facebook).
 *
 * Dos comportamientos distintos de la API de Instagram Insights,
 * confirmados probando contra la cuenta real (no están bien
 * documentados y cambiaron entre versiones de la API):
 *
 * 1. `reach` es una métrica de serie temporal — un `period=day` con
 *    `since`/`until` devuelve un valor POR DÍA dentro del rango.
 * 2. `profile_views`, `accounts_engaged` y `total_interactions` ya NO
 *    aceptan serie temporal — la API exige `metric_type=total_value` y
 *    devuelve UN SOLO número agregado para todo el rango pedido (no
 *    hay desglose por día). Por eso, para estas 3, el rango que se
 *    pide siempre es "un solo día" y se guarda con la fecha de ese día.
 *
 * `impressions` está deprecado para cuentas nuevas — la API lo
 * rechaza directamente (probado, error 100). Se usa `reach` en su lugar.
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

/** `reach` como serie diaria — sirve tanto para backfill histórico como para el día de ayer. */
export async function fetchInstagramReach({
  since,
  until,
}: {
  since: string; // YYYY-MM-DD
  until: string;
}): Promise<SocialStatRow[]> {
  const igAccountId = process.env.META_IG_ACCOUNT_ID;
  if (!igAccountId) {
    throw new Error("META_IG_ACCOUNT_ID no configurado — ver .env.example");
  }

  const data = await graphFetch<{
    data: { name: string; values: { value: number; end_time: string }[] }[];
  }>(`/${igAccountId}/insights`, { metric: "reach", period: "day", since, until });

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

/** profile_views/accounts_engaged/total_interactions del día indicado (formato YYYY-MM-DD). Un solo número por métrica, no serie. */
export async function fetchInstagramDailyTotals(date: string): Promise<SocialStatRow[]> {
  const igAccountId = process.env.META_IG_ACCOUNT_ID;
  if (!igAccountId) {
    throw new Error("META_IG_ACCOUNT_ID no configurado — ver .env.example");
  }

  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const until = nextDay.toISOString().slice(0, 10);

  const data = await graphFetch<{
    data: { name: string; total_value: { value: number } }[];
  }>(`/${igAccountId}/insights`, {
    metric: "profile_views,accounts_engaged,total_interactions",
    period: "day",
    metric_type: "total_value",
    since: date,
    until,
  });

  return data.data.map((m) => ({
    platform: "instagram",
    metric: m.name,
    date,
    value: m.total_value.value,
  }));
}

/** Conteo actual de seguidores. */
export async function fetchInstagramFollowerCount(): Promise<number | null> {
  const igAccountId = process.env.META_IG_ACCOUNT_ID;
  if (!igAccountId) return null;
  const data = await graphFetch<{ followers_count: number }>(`/${igAccountId}`, {
    fields: "followers_count",
  });
  return data.followers_count;
}
