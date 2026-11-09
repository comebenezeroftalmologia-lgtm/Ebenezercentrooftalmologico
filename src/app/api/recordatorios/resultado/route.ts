import { NextRequest, NextResponse } from "next/server";
import { llaveBotValida } from "@/lib/bot/sisma-citas";
import { createServiceClient } from "@/lib/supabase/server";

// Dapta avisa aquí cómo terminó cada recordatorio (confirmó, quiere reprogramar, no contestó…).
// Llave: cabecera x-bot-key (la misma BOT_API_KEY del bot de citas).
// Cuerpo: { "envio_id": 123, "resultado": "confirmo", "detalle": "texto opcional" }
export const dynamic = "force-dynamic";

const LIMPIO = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(req: NextRequest) {
  if (!llaveBotValida(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { envio_id?: unknown; resultado?: unknown; detalle?: unknown } | null;
  const id = Number(b?.envio_id);
  const resultado = LIMPIO(b?.resultado, 60).toLowerCase();
  if (!Number.isInteger(id) || id <= 0 || !resultado) {
    return NextResponse.json({ error: "Se requiere envio_id (entero) y resultado" }, { status: 400 });
  }
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("recordatorio_envios")
    .update({ resultado, resultado_at: new Date().toISOString(), resultado_detalle: LIMPIO(b?.detalle, 500) || null })
    .eq("id", id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Envío no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
