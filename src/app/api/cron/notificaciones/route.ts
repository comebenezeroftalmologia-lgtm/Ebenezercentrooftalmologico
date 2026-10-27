import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notificar } from "@/lib/notificaciones/notificar";
import { fechaLegible } from "@/lib/proyectos/avisos";

// Aviso diario de fechas límite (7:00 a. m. hora Colombia): vence mañana,
// vence hoy y venció ayer. Vercel llama con Authorization: Bearer CRON_SECRET.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function fechaBogota(desplazarDias = 0): string {
  const base = new Date(Date.now() + desplazarDias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(base);
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ayer = fechaBogota(-1);
  const hoy = fechaBogota(0);
  const manana = fechaBogota(1);

  const admin = createServiceClient();
  const { data: tareas, error } = await admin
    .from("proy_tareas")
    .select("id, nombre, created_by, fecha_limite")
    .is("completada_at", null)
    .in("fecha_limite", [ayer, hoy, manana]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (tareas ?? []).map((t) => t.id as string);
  const { data: asig } = ids.length
    ? await admin.from("proy_tarea_asignados").select("tarea_id, user_id").in("tarea_id", ids)
    : { data: [] as { tarea_id: string; user_id: string }[] };
  const asignadosPor = new Map<string, string[]>();
  for (const a of asig ?? []) asignadosPor.set(a.tarea_id, [...(asignadosPor.get(a.tarea_id) ?? []), a.user_id]);

  let procesadas = 0;
  for (const t of tareas ?? []) {
    const fecha = t.fecha_limite as string;
    const hito = fecha === manana ? "manana" : fecha === hoy ? "hoy" : "ayer";
    const titulo =
      hito === "manana" ? `«${t.nombre}» vence mañana` : hito === "hoy" ? `«${t.nombre}» vence hoy` : `«${t.nombre}» venció ayer`;
    const destinatarios = asignadosPor.get(t.id) ?? (t.created_by ? [t.created_by as string] : []);
    await notificar(destinatarios, {
      tipo: "fecha_limite",
      titulo,
      cuerpo: `Fecha límite: ${fechaLegible(fecha)}`,
      url: `/proyectos/tarea/${t.id}`,
      entidadId: t.id,
      clave: `fl:${t.id}:${fecha}:${hito}`,
    });
    procesadas++;
  }

  return NextResponse.json({ ok: true, hoy, tareas: procesadas });
}
