import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  extractServiceFromDealName,
  fetchClientifyDealsForPipeline,
  normalizeClientifyDeal,
} from "@/lib/integrations/clientify";
import { normalizeStage } from "@/lib/text";
import type { Pipeline } from "@/lib/types";


// Clientify puede paginar cientos de deals y responder lento/con
// timeouts intermitentes — 10s (default de Vercel) no alcanza.
export const maxDuration = 60;

const PIPELINES: Pipeline[] = [
  "generacion_leads",
  "ordenamientos_qx",
  "ordenamientos_no_qx",
];

// Etapa que alimenta el log acumulado de servicios_agendados_log — solo
// existe en el pipeline de Campañas (ver supabase/migrations/013).
const SERVICIO_AGENDADO_PIPELINE: Pipeline = "generacion_leads";
const SERVICIO_AGENDADO_STAGE = normalizeStage("Servicio Agendado");

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Cache de nombre de servicio -> id, para no consultar por cada deal
  const { data: services } = await supabase.from("services").select("id, name");
  const serviceIdByName = new Map((services ?? []).map((s) => [s.name, s.id]));

  let totalSynced = 0;
  const perPipeline: Record<string, number> = {};
  const servicioAgendadoLogged: Record<string, number> = {};

  for (const pipeline of PIPELINES) {
    const deals = await fetchClientifyDealsForPipeline(pipeline);
    const rows = deals.map((deal) => {
      const normalized = normalizeClientifyDeal(deal, pipeline);
      const { service_name, ...rest } = normalized;
      return {
        ...rest,
        service_id: service_name ? serviceIdByName.get(service_name) ?? null : null,
      };
    });

    if (rows.length > 0) {
      // Se lee el estado existente ANTES de sobreescribir con el upsert de
      // abajo — hace doble función:
      //   1) compara la etapa anterior de cada oportunidad para detectar
      //      quién ENTRÓ recién a "Servicio Agendado" (no solo quién está
      //      ahí hoy — así un mismo lead que reingresa genera una fila
      //      nueva en servicios_agendados_log cada vez).
      //   2) el mismo listado de IDs sirve para la limpieza de
      //      "fantasmas" de más abajo (el orden antes/después del upsert
      //      no afecta ese diff, solo importa el conjunto de IDs).
      // Paginado explícito — el límite por defecto de PostgREST (1000
      // filas) truncaba silenciosamente el pipeline de Campañas (1562
      // oportunidades), el mismo bug que ya se corrigió en getOpportunities().
      const existingRowsAll: { id: string; stage: string }[] = [];
      let idStart = 0;
      const ID_PAGE_SIZE = 1000;
      while (true) {
        const { data: page, error: existingError } = await supabase
          .from("opportunities")
          .select("id, stage")
          .eq("pipeline", pipeline)
          .range(idStart, idStart + ID_PAGE_SIZE - 1);
        if (existingError) {
          return NextResponse.json(
            { error: `${pipeline} (leyendo estado existente): ${existingError.message}`, syncedBeforeError: totalSynced },
            { status: 500 }
          );
        }
        const pageRows = page ?? [];
        existingRowsAll.push(...(pageRows as { id: string; stage: string }[]));
        if (pageRows.length < ID_PAGE_SIZE) break;
        idStart += ID_PAGE_SIZE;
      }
      const previousStageById = new Map(existingRowsAll.map((r) => [r.id, r.stage]));

      // Detecta entradas a "Servicio Agendado" (solo Campañas) ANTES del
      // upsert, mientras `previousStageById` todavía refleja la etapa de
      // la corrida anterior.
      const servicioAgendadoEntries: {
        opportunity_id: string;
        pipeline: Pipeline;
        contact_name: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        service_id: number | null;
        value: number | null;
        channel: string | null;
        deal_created_at: string;
      }[] = [];
      if (pipeline === SERVICIO_AGENDADO_PIPELINE) {
        for (let i = 0; i < deals.length; i++) {
          const deal = deals[i];
          const row = rows[i];
          if (normalizeStage(row.stage) !== SERVICIO_AGENDADO_STAGE) continue;
          const prevStage = previousStageById.get(row.id);
          const wasAlreadyThere = prevStage !== undefined && normalizeStage(prevStage) === SERVICIO_AGENDADO_STAGE;
          if (wasAlreadyThere) continue; // ya estaba ahí en la corrida anterior, no es una entrada nueva

          const serviceName = extractServiceFromDealName(deal.name);
          servicioAgendadoEntries.push({
            opportunity_id: row.id,
            pipeline,
            contact_name: deal.contact_name,
            contact_email: deal.contact_email,
            contact_phone: deal.contact_phone,
            service_id: serviceName ? serviceIdByName.get(serviceName) ?? null : null,
            value: row.value,
            channel: row.channel,
            deal_created_at: row.created_at,
          });
        }
      }

      const { error } = await supabase.from("opportunities").upsert(rows, {
        onConflict: "id",
      });
      if (error) {
        return NextResponse.json(
          { error: `${pipeline}: ${error.message}`, syncedBeforeError: totalSynced },
          { status: 500 }
        );
      }

      if (servicioAgendadoEntries.length > 0) {
        const { error: logError } = await supabase
          .from("servicios_agendados_log")
          .insert(servicioAgendadoEntries);
        if (logError) {
          return NextResponse.json(
            { error: `${pipeline} (log de Servicio Agendado): ${logError.message}`, syncedBeforeError: totalSynced },
            { status: 500 }
          );
        }
        servicioAgendadoLogged[pipeline] = servicioAgendadoEntries.length;
      }

      // Clientify no expone un webhook de borrado — un deal eliminado o
      // fusionado allá simplemente deja de aparecer en el listado. Sin
      // este paso, esos IDs se quedan como "fantasmas" en nuestra base
      // para siempre (encontramos y limpiamos 9 casos así el
      // 2026-09-08). Se calcula el diff en memoria (evita mandar un
      // filtro "not in (...)" con miles de IDs en la URL, que puede
      // superar límites de tamaño) y solo se borran los IDs que ya no
      // aparecen en el listado fresco de Clientify. servicios_agendados_log
      // no se ve afectado — su FK es "on delete set null", conserva la fila.
      const freshIds = new Set(rows.map((r) => r.id));
      const ghostIds = existingRowsAll
        .map((r) => r.id)
        .filter((id) => !freshIds.has(id));
      if (ghostIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("opportunities")
          .delete()
          .in("id", ghostIds);
        if (deleteError) {
          return NextResponse.json(
            { error: `${pipeline} (limpieza de fantasmas): ${deleteError.message}`, syncedBeforeError: totalSynced },
            { status: 500 }
          );
        }
      }
    }

    perPipeline[pipeline] = rows.length;
    totalSynced += rows.length;
  }

  return NextResponse.json({ synced: totalSynced, perPipeline, servicioAgendadoLogged });
}
