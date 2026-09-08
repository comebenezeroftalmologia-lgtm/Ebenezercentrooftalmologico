/**
 * Estadísticas de redes sociales — 100% Meta Graph API (Instagram
 * Business Insights), sin Metricool. Verificado en vivo contra la
 * cuenta real @ebenezeroftalmo (IG Business Account ID confirmado:
 * 17841402278847170, resuelto desde la página de Facebook).
 *
 * Comportamientos de la API de Instagram Insights confirmados probando
 * contra la cuenta real (no están bien documentados y cambiaron entre
 * versiones de la API):
 *
 * 1. `reach` es una métrica de serie temporal — un `period=day` con
 *    `since`/`until` devuelve un valor POR DÍA dentro del rango.
 * 2. `profile_views`, `accounts_engaged` y `total_interactions` ya NO
 *    aceptan serie temporal — la API exige `metric_type=total_value` y
 *    devuelve UN SOLO número agregado para todo el rango pedido (no
 *    hay desglose por día). Por eso, para estas 3, el rango que se
 *    pide siempre es "un solo día" y se guarda con la fecha de ese día.
 * 3. `follower_count` es una métrica de serie temporal pero es un
 *    DELTA diario (cuántos seguidores netos ganó/perdió ESE día), no un
 *    acumulado — y solo se puede pedir para los últimos 30 días. Se usa
 *    una sola vez para reconstruir el histórico hacia atrás a partir del
 *    conteo actual (ver `backfillInstagramFollowerHistory`); de ahí en
 *    adelante el histórico se construye solo, un punto por día, con el
 *    conteo actual que ya guarda el sync diario normal.
 *
 * `impressions` está deprecado — la API lo rechaza directamente (error
 * 100), confirmado tanto a nivel de cuenta como de publicación
 * individual. Se usa `reach` en su lugar en todo el dashboard (se lo
 * marcamos a Ebenezer: donde antes se hubiera mostrado "Impresiones"
 * ahora se muestra "Alcance").
 */

const GRAPH_API_VERSION = "v21.0";

export interface SocialStatRow {
  platform: string;
  metric: string;
  date: string; // YYYY-MM-DD
  value: number;
}

export interface InstagramMediaInsight {
  media_id: string;
  media_type: string;
  caption: string | null;
  permalink: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  reach: number;
  views: number | null;
  total_interactions: number;
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

/** Deltas diarios de seguidores (neto ganado/perdido ese día) — máximo 30 días hacia atrás, límite de la API. */
async function fetchInstagramFollowerDeltas({
  since,
  until,
}: {
  since: string;
  until: string;
}): Promise<{ date: string; delta: number }[]> {
  const igAccountId = process.env.META_IG_ACCOUNT_ID;
  if (!igAccountId) return [];

  const data = await graphFetch<{
    data: { name: string; values: { value: number; end_time: string }[] }[];
  }>(`/${igAccountId}/insights`, { metric: "follower_count", period: "day", since, until });

  const series = data.data.find((m) => m.name === "follower_count");
  return (series?.values ?? []).map((v) => ({ date: v.end_time.slice(0, 10), delta: v.value }));
}

/** Reconstruye el histórico ACUMULADO de seguidores de los últimos 30
 * días (límite de la API para el delta diario) partiendo del conteo
 * actual y restando los deltas hacia atrás en el tiempo. Pensado para
 * correrse una sola vez como respaldo histórico — de ahí en adelante el
 * sync diario normal (`fetchInstagramFollowerCount`) va acumulando el
 * histórico real día a día. */
export async function backfillInstagramFollowerHistory(): Promise<SocialStatRow[]> {
  const current = await fetchInstagramFollowerCount();
  if (current === null) return [];

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const sinceDate = new Date(today.getTime() - 29 * 86400_000);
  const since = sinceDate.toISOString().slice(0, 10);

  const deltas = await fetchInstagramFollowerDeltas({ since, until: todayStr });
  const deltaByDate = new Map(deltas.map((d) => [d.date, d.delta]));

  const dates: string[] = [];
  for (
    let d = new Date(sinceDate);
    d.getTime() <= today.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    dates.push(d.toISOString().slice(0, 10));
  }

  const cumulative = new Map<string, number>();
  cumulative.set(todayStr, current);
  for (let i = dates.length - 2; i >= 0; i--) {
    const nextDate = dates[i + 1];
    const thisDate = dates[i];
    const deltaOfNextDay = deltaByDate.get(nextDate) ?? 0;
    cumulative.set(thisDate, (cumulative.get(nextDate) ?? current) - deltaOfNextDay);
  }

  return dates.map((date) => ({
    platform: "instagram",
    metric: "followers",
    date,
    value: cumulative.get(date) ?? current,
  }));
}

/** Últimas publicaciones con sus métricas — base del ranking "Top 5 de contenidos". */
export async function fetchInstagramTopMedia(limit = 25): Promise<InstagramMediaInsight[]> {
  const igAccountId = process.env.META_IG_ACCOUNT_ID;
  if (!igAccountId) return [];

  const mediaList = await graphFetch<{
    data: { id: string; media_type: string; caption?: string; permalink?: string; timestamp: string }[];
  }>(`/${igAccountId}/media`, {
    fields: "id,media_type,caption,permalink,timestamp",
    limit: String(limit),
  });

  const results: InstagramMediaInsight[] = [];
  for (const media of mediaList.data) {
    const isVideo = media.media_type === "VIDEO" || media.media_type === "REELS";
    const metricNames = isVideo
      ? "likes,comments,shares,saved,reach,total_interactions,views"
      : "likes,comments,shares,saved,reach,total_interactions";

    let insightData: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] = [];
    try {
      const insight = await graphFetch<{ data: typeof insightData }>(`/${media.id}/insights`, {
        metric: metricNames,
      });
      insightData = insight.data;
    } catch {
      // Algunas piezas viejas (ej. carruseles) pueden no tener insights disponibles — se ignoran.
    }

    const val = (name: string) => {
      const m = insightData.find((x) => x.name === name);
      if (!m) return 0;
      if (m.total_value) return m.total_value.value;
      if (m.values?.[0]) return m.values[0].value;
      return 0;
    };

    results.push({
      media_id: media.id,
      media_type: media.media_type,
      caption: media.caption ?? null,
      permalink: media.permalink ?? null,
      timestamp: media.timestamp,
      likes: val("likes"),
      comments: val("comments"),
      shares: val("shares"),
      saved: val("saved"),
      reach: val("reach"),
      views: isVideo ? val("views") : null,
      total_interactions: val("total_interactions"),
    });
  }
  return results;
}

/** Seguidores actuales de la página de Facebook (Meta Graph API, mismo access token que Instagram). */
export async function fetchFacebookPageFollowers(): Promise<number | null> {
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) return null;
  const data = await graphFetch<{ followers_count?: number; fan_count?: number }>(`/${pageId}`, {
    fields: "followers_count,fan_count",
  });
  return data.followers_count ?? data.fan_count ?? null;
}
