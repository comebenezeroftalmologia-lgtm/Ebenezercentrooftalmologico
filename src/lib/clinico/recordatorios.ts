import { createServiceClient } from "@/lib/supabase/server";
import { mapWithConcurrency } from "@/lib/integrations/sisma";
import { aE164, nombreSede, renderPlantilla, titulo, valoresPlantilla, type CitaAgenda, type EnvioRecordatorio, type ReglaRecordatorio } from "./tipos";
import { aMinutos, relojBogota } from "./fechas";
import { enviarADapta, urlDapta } from "./dapta";

/** Motor de recordatorios de citas.
 *
 * Cada corrida del cron (cada 15 min en horario laboral):
 *  1. toma las reglas activas y las citas vigentes próximas;
 *  2. por cada pareja regla × cita decide si ya toca avisar (hora programada cumplida,
 *     dentro de la ventana horaria y los días permitidos, sin pasarse de la tolerancia);
 *  3. reserva el envío en recordatorio_envios (llave única regla + cita + intento, así
 *     dos corridas simultáneas no avisan dos veces) y lo manda al flow de Dapta del canal.
 *
 * Modo: sin RECORDATORIOS_ENVIAR=true NO se manda nada: todo queda como "simulado". */

const MAX_POR_CORRIDA = 60;
const CONCURRENCIA = 5;
const ENVIANDO_VENCE_MIN = 15;

export type ModoEnvio = "produccion" | "simulacion";
export const modoEnvio = (): ModoEnvio => (process.env.RECORDATORIOS_ENVIAR === "true" ? "produccion" : "simulacion");

export interface ResumenProceso {
  modo: ModoEnvio;
  reglas: number;
  citas: number;
  enviados: number;
  simulados: number;
  fallidos: number;
  omitidos: number;
  sinCelular: number;
  avisos: string[];
}

const dentro = (lista: (string | number)[] | null | undefined, valor: string | number | null | undefined) =>
  !lista || lista.length === 0 || (valor != null && lista.some((x) => String(x) === String(valor)));

export function cumpleFiltros(r: ReglaRecordatorio, c: CitaAgenda): boolean {
  return (
    dentro(r.estados, c.estado) &&
    dentro(r.sedes, c.id_sede) &&
    dentro(r.medicos, c.cod_medico) &&
    dentro(r.asuntos, c.asunto) &&
    dentro(r.especialidades?.map((e) => e.toLowerCase()), c.especialidad?.toLowerCase())
  );
}

export function enVentana(r: Pick<ReglaRecordatorio, "ventana_desde" | "ventana_hasta" | "dias_semana">, ahora: Date): boolean {
  const { minutos, diaSemana } = relojBogota(ahora);
  if (r.dias_semana?.length && !r.dias_semana.includes(diaSemana)) return false;
  return minutos >= aMinutos(r.ventana_desde) && minutos <= aMinutos(r.ventana_hasta);
}

const MENSAJE_POR_DEFECTO = "Recordatorio de cita: {fecha} a las {hora} con {medico}.";

