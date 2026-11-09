import { NextRequest, NextResponse } from "next/server";
import { procesarRecordatorios } from "@/lib/clinico/recordatorios";

// Motor de recordatorios de citas (llamada y WhatsApp por Dapta). Vercel Cron
// llama con Authorization: Bearer CRON_SECRET. Sin RECORDATORIOS_ENVIAR=true solo simula.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await procesarRecordatorios({ origen: "cron" })) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
