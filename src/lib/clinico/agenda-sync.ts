import { createServiceClient } from "@/lib/supabase/server";
import { fetchCitasDia, mapWithConcurrency, sismaFetch, type SismaCitaDia } from "@/lib/integrations/sisma";
import { celularValido } from "@/lib/bot/pacientes";
import { aInstante, fechaBogota, hora5, sumarDias } from "./fechas";

/** Carga la agenda de SISMA (hoy y los próximos días) en agenda_citas.
 *
 * /api/citas/dia entrega solo citas Pendientes (P) y Confirmadas (CC): es lo que
 * falta por atenderse. Por eso, una cita que ya estaba guardada y deja de salir
 * se marca vigente = false (cancelada, atendida o reagendada) y no recibe
 * más recordatorios. */

export interface ResultadoSync {
  ok: boolean;
  dias: number;
  citas: number;
  nuevas: number;
  retiradas: number;
  sinCelular: number;
  diasConError: { fecha: string; error: string }[];
  error?: string;
}

const MAX_CONSULTAS_CELULAR = 60;

/** PostgREST devuelve 1.000 filas como máximo por consulta: se lee por páginas. */
async function leerPaginado<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Busca un celular válido en cualquier campo cuyo nombre lo sugiera (celular, telefono, movil, whatsapp). */
export function extraerCelular(obj: unknown, profundidad = 0): string | null {
  if (obj == null || profundidad > 3) return null;
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const r = extraerCelular(x, profundidad + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    if (/cel|tel|movil|m[oó]vil|whats/i.test(k) && (typeof v === "string" || typeof v === "number")) {
      const c = celularValido(v);
      if (c) return c;
    }
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") {
      const r = extraerCelular(v, profundidad + 1);
      if (r) return r;
    }
  }
  return null;
}

async function celularDeSisma(autoid: number): Promise<string | null> {
  try {
    const r = await sismaFetch<unknown>(`/api/pacientes?autoid=${autoid}`);
    return extraerCelular(r);
  } catch {
    return null;
  }
}

function aFila(c: SismaCitaDia, celular: string | null) {
  const fecha = String(c.fecha ?? "").slice(0, 10);
  const hora = hora5(c.hora);
  const p = c.paciente;
  const nombre = [p?.nombres, p?.apellidos].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return {
    id_cita: c.idCita,
    fecha,
    hora,
    fecha_hora: aInstante(fecha, hora)?.toISOString() ?? null,
    estado: c.estado,
    estado_descripcion: c.estadoDescripcion,
    asunto: c.asunto,
    id_sede: c.idSede,
    paciente_autoid: p?.autoid ?? null,
    tipo_id: p?.tipoId ?? null,
    num_id: p?.numId ?? null,
    paciente_nombre: nombre || null,
    contrato_nombre: p?.contratoNombre ?? null,
    celular,
    cod_medico: c.medico?.codigo ?? null,
    medico_nombre: c.medico?.nombre ?? null,
    especialidad: c.medico?.especialidad ?? null,
    vigente: true,
    vigente_hasta: null as string | null,
    crudo: c as unknown as Record<string, unknown>,
    sincronizada_at: new Date().toISOString(),
  };
}

