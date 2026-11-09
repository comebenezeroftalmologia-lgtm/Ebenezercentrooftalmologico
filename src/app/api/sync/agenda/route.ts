import { NextRequest, NextResponse } from "next/server";
import { sincronizarAgenda } from "@/lib/clinico/agenda-sync";

// Carga la agenda de SISMA (hoy + los próximos días). Vercel Cron llama con
// Authorization: Bearer CRON_SECRET. ?dias=N cambia el horizonte (1–30).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const dias = Number(req.nextUrl.searchParams.get("dias") ?? "14");
  const r = await sincronizarAgenda({ dias: Number.isFinite(dias) ? dias : 14, origen: "cron" });
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
