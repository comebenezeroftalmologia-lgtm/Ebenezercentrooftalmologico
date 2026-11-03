import { NextRequest, NextResponse } from "next/server";
import { FECHA_RE, HORA_RE, llaveBotValida, sismaNodeJson } from "@/lib/bot/sisma-citas";
import { normalizarDocumento } from "@/lib/mutualser/afiliados";

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

  const idUsuario = Number(process.env.SISMA_BOT_USER_ID);
  if (!Number.isInteger(idUsuario) || idUsuario < 1) {
    return NextResponse.json({ agendada: false, error: "SISMA_BOT_USER_ID no configurado" }, { status: 503 });
  }

  let b: {
    documento?: string; tipoId?: string; codMedico?: number | string; idAsunto?: number | string;
    fecha?: string; hora?: string; canal?: string; observacion?: string;
  } = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const doc = normalizarDocumento(b.documento ?? "");
  const codMedico = Number(b.codMedico);
  const idAsunto = Number(b.idAsunto || 10); // 10 = consulta general primera vez
  const fecha = (b.fecha ?? "").trim();
  const hora = (b.hora ?? "").trim();
  if (doc.length < 4 || !Number.isInteger(codMedico) || codMedico < 1 || !Number.isInteger(idAsunto) || idAsunto < 1 || !FECHA_RE.test(fecha) || !HORA_RE.test(hora)) {
    return NextResponse.json({ error: "Datos incompletos o inválidos (documento, codMedico, idAsunto, fecha yyyy-MM-dd, hora HH:mm)" }, { status: 400 });
  }

  try {
    const q = new URLSearchParams({ numId: doc });
    if (b.tipoId) q.set("tipoId", b.tipoId);
    const pac = await sismaNodeJson<unknown>(`/api/pacientes?${q}`);
    const lista = Array.isArray(pac.data) ? (pac.data as Record<string, unknown>[]) : [];
    if (pac.status !== 200 || lista.length === 0) {
      return NextResponse.json({ agendada: false, motivo: "paciente_no_encontrado", accion_sugerida: "derivar_humano" });
    }
    if (lista.length > 1 && !b.tipoId) {
      return NextResponse.json({ agendada: false, motivo: "documento_ambiguo", accion_sugerida: "derivar_humano" });
    }
    const p = lista[0];
    const autoid = Number(p.autoid ?? p.Autoid ?? p.AUTOID);
    if (!Number.isInteger(autoid) || autoid < 1) {
      return NextResponse.json({ agendada: false, motivo: "paciente_sin_autoid", accion_sugerida: "derivar_humano" }, { status: 502 });
    }

    // SISMA no impide citas duplicadas: si ya tiene una pendiente ese día, no se agenda otra.
    const hist = await sismaNodeJson<unknown>(`/api/pacientes/${autoid}/citas?desde=${fecha}&hasta=${fecha}`);
    if (hist.status === 200 && Array.isArray(hist.data)) {
      const pendiente = (hist.data as Record<string, unknown>[]).some((c) => {
        const est = String(c.estado ?? c.Estado ?? "").toUpperCase();
        return est === "P" || est === "CC";
      });
      if (pendiente) {
        return NextResponse.json({ agendada: false, motivo: "cita_duplicada", accion_sugerida: "derivar_humano" });
      }
    }

    const r = await sismaNodeJson<unknown>("/api/citas", {
      method: "POST",
      body: {
        autoid, codMedico, idAsunto, fecha, hora, idUsuario,
        observacion: (b.observacion ?? `Agendada por el asistente virtual (${b.canal ?? "bot"})`).slice(0, 200),
      },
    });
    if (r.status >= 200 && r.status < 300) {
      return NextResponse.json({ agendada: true, fecha, hora, detalle: r.data });
    }
    if (r.status === 409) {
      // CupoOcupado: otra persona tomó el cupo; es un caso normal, se ofrece otro horario.
      return NextResponse.json({ agendada: false, motivo: "cupo_ocupado", accion_sugerida: "ofrecer_otro_horario" });
    }
    return NextResponse.json({ agendada: false, motivo: "sisma_rechazo", status: r.status, detalle: r.data, accion_sugerida: "ofrecer_otro_horario" });
  } catch (e) {
    return NextResponse.json(
      { agendada: false, error: e instanceof Error && e.message === "SIN_LLAVE" ? "SISMA_NODE_API_KEY no configurada" : "Error con SISMA" },
      { status: 502 },
    );
  }
}
