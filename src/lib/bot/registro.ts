import { createServiceClient } from "@/lib/supabase/server";

// Bitácora de agendamientos del bot: tabla bot_agendamientos (respaldo) y copia en una hoja de Google
// mediante un Apps Script (GOOGLE_SHEET_WEBHOOK_URL + GOOGLE_SHEET_WEBHOOK_SECRET). Nunca bloquea al bot.

export type FilaAgendamiento = {
  documento: string;
  nombre?: string | null;
  celular?: string | null;
  direccion?: string | null;
  barrio?: string | null;
  paciente_nuevo?: boolean | null;
  fecha_cita?: string | null;
  hora_cita?: string | null;
  cod_medico?: number | null;
  resultado: "agendada" | "no_agendada";
  motivo?: string | null;
  datos_por_verificar?: string[];
  detalle?: unknown;
};

export async function registrarAgendamiento(f: FilaAgendamiento): Promise<void> {
  const verificar = (f.datos_por_verificar ?? []).join(", ");
  try {
    await createServiceClient().from("bot_agendamientos").insert({
      documento: f.documento,
      nombre: f.nombre ?? null,
      celular: f.celular ?? null,
      direccion: f.direccion ?? null,
      barrio: f.barrio ?? null,
      paciente_nuevo: f.paciente_nuevo ?? null,
      fecha_cita: f.fecha_cita ?? null,
      hora_cita: f.hora_cita ?? null,
      cod_medico: f.cod_medico ?? null,
      resultado: f.resultado,
      motivo: f.motivo ?? null,
      datos_por_verificar: verificar || null,
      detalle: f.detalle ?? null,
    });
  } catch {
    /* la bitácora no debe tumbar el agendamiento */
  }

  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!url) return;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secreto: process.env.GOOGLE_SHEET_WEBHOOK_SECRET ?? "",
        fila: [
          new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
          f.documento,
          f.nombre ?? "",
          f.celular ?? "",
          f.direccion ?? "",
          f.barrio ?? "",
          f.paciente_nuevo == null ? "" : f.paciente_nuevo ? "Sí" : "No",
          f.fecha_cita ?? "",
          f.hora_cita ?? "",
          f.cod_medico ?? "",
          f.resultado === "agendada" ? "Agendada" : `No agendada${f.motivo ? ` (${f.motivo})` : ""}`,
          verificar,
          "",
          "",
        ],
      }),
      signal: ctl.signal,
      redirect: "follow",
    });
    clearTimeout(t);
  } catch {
    /* sin hoja disponible: queda el respaldo en Supabase */
  }
}
