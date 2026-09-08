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

export type OpportunityStatus = "open" | "won" | "lost" | "expired";

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  open: "Abiertas",
  expired: "Vencidas",
  lost: "Perdidas",
  won: "Ganadas",
};

export interface Opportunity {
  id: string;
  pipeline: Pipeline;
  stage: string;
  service_id: number | null;
  value: number | null;
  channel: string | null;
  campaign_id: string | null;
  contact_id: string | null;
  contact_name: string | null;
  created_at: string;
  closed_at: string | null;
  next_appointment_date: string | null;
  expected_close_date: string | null;
  status: OpportunityStatus;
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

export interface SocialPost {
  media_id: string;
  platform: string;
  media_type: string | null;
  caption: string | null;
  permalink: string | null;
  posted_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  reach: number;
  views: number | null;
  total_interactions: number;
  synced_at: string;
}

export interface SocialStatPoint {
  date: string;
  value: number;
}
