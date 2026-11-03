import { NextRequest, NextResponse } from "next/server";
import { FECHA_RE, llaveBotValida, sismaNodeJson } from "@/lib/bot/sisma-citas";

// Consulta de cupos libres en SISMA para el bot de citas (solo lectura).
// Body: { fecha: "2026-11-05", idEspecialidad?, idAsunto?, codMedico? }
// Devuelve hasta 12 cupos tal como los entrega SISMA (campo `hora` en 24 h).
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!llaveBotValida(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let b: { fecha?: string; idEspecialidad?: number | string; idAsunto?: number | string; codMedico?: number | string } = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const fecha = (b.fecha ?? "").trim();
  if (!FECHA_RE.test(fecha)) {
    return NextResponse.json({ error: "fecha debe ser yyyy-MM-dd" }, { status: 400 });
  }
  const q = new URLSearchParams({ fecha });
  if (b.idEspecialidad) q.set("idEspecialidad", String(b.idEspecialidad));
  if (b.idAsunto) q.set("idAsunto", String(b.idAsunto));
  if (b.codMedico) q.set("codMedico", String(b.codMedico));

  try {
    const { status, data } = await sismaNodeJson<unknown>(`/api/citas/disponibilidad?${q}`);
    if (status !== 200) {
      return NextResponse.json({ disponible: false, error: "SISMA no respondió la disponibilidad", status }, { status: 502 });
    }
    const lista = Array.isArray(data)
      ? data
      : Array.isArray((data as { cupos?: unknown[] })?.cupos)
        ? (data as { cupos: unknown[] }).cupos
        : null;
    if (!lista) return NextResponse.json({ disponible: true, cupos: [], crudo: data });
    return NextResponse.json({ disponible: lista.length > 0, total: lista.length, cupos: lista.slice(0, 12) });
  } catch (e) {
    return NextResponse.json(
      { disponible: false, error: e instanceof Error && e.message === "SIN_LLAVE" ? "SISMA_NODE_API_KEY no configurada" : "Error consultando SISMA" },
      { status: 502 },
    );
  }
}
