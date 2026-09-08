import { createServiceClient } from "@/lib/supabase/server";
import type {
  AvgClosingTimeRow,
  Pipeline,
  StageFunnelRow,
} from "@/lib/types";

export interface DashboardFilters {
  pipeline: Pipeline;
  serviceId?: number | null;
}

/** Etapas de las oportunidades (embudo) para un módulo, opcionalmente filtrado por servicio */
export async function getStageFunnel({
  pipeline,
  serviceId,
}: DashboardFilters): Promise<StageFunnelRow[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("v_stage_funnel")
    .select("*")
    .eq("pipeline", pipeline);

  if (serviceId) query = query.eq("service_id", serviceId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Tiempo promedio de cierre (días) para un módulo, opcionalmente filtrado por servicio */
export async function getAvgClosingTime({
  pipeline,
  serviceId,
}: DashboardFilters): Promise<AvgClosingTimeRow[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("v_avg_closing_time")
    .select("*")
    .eq("pipeline", pipeline);

  if (serviceId) query = query.eq("service_id", serviceId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Gasto total de Meta Ads en un rango de fechas (módulo Generación de Clientes Potenciales) */
export async function getAdSpendTotal({
  from,
  to,
}: {
  from: string;
  to: string;
}): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ad_spend")
    .select("spend")
    .gte("date", from)
    .lte("date", to);

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.spend), 0);
}

export async function listServices() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
