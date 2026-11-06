import { createServiceClient } from "@/lib/supabase/server";
import { MUNICIPIOS_ATENDIDOS, normalizarDocumento } from "@/lib/mutualser/afiliados";
import { FECHA_RE, HORA_RE, sismaNodeJson } from "./sisma-citas";
import { verificarNombre } from "./nombres";
import { atendidoEnElUltimoAno, celularValido, crearPacienteSisma, textoLimpio as limpiarTexto, type AfiliadoBase } from "./pacientes";
import { registrarAgendamiento } from "./registro";

// Lógica del bot de citas compartida por los endpoints /api/bot/** (Dapta) y por el
// servidor MCP (/api/mcp). Cada acción devuelve { status, body } para que quien la
// llame decida cómo responder.
export type Resultado = { status: number; body: Record<string, unknown> };

// ---------------------------------------------------------------- validar afiliado

function edadDesde(fecha: string | null): number | null {
  if (!fecha) return null;
  const n = new Date(fecha + "T00:00:00Z");
  if (Number.isNaN(n.getTime())) return null;
  const hoy = new Date();
  let e = hoy.getUTCFullYear() - n.getUTCFullYear();
  const m = hoy.getUTCMonth() - n.getUTCMonth();
  if (m < 0 || (m === 0 && hoy.getUTCDate() < n.getUTCDate())) e--;
  return e;
}

