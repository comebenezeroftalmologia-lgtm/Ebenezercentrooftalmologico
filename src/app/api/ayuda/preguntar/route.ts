import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Responde preguntas del equipo usando SOLO los documentos publicados del
// Centro de Conocimiento. /api/** queda fuera del middleware, así que la
// sesión se valida aquí.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const LIMITE_DIARIO = Number(process.env.AYUDA_LIMITE_DIARIO ?? 60);
const MODELO = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
const MAX_PREGUNTA = 600;

type Turno = { rol: "usuario" | "asistente"; texto: string };

const SISTEMA = `Eres el asistente interno del Centro Oftalmológico Ebenezer IPS. Ayudas al equipo a resolver dudas sobre la organización, sus procesos y sus formatos.

Reglas:
- Responde SOLO con la información de los fragmentos de contexto que se te entregan. No inventes datos, cifras, plazos ni nombres de documentos.
- Si el contexto no alcanza para responder, dilo claramente ("No encontré esto en los documentos publicados") y sugiere consultar con Calidad. No completes con conocimiento general.
- Cita las fuentes con su número entre corchetes, por ejemplo [1] o [2][3], justo después de la afirmación que respaldan.
- Si piden un formato o plantilla, indica el nombre del documento y que puede descargarlo desde las fuentes.
- Responde en español, claro y breve, con pasos numerados cuando se trate de un procedimiento.
- Nunca pidas ni repitas datos personales de pacientes.`;

export async function POST(req: Request) {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  let body: { pregunta?: string; historial?: Turno[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const pregunta = String(body.pregunta ?? "").trim().slice(0, MAX_PREGUNTA);
  if (pregunta.length < 3) return NextResponse.json({ error: "Escribe tu pregunta." }, { status: 400 });
  const historial = (Array.isArray(body.historial) ? body.historial : [])
    .slice(-6)
    .filter((t) => t && (t.rol === "usuario" || t.rol === "asistente") && typeof t.texto === "string")
    .map((t) => ({ rol: t.rol, texto: t.texto.slice(0, 1500) }));

  const admin = createServiceClient();

  // Límite diario por persona (cuida el costo de la API).
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin
    .from("ayuda_consultas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", desde);
  if ((count ?? 0) >= LIMITE_DIARIO) {
    return NextResponse.json(
      { error: `Llegaste al límite de ${LIMITE_DIARIO} preguntas en 24 horas. Intenta mañana o consulta con Calidad.` },
      { status: 429 }
    );
  }

  // Recuperación: la pregunta + la anterior (para seguimientos tipo "¿y si es urgente?").
  const consultaBusqueda = historial.length > 0 && pregunta.length < 60
    ? `${[...historial].reverse().find((t) => t.rol === "usuario")?.texto ?? ""} ${pregunta}`
    : pregunta;
  const { data: frag, error: busError } = await admin.rpc("buscar_conocimiento", { q: consultaBusqueda, n: 8 });
  if (busError) {
    return NextResponse.json({ error: "La base de conocimiento aún no está lista. Avisa al equipo de desarrollo." }, { status: 503 });
  }

  const fragmentos = (frag ?? []) as {
    documento_id: string; titulo: string; codigo: string | null; version: string | null; es_formato: boolean; texto: string;
  }[];

  // Fuentes únicas, numeradas en orden de aparición.
  const fuentes: { n: number; documentoId: string; titulo: string; codigo: string | null; version: string | null; esFormato: boolean }[] = [];
  const numeroPorDoc = new Map<string, number>();
  for (const f of fragmentos) {
    if (!numeroPorDoc.has(f.documento_id)) {
      const n = fuentes.length + 1;
      numeroPorDoc.set(f.documento_id, n);
      fuentes.push({ n, documentoId: f.documento_id, titulo: f.titulo, codigo: f.codigo, version: f.version, esFormato: f.es_formato });
    }
  }

  const registrar = (respondida: boolean, usoIa: boolean) =>
    admin.from("ayuda_consultas").insert({
      user_id: user.id,
      pregunta,
      respondida,
      n_fragmentos: fragmentos.length,
      uso_ia: usoIa,
    });

  if (fragmentos.length === 0) {
    await registrar(false, false);
    return NextResponse.json({
      modo: "sin_resultados",
      respuesta:
        "No encontré información sobre esto en los documentos publicados. Prueba con otras palabras o consulta con el equipo de Calidad; tu pregunta quedó registrada para que se documente.",
      fuentes: [],
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Sin llave de IA: se muestran los fragmentos más relevantes.
    await registrar(true, false);
    return NextResponse.json({
      modo: "busqueda",
      respuesta: "Esto es lo más relevante que encontré en los documentos publicados:",
      fuentes,
      fragmentos: fragmentos.slice(0, 4).map((f) => ({
        n: numeroPorDoc.get(f.documento_id)!,
        titulo: f.titulo,
        texto: f.texto,
      })),
    });
  }

  const contexto = fragmentos
    .map((f) => `[${numeroPorDoc.get(f.documento_id)}] ${f.titulo}${f.codigo ? ` (${f.codigo}${f.version ? ` v${f.version}` : ""})` : ""}\n${f.texto}`)
    .join("\n\n---\n\n");

  const mensajes = [
    ...historial.map((t) => ({ role: t.rol === "usuario" ? "user" : "assistant", content: t.texto })),
    { role: "user", content: `Contexto de documentos publicados:\n\n${contexto}\n\n---\nPregunta: ${pregunta}` },
  ];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODELO, max_tokens: 1024, system: SISTEMA, messages: mensajes }),
    });
    if (!r.ok) {
      const detalle = await r.text();
      console.error("[ayuda] Anthropic", r.status, detalle.slice(0, 300));
      await registrar(false, true);
      return NextResponse.json({ error: "La IA no está disponible en este momento. Intenta de nuevo en unos minutos." }, { status: 502 });
    }
    const json = (await r.json()) as { content?: { type: string; text?: string }[] };
    const respuesta = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
    const noSabe = /no encontr[eé]/i.test(respuesta.slice(0, 120));
    await registrar(!noSabe, true);
    // Solo se listan las fuentes que la respuesta realmente cita.
    const citadas = new Set(Array.from(respuesta.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1])));
    return NextResponse.json({
      modo: "ia",
      respuesta,
      fuentes: citadas.size > 0 ? fuentes.filter((f) => citadas.has(f.n)) : fuentes.slice(0, 3),
    });
  } catch (e) {
    console.error("[ayuda] fallo de red", e);
    await registrar(false, true);
    return NextResponse.json({ error: "No se pudo contactar a la IA. Intenta de nuevo." }, { status: 502 });
  }
}
