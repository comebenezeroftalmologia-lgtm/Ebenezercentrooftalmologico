import { NextRequest, NextResponse } from "next/server";
import { llaveBotValida } from "@/lib/bot/sisma-citas";
import { validarAfiliado } from "@/lib/bot/acciones";

// Valida si un paciente está activo en la base de afiliados de MutualSer.
// Lo llama el agente de Dapta (acción API). Se protege con la llave BOT_API_KEY
// en el encabezado x-bot-key; /api/** está fuera del middleware de sesión.
// Devuelve lo mínimo necesario (nombre de pila, régimen, municipio): nada de
// dirección, correo ni teléfono. La lógica vive en src/lib/bot/acciones.ts.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!llaveBotValida(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let cuerpo: { documento?: string; canal?: string; nombre?: string } = {};
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const r = await validarAfiliado(cuerpo.documento, cuerpo.canal, cuerpo.nombre);
  return NextResponse.json(r.body, { status: r.status });
}
