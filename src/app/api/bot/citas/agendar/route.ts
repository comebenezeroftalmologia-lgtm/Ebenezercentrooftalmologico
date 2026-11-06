import { NextRequest, NextResponse } from "next/server";
import { llaveBotValida } from "@/lib/bot/sisma-citas";
import { agendarCita, type EntradaAgendar } from "@/lib/bot/acciones";

// Agenda una cita de primera vez (o con más de un año desde la última consulta) en SISMA.
// Si el paciente no existe y es afiliado activo de MutualSer, lo crea con el celular dado.
// Requiere: SISMA_NODE_API_KEY con permisos citas.agendar y pacientes.crear, y SISMA_BOT_USER_ID
// (id del usuario de SISMA que figura como autor).
// Body: { documento, tipoId?, codMedico, idAsunto, fecha, hora, celular?, direccion?, barrio?, canal?, observacion? }
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
