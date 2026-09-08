import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  fetchClientifyDealsForPipeline,
  normalizeClientifyDeal,
} from "@/lib/integrations/clientify";
import type { Pipeline } from "@/lib/types";

const PIPELINES: Pipeline[] = [
  "generacion_leads",
  "ordenamientos_qx",
  "ordenamientos_no_qx",
];

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
      const { error } = await supabase.from("opportunities").upsert(rows, {
        onConflict: "id",
      });
      if (error) {
        return NextResponse.json(
          { error: `${pipeline}: ${error.message}`, syncedBeforeError: totalSynced },
          { status: 500 }
        );
      }

      // Clientify no expone un webhook de borrado — un deal eliminado o
      // fusionado allá simplemente deja de aparecer en el listado. Sin
      // este paso, esos IDs se quedan como "fantasmas" en nuestra base
      // para siempre (encontramos y limpiamos 9 casos así el
      // 2026-09-08). Se calcula el diff en memoria (evita mandar un
      // filtro "not in (...)" con miles de IDs en la URL, que puede
      // superar límites de tamaño) y solo se borran los IDs que ya no
      // aparecen en el listado fresco de Clientify.
      const freshIds = new Set(rows.map((r) => r.id));
      // Paginado explícito — el límite por defecto de PostgREST (1000
      // filas) truncaba silenciosamente el pipeline de Campañas (1562
      // oportunidades), el mismo bug que ya se corrigió en getOpportunities().
      const existingIdsAll: { id: string }[] = [];
      let idStart = 0;
      const ID_PAGE_SIZE = 1000;
      while (true) {
        const { data: page, error: existingError } = await supabase
          .from("opportunities")
          .select("id")
          .eq("pipeline", pipeline)
          .range(idStart, idStart + ID_PAGE_SIZE - 1);
        if (existingError) {
          return NextResponse.json(
            { error: `${pipeline} (leyendo IDs existentes): ${existingError.message}`, syncedBeforeError: totalSynced },
            { status: 500 }
          );
        }
        const pageRows = page ?? [];
        existingIdsAll.push(...(pageRows as { id: string }[]));
        if (pageRows.length < ID_PAGE_SIZE) break;
        idStart += ID_PAGE_SIZE;
      }
      const ghostIds = existingIdsAll
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

  return NextResponse.json({ synced: totalSynced, perPipeline });
}
