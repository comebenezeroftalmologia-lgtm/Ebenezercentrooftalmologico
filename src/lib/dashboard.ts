import type { Opportunity, OpportunityStatus, Pipeline } from "@/lib/types";
import { normalizeStage } from "@/lib/text";
import { PROBABILIDAD_COMPRA_STAGES, VENTA_STAGES } from "@/lib/pipelineStages";

/** "Vendida" = status Ganada en Clientify, O la oportunidad llegó a la
 * etapa de "programación" real de venta de su pipeline (ver
 * pipelineStages.ts) — no existe una etapa literal "Ganada". */
export function isVendida(o: Opportunity): boolean {
  if (o.status === "won") return true;
  const ventaStages = VENTA_STAGES[o.pipeline];
  return ventaStages.some((s) => normalizeStage(s) === normalizeStage(o.stage));
}

/** Solo aplica al pipeline de Generación de Clientes Potenciales. */
export function isProbabilidadCompra(o: Opportunity): boolean {
  return PROBABILIDAD_COMPRA_STAGES.some(
    (s) => normalizeStage(s) === normalizeStage(o.stage)
  );
}

export interface StatusCounts {
  total: number;
  open: number;
  expired: number;
  lost: number;
  won: number;
}

export function statusCounts(opps: Opportunity[]): StatusCounts {
  const counts: StatusCounts = { total: opps.length, open: 0, expired: 0, lost: 0, won: 0 };
  for (const o of opps) {
    counts[o.status] += 1;
  }
  return counts;
}

export function totalImporte(opps: Opportunity[]): number {
  return opps.reduce((sum, o) => sum + (o.value ?? 0), 0);
}

export interface FunnelDatum {
  stage: string;
  count: number;
  value: number;
}

export function buildStageFunnel(opps: Opportunity[]): FunnelDatum[] {
  const byStage = new Map<string, FunnelDatum>();
  for (const o of opps) {
    const cur = byStage.get(o.stage) ?? { stage: o.stage, count: 0, value: 0 };
    cur.count += 1;
    cur.value += o.value ?? 0;
    byStage.set(o.stage, cur);
  }
  return Array.from(byStage.values()).sort((a, b) => b.count - a.count);
}

/** Promedio de días entre dos fechas de cada oportunidad (solo cuenta
 * las que tienen ambas fechas presentes). Genérico: se usa tanto para
 * el cálculo "creación -> próxima cita" (módulo 1) como el clásico
 * "creación -> cierre" (módulos 2 y 3). */
export function avgDaysBetween(
  opps: Opportunity[],
  getStart: (o: Opportunity) => string | null,
  getEnd: (o: Opportunity) => string | null
): number | null {
  const diffs: number[] = [];
  for (const o of opps) {
    const start = getStart(o);
    const end = getEnd(o);
    if (!start || !end) continue;
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    if (Number.isFinite(days)) diffs.push(days);
  }
  if (diffs.length === 0) return null;
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

export type EstadoFilter =
  | "open"
  | "expired"
  | "lost"
  | "won"
  | "vendidas"
  | "probabilidad"
  | undefined;

export function filterByEstado(opps: Opportunity[], estado: EstadoFilter): Opportunity[] {
  switch (estado) {
    case "open":
    case "expired":
    case "lost":
    case "won":
      return opps.filter((o) => o.status === (estado as OpportunityStatus));
    case "vendidas":
      return opps.filter(isVendida);
    case "probabilidad":
      return opps.filter(isProbabilidadCompra);
    default:
      return opps;
  }
}

export function calcROI({ totalImporte, gasto }: { totalImporte: number; gasto: number }): number | null {
  if (!gasto) return null;
  return ((totalImporte - gasto) / gasto) * 100;
}

/** Rango de fechas por defecto: últimos 30 días. */
export function defaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today.getTime() - 30 * 86400_000).toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  return { from, to };
}

export const ESTADO_LABELS: Record<string, string> = {
  open: "Abiertas",
  expired: "Vencidas",
  lost: "Perdidas",
  won: "Ganadas",
  vendidas: "Vendidas",
  probabilidad: "Con Probabilidad de Compra",
};
