import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchInstagramInsights } from "@/lib/integrations/social";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const rows = await fetchInstagramInsights({ since, until });
  const supabase = createServiceClient();

  if (rows.length > 0) {
    const { error } = await supabase
      .from("social_stats")
      .upsert(rows, { onConflict: "platform,metric,date" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ synced: rows.length });
}
