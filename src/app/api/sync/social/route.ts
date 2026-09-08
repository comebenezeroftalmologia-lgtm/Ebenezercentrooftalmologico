import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  backfillInstagramFollowerHistory,
  fetchFacebookPageFollowers,
  fetchInstagramDailyTotals,
  fetchInstagramFollowerCount,
  fetchInstagramReach,
  fetchInstagramTopMedia,
} from "@/lib/integrations/social";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const backfill = req.nextUrl.searchParams.get("backfill") === "1";

    const [reachRows, totalsRows, followers, fbFollowers, topMedia, backfillRows] = await Promise.all([
      fetchInstagramReach({ since: yesterday, until: today }),
      fetchInstagramDailyTotals(yesterday),
      fetchInstagramFollowerCount(),
      fetchFacebookPageFollowers(),
      fetchInstagramTopMedia(25),
      backfill ? backfillInstagramFollowerHistory() : Promise.resolve([]),
    ]);

    const statRows = [...reachRows, ...totalsRows, ...backfillRows];
    if (followers !== null) {
      statRows.push({ platform: "instagram", metric: "followers", date: today, value: followers });
    }
    if (fbFollowers !== null) {
      statRows.push({ platform: "facebook", metric: "followers", date: today, value: fbFollowers });
    }

    const supabase = createServiceClient();

    if (statRows.length > 0) {
      const { error } = await supabase
        .from("social_stats")
        .upsert(statRows, { onConflict: "platform,metric,date" });
      if (error) {
        return NextResponse.json({ error: `social_stats: ${error.message}` }, { status: 500 });
      }
    }

    const postRows = topMedia.map((m) => ({
      media_id: m.media_id,
      platform: "instagram",
      media_type: m.media_type,
      caption: m.caption,
      permalink: m.permalink,
      posted_at: m.timestamp,
      likes: m.likes,
      comments: m.comments,
      shares: m.shares,
      saved: m.saved,
      reach: m.reach,
      views: m.views,
      total_interactions: m.total_interactions,
    }));

    if (postRows.length > 0) {
      const { error } = await supabase
        .from("social_posts")
        .upsert(postRows, { onConflict: "media_id" });
      if (error) {
        return NextResponse.json({ error: `social_posts: ${error.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      synced: statRows.length,
      posts: postRows.length,
      backfilled: backfillRows.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