export async function sincronizarAgenda(opts: { dias?: number; origen?: "cron" | "manual" } = {}): Promise<ResultadoSync> {
  const dias = Math.min(Math.max(opts.dias ?? 14, 1), 30);
  const origen = opts.origen ?? "cron";
  const admin = createServiceClient();

  const { data: log } = await admin.from("agenda_sincronizaciones").insert({ origen, dias }).select("id").single();
  const logId = log?.id as number | undefined;

  const resultado: ResultadoSync = { ok: false, dias, citas: 0, nuevas: 0, retiradas: 0, sinCelular: 0, diasConError: [] };

  try {
    const hoy = fechaBogota(0);
    const fechas = Array.from({ length: dias }, (_, i) => sumarDias(hoy, i));

    // 1. Agenda de cada día en SISMA (con tope de llamadas simultáneas).
    const porDia = await mapWithConcurrency(fechas, 3, async (fecha) => {
      try {
        return { fecha, citas: await fetchCitasDia(fecha), error: null as string | null };
      } catch (e) {
        return { fecha, citas: [] as SismaCitaDia[], error: e instanceof Error ? e.message.slice(0, 300) : String(e) };
      }
    });
    for (const d of porDia) if (d.error) resultado.diasConError.push({ fecha: d.fecha, error: d.error });
    if (resultado.diasConError.length === fechas.length) {
      throw new Error(`SISMA no respondió ningún día. ${resultado.diasConError[0].error}`);
    }

    const recibidas = porDia.flatMap((d) => (Array.isArray(d.citas) ? d.citas : []));
    resultado.citas = recibidas.length;

    // 2. Lo que ya teníamos guardado en esas fechas.
    const previas = await leerPaginado<{ id_cita: number; fecha: string; celular: string | null; paciente_autoid: number | null; vigente: boolean }>(
      (d, h) =>
        admin
          .from("agenda_citas")
          .select("id_cita, fecha, celular, paciente_autoid, vigente")
          .in("fecha", fechas)
          .order("id_cita")
          .range(d, h),
    );
    const previasPorId = new Map(previas.map((r) => [r.id_cita, r]));

    // 3. Celulares: de la propia cita, de lo ya guardado o consultando al paciente en SISMA.
    const celularPorPaciente = new Map<number, string>();
    for (const r of previas) if (r.celular && r.paciente_autoid) celularPorPaciente.set(r.paciente_autoid, r.celular);
    const autoidsFaltantes = Array.from(
      new Set(
        recibidas
          .filter((c) => c.paciente?.autoid && !extraerCelular(c) && !celularPorPaciente.has(c.paciente.autoid))
          .map((c) => c.paciente.autoid),
      ),
    );
    for (let i = 0; i < autoidsFaltantes.length; i += 150) {
      const { data: otros } = await admin
        .from("agenda_citas")
        .select("paciente_autoid, celular")
        .in("paciente_autoid", autoidsFaltantes.slice(i, i + 150))
        .not("celular", "is", null)
        .limit(1000);
      for (const r of otros ?? []) celularPorPaciente.set(r.paciente_autoid as number, r.celular as string);
    }
    const porConsultar = autoidsFaltantes.filter((id) => !celularPorPaciente.has(id)).slice(0, MAX_CONSULTAS_CELULAR);
    await mapWithConcurrency(porConsultar, 4, async (id) => {
      const c = await celularDeSisma(id);
      if (c) celularPorPaciente.set(id, c);
    });

    const filas = recibidas.map((c) => {
      const celular = extraerCelular(c) ?? (c.paciente?.autoid ? celularPorPaciente.get(c.paciente.autoid) ?? null : null);
      if (!celular) resultado.sinCelular++;
      if (!previasPorId.has(c.idCita)) resultado.nuevas++;
      return aFila(c, celular);
    });

    // 4. Guardar (por lotes). primera_vez_at no se envía: queda la de la primera carga.
    for (let i = 0; i < filas.length; i += 400) {
      const { error } = await admin.from("agenda_citas").upsert(filas.slice(i, i + 400), { onConflict: "id_cita" });
      if (error) throw new Error(`No se pudo guardar la agenda: ${error.message}`);
    }

    // 5. Citas que ya no aparecen en los días que SÍ se leyeron bien: salieron de la agenda.
    const diasOk = new Set(porDia.filter((d) => !d.error).map((d) => d.fecha));
    const recibidasIds = new Set(recibidas.map((c) => c.idCita));
    const retirar = previas.filter((r) => r.vigente && diasOk.has(r.fecha) && !recibidasIds.has(r.id_cita)).map((r) => r.id_cita);
    for (let i = 0; i < retirar.length; i += 300) {
      const { error } = await admin
        .from("agenda_citas")
        .update({ vigente: false, vigente_hasta: new Date().toISOString() })
        .in("id_cita", retirar.slice(i, i + 300));
      if (error) throw new Error(`No se pudieron retirar citas: ${error.message}`);
    }
    resultado.retiradas = retirar.length;
    resultado.ok = true;
  } catch (e) {
    resultado.error = e instanceof Error ? e.message : String(e);
  }

  if (logId) {
    await admin
      .from("agenda_sincronizaciones")
      .update({
        terminada_at: new Date().toISOString(),
        citas: resultado.citas,
        nuevas: resultado.nuevas,
        retiradas: resultado.retiradas,
        sin_celular: resultado.sinCelular,
        ok: resultado.ok,
        error: resultado.error ?? (resultado.diasConError.length ? `Días con error: ${resultado.diasConError.map((d) => d.fecha).join(", ")}` : null),
      })
      .eq("id", logId);
  }
  return resultado;
}
