import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchClientifyDeals, normalizeClientifyDeal } from "@/lib/integrations/clientify";

// Vercel Cron Jobs llaman por GET, con
// `Authorization: Bearer <CRON_SECRET>` cuando CRON_SECRET está
// configurado en el proyecto de Vercel. Ver vercel.json para el horario.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const deals = await fetchClientifyDeals();
  const supabase = createServiceClient();

  const rows = deals
    .map(normalizeClientifyDeal)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const { error } = await supabase.from("opportunities").upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length });
}
