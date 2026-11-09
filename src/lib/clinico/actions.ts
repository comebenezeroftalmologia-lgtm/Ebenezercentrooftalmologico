"use server";

import { revalidatePath } from "next/cache";
import { requireModuloAccess } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { sincronizarAgenda } from "./agenda-sync";
import { procesarRecordatorios } from "./recordatorios";

type Res<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// ------------------------------------------------------------ agenda
export async function sincronizarAgendaAction(): Promise<Res<{ mensaje: string }>> {
  await requireModuloAccess("clinico_agenda");
  const r = await sincronizarAgenda({ dias: 14, origen: "manual" });
  revalidatePath("/clinico/agenda");
  if (!r.ok) return { ok: false, error: r.error ?? "No se pudo sincronizar la agenda." };
  const extra = r.diasConError.length ? ` (${r.diasConError.length} día(s) con error)` : "";
  return { ok: true, mensaje: `${r.citas} citas cargadas · ${r.nuevas} nuevas · ${r.retiradas} salieron de la agenda · ${r.sinCelular} sin celular${extra}` };
}

// ------------------------------------------------------------ reglas
export interface ReglaInput {
  id?: string;
  nombre: string;
  activa: boolean;
  canal: "llamada" | "whatsapp";
  anticipacionMinutos: number;
  ventanaDesde: string;
  ventanaHasta: string;
  diasSemana: number[];
  sedes: number[];
  medicos: number[];
  especialidades: string[];
  estados: string[];
  maxRetrasoMinutos: number;
  minAntelacionMinutos: number;
  maxIntentos: number;
  reintentoMinutos: number;
  plantilla: string;
}

const entero = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const listaEnteros = (v: unknown) => Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0 && x < 1_000_000);

function validar(i: ReglaInput): string | null {
  if (!i.nombre?.trim() || i.nombre.trim().length > 80) return "Ponle un nombre a la regla (máximo 80 caracteres).";
  if (i.canal !== "llamada" && i.canal !== "whatsapp") return "Canal no válido.";
  if (!entero(i.anticipacionMinutos, 30, 20160)) return "La anticipación debe estar entre 30 minutos y 14 días.";
  if (!HORA.test(i.ventanaDesde) || !HORA.test(i.ventanaHasta)) return "La ventana horaria no es válida.";
  if (i.ventanaDesde >= i.ventanaHasta) return "La hora de inicio de la ventana debe ser anterior a la de fin.";
  if (!Array.isArray(i.diasSemana) || !i.diasSemana.length || !i.diasSemana.every((d) => entero(d, 1, 7))) return "Elige al menos un día de la semana.";
  if (!Array.isArray(i.estados) || !i.estados.length || !i.estados.every((e) => e === "P" || e === "CC")) return "Elige al menos un estado de cita.";
  if (!listaEnteros(i.sedes) || !listaEnteros(i.medicos)) return "Los filtros de sede o médico no son válidos.";
  if (!Array.isArray(i.especialidades) || !i.especialidades.every((e) => typeof e === "string" && e.length <= 80)) return "Filtro de especialidad no válido.";
  if (!entero(i.maxRetrasoMinutos, 30, 2880)) return "La tolerancia debe estar entre 30 minutos y 48 horas.";
  if (!entero(i.minAntelacionMinutos, 0, 1440)) return "La antelación mínima debe estar entre 0 y 24 horas.";
  if (!entero(i.maxIntentos, 1, 5)) return "Los intentos deben ser entre 1 y 5.";
  if (!entero(i.reintentoMinutos, 15, 1440)) return "El reintento debe estar entre 15 minutos y 24 horas.";
  if (typeof i.plantilla !== "string" || i.plantilla.length > 1000) return "El texto es demasiado largo (máximo 1.000 caracteres).";
  if (i.canal === "whatsapp" && !i.plantilla.trim()) return "El WhatsApp necesita un texto.";
  return null;
}

export async function guardarReglaAction(input: ReglaInput): Promise<Res> {
  const user = await requireModuloAccess("clinico_recordatorios");
  const error = validar(input);
  if (error) return { ok: false, error };
  if (input.id && !UUID.test(input.id)) return { ok: false, error: "Regla no válida." };

  const vacioANull = <T,>(a: T[]) => (a.length ? a : null);
  const fila = {
    nombre: input.nombre.trim(),
    activa: input.activa,
    canal: input.canal,
    anticipacion_minutos: input.anticipacionMinutos,
    ventana_desde: input.ventanaDesde,
    ventana_hasta: input.ventanaHasta,
    dias_semana: Array.from(new Set(input.diasSemana)).sort(),
    sedes: vacioANull(input.sedes),
    medicos: vacioANull(input.medicos),
    especialidades: vacioANull(input.especialidades.map((e) => e.trim()).filter(Boolean)),
    estados: Array.from(new Set(input.estados)),
    max_retraso_minutos: input.maxRetrasoMinutos,
    min_antelacion_minutos: input.minAntelacionMinutos,
    max_intentos: input.maxIntentos,
    reintento_minutos: input.reintentoMinutos,
    plantilla: input.plantilla.trim(),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const admin = createServiceClient();
  const { error: e } = input.id
    ? await admin.from("recordatorio_reglas").update(fila).eq("id", input.id)
    : await admin.from("recordatorio_reglas").insert({ ...fila, created_by: user.id });
  if (e) return { ok: false, error: e.message };
  revalidatePath("/clinico/recordatorios");
  return { ok: true };
}

export async function alternarReglaAction(id: string, activa: boolean): Promise<Res> {
  const user = await requireModuloAccess("clinico_recordatorios");
  if (!UUID.test(id)) return { ok: false, error: "Regla no válida." };
  const { error } = await createServiceClient()
    .from("recordatorio_reglas")
    .update({ activa: !!activa, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clinico/recordatorios");
  return { ok: true };
}

export async function eliminarReglaAction(id: string): Promise<Res> {
  await requireModuloAccess("clinico_recordatorios");
  if (!UUID.test(id)) return { ok: false, error: "Regla no válida." };
  const { error } = await createServiceClient().from("recordatorio_reglas").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clinico/recordatorios");
  return { ok: true };
}

/** Corre el motor en modo simulación: arma los envíos que tocarían ahora y los deja
 * en la bitácora como "simulado", sin llamar ni escribir a nadie. */
export async function simularRecordatoriosAction(): Promise<Res<{ mensaje: string }>> {
  await requireModuloAccess("clinico_recordatorios");
  try {
    const r = await procesarRecordatorios({ origen: "manual", forzarSimulacion: true });
    revalidatePath("/clinico/recordatorios");
    revalidatePath("/clinico/agenda");
    if (!r.reglas) return { ok: true, mensaje: "No hay reglas activas: nada que simular." };
    const av = r.avisos.length ? ` · ${r.avisos.join(" ")}` : "";
    return { ok: true, mensaje: `${r.simulados} recordatorios armados (sin enviar) · ${r.omitidos} omitidos · ${r.sinCelular} citas sin celular · ${r.citas} citas revisadas${av}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
