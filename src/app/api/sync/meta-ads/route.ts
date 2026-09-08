import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { extractLeadsFromActions, fetchMetaAdInsights } from "@/lib/integrations/meta-ads";

// Vercel Cron Jobs llaman por GET, con
// `Authorization: Bearer <CRON_SECRET>` cuando CRON_SECRET está
// configurado en el proyecto de Vercel — así se evita que quede
// invocable públicamente. Ver vercel.json para el horario.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const insights = await fetchMetaAdInsights({ since, until });
  const supabase = createServiceClient();

  const rows = insights.map((row) => ({
    platform: "meta_ads",
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    date: row.date_start,
    spend: Number(row.spend),
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    leads: extractLeadsFromActions(row),
  }));

  const { error } = await supabase
    .from("ad_spend")
    .upsert(rows, { onConflict: "platform,campaign_id,date" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length });
}
