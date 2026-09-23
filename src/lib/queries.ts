import { createServiceClient } from "@/lib/supabase/server";
import type { FrecuenciaCobrableMensual, FrecuenciaConteo, FrecuenciaDia, FrecuenciaMedicoMensual, FrecuenciaMonthly, FrecuenciaPrepagadaMensual, FrecuenciaPrepagadaRanking, Opportunity, Pipeline, Service, ServicioAgendadoLogRow, SocialPost, SocialStatPoint } from "@/lib/types";
import { VENTA_STAGES } from "@/lib/pipelineStages";

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

/** Candidatas a "vendida" de un pipeline, SIN filtrar por fecha de
 * creación: cualquier oportunidad con status=Ganada (en cualquier
 * etapa) o cuya etapa actual sea una de cierre real del pipeline (ver
 * VENTA_STAGES). Existe porque una venta puede cerrarse mucho después
 * de haberse creado (p. ej. un lead de julio que cierra en
 * septiembre) — filtrar primero por fecha de creación las hacía
 * desaparecer del conteo del período en que realmente se vendieron.
 * El llamador filtra después por "fecha de cierre efectiva"
 * (ver dashboard.ts: effectiveClosingDate / isVendidaEnRango). */
export async function getVentasCandidatas({
  pipeline,
  serviceId,
}: {
  pipeline: Pipeline;
  serviceId?: number | null;
}): Promise<Opportunity[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;
  const byId = new Map<string, Opportunity>();

  async function fetchAll(build: (q: any) => any) {
    let start = 0;
    while (true) {
      let query = supabase.from("opportunities").select(OPPORTUNITY_COLUMNS).eq("pipeline", pipeline);
      query = build(query);
      if (serviceId) query = query.eq("service_id", serviceId);
      const { data, error } = await query.order("id", { ascending: true }).range(start, start + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []) as Opportunity[];
      for (const row of rows) byId.set(row.id, row);
      if (rows.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }
  }

  await fetchAll((q) => q.eq("status", "won"));
  const ventaStages = VENTA_STAGES[pipeline];
  if (ventaStages.length > 0) {
    await fetchAll((q) => q.in("stage", ventaStages));
  }

  return Array.from(byId.values());
}

/** Gasto total de Meta Ads en un rango de fechas (módulo Generación de Clientes Potenciales) */
export async function getAdSpendTotal({ from, to }: DateRange): Promise<number> {
  const stats = await getAdSpendStats({ from, to });
  return stats.spend;
}

export interface AdSpendStats {
  spend: number;
  impressions: number;
  clicks: number;
  /** Leads reportados por Meta (action_type "lead"), no confundir con las
   * oportunidades de Clientify — ver ingest en extractLeadsFromActions. */
  leads: number;
}

/** Métricas agregadas de Meta Ads en un rango de fechas — base del
 * "Embudo de Conversión" (Impresiones → Clics → Leads Captados) del
 * módulo Generación de Clientes Potenciales. */
export async function getAdSpendStats({ from, to }: DateRange): Promise<AdSpendStats> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ad_spend")
    .select("spend, impressions, clicks, leads")
    .gte("date", from)
    .lte("date", to);

  if (error) throw error;
  const rows = data ?? [];
  return {
    spend: rows.reduce((sum, row) => sum + Number(row.spend), 0),
    impressions: rows.reduce((sum, row) => sum + Number(row.impressions ?? 0), 0),
    clicks: rows.reduce((sum, row) => sum + Number(row.clicks ?? 0), 0),
    leads: rows.reduce((sum, row) => sum + Number(row.leads ?? 0), 0),
  };
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

/** Log acumulado de "Servicio Agendado" (Campañas) — ver
 * ServicioAgendadoLogRow. Filtra por `entered_at` (cuándo se detectó la
 * entrada a la etapa), no por fecha de creación de la oportunidad. */
export async function getServiciosAgendadosLog({ from, to }: DateRange): Promise<ServicioAgendadoLogRow[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;
  const all: ServicioAgendadoLogRow[] = [];
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from("servicios_agendados_log")
      .select("id, opportunity_id, entered_at, contact_name, contact_email, contact_phone, service_id, value, channel, deal_created_at")
      .gte("entered_at", `${from}T00:00:00.000Z`)
      .lte("entered_at", `${to}T23:59:59.999Z`)
      .order("entered_at", { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as ServicioAgendadoLogRow[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return all;
}

// ---------------------------------------------------------------------
// Redes sociales

/** Para cada oportunidad que alguna vez entró a "Cirugía Exitosa", la
 * fecha (YYYY-MM-DD) de su entrada MÁS RECIENTE — es la "fecha de
 * cierre efectiva" que usa dashboard.effectiveClosingDate cuando
 * Clientify no tiene ningún campo confiable para esto (ver
 * cirugia_exitosa_log, migración 015). */
export async function getCirugiaExitosaEntryDates(): Promise<Map<string, string>> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;
  const map = new Map<string, string>();
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cirugia_exitosa_log")
      .select("opportunity_id, entered_at")
      .order("entered_at", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as { opportunity_id: string | null; entered_at: string }[];
    for (const row of rows) {
      if (!row.opportunity_id) continue;
      map.set(row.opportunity_id, row.entered_at.slice(0, 10)); // ascendente: la última entrada gana
    }
    if (rows.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return map;
}
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

const FRECUENCIA_COLUMNS =
  "year, month_num, month_name, uf, grupo, real, meta, base_prev, dias_calendario, dias_habiles, is_mtd";

/** Serie mensual total (todas las UF, todos los grupos) de un año —
 * base del gráfico "Real vs. Meta" principal de Frecuencias. */
export async function getFrecuenciasTotalSerie(year: number): Promise<FrecuenciaMonthly[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_mensual")
    .select(FRECUENCIA_COLUMNS)
    .is("uf", null)
    .is("grupo", null)
    .eq("year", year)
    .order("month_num");
  if (error) throw error;
  return data ?? [];
}

/** Desglose por Unidad Funcional (UF) de un mes puntual (todos los
 * grupos combinados). */
export async function getFrecuenciasPorUF({
  year,
  monthNum,
}: {
  year: number;
  monthNum: number;
}): Promise<FrecuenciaMonthly[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_mensual")
    .select(FRECUENCIA_COLUMNS)
    .not("uf", "is", null)
    .is("grupo", null)
    .eq("year", year)
    .eq("month_num", monthNum)
    .order("uf");
  if (error) throw error;
  return data ?? [];
}

/** Desglose por empresa/contrato (grupo) de un mes puntual (todas las
 * UF combinadas). */
export async function getFrecuenciasPorGrupo({
  year,
  monthNum,
}: {
  year: number;
  monthNum: number;
}): Promise<FrecuenciaMonthly[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_mensual")
    .select(FRECUENCIA_COLUMNS)
    .is("uf", null)
    .not("grupo", "is", null)
    .eq("year", year)
    .eq("month_num", monthNum)
    .order("grupo");
  if (error) throw error;
  return data ?? [];
}

/** Años disponibles en la base de Frecuencias (para el selector), de
 * más reciente a más antiguo. */
export async function getFrecuenciasAniosDisponibles(): Promise<number[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_mensual")
    .select("year")
    .is("uf", null)
    .is("grupo", null);
  if (error) throw error;
  const years = Array.from(new Set((data ?? []).map((r) => r.year)));
  return years.sort((a, b) => b - a);
}

/** El mes más reciente con datos cargados (año + mes) — para elegir el
 * valor por defecto de los filtros al entrar al módulo. Si el mes más
 * reciente está "en curso" (is_mtd), se informa igual: la página avisa
 * que es un corte parcial. */
export async function getFrecuenciasMesMasReciente(): Promise<{
  year: number;
  month_num: number;
  is_mtd: boolean;
} | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_mensual")
    .select("year, month_num, is_mtd")
    .is("uf", null)
    .is("grupo", null)
    .order("year", { ascending: false })
    .order("month_num", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

const FRECUENCIA_CONTEO_COLUMNS =
  "year, month_num, month_name, uf, grupo, cantidad, valor, dias_calendario, dias_habiles";

const FRECUENCIA_DIA_COLUMNS = "fecha, uf, grupo, cantidad, valor";

/** Detalle día a día (tabla frecuencias_dias, migración 013). Se usa
 * para cortar todos los años al mismo día del calendario: sin esto, la
 * comparación resta un año en curso contra años completos y siempre da
 * en rojo. Son ~10.300 filas, así que se traen todas y se agregan en el
 * cliente, igual que hace el tablero original. */
export async function getFrecuenciasDias(): Promise<FrecuenciaDia[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;
  const all: FrecuenciaDia[] = [];
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from("frecuencias_dias")
      .select(FRECUENCIA_DIA_COLUMNS)
      .order("fecha")
      .range(start, start + PAGE_SIZE - 1);
    // La tabla puede no existir todavía (migración 013 sin aplicar): en
    // ese caso se devuelve vacío y la UI cae al modo por meses, en vez
    // de tumbar la página entera.
    if (error) {
      console.warn("getFrecuenciasDias:", error.message);
      return [];
    }
    const rows = (data ?? []) as FrecuenciaDia[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return all;
}

/** Matriz completa año/mes/UF/empresa (sin filtrar Mutual) — fuente
 * única del módulo nativo "Resumen Comparativo" y las pestañas que le
 * siguen. El filtro Mutual (incluir/excluir) y el modo
 * Frecuencias/Pesos $ se aplican en el cliente, igual que el tablero
 * original de Pedro. */
export async function getFrecuenciasConteos(): Promise<FrecuenciaConteo[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;
  const all: FrecuenciaConteo[] = [];
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from("frecuencias_conteos")
      .select(FRECUENCIA_CONTEO_COLUMNS)
      .order("year")
      .order("month_num")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as FrecuenciaConteo[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return all;
}

/** Filas de meta/real "por UF" (incluye el total con uf=null) de todos
 * los años — fuente para la pestaña nativa "Comparativo Anual" (banner
 * de meta +15% y columna Meta/% Avance de la tabla por UF). Esta meta
 * ya viene sin Mutual desde el motor de Pedro (no depende del toggle
 * Mutual del cliente) y solo aplica en modo Frecuencias. */
export async function getFrecuenciasMetaPorUF(): Promise<FrecuenciaMonthly[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_mensual")
    .select(FRECUENCIA_COLUMNS)
    .is("grupo", null)
    .order("year")
    .order("month_num");
  if (error) throw error;
  return data ?? [];
}

/** Filas de meta/real "por UF + Empresa" (detalle granular, ninguna
 * columna nula) — fuente para la columna Meta de la pestaña nativa
 * "Detalle por Empresa". Igual que la meta total/por UF, ya viene sin
 * Mutual desde el motor de Pedro y solo aplica en modo Frecuencias. */
export async function getFrecuenciasMetaDetalle(): Promise<FrecuenciaMonthly[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_mensual")
    .select(FRECUENCIA_COLUMNS)
    .not("uf", "is", null)
    .not("grupo", "is", null)
    .order("year")
    .order("month_num");
  if (error) throw error;
  return data ?? [];
}

/** Evolución mensual de Prepagadas (todas las entidades combinadas) —
 * alimenta el gráfico de evolución de la pestaña nativa "Prepagadas".
 * No depende del toggle Mutual (Prepagadas es un grupo aparte). */
export async function getFrecuenciasPrepagadasMensual(): Promise<FrecuenciaPrepagadaMensual[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_prepagadas_mensual")
    .select("year, month_num, month_name, freq, valor")
    .order("year")
    .order("month_num");
  if (error) throw error;
  return data ?? [];
}

/** Ranking por contrato/entidad prepagada, todos los años disponibles —
 * alimenta el Top 5 y la tabla de ranking de la pestaña "Prepagadas". */
export async function getFrecuenciasPrepagadasRanking(): Promise<FrecuenciaPrepagadaRanking[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_prepagadas_ranking")
    .select("year, contrato, freq, valor")
    .order("year")
    .order("valor", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Actividad por médico (año/mes/sede/UF) — alimenta la pestaña
 * nativa "Médicos". "Sede 2" se filtra en el cliente según el toggle
 * Mutual (Sede 2 es donde se atiende Mutual). */
export async function getFrecuenciasMedicos(): Promise<FrecuenciaMedicoMensual[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;
  const all: FrecuenciaMedicoMensual[] = [];
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from("frecuencias_medicos_mensual")
      .select("year, month_num, month_name, medico, sede, uf, cantidad, valor")
      .order("year")
      .order("month_num")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as FrecuenciaMedicoMensual[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return all;
}

/** Servicios facturados vs. no cobrados por mes — alimenta la pestaña
 * nativa "Cobrable vs No". */
export async function getFrecuenciasCobrable(): Promise<FrecuenciaCobrableMensual[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("frecuencias_cobrable_mensual")
    .select("year, month_num, month_name, uf, si, no, valor_si, valor_no")
    .order("year")
    .order("month_num");
  if (error) throw error;
  return data ?? [];
}