async function leerCitas(desde: Date, hasta: Date): Promise<CitaAgenda[]> {
  const admin = createServiceClient();
  const out: CitaAgenda[] = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await admin
      .from("agenda_citas")
      .select("*")
      .eq("vigente", true)
      .gte("fecha_hora", desde.toISOString())
      .lte("fecha_hora", hasta.toISOString())
      .order("fecha_hora")
      .range(d, d + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as CitaAgenda[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function procesarRecordatorios(opts: { origen: "cron" | "manual"; forzarSimulacion?: boolean }): Promise<ResumenProceso> {
  const modo: ModoEnvio = opts.forzarSimulacion ? "simulacion" : modoEnvio();
  const resumen: ResumenProceso = { modo, reglas: 0, citas: 0, enviados: 0, simulados: 0, fallidos: 0, omitidos: 0, sinCelular: 0, avisos: [] };
  const admin = createServiceClient();
  const ahora = new Date();

  // Envíos que quedaron "enviando" (la función se cortó): pasan a fallido para poder reintentarse.
  await admin
    .from("recordatorio_envios")
    .update({ estado: "fallido", motivo: "Sin respuesta de Dapta (se agotó el tiempo)" })
    .eq("estado", "enviando")
    .lt("created_at", new Date(ahora.getTime() - ENVIANDO_VENCE_MIN * 60_000).toISOString());

  const { data: reglasDb, error: eReglas } = await admin.from("recordatorio_reglas").select("*").eq("activa", true);
  if (eReglas) throw new Error(eReglas.message);
  const reglas = (reglasDb ?? []) as ReglaRecordatorio[];
  resumen.reglas = reglas.length;
  if (!reglas.length) return resumen;

  if (modo === "produccion") {
    for (const canal of ["llamada", "whatsapp"] as const) {
      if (reglas.some((r) => r.canal === canal) && !urlDapta(canal)) {
        resumen.avisos.push(`Hay reglas de ${canal} activas pero falta el webhook de Dapta (DAPTA_WEBHOOK_${canal === "llamada" ? "LLAMADA" : "WHATSAPP"}). Se omiten.`);
      }
    }
  }

  const maxAnticipacion = Math.max(...reglas.map((r) => r.anticipacion_minutos));
  const citas = await leerCitas(ahora, new Date(ahora.getTime() + maxAnticipacion * 60_000));
  resumen.citas = citas.length;
  if (!citas.length) return resumen;

  // Envíos que ya existen para esas citas.
  const previos = new Map<string, EnvioRecordatorio[]>();
  const ids = citas.map((c) => c.id_cita);
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from("recordatorio_envios").select("*").in("id_cita", ids.slice(i, i + 200)).limit(5000);
    for (const e of (data ?? []) as EnvioRecordatorio[]) {
      const k = `${e.regla_id}:${e.id_cita}`;
      previos.set(k, [...(previos.get(k) ?? []), e]);
    }
  }

  type Trabajo = { envioId: number; regla: ReglaRecordatorio; cita: CitaAgenda; payload: Record<string, unknown>; mensaje: string };
  const trabajos: Trabajo[] = [];
  const sitio = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ebenezer-app.com").replace(/\/$/, "");
  let reservados = 0;

  const omitir = async (r: ReglaRecordatorio, c: CitaAgenda, motivo: string, programado: Date) => {
    const { error } = await admin.from("recordatorio_envios").insert({
      regla_id: r.id, id_cita: c.id_cita, canal: r.canal, intento: 1, estado: "omitido", motivo, celular: c.celular, programado_para: programado.toISOString(),
    });
    if (!error) resumen.omitidos++;
  };

  externo: for (const regla of reglas) {
    if (modo === "produccion" && !urlDapta(regla.canal)) continue;
    for (const cita of citas) {
      if (reservados >= MAX_POR_CORRIDA) {
        resumen.avisos.push(`Se alcanzó el tope de ${MAX_POR_CORRIDA} envíos por corrida; el resto sale en la siguiente.`);
        break externo;
      }
      if (!cita.fecha_hora || !cumpleFiltros(regla, cita)) continue;
      const inicio = new Date(cita.fecha_hora);
      const programado = new Date(inicio.getTime() - regla.anticipacion_minutos * 60_000);
      if (ahora < programado) continue;

      const hist = previos.get(`${regla.id}:${cita.id_cita}`) ?? [];
      if (hist.some((e) => e.estado === "enviado" || e.estado === "omitido" || e.estado === "enviando")) continue;
      const fallidos = hist.filter((e) => e.estado === "fallido");
      const simulado = hist.find((e) => e.estado === "simulado");
      if (modo === "simulacion" && simulado && !fallidos.length) continue;

      let intento = fallidos.length + 1;
      if (fallidos.length) {
        if (fallidos.length >= regla.max_intentos) continue;
        const ultimo = Math.max(...fallidos.map((e) => new Date(e.created_at).getTime()));
        if (ahora.getTime() < ultimo + regla.reintento_minutos * 60_000) continue;
      } else {
        // Primer intento: ¿todavía tiene sentido avisar?
        const faltaMin = (inicio.getTime() - ahora.getTime()) / 60_000;
        const retrasoMin = (ahora.getTime() - programado.getTime()) / 60_000;
        if (faltaMin < regla.min_antelacion_minutos) {
          await omitir(regla, cita, "Faltaba muy poco para la cita", programado);
          continue;
        }
        if (retrasoMin > regla.max_retraso_minutos) {
          await omitir(regla, cita, "Fuera de tolerancia: la cita llegó a la agenda después de la hora del recordatorio", programado);
          continue;
        }
      }
      if (!enVentana(regla, ahora)) continue; // se intenta de nuevo en la siguiente corrida
      if (!cita.celular) {
        resumen.sinCelular++;
        continue;
      }

      const mensaje = renderPlantilla(regla.plantilla?.trim() || MENSAJE_POR_DEFECTO, valoresPlantilla(cita));
      const base = {
        regla_id: regla.id, id_cita: cita.id_cita, canal: regla.canal, intento, celular: cita.celular,
        programado_para: programado.toISOString(), mensaje,
      };
      const armar = (envioId: number | null) => ({
        envio_id: envioId,
        canal: regla.canal,
        intento,
        mensaje,
        telefono: aE164(cita.celular as string),
        telefono_local: cita.celular,
        paciente: { nombre: titulo(cita.paciente_nombre), primer_nombre: titulo(cita.paciente_nombre).split(" ")[0] ?? "" },
        cita: {
          id: cita.id_cita, fecha: cita.fecha, hora: cita.hora, fecha_hora: cita.fecha_hora,
          medico: titulo(cita.medico_nombre), especialidad: titulo(cita.especialidad), sede: nombreSede(cita.id_sede), asunto: cita.asunto,
        },
        regla: { id: regla.id, nombre: regla.nombre },
        callback_url: `${sitio}/api/recordatorios/resultado`,
      });

      if (modo === "simulacion") {
        const { error } = await admin.from("recordatorio_envios").insert({ ...base, estado: "simulado", motivo: "Simulación: no se envió nada", solicitud: armar(null) });
        if (error) continue; // 23505 = otra corrida ya lo reservó
        resumen.simulados++;
        reservados++;
        continue;
      }

      // Producción: se reserva la fila (o se toma la simulada) y luego se envía.
      let envioId: number | null = null;
      if (simulado && intento === 1) {
        const { data } = await admin
          .from("recordatorio_envios")
          .update({ ...base, estado: "enviando", motivo: null, created_at: new Date().toISOString() })
          .eq("id", simulado.id)
          .eq("estado", "simulado")
          .select("id");
        envioId = data?.[0]?.id ?? null;
      } else {
        const { data, error } = await admin.from("recordatorio_envios").insert({ ...base, estado: "enviando" }).select("id").single();
        envioId = error ? null : (data?.id as number);
      }
      if (envioId == null) continue;
      reservados++;
      trabajos.push({ envioId, regla, cita, payload: armar(envioId), mensaje });
    }
  }

  await mapWithConcurrency(trabajos, CONCURRENCIA, async (t) => {
    const r = await enviarADapta(t.regla.canal, t.payload);
    await admin
      .from("recordatorio_envios")
      .update({
        estado: r.ok ? "enviado" : "fallido",
        motivo: r.ok ? null : r.error ?? "Error al enviar",
        solicitud: t.payload,
        respuesta: { status: r.status, cuerpo: r.cuerpo },
        enviado_at: r.ok ? new Date().toISOString() : null,
      })
      .eq("id", t.envioId);
    if (r.ok) resumen.enviados++;
    else resumen.fallidos++;
  });

  return resumen;
}
