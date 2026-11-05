import { NextRequest, NextResponse } from "next/server";
import { llaveBotValida } from "@/lib/bot/sisma-citas";
import { consultarCupos, type EntradaCupos } from "@/lib/bot/acciones";

// Consulta de cupos libres en SISMA para el bot de citas (solo lectura).
// Body: { fecha: "2026-11-05", idEspecialidad?, idAsunto?, codMedico? }
// Devuelve hasta 12 cupos tal como los entrega SISMA (campo `hora` en 24 h).
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!llaveBotValida(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let b: EntradaCupos = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const r = await consultarCupos(b);
  return NextResponse.json(r.body, { status: r.status });
}
