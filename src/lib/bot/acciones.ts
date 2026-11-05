import { createServiceClient } from "@/lib/supabase/server";
import { MUNICIPIOS_ATENDIDOS, normalizarDocumento } from "@/lib/mutualser/afiliados";
import { FECHA_RE, HORA_RE, sismaNodeJson } from "./sisma-citas";
import { verificarNombre } from "./nombres";

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
  if (exigeNombre) {
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
};

/**
 * Agenda una cita en SISMA para un paciente YA existente (se busca por documento).
 * Si el paciente no existe NO lo crea: devuelve paciente_no_encontrado para derivar a un humano.
 * Requiere SISMA_NODE_API_KEY con permiso citas.agendar y SISMA_BOT_USER_ID.
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

  try {
    const q = new URLSearchParams({ numId: doc });
    if (b.tipoId) q.set("tipoId", b.tipoId);
    const pac = await sismaNodeJson<unknown>(`/api/pacientes?${q}`);
    const lista = Array.isArray(pac.data) ? (pac.data as Record<string, unknown>[]) : [];
    if (pac.status !== 200 || lista.length === 0) {
      return { status: 200, body: { agendada: false, motivo: "paciente_no_encontrado", accion_sugerida: "derivar_humano" } };
    }
    if (lista.length > 1 && !b.tipoId) {
      return { status: 200, body: { agendada: false, motivo: "documento_ambiguo", accion_sugerida: "derivar_humano" } };
    }
    const p = lista[0];
    const autoid = Number(p.autoid ?? p.Autoid ?? p.AUTOID);
    if (!Number.isInteger(autoid) || autoid < 1) {
      return { status: 502, body: { agendada: false, motivo: "paciente_sin_autoid", accion_sugerida: "derivar_humano" } };
    }

    // SISMA no impide citas duplicadas: si ya tiene una pendiente ese día, no se agenda otra.
    const hist = await sismaNodeJson<unknown>(`/api/pacientes/${autoid}/citas?desde=${fecha}&hasta=${fecha}`);
    if (hist.status === 200 && Array.isArray(hist.data)) {
      const pendiente = (hist.data as Record<string, unknown>[]).some((c) => {
        const est = String(c.estado ?? c.Estado ?? "").toUpperCase();
        return est === "P" || est === "CC";
      });
      if (pendiente) {
        return { status: 200, body: { agendada: false, motivo: "cita_duplicada", accion_sugerida: "derivar_humano" } };
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
      return { status: 200, body: { agendada: true, fecha, hora, detalle: r.data } };
    }
    if (r.status === 409) {
      // CupoOcupado: otra persona tomó el cupo; es un caso normal, se ofrece otro horario.
      return { status: 200, body: { agendada: false, motivo: "cupo_ocupado", accion_sugerida: "ofrecer_otro_horario" } };
    }
    return { status: 200, body: { agendada: false, motivo: "sisma_rechazo", status: r.status, detalle: r.data, accion_sugerida: "ofrecer_otro_horario" } };
  } catch (e) {
    return {
      status: 502,
      body: { agendada: false, error: e instanceof Error && e.message === "SIN_LLAVE" ? "SISMA_NODE_API_KEY no configurada" : "Error con SISMA" },
    };
  }
}
