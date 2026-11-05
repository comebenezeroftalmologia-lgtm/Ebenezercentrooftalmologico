import { NextRequest, NextResponse } from "next/server";
import { llaveBotValida } from "@/lib/bot/sisma-citas";
import { agendarCita, type EntradaAgendar } from "@/lib/bot/acciones";

// Agenda una cita en SISMA para un paciente YA existente (se busca por documento).
// Si el paciente no existe, NO lo crea: devuelve paciente_no_encontrado para que el
// bot lo derive al equipo humano.
// Requiere: SISMA_NODE_API_KEY con permiso citas.agendar y SISMA_BOT_USER_ID
// (id del usuario de SISMA que figura como autor de la cita).
// Body: { documento, tipoId?, codMedico, idAsunto, fecha, hora, canal?, observacion? }
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!llaveBotValida(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let b: EntradaAgendar = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const r = await agendarCita(b);
  return NextResponse.json(r.body, { status: r.status });
}
