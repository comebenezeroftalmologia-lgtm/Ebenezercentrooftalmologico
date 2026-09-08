export type Pipeline =
  | "generacion_leads"
  | "ordenamientos_no_qx"
  | "ordenamientos_qx";

export const PIPELINE_LABELS: Record<Pipeline, string> = {
  generacion_leads: "Generación de Clientes Potenciales",
  ordenamientos_no_qx: "Ordenamientos No Quirúrgicos",
  ordenamientos_qx: "Ordenamientos Quirúrgicos",
};

export type ServiceName = "Cataratas" | "Cx Refractiva" | "Ojo Seco";

export interface Service {
  id: number;
  name: ServiceName | string;
}

export interface Opportunity {
  id: string;
  pipeline: Pipeline;
  stage: string;
  service_id: number | null;
  value: number | null;
  channel: string | null;
  campaign_id: string | null;
  contact_id: string | null;
  created_at: string;
  closed_at: string | null;
  status: "open" | "won" | "lost";
}

export interface AdSpendRow {
  campaign_id: string;
  campaign_name: string | null;
  date: string;
  spend: number;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
}

export interface StageFunnelRow {
  pipeline: Pipeline;
  service_id: number | null;
  stage: string;
  opportunity_count: number;
  total_value: number | null;
}

export interface AvgClosingTimeRow {
  pipeline: Pipeline;
  service_id: number | null;
  avg_days_to_close: number;
  closed_count: number;
}
