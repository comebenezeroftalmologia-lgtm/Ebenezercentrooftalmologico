import { createServiceClient } from "@/lib/supabase/server";
import { fechaBogota } from "./fechas";
import type { CitaAgenda, EnvioRecordatorio, ReglaRecordatorio } from "./tipos";

/** Lecturas del módulo Clínico. Siempre con el cliente de servicio: las tablas no
 * tienen políticas RLS, y quien llama ya validó el permiso del módulo. */

export async function citasDelDia(fecha: string): Promise<CitaAgenda[]> {
  const admin = createServiceClient();
  const out: CitaAgenda[] = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await admin
      .from("agenda_citas")
      .select("id_cita, fecha, hora, fecha_hora, estado, estado_descripcion, asunto, id_sede, paciente_autoid, tipo_id, num_id, paciente_nombre, contrato_nombre, celular, cod_medico, medico_nombre, especialidad, vigente, sincronizada_at")
      .eq("fecha", fecha)
      .eq("vigente", true)
      .order("hora", { ascending: true })
      .order("id_cita", { ascending: true })
      .range(d, d + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as CitaAgenda[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function enviosDeCitas(ids: number[]): Promise<EnvioRecordatorio[]> {
  if (!ids.length) return [];
  const admin = createServiceClient();
  const out: EnvioRecordatorio[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from("recordatorio_envios")
      .select("id, regla_id, id_cita, canal, intento, estado, motivo, celular, programado_para, mensaje, resultado, created_at, enviado_at")
      .in("id_cita", ids.slice(i, i + 200))
      .order("created_at", { ascending: true })
      .limit(5000);
    out.push(...((data ?? []) as EnvioRecordatorio[]));
  }
  return out;
}

export async function listarReglas(): Promise<ReglaRecordatorio[]> {
  const admin = createServiceClient();
  const { data, error } = await admin.from("recordatorio_reglas").select("*").order("canal").order("anticipacion_minutos", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReglaRecordatorio[];
}

export interface EnvioConCita extends EnvioRecordatorio {
  regla_nombre: string;
  paciente_nombre: string | null;
  fecha: string | null;
  hora: string | null;
}

export async function ultimosEnvios(limite = 60): Promise<EnvioConCita[]> {
  const admin = createServiceClient();
  const { data } = await admin
    .from("recordatorio_envios")
    .select("id, regla_id, id_cita, canal, intento, estado, motivo, celular, programado_para, mensaje, resultado, created_at, enviado_at, recordatorio_reglas(nombre), agenda_citas(paciente_nombre, fecha, hora)")
    .order("created_at", { ascending: false })
    .limit(limite);
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    regla_nombre: r.recordatorio_reglas?.nombre ?? "—",
    paciente_nombre: r.agenda_citas?.paciente_nombre ?? null,
    fecha: r.agenda_citas?.fecha ?? null,
    hora: r.agenda_citas?.hora ?? null,
  }));
}

export interface SyncInfo {
  iniciada_at: string;
  terminada_at: string | null;
  origen: string;
  dias: number | null;
  citas: number | null;
  nuevas: number | null;
  retiradas: number | null;
  sin_celular: number | null;
  ok: boolean | null;
  error: string | null;
}

export async function ultimaSincronizacion(): Promise<SyncInfo | null> {
  const admin = createServiceClient();
  const { data } = await admin.from("agenda_sincronizaciones").select("*").order("iniciada_at", { ascending: false }).limit(1).maybeSingle();
  return (data as SyncInfo | null) ?? null;
}

/** Opciones para los filtros (médicos, especialidades y sedes de la agenda vigente). */
export async function opcionesFiltro(): Promise<{ medicos: { codigo: number; nombre: string }[]; especialidades: string[]; sedes: number[] }> {
  const admin = createServiceClient();
  const medicos = new Map<number, string>();
  const especialidades = new Set<string>();
  const sedes = new Set<number>();
  for (let d = 0; d < 20_000; d += 1000) {
    const { data, error } = await admin
      .from("agenda_citas")
      .select("cod_medico, medico_nombre, especialidad, id_sede")
      .eq("vigente", true)
      .gte("fecha", fechaBogota(0))
      .range(d, d + 999);
    if (error) break;
    for (const r of data ?? []) {
      if (r.cod_medico != null) medicos.set(r.cod_medico as number, (r.medico_nombre as string) ?? String(r.cod_medico));
      if (r.especialidad) especialidades.add(r.especialidad as string);
      if (r.id_sede != null) sedes.add(r.id_sede as number);
    }
    if (!data || data.length < 1000) break;
  }
  return {
    medicos: Array.from(medicos, ([codigo, nombre]) => ({ codigo, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    especialidades: Array.from(especialidades).sort(),
    sedes: Array.from(sedes).sort((a, b) => a - b),
  };
}