function nombrePila(s: string | null): string {
  const p = (s ?? "").trim().toLowerCase();
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

/** Dapta manda la palabra "undefined" (o "null") cuando una variable no existe. */
function textoLimpio(v: unknown): string {
  const t = typeof v === "string" ? v.trim() : "";
  return /^(undefined|null)$/i.test(t) ? "" : t;
}

/** ¿El documento ya existe como paciente en SISMA? null = no se pudo saber (SISMA no respondió). */
async function pacienteEnSisma(documento: string): Promise<boolean | null> {
  try {
    const r = await sismaNodeJson<unknown>(`/api/pacientes?${new URLSearchParams({ numId: documento })}`);
    if (r.status !== 200) return null;
    return Array.isArray(r.data) && r.data.length > 0;
  } catch {
    return null;
  }
}

/**
 * Valida si un paciente está activo en la base de afiliados de MutualSer (lo mínimo necesario).
 * Por voz (cualquier canal distinto de "mcp") exige además el nombre completo dicho por la persona:
 * debe coincidir al menos un nombre y todos los apellidos registrados. Mientras la identidad no
 * esté verificada NO se devuelve ningún dato del afiliado (ni siquiera el nombre registrado).
 */
export async function validarAfiliado(documentoCrudo: unknown, canal?: string, nombreHablado?: unknown): Promise<Resultado> {
  const documento = normalizarDocumento(documentoCrudo);
  if (documento.length < 4 || documento.length > 20) {
    return { status: 400, body: { error: "Documento inválido", afiliado: false } };
  }
  const nombre = textoLimpio(nombreHablado);
  const exigeNombre = (canal ?? "bot") !== "mcp";

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("mutualser_afiliados")
    .select(
      "primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, regimen, estado, municipio_afiliacion, tipo_doc, fecha_corte",
    )
    .eq("doc_beneficiario", documento)
    .maybeSingle();
  if (error) return { status: 500, body: { error: error.message } };

  const activo = data?.estado === "AC";
  await admin.from("mutualser_validaciones").insert({
    documento,
    encontrado: !!data,
    activo: data ? activo : null,
    canal: canal ?? "bot",
  });

  if (!data) {
    return {
      status: 200,
      body: {
        afiliado: false,
        activo: false,
        mensaje: "El documento no aparece en la base de afiliados activos de MutualSer.",
      },
    };
  }

  // Verificación de identidad por nombre (solo voz / bot).
  let verificacion: "coincide" | "parcial" | "no_coincide" | "no_solicitada" = "no_solicitada";
  if (exigeNombre || nombre) {
    if (!nombre) {
      return {
        status: 200,
        body: { afiliado: true, identidad_verificada: false, verificacion_nombre: "falta_nombre", accion_sugerida: "pedir_nombre_completo" },
      };
    }
    verificacion = verificarNombre(nombre, data);
    if (verificacion !== "coincide") {
      return {
        status: 200,
        body: {
          afiliado: true,
          identidad_verificada: false,
          verificacion_nombre: verificacion,
          accion_sugerida: "repetir_nombre_completo",
          mensaje: "El nombre y los apellidos dichos no coinciden con el registro. No reveles el nombre registrado.",
        },
      };
    }
  }

  const enCobertura = !!data.municipio_afiliacion && MUNICIPIOS_ATENDIDOS.has(data.municipio_afiliacion);
  // Solo vale la pena preguntarle a SISMA si la persona va a poder agendar.
  const enSisma = activo && enCobertura ? await pacienteEnSisma(documento) : null;
  const accion = !activo
    ? "derivar_humano"
    : !enCobertura
      ? "no_aplica"
      : enSisma === false
        ? "registro_pendiente"
        : "continuar";
  return {
    status: 200,
    body: {
      afiliado: true,
      activo,
      identidad_verificada: true,
      verificacion_nombre: verificacion,
      nombre: nombrePila(data.primer_nombre),
      regimen: data.regimen,
      tipo_documento: data.tipo_doc,
      edad: edadDesde(data.fecha_nacimiento),
      municipio_afiliacion: data.municipio_afiliacion,
      en_cobertura: enCobertura,
      paciente_en_sisma: enSisma,
      accion_sugerida: accion,
      corte_base: data.fecha_corte,
    },
  };
}

// ---------------------------------------------------------------- consultar cupos

/** Dapta manda la palabra "undefined" cuando una variable no existe: solo se aceptan enteros positivos. */
const entero = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export type EntradaCupos = {
  fecha?: string;
  idEspecialidad?: number | string;
  idAsunto?: number | string;
  codMedico?: number | string;
};

/** Cupos libres en SISMA para una fecha (solo lectura). Hasta 12 cupos tal como los entrega SISMA. */
export async function consultarCupos(b: EntradaCupos): Promise<Resultado> {
  const fecha = (b.fecha ?? "").trim();
  if (!FECHA_RE.test(fecha)) return { status: 400, body: { error: "fecha debe ser yyyy-MM-dd" } };

  const q = new URLSearchParams({ fecha });
  const idEspecialidad = entero(b.idEspecialidad);
  const codMedico = entero(b.codMedico);
  if (idEspecialidad) q.set("idEspecialidad", String(idEspecialidad));
  // Asunto 10 = «Consulta oftalmología general primera vez» (29 médicos; confirmado por TIC).
  q.set("idAsunto", String(entero(b.idAsunto) ?? 10));
  if (codMedico) q.set("codMedico", String(codMedico));

  try {
    const { status, data } = await sismaNodeJson<unknown>(`/api/citas/disponibilidad?${q}`);
    if (status !== 200) {
      return { status: 502, body: { disponible: false, error: "SISMA no respondió la disponibilidad", status } };
    }
    const lista = Array.isArray(data)
      ? data
      : Array.isArray((data as { cupos?: unknown[] })?.cupos)
        ? (data as { cupos: unknown[] }).cupos
        : null;
    if (!lista) return { status: 200, body: { disponible: true, cupos: [], crudo: data } };
    return { status: 200, body: { disponible: lista.length > 0, total: lista.length, cupos: lista.slice(0, 12) } };
  } catch (e) {
    return {
      status: 502,
      body: {
        disponible: false,
        error: e instanceof Error && e.message === "SIN_LLAVE" ? "SISMA_NODE_API_KEY no configurada" : "Error consultando SISMA",
      },
    };
  }
}

// ---------------------------------------------------------------- agendar cita

export type EntradaAgendar = {
  documento?: string;
  tipoId?: string;
  codMedico?: number | string;
  idAsunto?: number | string;
  fecha?: string;
  hora?: string;
  canal?: string;
  observacion?: string;
  /** Solo para pacientes nuevos: se crean en SISMA con estos datos. */
  celular?: string;
  direccion?: string;
  barrio?: string;
};

/**
 * Agenda una cita de consulta general PRIMERA VEZ en SISMA.
 *  - Paciente que ya existe en SISMA: solo se agenda si NO tuvo una consulta atendida en el último año.
 *  - Paciente que no existe: si es afiliado activo de MutualSer en un municipio atendido y entregó un
 *    celular válido, se CREA en SISMA (datos de la hoja de afiliados + celular, dirección y barrio dichos
 *    por teléfono; lo que falta queda genérico y se anota en «datos por verificar») y luego se agenda.
 * Cada intento queda en la bitácora (tabla bot_agendamientos y hoja de Google).
 * Requiere SISMA_NODE_API_KEY con permisos citas.agendar y pacientes.crear, y SISMA_BOT_USER_ID.
 */
export async function agendarCita(b: EntradaAgendar): Promise<Resultado> {
  const idUsuario = Number(process.env.SISMA_BOT_USER_ID);
  if (!Number.isInteger(idUsuario) || idUsuario < 1) {
    return { status: 503, body: { agendada: false, error: "SISMA_BOT_USER_ID no configurado" } };
  }

  const doc = normalizarDocumento(b.documento ?? "");
  const codMedico = Number(b.codMedico);
  const idAsunto = Number(b.idAsunto || 10); // 10 = consulta general primera vez
  const fecha = (b.fecha ?? "").trim();
  const hora = (b.hora ?? "").trim();
  if (doc.length < 4 || !Number.isInteger(codMedico) || codMedico < 1 || !Number.isInteger(idAsunto) || idAsunto < 1 || !FECHA_RE.test(fecha) || !HORA_RE.test(hora)) {
    return { status: 400, body: { error: "Datos incompletos o inválidos (documento, codMedico, idAsunto, fecha yyyy-MM-dd, hora HH:mm)" } };
  }

  // Datos para la bitácora y para dar de alta si hace falta.
  const admin = createServiceClient();
  const { data: afi } = await admin
    .from("mutualser_afiliados")
    .select(
      "tipo_doc, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, sexo, regimen, estado, municipio_afiliacion, cod_departamento, cod_municipio",
    )
    .eq("doc_beneficiario", doc)
    .maybeSingle();
  const nombreCompleto = afi
    ? [afi.primer_nombre, afi.segundo_nombre, afi.primer_apellido, afi.segundo_apellido].filter(Boolean).join(" ")
    : null;
  const celular = celularValido(b.celular);
  const direccion = limpiarTexto(b.direccion) || null;
  const barrio = limpiarTexto(b.barrio) || null;
  const base = { documento: doc, nombre: nombreCompleto, celular, direccion, barrio, fecha_cita: fecha, hora_cita: hora, cod_medico: codMedico };

  const no = async (motivo: string, accion: string, extra: Record<string, unknown> = {}, nuevo: boolean | null = null, verificar: string[] = []): Promise<Resultado> => {
    await registrarAgendamiento({ ...base, paciente_nuevo: nuevo, resultado: "no_agendada", motivo, datos_por_verificar: verificar, detalle: extra.detalle });
    return { status: 200, body: { agendada: false, motivo, accion_sugerida: accion, ...extra } };
  };

  try {
    const q = new URLSearchParams({ numId: doc });
    if (b.tipoId) q.set("tipoId", b.tipoId);
    const pac = await sismaNodeJson<unknown>(`/api/pacientes?${q}`);
    if (pac.status !== 200) return await no("sisma_no_responde", "derivar_humano");
    let lista = Array.isArray(pac.data) ? (pac.data as Record<string, unknown>[]) : [];
    let pacienteNuevo = false;
    let avisos: string[] = [];

    if (lista.length === 0) {
      // ---- paciente nuevo: debe ser afiliado activo de un municipio atendido
      if (!afi || afi.estado !== "AC" || !afi.municipio_afiliacion || !MUNICIPIOS_ATENDIDOS.has(afi.municipio_afiliacion)) {
        return await no("no_elegible", "derivar_humano");
      }
      if (!celular) return await no("falta_celular", "pedir_celular");
      const alta = await crearPacienteSisma(doc, afi as AfiliadoBase, { celular, direccion: direccion ?? undefined, barrio: barrio ?? undefined }, idUsuario);
      if (!alta.ok) return await no(alta.motivo, "derivar_humano", { detalle: alta.detalle });
      pacienteNuevo = true;
      avisos = alta.avisos;
      const de_nuevo = await sismaNodeJson<unknown>(`/api/pacientes?${new URLSearchParams({ numId: doc })}`);
      lista = de_nuevo.status === 200 && Array.isArray(de_nuevo.data) ? (de_nuevo.data as Record<string, unknown>[]) : [];
      if (lista.length === 0) return await no("paciente_creado_sin_autoid", "derivar_humano", {}, true, avisos);
    }

    if (lista.length > 1 && !b.tipoId) return await no("documento_ambiguo", "derivar_humano", {}, pacienteNuevo, avisos);
    const p = lista[0];
    const autoid = Number(p.autoid ?? p.Autoid ?? p.AUTOID);
    if (!Number.isInteger(autoid) || autoid < 1) return await no("paciente_sin_autoid", "derivar_humano", {}, pacienteNuevo, avisos);

    // ---- regla: solo primera vez o más de un año desde la última consulta atendida
    if (!pacienteNuevo) {
      const reciente = await atendidoEnElUltimoAno(autoid);
      if (reciente === true) return await no("atendido_en_el_ultimo_ano", "derivar_control", {}, false);
      if (reciente === null) avisos = [...avisos, "no se pudo comprobar la última atención"];
    }

    // SISMA no impide citas duplicadas: si ya tiene una pendiente ese día, no se agenda otra.
    const hist = await sismaNodeJson<unknown>(`/api/pacientes/${autoid}/citas?desde=${fecha}&hasta=${fecha}`);
    if (hist.status === 200 && Array.isArray(hist.data)) {
      const pendiente = (hist.data as Record<string, unknown>[]).some((c) => {
        const est = String(c.estado ?? c.Estado ?? "").toUpperCase();
        return est === "P" || est === "CC";
      });
      if (pendiente) return await no("cita_duplicada", "derivar_humano", {}, pacienteNuevo, avisos);
    }

    const r = await sismaNodeJson<unknown>("/api/citas", {
      method: "POST",
      body: {
        autoid, codMedico, idAsunto, fecha, hora, idUsuario,
        observacion: (b.observacion ?? `Agendada por el asistente virtual (${b.canal ?? "bot"})${pacienteNuevo ? " - paciente creado por el bot, verificar datos" : ""}`).slice(0, 200),
      },
    });
    if (r.status >= 200 && r.status < 300) {
      await registrarAgendamiento({ ...base, paciente_nuevo: pacienteNuevo, resultado: "agendada", datos_por_verificar: avisos, detalle: r.data });
      return { status: 200, body: { agendada: true, fecha, hora, paciente_nuevo: pacienteNuevo, detalle: r.data } };
    }
    if (r.status === 409) {
      // CupoOcupado: otra persona tomó el cupo; es un caso normal, se ofrece otro horario.
      return await no("cupo_ocupado", "ofrecer_otro_horario", {}, pacienteNuevo, avisos);
    }
    return await no("sisma_rechazo", "ofrecer_otro_horario", { status: r.status, detalle: r.data }, pacienteNuevo, avisos);
  } catch (e) {
    return {
      status: 502,
      body: { agendada: false, error: e instanceof Error && e.message === "SIN_LLAVE" ? "SISMA_NODE_API_KEY no configurada" : "Error con SISMA" },
    };
  }
}
