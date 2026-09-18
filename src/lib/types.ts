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

export interface FrecuenciaMonthly {
  year: number;
  month_num: number;
  month_name: string;
  uf: string | null;
  grupo: string | null;
  real: number;
  meta: number;
  base_prev: number;
  dias_calendario: number | null;
  dias_habiles: number | null;
  is_mtd: boolean;
}

/** Fila de la matriz completa año/mes/UF/empresa del tablero de Pedro
 * (RAW.mens_year_uf_grp y RAW.valor_year_uf_grp), sin filtrar Mutual —
 * el incluir/excluir Mutual se aplica en el cliente (nombre de grupo
 * que contiene "MUTUAL"), igual que el tablero original. */
export interface FrecuenciaConteo {
  year: number;
  month_num: number;
  month_name: string;
  uf: string;
  grupo: string;
  cantidad: number;
  valor: number;
  dias_calendario: number | null;
  dias_habiles: number | null;
}

/** Evolución mensual del grupo "Prepagadas" (todas las entidades
 * combinadas) — RAW.prepagadas_mens del motor de Pedro. */
export interface FrecuenciaPrepagadaMensual {
  year: number;
  month_num: number;
  month_name: string;
  freq: number;
  valor: number;
}

/** Ranking por contrato/entidad prepagada de un año — RAW.prepagadas_top. */
export interface FrecuenciaPrepagadaRanking {
  year: number;
  contrato: string;
  freq: number;
  valor: number;
}

/** Actividad de un médico por año/mes/sede/UF — RAW.medicos del motor
 * de Pedro, aplanado. "Sede 2" es donde se atiende Mutual: el toggle
 * Mutual del módulo decide si entra en los totales. */
export interface FrecuenciaMedicoMensual {
  year: number;
  month_num: number;
  month_name: string;
  medico: string;
  sede: string;
  uf: string;
  cantidad: number;
  valor: number;
}

/** Servicios facturados vs. no cobrados por mes — RAW.cobrable del
 * motor de Pedro. uf=null es el total (con valor_si/valor_no en
 * pesos); las filas con uf trae el desglose de conteos por UF. */
export interface FrecuenciaCobrableMensual {
  year: number;
  month_num: number;
  month_name: string;
  uf: string | null;
  si: number;
  no: number;
  valor_si: number | null;
  valor_no: number | null;
}
