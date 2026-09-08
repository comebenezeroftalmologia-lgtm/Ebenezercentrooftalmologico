import { createServiceClient } from "@/lib/supabase/server";
import type { Opportunity, Pipeline, Service, SocialPost, SocialStatPoint } from "@/lib/types";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface DashboardFilters extends DateRange {
  pipeline: Pipeline;
  serviceId?: number | null;
}

const OPPORTUNITY_COLUMNS =
  "id, pipeline, stage, service_id, value, channel, campaign_id, contact_id, contact_name, created_at, closed_at, next_appointment_date, expected_close_date, status";

/** Todas las oportunidades de un pipeline dentro del rango de fechas
 * (por fecha de creación), opcionalmente filtradas por servicio. Es la
 * fuente única para tarjetas de estado, embudo, tiempos de cierre,
 * IMPORTE y drill-down — todo se deriva de este mismo conjunto en el
 * cliente/servidor para que el filtro de estado (clic en una tarjeta)
 * recalcule todo de forma consistente. */
export async function getOpportunities({
  pipeline,
  from,
  to,
  serviceId,
}: DashboardFilters): Promise<Opportunity[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000; // límite por defecto de PostgREST/Supabase — hay
  // que paginar explícitamente, algunos pipelines (Campañas) superan las
  // 1000 oportunidades y se estaban truncando silenciosamente.
  const all: Opportunity[] = [];
  let start = 0;

  while (true) {
    let query = supabase
      .from("opportunities")
      .select(OPPORTUNITY_COLUMNS)
      .eq("pipeline", pipeline)
      .gte("created_at", `${from}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`)
      .order("id", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);

    if (serviceId) query = query.eq("service_id", serviceId);

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Opportunity[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return all;
}

/** Gasto total de Meta Ads en un rango de fechas (módulo Generación de Clientes Potenciales) */
export async function getAdSpendTotal({ from, to }: DateRange): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ad_spend")
    .select("spend")
    .gte("date", from)
    .lte("date", to);

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.spend), 0);
}

export async function listServices(): Promise<Service[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export function serviceNameMap(services: Service[]): Map<number, string> {
  return new Map(services.map((s) => [s.id, s.name]));
}

// ---------------------------------------------------------------------
// Redes sociales
// ---------------------------------------------------------------------

export async function getSocialStatsSeries({
  platform,
  metric,
  from,
  to,
}: {
  platform: string;
  metric: string;
  from: string;
  to: string;
}): Promise<SocialStatPoint[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("social_stats")
    .select("date, value")
    .eq("platform", platform)
    .eq("metric", metric)
    .gte("date", from)
    .lte("date", to)
    .order("date");
  if (error) throw error;
  return data ?? [];
}

export async function getSocialPlatforms(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("social_stats").select("platform");
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.platform)));
}

export async function getSocialPosts({
  platform,
  from,
  to,
}: {
  platform?: string | null;
  from: string;
  to: string;
}): Promise<SocialPost[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("social_posts")
    .select("*")
    .gte("posted_at", `${from}T00:00:00.000Z`)
    .lte("posted_at", `${to}T23:59:59.999Z`)
    .order("posted_at", { ascending: false });

  if (platform) query = query.eq("platform", platform);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Último valor conocido de una métrica de red social, sin importar el
 * rango de fechas seleccionado — para mostrar el conteo "actual" de
 * seguidores en los chips de plataforma, independiente del filtro. */
export async function getLatestSocialStat({
  platform,
  metric,
}: {
  platform: string;
  metric: string;
}): Promise<SocialStatPoint | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("social_stats")
    .select("date, value")
    .eq("platform", platform)
    .eq("metric", metric)
    .order("date", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

/** Suma de una métrica de social_stats en un rango de fechas (ej. alcance,
 * visitas al perfil, cuentas alcanzadas, interacciones totales). */
export async function getSocialStatsSum({
  platform,
  metric,
  from,
  to,
}: {
  platform: string;
  metric: string;
  from: string;
  to: string;
}): Promise<number> {
  const rows = await getSocialStatsSeries({ platform, metric, from, to });
  return rows.reduce((sum, r) => sum + Number(r.value), 0);
}

/** Reduce una serie diaria a un punto por mes (el último valor observado
 * dentro de cada mes) — usado para el histórico de seguidores. */
export function toMonthlySeries(rows: SocialStatPoint[]): SocialStatPoint[] {
  const byMonth = new Map<string, SocialStatPoint>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const existing = byMonth.get(month);
    if (!existing || row.date > existing.date) {
      byMonth.set(month, { date: month, value: row.value });
    }
  }
  return Array.from(byMonth.values()).sort((a, b) => a.date.localeCompare(b.date));
}
