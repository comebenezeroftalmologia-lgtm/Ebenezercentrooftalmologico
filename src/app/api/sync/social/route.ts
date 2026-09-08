import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  fetchInstagramDailyTotals,
  fetchInstagramFollowerCount,
  fetchInstagramReach,
} from "@/lib/integrations/social";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const [reachRows, totalsRows, followers] = await Promise.all([
      fetchInstagramReach({ since: yesterday, until: today }),
      fetchInstagramDailyTotals(yesterday),
      fetchInstagramFollowerCount(),
    ]);

    const rows = [...reachRows, ...totalsRows];
    if (followers !== null) {
      rows.push({ platform: "instagram", metric: "followers", date: today, value: followers });
    }

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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
