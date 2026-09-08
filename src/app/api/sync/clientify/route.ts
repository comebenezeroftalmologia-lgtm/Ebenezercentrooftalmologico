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
    }

    perPipeline[pipeline] = rows.length;
    totalSynced += rows.length;
  }

  return NextResponse.json({ synced: totalSynced, perPipeline });
}
