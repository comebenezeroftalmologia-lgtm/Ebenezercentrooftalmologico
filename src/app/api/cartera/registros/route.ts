import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth";
import {
  causaNormativa6De,
  claveFacturaNorm,
  extraerCodigoCausalExplicito,
  extraerFacturasFcoe,
  homologarEmpresaYOrigen,
  homologarPersonaFacturacion,
  clasificarAtencionYSede,
  limpiarNombrePersona,
  normalizarEmpresaNitUnificada,
  normalizarSeguimientoGlosa,
} from "@/lib/carteraCruces";

// API de registros de Cartera y Glosas.
//
// Hasta ahora el modulo guardaba con localStorage.setItem: cada facturadora
// veia solo sus propios registros y todo se perdia al limpiar cache o cambiar
// de equipo. Esta ruta es la persistencia real, contra las tablas cf_*.
//
// Las tablas tienen RLS activo sin politicas, asi que solo entra el service
// role. La autorizacion por persona vive aqui, con getCurrentAppUser.

export const dynamic = "force-dynamic";

type Fila = Record<string, unknown>;

const limpiarUtf8 = (s: string): string => {
  if (!s || (!s.includes("Ã") && !s.includes("Â") && !s.includes("ã"))) return s;
  return s
    .replace(/tecnologÃ-as/gi, "tecnologías")
    .replace(/dÃ-as/gi, "días")
    .replace(/Ã‘|Ã\x91|ã\x91/g, "Ñ")
    .replace(/Ã±|ã±/g, "ñ")
    .replace(/Ã\x81/g, "Á")
    .replace(/Ã\x89/g, "É")
    .replace(/Ã\x8d|Ã•/g, "Í")
    .replace(/Ã\x93/g, "Ó")
    .replace(/Ã\x9a/g, "Ú")
    .replace(/Ã¡|ã¡/g, "á")
    .replace(/Ã©|ã©/g, "é")
    .replace(/Ã­|Ã\xad|ã­/g, "í")
    .replace(/Ã³|ã³/g, "ó")
    .replace(/Ãº|ãº/g, "ú")
    .replace(/Ã¼/g, "ü")
    .replace(/Â·/g, "·")
    .replace(/Â°/g, "°")
    .replace(/Â¿/g, "¿")
    .replace(/Â¡/g, "¡");
};

const strLimpio = (v: unknown): string => (v === null || v === undefined ? "" : limpiarUtf8(String(v)));
const txt = (v: unknown) => (v === null || v === undefined || v === "" ? null : limpiarUtf8(String(v)));
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fecha = (v: unknown) => {
  const s = txt(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

const esNotaCreditoValida = (v: unknown): boolean => {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return false;
  if (s === "N/A" || s === "NA" || s === "NO APLICA") return true;
  return /\d/.test(s);
};

const CAUSALES_NORMATIVAS_BASE: { codigo: string; familia: string; nombre: string }[] = [
  {
    codigo: "FA",
    familia: "Facturación",
    nombre: "Diferencias en cantidades de servicios, errores administrativos o copagos mal calculados.",
  },
  {
    codigo: "TA",
    familia: "Tarifas",
    nombre: "Diferencias entre los valores cobrados y los precios pactados en el contrato o fijados por ley.",
  },
  {
    codigo: "SO",
    familia: "Soportes",
    nombre: "Inconsistencia, enmendadura o ausencia parcial/total de los documentos requeridos (ej. historia clínica).",
  },
  {
    codigo: "AU",
    familia: "Autorizaciones",
    nombre: "Servicios prestados sin el debido aval o número de autorización acordado con la ERP.",
  },
  {
    codigo: "CO",
    familia: "Cobertura",
    nombre: "Tecnologías o servicios prestados que no corresponden al Plan de Beneficios (PBS) a cargo de esa entidad.",
  },
  {
    codigo: "DE",
    familia: "Devoluciones",
    nombre: "Causales que afectan de forma total la factura por falta de requisitos esenciales para su radicación o trámite.",
  },
];

async function asegurarCausalNormativa(
  db: ReturnType<typeof createServiceClient>,
  codigoRaw: string | null
) {
  if (!codigoRaw) return;
  const cod = codigoRaw.trim().toUpperCase();
  const base = CAUSALES_NORMATIVAS_BASE.find((c) => c.codigo === cod);
  if (!base) return;
  await db
    .from("cf_causales")
    .upsert({ codigo: base.codigo, familia: base.familia, nombre: base.nombre, activo: true }, { onConflict: "codigo" });
}

async function resolverCodigoParaBD(
  db: ReturnType<typeof createServiceClient>,
  causalRaw: unknown,
  subcodigoRaw: unknown,
  tipoRaw?: unknown
): Promise<string | null> {
  const sub = strLimpio(subcodigoRaw).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const c6 =
    causaNormativa6De(strLimpio(causalRaw) || sub, strLimpio(tipoRaw)) || null;
  if (sub.length >= 4 && (!c6 || sub.startsWith(c6))) {
    const sub4 = sub.slice(0, 4);
    const { data } = await db
      .from("cf_causales")
      .select("codigo")
      .in("codigo", [sub, sub4])
      .limit(1)
      .maybeSingle();
    if (data?.codigo) return String(data.codigo).toUpperCase();
  }
  if (c6) {
    await asegurarCausalNormativa(db, c6);
    return c6;
  }
  return null;
}

/**
 * Busca un nombre en un catalogo (cf_empresas, cf_responsables) y, si no
 * existe, lo crea.
 *
 * Antes no se creaba: si alguien escribia una EPS que no estaba en el
 * catalogo, la glosa quedaba con el nombre escrito pero sin enlace, y esa
 * glosa no sumaba por empresa en ningun lado. Fallaba en silencio, que es
 * la peor forma de fallar.
 */
async function idCatalogo(
  db: ReturnType<typeof createServiceClient>,
  tabla: "cf_empresas" | "cf_responsables",
  nombre: unknown
): Promise<string | null> {
  const raw = txt(nombre)?.trim();
  if (!raw) return null;
  const n =
    tabla === "cf_empresas"
      ? normalizarEmpresaNitUnificada(raw).nombre || raw.toUpperCase()
      : homologarPersonaFacturacion(raw);
  if (!n) return null;
  const { data } = await db.from(tabla).select("id").ilike("nombre", n).maybeSingle();
  if (data?.id) return data.id as string;
  const ins = await db.from(tabla).insert({ nombre: n }).select("id").maybeSingle();
  return (ins.data?.id as string) ?? null;
}

function construirOrigenGestion(origenPrevio: unknown, filaInput: Fila): Record<string, unknown> {
  const prev =
    origenPrevio && typeof origenPrevio === "object" && !Array.isArray(origenPrevio)
      ? (origenPrevio as Record<string, unknown>)
      : {};
  const prevGest =
    prev.gestion_ebenezer && typeof prev.gestion_ebenezer === "object" && !Array.isArray(prev.gestion_ebenezer)
      ? (prev.gestion_ebenezer as Record<string, unknown>)
      : {};
  const nextGest: Record<string, unknown> = { ...prevGest };
  if (filaInput.fechaPrestacionServicio !== undefined) {
    nextGest.fechaPrestacionServicio = fecha(filaInput.fechaPrestacionServicio);
  }
  if (filaInput.subcodigoCausal !== undefined) {
    nextGest.subcodigoCausal = txt(filaInput.subcodigoCausal)?.trim().toUpperCase() || "";
  }
  if (filaInput.seguimientoEstado !== undefined) {
    nextGest.seguimientoEstado = normalizarSeguimientoGlosa(strLimpio(filaInput.seguimientoEstado)) || null;
  }
  if (filaInput.valorSeguimiento !== undefined) {
    nextGest.valorSeguimiento =
      filaInput.valorSeguimiento === null || filaInput.valorSeguimiento === ""
        ? null
        : num(filaInput.valorSeguimiento);
  }
  return { ...prev, gestion_ebenezer: nextGest };
}

/** Registra el cambio en cf_historial. Nunca interrumpe la operacion. */
async function anotar(
  db: ReturnType<typeof createServiceClient>,
  entidad: "factura" | "glosa" | "pendiente",
  entidadId: string,
  facturaNumero: string | null,
  accion: "CREAR" | "EDITAR" | "CAMBIO_ESTADO" | "CLASIFICAR" | "IMPORTAR",
  detalle: Fila,
  userId: string | null,
  userNombre: string | null
) {
  try {
    await db.from("cf_historial").insert({
      entidad,
      entidad_id: entidadId,
      factura_numero: facturaNumero,
      accion,
      detalle,
      user_id: userId,
      user_nombre: userNombre,
    });
  } catch {
    // El historial no puede tumbar un guardado.
  }
}

/** Busca la factura por numero; la crea si no existe. Devuelve su id. */
async function idFactura(
  db: ReturnType<typeof createServiceClient>,
  numero: string,
  base: Fila = {}
): Promise<string | null> {
  const limpio = numero.trim().toUpperCase().replace(/\s+/g, "");
  if (!limpio) return null;
  const { data } = await db.from("cf_facturas").select("id").eq("numero", limpio).maybeSingle();
  if (data?.id) return data.id as string;
  const { data: nueva } = await db
    .from("cf_facturas")
    .insert({ numero: limpio, ...base })
    .select("id")
    .maybeSingle();
  return (nueva?.id as string) ?? null;
}

// ---------------------------------------------------------------------------
// GET — devuelve los registros con la misma forma que espera el tablero
// ---------------------------------------------------------------------------

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const db = createServiceClient();

  const [facturas, glosas, pendientes, causales, empresasCat, responsablesCat] = await Promise.all([
    db.from("cf_facturas").select(
      "id, numero, anio, periodo, fecha_elaboracion, fecha_radicacion, fecha_anulacion, " +
      "valor_radicado, copagos, valor_glosa_devolucion, estado, motivo_anulacion_texto, rips, " +
      "revision_financiera, empresa_nombre_original, reemplaza_a_id, " +
      "cf_empresas(nombre), cf_responsables(nombre)"
    ),
    db.from("cf_glosas").select(
      "id, tipo, alcance, motivo_codigo, motivo_texto, observacion, valor_glosado, valor_aceptado, estado, fecha_glosa, nota_credito, origen, " +
      "cf_facturas(numero, anio, periodo, fecha_elaboracion, fecha_radicacion, valor_radicado, " +
      "empresa_nombre_original, cf_empresas(nombre)), " +
      "facturador:cf_responsables!cf_glosas_facturador_id_fkey(nombre), " +
      "aceptacion:cf_responsables!cf_glosas_responsable_aceptacion_id_fkey(nombre)"
    ),
    db.from("cf_pendientes_facturar").select(
      "id, paciente_tipo_id, paciente_num_id, paciente_nombre, contrato, fecha_servicio, anio, " +
      "unidad_funcional, cups, descripcion, medico, autorizacion, cantidad, valor_servicio, " +
      "estado, observaciones, empresa_nombre_original, cf_empresas(nombre), cf_responsables(nombre)"
    ),
    db.from("cf_causales").select("codigo, familia, nombre").eq("activo", true).order("codigo"),
    db.from("cf_empresas").select("nombre").eq("activo", true).order("nombre"),
    db.from("cf_responsables").select("nombre").eq("activo", true).order("nombre"),
  ]);

  if (facturas.error || glosas.error || pendientes.error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          facturas.error?.message || glosas.error?.message || pendientes.error?.message,
      },
      { status: 500 }
    );
  }

  const emp = (r: Fila) =>
    strLimpio((r.cf_empresas as Fila | null)?.nombre) ||
    strLimpio(r.empresa_nombre_original) ||
    "";

  type AcumClinicoFactura = {
    pacientes: string[];
    docs: string[];
    medicos: string[];
    cups: string[];
    descripciones: string[];
    contratos: string[];
    ufs: string[];
    fechasServicio: string[];
  };
  const crucePorFactura = new Map<string, AcumClinicoFactura>();
  const agregarUnico = (lista: string[], val: string) => {
    if (val && !lista.includes(val)) lista.push(val);
  };

  // 1. Procesamos primero cf_pendientes_facturar para extraer paciente, médico, CUPS,
  //    Consulta/Cirugía, Sede y cruzar cualquier factura FCOE asociada en observaciones.
  const filasPendiente = ((pendientes.data || []) as unknown as Fila[]).map((r) => {
    const empresaBase = emp(r);
    const empresaOrig = strLimpio(r.empresa_nombre_original) || empresaBase;
    const contratoStr = strLimpio(r.contrato);
    const ufStr = strLimpio(r.unidad_funcional);
    const cupsStr = strLimpio(r.cups);
    const descStr = strLimpio(r.descripcion);
    const obsStr = strLimpio(r.observaciones);
    const pacTipo = strLimpio(r.paciente_tipo_id);
    const pacNum = strLimpio(r.paciente_num_id);
    const pacNombre = limpiarNombrePersona(strLimpio(r.paciente_nombre));
    const pacDoc = [pacTipo, pacNum].filter(Boolean).join(" ");
    const medNombre = limpiarNombrePersona(strLimpio(r.medico));
    const facturasEnObs = extraerFacturasFcoe(obsStr);
    const facturaAsociada = facturasEnObs[0] || "";

    const empInfo = homologarEmpresaYOrigen({
      empresa: empresaBase,
      empresaOriginal: empresaOrig,
      contrato: contratoStr,
    });
    const atencionInfo = clasificarAtencionYSede({
      esMutual: empInfo.esMutual,
      cups: cupsStr,
      unidadFuncional: ufStr,
      descripcion: descStr,
      contrato: contratoStr,
    });

    for (const fCod of facturasEnObs) {
      const k = claveFacturaNorm(fCod);
      if (!k) continue;
      const acum = crucePorFactura.get(k) || {
        pacientes: [],
        docs: [],
        medicos: [],
        cups: [],
        descripciones: [],
        contratos: [],
        ufs: [],
        fechasServicio: [],
      };
      agregarUnico(acum.pacientes, pacNombre);
      agregarUnico(acum.docs, pacDoc);
      agregarUnico(acum.medicos, medNombre);
      agregarUnico(acum.cups, cupsStr);
      agregarUnico(acum.descripciones, descStr);
      agregarUnico(acum.contratos, contratoStr);
      agregarUnico(acum.ufs, ufStr);
      agregarUnico(acum.fechasServicio, strLimpio(r.fecha_servicio).slice(0, 10));
      crucePorFactura.set(k, acum);
    }

    return {
      id: String(r.id),
      empresa: empresaBase,
      empresaOriginal: empresaOrig,
      empresaHomologada: empInfo.empresaHomologada,
      nit: empInfo.nit,
      esMutual: empInfo.esMutual,
      deDondeEs: empInfo.deDondeEs,
      sede: atencionInfo.sede,
      sedeGrupo: atencionInfo.sedeGrupo,
      tipoAtencion: atencionInfo.tipoAtencion,
      tipoGrupo: atencionInfo.tipoGrupo,
      contrato: contratoStr,
      unidadFuncional: ufStr,
      cups: cupsStr,
      descripcion: descStr,
      fechaServicio: (r.fecha_servicio as string) || "",
      anio: r.anio ? String(r.anio) : "",
      pacienteTipoId: pacTipo,
      pacienteNumId: pacNum,
      pacienteDoc: pacDoc,
      pacienteNombre: pacNombre,
      medico: medNombre || strLimpio(r.medico),
      medicoNombre: medNombre,
      autorizacion: strLimpio(r.autorizacion),
      cantidad: Number(r.cantidad) || 1,
      facturaAsociada,
      valorServicio: Number(r.valor_servicio) || 0,
      responsable: homologarPersonaFacturacion(strLimpio((r.cf_responsables as Fila | null)?.nombre)),
      observaciones: obsStr,
      estado: strLimpio(r.estado) || "PENDIENTE",
    };
  });

  const todas = (facturas.data || []) as unknown as Fila[];
  const numeroPorFacturaId = new Map<string, string>();
  for (const r of todas) {
    const idStr = String(r.id || "");
    const numStr = strLimpio(r.numero);
    if (idStr && numStr) numeroPorFacturaId.set(idStr, numStr);
  }

  const filaFactura = (r: Fila, i: number) => {
    const empBase = emp(r);
    const empOrig = strLimpio(r.empresa_nombre_original) || empBase;
    const facStr = strLimpio(r.numero);
    const motivoStr = strLimpio(r.motivo_anulacion_texto);
    const clinico = crucePorFactura.get(claveFacturaNorm(facStr));
    const empInfo = homologarEmpresaYOrigen({
      empresa: empBase,
      empresaOriginal: empOrig,
      contrato: clinico?.contratos[0],
    });
    const atencionInfo = clasificarAtencionYSede({
      esMutual: empInfo.esMutual,
      cups: clinico?.cups[0],
      unidadFuncional: clinico?.ufs[0],
      descripcion: clinico?.descripciones.join(" | "),
      contrato: clinico?.contratos[0],
      motivoTexto: motivoStr,
    });
    const reempId = r.reemplaza_a_id ? String(r.reemplaza_a_id) : "";
    const facturaReemplazaReal = reempId ? numeroPorFacturaId.get(reempId) || "SI" : "";

    return {
      id: String(r.id),
      numero: i + 1,
      empresa: empBase,
      empresaOriginal: empOrig,
      empresaHomologada: empInfo.empresaHomologada,
      nit: empInfo.nit,
      esMutual: empInfo.esMutual,
      deDondeEs: empInfo.deDondeEs,
      sede: atencionInfo.sede,
      sedeGrupo: atencionInfo.sedeGrupo,
      tipoAtencion: atencionInfo.tipoAtencion,
      tipoGrupo: atencionInfo.tipoGrupo,
      pacienteNombre: clinico ? clinico.pacientes.join(" / ") : "",
      pacienteDoc: clinico ? clinico.docs.join(" / ") : "",
      medicoNombre: clinico ? clinico.medicos.join(" / ") : "",
      cups: clinico ? clinico.cups.join(", ") : "",
      servicioDescripcion: clinico ? clinico.descripciones.join(" · ") : "",
      fechaFactura: (r.fecha_elaboracion as string) || "",
      periodo: strLimpio(r.periodo),
      anio: r.anio ? String(r.anio) : "",
      factura: facStr,
      fechaRadicacion: (r.fecha_radicacion as string) || "",
      valorRadicado: Number(r.valor_radicado) || 0,
      copagos: Number(r.copagos) || 0,
      valorGlosaDevolucion: Number(r.valor_glosa_devolucion) || 0,
      tipo: "GLOSA",
      motivo: motivoStr,
      facturaReemplaza: facturaReemplazaReal,
      fechaAnulacion: (r.fecha_anulacion as string) || "",
      fechaRadicacionReemplazo: "",
      rips: strLimpio(r.rips),
      revisionFinanciera: strLimpio(r.revision_financiera),
      preagrupado: "",
      responsable: homologarPersonaFacturacion(strLimpio((r.cf_responsables as Fila | null)?.nombre)) || "SIN ASIGNAR",
      estadoGestion: strLimpio(r.estado) || "RADICADA",
    };
  };

  const todasFacturasBase = todas.map(filaFactura);
  const anuladas = todas
    .filter((r) => ["ANULADA", "REEMPLAZADA", "PENDIENTE_REEMPLAZO"].includes(String(r.estado)))
    .map(filaFactura);
  const legalizadas = todas
    .filter((r) => String(r.estado) === "LEGALIZADA")
    .map(filaFactura);

  const filasGlosa = ((glosas.data || []) as unknown as Fila[]).map((r) => {
    const f = (r.cf_facturas as Fila | null) || {};
    const empBase =
      strLimpio((f.cf_empresas as Fila | null)?.nombre) ||
      strLimpio(f.empresa_nombre_original) ||
      "";
    const empOrig = strLimpio(f.empresa_nombre_original);
    const facStr = strLimpio(f.numero);
    const motivoStr = strLimpio(r.motivo_texto);
    const obsStr = strLimpio(r.observacion);
    const clinico = crucePorFactura.get(claveFacturaNorm(facStr));
    const empInfo = homologarEmpresaYOrigen({
      empresa: empBase,
      empresaOriginal: empOrig,
      contrato: clinico?.contratos[0],
    });
    const atencionInfo = clasificarAtencionYSede({
      esMutual: empInfo.esMutual,
      cups: clinico?.cups[0],
      unidadFuncional: clinico?.ufs[0],
      descripcion: clinico?.descripciones.join(" | "),
      contrato: clinico?.contratos[0],
      motivoTexto: `${motivoStr} ${obsStr}`,
    });

    const origenObj =
      r.origen && typeof r.origen === "object" && !Array.isArray(r.origen)
        ? (r.origen as Record<string, unknown>)
        : {};
    const gestObj =
      origenObj.gestion_ebenezer &&
      typeof origenObj.gestion_ebenezer === "object" &&
      !Array.isArray(origenObj.gestion_ebenezer)
        ? (origenObj.gestion_ebenezer as Record<string, unknown>)
        : {};
    const fechaPrestGuardada = strLimpio(gestObj.fechaPrestacionServicio).slice(0, 10);
    const fechaPrestCruce = clinico?.fechasServicio[0] || "";
    const segEst = normalizarSeguimientoGlosa(strLimpio(gestObj.seguimientoEstado));
    const valSeg =
      gestObj.valorSeguimiento === null ||
      gestObj.valorSeguimiento === undefined ||
      gestObj.valorSeguimiento === ""
        ? null
        : Number(gestObj.valorSeguimiento);
    const factUnif = homologarPersonaFacturacion(strLimpio((r.facturador as Fila | null)?.nombre));
    const respUnif = homologarPersonaFacturacion(strLimpio((r.aceptacion as Fila | null)?.nombre));
    const empCanonica = empInfo.empresaCorta !== "SIN ENTIDAD" ? empInfo.empresaCorta : empBase;
    const codBD = strLimpio(r.motivo_codigo).trim().toUpperCase();
    const tipoBD = strLimpio(r.tipo) || "GLOSA";
    const tieneSubGuardado = Object.prototype.hasOwnProperty.call(gestObj, "subcodigoCausal");
    const subGuardado = strLimpio(gestObj.subcodigoCausal).trim().toUpperCase();
    const codExplicito = extraerCodigoCausalExplicito(motivoStr);
    const causal6 = causaNormativa6De(codBD || subGuardado || codExplicito, tipoBD);
    const subcodigoExpuesto = tieneSubGuardado
      ? subGuardado
      : codBD.length > 2
      ? codBD
      : codExplicito.length > 2
      ? codExplicito
      : "";

    return {
      id: String(r.id),
      subtabla: String(r.estado),
      empresa: empCanonica,
      empresaOriginal: empOrig || empBase,
      empresaHomologada: empInfo.empresaHomologada,
      nit: empInfo.nit,
      esMutual: empInfo.esMutual,
      deDondeEs: empInfo.deDondeEs,
      sede: atencionInfo.sede,
      sedeGrupo: atencionInfo.sedeGrupo,
      tipoAtencion: atencionInfo.tipoAtencion,
      tipoGrupo: atencionInfo.tipoGrupo,
      pacienteNombre: clinico ? clinico.pacientes.join(" / ") : "",
      pacienteDoc: clinico ? clinico.docs.join(" / ") : "",
      medicoNombre: clinico ? clinico.medicos.join(" / ") : "",
      cups: clinico ? clinico.cups.join(", ") : "",
      servicioDescripcion: clinico ? clinico.descripciones.join(" · ") : "",
      fechaPrestacionServicio: fechaPrestGuardada || fechaPrestCruce,
      fechaFactura: (f.fecha_elaboracion as string) || "",
      periodo: strLimpio(f.periodo),
      anio: f.anio ? String(f.anio) : "",
      factura: facStr,
      fechaRadicacion: (f.fecha_radicacion as string) || "",
      fechaNotificacionGlosa: (r.fecha_glosa as string) || "",
      valorRadicado: Number(f.valor_radicado) || 0,
      valorFactura: Number(f.valor_radicado) || 0,
      valorFacturado: Number(f.valor_radicado) || 0,
      valorGlosado: Number(r.valor_glosado) || 0,
      valorAceptado:
        r.valor_aceptado === null || r.valor_aceptado === undefined
          ? null
          : Number(r.valor_aceptado),
      motivoCodigo: causal6,
      subcodigoCausal: subcodigoExpuesto,
      motivoGlosa: motivoStr,
      facturador: factUnif,
      responsableAceptacion: respUnif,
      responsableRespuesta: respUnif,
      seguimientoEstado: segEst,
      valorSeguimiento: valSeg,
      observacionInterna: obsStr,
      notaCredito: strLimpio(r.nota_credito),
      tipoGlosa: tipoBD,
      alcance: strLimpio(r.alcance),
      estado: strLimpio(r.estado) || "PENDIENTE",
    };
  });

  const unicos = (xs: (string | undefined)[]) =>
    Array.from(new Set(xs.filter((x): x is string => !!x && x.trim() !== "").map((x) => limpiarUtf8(x.trim()))))
      .sort((a, b) => a.localeCompare(b, "es"));

  const causalesDb = ((causales.data || []) as { codigo: string; familia: string; nombre: string }[]).map((c) => ({
    codigo: limpiarUtf8(c.codigo),
    familia: limpiarUtf8(c.familia),
    nombre: limpiarUtf8(c.nombre),
  }));
  const codigosExistentes = new Set(causalesDb.map((c) => c.codigo));
  const causalesCompletas = [
    ...CAUSALES_NORMATIVAS_BASE.filter((b) => !codigosExistentes.has(b.codigo)),
    ...causalesDb,
  ];

  const catalogos = {
    empresas: unicos([
      ...(empresasCat.data || []).map((x) => {
        const rawE = String(x.nombre || "");
        return normalizarEmpresaNitUnificada(rawE).nombre || rawE;
      }),
      ...filasGlosa.map((g) => g.empresa),
    ]),
    responsables: unicos([
      ...(responsablesCat.data || []).map((x) => homologarPersonaFacturacion(String(x.nombre || ""))),
      ...filasGlosa.map((g) => g.facturador),
      ...filasGlosa.map((g) => g.responsableAceptacion),
    ]),
    motivos: unicos(filasGlosa.map((g) => g.motivoGlosa)),
    causales: causalesCompletas,
    anios: unicos(filasGlosa.map((g) => g.anio)),
  };

  return NextResponse.json({
    ok: true,
    origen: "base de datos",
    catalogos,
    facturasBase: todasFacturasBase,
    anuladas,
    legalizadas,
    glosas: filasGlosa,
    pendientes: filasPendiente,
  });
}

// ---------------------------------------------------------------------------
// POST — crea o actualiza UN registro
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: {
    entidad?: string;
    accion?: string;
    archivoNombre?: string;
    fila?: Fila;
    filas?: Fila[];
    glosas?: Fila[];
    pendientes?: Fila[];
    anuladas?: Fila[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const { entidad, accion = "EDITAR" } = body;
  const fila: Fila = (body.fila && !Array.isArray(body.fila) ? body.fila : {}) as Fila;
  if (
    !entidad ||
    (entidad !== "importar-excel" && !body.fila && !Array.isArray(body.filas))
  ) {
    return NextResponse.json({ ok: false, error: "Faltan entidad o fila" }, { status: 400 });
  }

  const db = createServiceClient();
  const esNuevo = accion === "CREAR";
  const uid = user.id;
  const unombre = user.nombreCompleto;

  try {
    // ---- facturas (pestañas anuladas y legalizadas) ----
    if (entidad === "anuladas" || entidad === "legalizadas") {
      const numero = String(fila.factura || "").trim().toUpperCase().replace(/\s+/g, "");
      if (!numero) {
        return NextResponse.json({ ok: false, error: "Falta el numero de factura" }, { status: 400 });
      }
      const empresaIdAnul = await idCatalogo(db, "cf_empresas", fila.empresa);
      const respIdAnul = await idCatalogo(db, "cf_responsables", fila.responsable);

      const valores = {
        empresa_id: empresaIdAnul,
        empresa_nombre_original: txt(fila.empresaOriginal) ?? txt(fila.empresa),
        anio: fila.anio ? Number(fila.anio) : null,
        periodo: txt(fila.periodo),
        fecha_elaboracion: fecha(fila.fechaFactura),
        fecha_radicacion: fecha(fila.fechaRadicacion),
        fecha_anulacion: fecha(fila.fechaAnulacion),
        valor_radicado: num(fila.valorRadicado),
        copagos: num(fila.copagos),
        valor_glosa_devolucion: num(fila.valorGlosaDevolucion),
        motivo_anulacion_texto: txt(fila.motivo),
        rips: txt(fila.rips),
        revision_financiera: txt(fila.revisionFinanciera),
        responsable_id: respIdAnul,
        estado:
          entidad === "legalizadas"
            ? "LEGALIZADA"
            : String(fila.facturaReemplaza || "").toUpperCase().includes("FCOE")
            ? "REEMPLAZADA"
            : "ANULADA",
      };

      const existente = esNuevo
        ? null
        : (await db.from("cf_facturas").select("id").eq("id", String(fila.id)).maybeSingle()).data;

      let id: string | null = existente?.id ?? null;
      if (id) {
        await db.from("cf_facturas").update(valores).eq("id", id);
      } else {
        const yaEsta = await db.from("cf_facturas").select("id").eq("numero", numero).maybeSingle();
        if (yaEsta.data?.id) {
          id = yaEsta.data.id as string;
          await db.from("cf_facturas").update(valores).eq("id", id);
        } else {
          const ins = await db
            .from("cf_facturas").insert({ numero, ...valores }).select("id").maybeSingle();
          id = (ins.data?.id as string) ?? null;
        }
      }
      if (!id) throw new Error("No se pudo guardar la factura");
      await anotar(db, "factura", id, numero, esNuevo ? "CREAR" : "EDITAR", fila, uid, unombre);
      return NextResponse.json({ ok: true, id });
    }

    // ---- clasificar en lote por texto de motivo ----
    //
    // 217 glosas quedaron sin causal y son solo 122 redacciones distintas: la
    // misma frase repetida muchas veces. Clasificarlas una por una seria
    // teclear lo mismo 217 veces. Esto aplica un codigo a todas las que
    // compartan exactamente el mismo texto.
    if (entidad === "glosas-lote") {
      const texto = txt(fila.motivoGlosa);
      const codigoRaw = txt(fila.motivoCodigo);
      const subRaw = txt(fila.subcodigoCausal);
      const codigoBD = await resolverCodigoParaBD(db, codigoRaw, subRaw);
      if (!texto || !codigoBD) {
        return NextResponse.json(
          { ok: false, error: "Falta el texto del motivo o la causal (TA, AU, SO, DE, CO, FA)" },
          { status: 400 }
        );
      }
      const { data: afectadas, error } = await db
        .from("cf_glosas")
        .update({ motivo_codigo: codigoBD })
        .eq("motivo_texto", texto)
        .is("motivo_codigo", null)
        .select("id");
      const codigo = codigoBD;
      if (error) throw new Error(error.message);
      const ids = (afectadas || []).map((x) => x.id as string);
      for (const id of ids) {
        await anotar(db, "glosa", id, "", "CLASIFICAR", { codigo, texto }, uid, unombre);
      }
      return NextResponse.json({ ok: true, afectadas: ids.length });
    }

    // ---- glosas ----
    if (entidad === "glosas") {
      const numero = String(fila.factura || "").trim().toUpperCase().replace(/\s+/g, "");
      if (!numero) {
        return NextResponse.json({ ok: false, error: "Falta el número de factura" }, { status: 400 });
      }
      if (esNuevo && !esNotaCreditoValida(fila.notaCredito)) {
        return NextResponse.json(
          { ok: false, error: "La Nota Crédito es obligatoria (ingresa el número o N/A)" },
          { status: 400 }
        );
      }
      if (
        !esNuevo &&
        fila.notaCredito !== undefined &&
        String(fila.notaCredito).trim() !== "" &&
        !esNotaCreditoValida(fila.notaCredito)
      ) {
        return NextResponse.json(
          { ok: false, error: "La Nota Crédito debe contener el número consecutivo o N/A" },
          { status: 400 }
        );
      }

      const empresaId = await idCatalogo(db, "cf_empresas", fila.empresa);
      const facturaId = await idFactura(db, numero, {
        empresa_id: empresaId,
        empresa_nombre_original: txt(fila.empresaOriginal) ?? txt(fila.empresa),
        valor_radicado: num(fila.valorFacturado ?? fila.valorRadicado),
        fecha_elaboracion: fecha(fila.fechaFactura),
        fecha_radicacion: fecha(fila.fechaRadicacion),
      });
      if (!facturaId) throw new Error("No se pudo resolver la factura de la glosa");

      // Actualizar factura si se pasaron fechas, empresa o valor actualizados
      const upFact: Record<string, unknown> = {};
      if (empresaId) upFact.empresa_id = empresaId;
      if (fila.fechaFactura !== undefined) upFact.fecha_elaboracion = fecha(fila.fechaFactura);
      if (fila.fechaRadicacion !== undefined) upFact.fecha_radicacion = fecha(fila.fechaRadicacion);
      if (fila.valorFacturado !== undefined || fila.valorRadicado !== undefined) {
        upFact.valor_radicado = num(fila.valorFacturado ?? fila.valorRadicado);
      }
      if (Object.keys(upFact).length > 0) {
        await db.from("cf_facturas").update(upFact).eq("id", facturaId);
      }

      const factId = await idCatalogo(db, "cf_responsables", fila.facturador);
      const acepId = await idCatalogo(db, "cf_responsables", fila.responsableRespuesta || fila.responsableAceptacion);
      const fechaNotif = fecha(fila.fechaNotificacionGlosa);
      const codCausal = await resolverCodigoParaBD(
        db,
        fila.motivoCodigo,
        fila.subcodigoCausal,
        fila.tipoGlosa
      );

      const existente = esNuevo
        ? null
        : (await db.from("cf_glosas").select("id, estado, origen").eq("id", String(fila.id)).maybeSingle()).data;

      const estado = String(fila.estado || fila.subtabla || "PENDIENTE").toUpperCase();
      const ncNormalizada =
        txt(fila.notaCredito)?.trim().toUpperCase() === "NA" ||
        txt(fila.notaCredito)?.trim().toUpperCase() === "NO APLICA"
          ? "N/A"
          : txt(fila.notaCredito)?.trim() || null;

      const valores = {
        factura_id: facturaId,
        tipo: String(fila.tipoGlosa || "GLOSA").toUpperCase().startsWith("DEVOL") ? "DEVOLUCION" : "GLOSA",
        alcance: ["PARCIAL", "TOTAL"].includes(String(fila.alcance || "").toUpperCase())
          ? String(fila.alcance).toUpperCase()
          : null,
        motivo_codigo: codCausal,
        motivo_texto: txt(fila.motivoGlosa),
        observacion: txt(fila.observacionInterna),
        valor_glosado: num(fila.valorGlosado),
        // Nullable de verdad: sin desenlace definido se guarda null, no 0.
        valor_aceptado:
          fila.valorAceptado === null ||
          fila.valorAceptado === undefined ||
          fila.valorAceptado === ""
            ? null
            : num(fila.valorAceptado),
        estado: ["PENDIENTE", "RESPONDIDA", "ACEPTADA", "NO_ACEPTADA", "LEGALIZADA"].includes(estado)
          ? estado
          : "PENDIENTE",
        fecha_glosa: fechaNotif,
        nota_credito: ncNormalizada,
        facturador_id: factId,
        responsable_aceptacion_id: acepId,
        origen: construirOrigenGestion(existente?.origen, fila),
      };

      let id: string | null = existente?.id ?? null;
      if (id) {
        await db.from("cf_glosas").update(valores).eq("id", id);
      } else {
        const ins = await db.from("cf_glosas").insert(valores).select("id").maybeSingle();
        id = (ins.data?.id as string) ?? null;
      }
      if (!id) throw new Error("No se pudo guardar la glosa");

      const cambioEstado = existente && existente.estado !== valores.estado;
      await anotar(
        db, "glosa", id, numero,
        esNuevo ? "CREAR" : cambioEstado ? "CAMBIO_ESTADO" : "EDITAR",
        cambioEstado ? { antes: existente?.estado, despues: valores.estado, fila } : fila,
        uid, unombre
      );
      return NextResponse.json({ ok: true, id });
    }

    // ---- pendientes por facturar ----
    if (entidad === "pendientes") {
      const empresaIdPend = await idCatalogo(db, "cf_empresas", fila.empresa);
      const respIdPend = await idCatalogo(db, "cf_responsables", fila.responsable);

      const estado = String(fila.estado || "PENDIENTE").toUpperCase();
      const valores = {
        empresa_id: empresaIdPend,
        empresa_nombre_original: txt(fila.empresaOriginal) ?? txt(fila.empresa),
        contrato: txt(fila.contrato),
        fecha_servicio: fecha(fila.fechaServicio),
        anio: fila.anio ? Number(fila.anio) : null,
        unidad_funcional: txt(fila.unidadFuncional),
        cups: txt(fila.cups),
        descripcion: txt(fila.descripcion),
        medico: txt(fila.medico),
        valor_servicio: num(fila.valorServicio),
        estado: ["PENDIENTE", "FACTURADO", "ANULADO", "NO_FACTURABLE"].includes(estado)
          ? estado
          : "PENDIENTE",
        responsable_id: respIdPend,
        observaciones: txt(fila.observaciones),
      };

      const existente = esNuevo
        ? null
        : (await db.from("cf_pendientes_facturar").select("id").eq("id", String(fila.id)).maybeSingle()).data;

      let id: string | null = existente?.id ?? null;
      if (id) {
        await db.from("cf_pendientes_facturar").update(valores).eq("id", id);
      } else {
        const ins = await db
          .from("cf_pendientes_facturar").insert(valores).select("id").maybeSingle();
        id = (ins.data?.id as string) ?? null;
      }
      if (!id) throw new Error("No se pudo guardar el pendiente");
      await anotar(db, "pendiente", id, null, esNuevo ? "CREAR" : "EDITAR", fila, uid, unombre);
      return NextResponse.json({ ok: true, id });
    }

    // ---- anular factura ----
    if (entidad === "anular") {
      const numero = String(fila.factura || "").trim().toUpperCase().replace(/\s+/g, "");
      if (!numero) {
        return NextResponse.json({ ok: false, error: "Falta el número de factura a anular" }, { status: 400 });
      }
      const motivo = txt(fila.motivo);
      if (!motivo) {
        return NextResponse.json({ ok: false, error: "Indica el motivo de anulación de la factura" }, { status: 400 });
      }
      const fechaAnul = fecha(fila.fechaAnulacion);
      const empId = await idCatalogo(db, "cf_empresas", fila.empresa);
      const respId = await idCatalogo(db, "cf_responsables", fila.responsable);
      const yaEsta = await db.from("cf_facturas").select("id").eq("numero", numero).maybeSingle();
      let factId = yaEsta.data?.id as string | undefined;

      const camposAnulacion: Record<string, unknown> = {
        estado: "ANULADA",
        motivo_anulacion_texto: motivo,
      };
      if (fechaAnul) camposAnulacion.fecha_anulacion = fechaAnul;
      if (empId) camposAnulacion.empresa_id = empId;
      if (fila.empresa) camposAnulacion.empresa_nombre_original = txt(fila.empresaOriginal) ?? txt(fila.empresa);
      if (fila.fechaFactura) camposAnulacion.fecha_elaboracion = fecha(fila.fechaFactura);
      if (fila.fechaRadicacion) camposAnulacion.fecha_radicacion = fecha(fila.fechaRadicacion);
      if (fila.valorFacturado !== undefined && fila.valorFacturado !== "") {
        camposAnulacion.valor_radicado = num(fila.valorFacturado);
      }
      if (respId) camposAnulacion.responsable_id = respId;

      if (!factId) {
        const ins = await db
          .from("cf_facturas")
          .insert({ numero, ...camposAnulacion })
          .select("id")
          .maybeSingle();
        factId = ins.data?.id as string | undefined;
      } else {
        await db.from("cf_facturas").update(camposAnulacion).eq("id", factId);
      }
      if (factId) {
        await anotar(
          db,
          "factura",
          factId,
          numero,
          "CAMBIO_ESTADO",
          { motivo, fechaAnulacion: fechaAnul, estado: "ANULADA" },
          uid,
          unombre
        );
      }
      return NextResponse.json({ ok: true, factura: numero });
    }

    // ---- importar lote de glosas ----
    if (entidad === "importar-lote") {
      const listaFilas: Fila[] = Array.isArray(body.filas)
        ? body.filas
        : Array.isArray(body.fila)
        ? (body.fila as unknown as Fila[])
        : [fila];

      // Validación previa de Nota Crédito cuando se informa (conserva vacío como null si el Excel histórico no la trae)
      for (let i = 0; i < listaFilas.length; i++) {
        const item = listaFilas[i];
        const numFact = String(item.factura || "").trim().toUpperCase().replace(/\s+/g, "");
        if (!numFact) continue;
        const ncVal = String(item.notaCredito ?? "").trim();
        if (ncVal !== "" && !esNotaCreditoValida(ncVal)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Fila ${i + 1} (${numFact}): la Nota Crédito debe contener el número consecutivo o N/A.`,
            },
            { status: 400 }
          );
        }
      }

      let importadas = 0;
      for (const item of listaFilas) {
        const numFact = String(item.factura || "").trim().toUpperCase().replace(/\s+/g, "");
        if (!numFact) continue;
        const empId = await idCatalogo(db, "cf_empresas", item.empresa);
        const factId = await idFactura(db, numFact, {
          empresa_id: empId,
          empresa_nombre_original: txt(item.empresaOriginal) ?? txt(item.empresa),
          valor_radicado: num(item.valorFacturado ?? item.valorRadicado),
          fecha_elaboracion: fecha(item.fechaFactura),
          fecha_radicacion: fecha(item.fechaRadicacion),
        });
        if (!factId) continue;

        const upFactImp: Record<string, unknown> = {};
        if (empId) upFactImp.empresa_id = empId;
        if (item.fechaFactura) upFactImp.fecha_elaboracion = fecha(item.fechaFactura);
        if (item.fechaRadicacion) upFactImp.fecha_radicacion = fecha(item.fechaRadicacion);
        if (item.valorFacturado !== undefined || item.valorRadicado !== undefined) {
          const vf = num(item.valorFacturado ?? item.valorRadicado);
          if (vf > 0) upFactImp.valor_radicado = vf;
        }
        if (Object.keys(upFactImp).length > 0) {
          await db.from("cf_facturas").update(upFactImp).eq("id", factId);
        }

        const fId = await idCatalogo(db, "cf_responsables", item.facturador);
        const rId = await idCatalogo(db, "cf_responsables", item.responsableRespuesta || item.responsableAceptacion);
        const notif = fecha(item.fechaNotificacionGlosa);
        const rawNc = txt(item.notaCredito)?.trim() || "";
        const nc = !rawNc
          ? null
          : rawNc.toUpperCase() === "NA" || rawNc.toUpperCase() === "NO APLICA"
          ? "N/A"
          : rawNc;
        const codCausal = await resolverCodigoParaBD(
          db,
          item.motivoCodigo,
          item.subcodigoCausal,
          item.tipoGlosa
        );

        const insGlosa = await db
          .from("cf_glosas")
          .insert({
            factura_id: factId,
            tipo: String(item.tipoGlosa || "GLOSA").toUpperCase().startsWith("DEVOL") ? "DEVOLUCION" : "GLOSA",
            alcance: ["PARCIAL", "TOTAL"].includes(String(item.alcance || "").toUpperCase())
              ? String(item.alcance).toUpperCase()
              : null,
            motivo_codigo: codCausal,
            motivo_texto: txt(item.motivoGlosa),
            observacion: txt(item.observacionInterna),
            valor_glosado: num(item.valorGlosado),
            valor_aceptado:
              item.valorAceptado === null || item.valorAceptado === undefined || item.valorAceptado === ""
                ? null
                : num(item.valorAceptado),
            estado: ["PENDIENTE", "RESPONDIDA", "ACEPTADA", "NO_ACEPTADA", "LEGALIZADA"].includes(
              String(item.estado || "").toUpperCase()
            )
              ? String(item.estado).toUpperCase()
              : "PENDIENTE",
            fecha_glosa: notif,
            nota_credito: nc,
            facturador_id: fId,
            responsable_aceptacion_id: rId,
            origen: construirOrigenGestion(null, item),
          })
          .select("id")
          .maybeSingle();

        if (insGlosa.data?.id) {
          await anotar(db, "glosa", String(insGlosa.data.id), numFact, "IMPORTAR", item, uid, unombre);
        }
        importadas++;
      }
      return NextResponse.json({ ok: true, importadas });
    }

    // ---- importar libro Excel completo (.xlsx / .csv) con autodetección y upsert sin duplicados ----
    if (entidad === "importar-excel") {
      const listaGlosas: Fila[] = Array.isArray(body.glosas) ? body.glosas : [];
      const listaPendientes: Fila[] = Array.isArray(body.pendientes) ? body.pendientes : [];
      const listaAnuladas: Fila[] = Array.isArray(body.anuladas) ? body.anuladas : [];
      const archivoNombre = txt(body.archivoNombre) || "carga_excel.xlsx";
      const hoyCarga = new Date().toISOString().slice(0, 10);

      // Precarga en memoria de catálogos y llaves existentes para upsert rápido e idempotente
      const [empExist, respExist, causExist, factExist, glosaExist, pendExist] = await Promise.all([
        db.from("cf_empresas").select("id, nombre"),
        db.from("cf_responsables").select("id, nombre"),
        db.from("cf_causales").select("codigo"),
        db.from("cf_facturas").select("id, numero"),
        db.from("cf_glosas").select("id, factura_id, motivo_texto, valor_glosado, origen"),
        db.from("cf_pendientes_facturar").select("id, paciente_num_id, fecha_servicio, cups, valor_servicio, descripcion"),
      ]);

      const mapaEmp = new Map<string, string>();
      for (const e of (empExist.data || []) as { id: string; nombre: string }[]) {
        if (e.nombre) mapaEmp.set(e.nombre.trim().toUpperCase(), e.id);
      }
      const obtenerEmpresaId = async (nombreRaw: unknown): Promise<string | null> => {
        const raw = txt(nombreRaw)?.trim();
        if (!raw) return null;
        const n = normalizarEmpresaNitUnificada(raw).nombre || raw.toUpperCase();
        const prev = mapaEmp.get(n);
        if (prev) return prev;
        const ins = await db.from("cf_empresas").insert({ nombre: n }).select("id").maybeSingle();
        const nuevoId = (ins.data?.id as string) ?? null;
        if (nuevoId) mapaEmp.set(n, nuevoId);
        return nuevoId;
      };

      const mapaResp = new Map<string, string>();
      for (const r of (respExist.data || []) as { id: string; nombre: string }[]) {
        if (r.nombre) mapaResp.set(r.nombre.trim().toUpperCase(), r.id);
      }
      const obtenerRespId = async (nombreRaw: unknown): Promise<string | null> => {
        const n = homologarPersonaFacturacion(strLimpio(nombreRaw));
        if (!n || n === "SIN ASIGNAR" || n === "N/A") return null;
        const prev = mapaResp.get(n);
        if (prev) return prev;
        const ins = await db.from("cf_responsables").insert({ nombre: n, activo: true }).select("id").maybeSingle();
        const nuevoId = (ins.data?.id as string) ?? null;
        if (nuevoId) mapaResp.set(n, nuevoId);
        return nuevoId;
      };

      const setCausales = new Set<string>(
        ((causExist.data || []) as { codigo: string }[]).map((c) => String(c.codigo || "").toUpperCase())
      );
      const resolverCodigoCausalSeguro = async (rawCod: unknown): Promise<string | null> => {
        const c = txt(rawCod)?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
        if (!c) return null;
        if (setCausales.has(c)) return c;
        if (CAUSALES_NORMATIVAS_BASE.some((b) => b.codigo === c)) {
          await asegurarCausalNormativa(db, c);
          setCausales.add(c);
          return c;
        }
        const c4 = c.slice(0, 4);
        if (c4.length === 4 && setCausales.has(c4)) return c4;
        const c2 = c.slice(0, 2);
        if (CAUSALES_NORMATIVAS_BASE.some((b) => b.codigo === c2)) {
          await asegurarCausalNormativa(db, c2);
          setCausales.add(c2);
          return c2;
        }
        return null;
      };

      const mapaFact = new Map<string, string>();
      for (const f of (factExist.data || []) as { id: string; numero: string }[]) {
        const k = claveFacturaNorm(f.numero);
        if (k) mapaFact.set(k, f.id);
      }

      const normClaveTxt = (s: unknown) =>
        strLimpio(s).toUpperCase().replace(/\s+/g, " ").trim().slice(0, 140);

      const mapaGlosaNatural = new Map<string, { id: string; origen: unknown }>();
      for (const g of (glosaExist.data || []) as {
        id: string;
        factura_id: string;
        motivo_texto: string | null;
        valor_glosado: number | null;
        origen?: unknown;
      }[]) {
        const k = `${g.factura_id}|${Math.round(Number(g.valor_glosado || 0))}|${normClaveTxt(g.motivo_texto)}`;
        if (!mapaGlosaNatural.has(k)) mapaGlosaNatural.set(k, { id: g.id, origen: g.origen });
      }

      const mapaPendNatural = new Map<string, string>();
      for (const p of (pendExist.data || []) as {
        id: string;
        paciente_num_id: string | null;
        fecha_servicio: string | null;
        cups: string | null;
        valor_servicio: number | null;
        descripcion: string | null;
      }[]) {
        const k = `${strLimpio(p.paciente_num_id)}|${strLimpio(p.fecha_servicio)}|${strLimpio(p.cups)}|${Math.round(Number(p.valor_servicio || 0))}|${normClaveTxt(p.descripcion)}`;
        if (!mapaPendNatural.has(k)) mapaPendNatural.set(k, p.id);
      }

      let creados = 0;
      let actualizados = 0;
      let glosasProcesadas = 0;
      let pendientesProcesados = 0;
      let anuladasProcesadas = 0;

      // 1. Procesar Anuladas / Reemplazadas / Legalizadas (cf_facturas)
      for (const item of listaAnuladas) {
        const numero = claveFacturaNorm(strLimpio(item.factura));
        if (!numero) continue;

        const empId = await obtenerEmpresaId(item.empresa);
        const respId = await obtenerRespId(item.responsable);
        const reempNum = claveFacturaNorm(strLimpio(item.facturaReemplaza));
        let reempId: string | null = null;
        if (reempNum && reempNum.startsWith("FCOE")) {
          reempId = mapaFact.get(reempNum) || (await idFactura(db, reempNum, { empresa_id: empId }));
          if (reempId) mapaFact.set(reempNum, reempId);
        }

        const estGest = String(item.estadoGestion || "ANULADA").toUpperCase();
        const estadoFact =
          estGest === "LEGALIZADA"
            ? "LEGALIZADA"
            : reempId || estGest === "REEMPLAZADA"
            ? "REEMPLAZADA"
            : "ANULADA";

        const camposFact: Record<string, unknown> = {
          estado: estadoFact,
          origen: {
            archivo: archivoNombre,
            hoja: strLimpio(item.hojaExcel) || "ANULACION",
            fila: Number(item.filaExcel) || null,
            cargado: hoyCarga,
            datos: (item.datosOriginales as Record<string, unknown>) || {},
          },
        };
        if (empId) camposFact.empresa_id = empId;
        if (txt(item.empresaOriginal) || txt(item.empresa)) {
          camposFact.empresa_nombre_original = txt(item.empresaOriginal) ?? txt(item.empresa);
        }
        if (item.anio && Number(item.anio) >= 2000) camposFact.anio = Number(item.anio);
        if (txt(item.periodo)) camposFact.periodo = txt(item.periodo);
        if (fecha(item.fechaFactura)) camposFact.fecha_elaboracion = fecha(item.fechaFactura);
        if (fecha(item.fechaRadicacion)) camposFact.fecha_radicacion = fecha(item.fechaRadicacion);
        if (fecha(item.fechaAnulacion)) camposFact.fecha_anulacion = fecha(item.fechaAnulacion);
        if (num(item.valorRadicado) > 0) camposFact.valor_radicado = num(item.valorRadicado);
        if (num(item.copagos) > 0) camposFact.copagos = num(item.copagos);
        if (num(item.valorGlosaDevolucion) > 0) camposFact.valor_glosa_devolucion = num(item.valorGlosaDevolucion);
        if (txt(item.motivo)) camposFact.motivo_anulacion_texto = txt(item.motivo);
        if (reempId) camposFact.reemplaza_a_id = reempId;
        if (txt(item.rips)) camposFact.rips = txt(item.rips);
        if (txt(item.revisionFinanciera)) camposFact.revision_financiera = txt(item.revisionFinanciera);
        if (respId) camposFact.responsable_id = respId;

        const idExist = mapaFact.get(numero);
        if (idExist) {
          await db.from("cf_facturas").update(camposFact).eq("id", idExist);
          actualizados++;
        } else {
          const ins = await db
            .from("cf_facturas")
            .insert({ numero, valor_radicado: num(item.valorRadicado), ...camposFact })
            .select("id")
            .maybeSingle();
          if (ins.data?.id) {
            mapaFact.set(numero, String(ins.data.id));
            creados++;
          }
        }
        anuladasProcesadas++;
      }

      // 2. Procesar Glosas (cf_facturas + cf_glosas)
      for (const item of listaGlosas) {
        const numero = claveFacturaNorm(strLimpio(item.factura));
        if (!numero) continue;

        const empId = await obtenerEmpresaId(item.empresa);
        let factId = mapaFact.get(numero) || null;
        const vRad = num(item.valorFacturado ?? item.valorRadicado);
        const fElab = fecha(item.fechaFactura);
        const fRad = fecha(item.fechaRadicacion);

        if (!factId) {
          const insF = await db
            .from("cf_facturas")
            .insert({
              numero,
              empresa_id: empId,
              empresa_nombre_original: txt(item.empresaOriginal) ?? txt(item.empresa),
              anio: item.anio && Number(item.anio) >= 2000 ? Number(item.anio) : fElab ? Number(fElab.slice(0, 4)) : null,
              fecha_elaboracion: fElab,
              fecha_radicacion: fRad,
              valor_radicado: vRad,
            })
            .select("id")
            .maybeSingle();
          factId = (insF.data?.id as string) ?? null;
          if (factId) mapaFact.set(numero, factId);
        } else {
          const upF: Record<string, unknown> = {};
          if (empId) upF.empresa_id = empId;
          if (fElab) upF.fecha_elaboracion = fElab;
          if (fRad) upF.fecha_radicacion = fRad;
          if (vRad > 0) upF.valor_radicado = vRad;
          if (Object.keys(upF).length > 0) {
            await db.from("cf_facturas").update(upF).eq("id", factId);
          }
        }
        if (!factId) continue;

        const fId = await obtenerRespId(item.facturador);
        const rId = await obtenerRespId(item.responsableRespuesta || item.responsableAceptacion);
        const codCausal = await resolverCodigoCausalSeguro(
          strLimpio(item.subcodigoCausal) || strLimpio(item.motivoCodigo)
        );
        const rawNc = txt(item.notaCredito)?.trim() || "";
        const nc =
          !rawNc
            ? null
            : rawNc.toUpperCase() === "NA" || rawNc.toUpperCase() === "NO APLICA"
            ? "N/A"
            : rawNc;

        const estUp = String(item.estado || "PENDIENTE").toUpperCase();
        const estadoValido = ["PENDIENTE", "RESPONDIDA", "ACEPTADA", "NO_ACEPTADA", "LEGALIZADA"].includes(estUp)
          ? estUp
          : "PENDIENTE";

        const vGlosado = num(item.valorGlosado);
        const motivoTxt = txt(item.motivoGlosa);
        const valoresGlosa: Record<string, unknown> = {
          factura_id: factId,
          tipo: String(item.tipoGlosa || "GLOSA").toUpperCase().startsWith("DEVOL") ? "DEVOLUCION" : "GLOSA",
          alcance: ["PARCIAL", "TOTAL"].includes(String(item.alcance || "").toUpperCase())
            ? String(item.alcance).toUpperCase()
            : null,
          motivo_codigo: codCausal,
          motivo_texto: motivoTxt,
          observacion: txt(item.observacionInterna),
          valor_glosado: vGlosado,
          valor_aceptado:
            item.valorAceptado === null || item.valorAceptado === undefined || item.valorAceptado === ""
              ? null
              : num(item.valorAceptado),
          estado: estadoValido,
          fecha_glosa: fecha(item.fechaNotificacionGlosa),
          nota_credito: nc,
          facturador_id: fId,
          responsable_aceptacion_id: rId,
        };

        const claveNat = `${factId}|${Math.round(vGlosado)}|${normClaveTxt(motivoTxt)}`;
        const prevGlosa = mapaGlosaNatural.get(claveNat);
        const origenBaseCarga = {
          ...(prevGlosa?.origen && typeof prevGlosa.origen === "object"
            ? (prevGlosa.origen as Record<string, unknown>)
            : {}),
          archivo: archivoNombre,
          hoja: strLimpio(item.hojaExcel) || "GLOSAS",
          fila: Number(item.filaExcel) || null,
          cargado: hoyCarga,
          datos: (item.datosOriginales as Record<string, unknown>) || {},
        };
        const patchGest: Fila = {};
        if (strLimpio(item.fechaPrestacionServicio)) {
          patchGest.fechaPrestacionServicio = item.fechaPrestacionServicio;
        }
        if (strLimpio(item.subcodigoCausal)) {
          patchGest.subcodigoCausal = item.subcodigoCausal;
        }
        if (strLimpio(item.seguimientoEstado)) {
          patchGest.seguimientoEstado = item.seguimientoEstado;
        }
        if (item.valorSeguimiento !== null && item.valorSeguimiento !== undefined && item.valorSeguimiento !== "") {
          patchGest.valorSeguimiento = item.valorSeguimiento;
        }
        valoresGlosa.origen = construirOrigenGestion(origenBaseCarga, patchGest);

        if (prevGlosa?.id) {
          await db.from("cf_glosas").update(valoresGlosa).eq("id", prevGlosa.id);
          actualizados++;
        } else {
          const insG = await db.from("cf_glosas").insert(valoresGlosa).select("id").maybeSingle();
          if (insG.data?.id) {
            mapaGlosaNatural.set(claveNat, { id: String(insG.data.id), origen: valoresGlosa.origen });
            creados++;
          }
        }
        glosasProcesadas++;
      }

      // 3. Procesar Servicios Clínicos / Pendientes por Facturar (cf_pendientes_facturar)
      for (const item of listaPendientes) {
        const empId = await obtenerEmpresaId(item.empresa);
        const respId = await obtenerRespId(item.responsable);
        const numFactAsoc = claveFacturaNorm(strLimpio(item.facturaAsociada));
        let factAsocId: string | null = null;
        if (numFactAsoc && numFactAsoc.startsWith("FCOE")) {
          factAsocId = mapaFact.get(numFactAsoc) || (await idFactura(db, numFactAsoc, { empresa_id: empId }));
          if (factAsocId) mapaFact.set(numFactAsoc, factAsocId);
        }

        const fServ = fecha(item.fechaServicio);
        const vServ = num(item.valorServicio);
        const cupsTxt = txt(item.cups);
        const descTxt = txt(item.descripcion);
        const pacNumTxt = txt(item.pacienteNumId);
        const estP = String(item.estado || (factAsocId ? "FACTURADO" : "PENDIENTE")).toUpperCase();
        const estadoPend = ["PENDIENTE", "FACTURADO", "ANULADO", "NO_FACTURABLE"].includes(estP)
          ? estP
          : "PENDIENTE";

        const valoresPend: Record<string, unknown> = {
          paciente_tipo_id: txt(item.pacienteTipoId),
          paciente_num_id: pacNumTxt,
          paciente_nombre: txt(item.pacienteNombre),
          empresa_id: empId,
          empresa_nombre_original: txt(item.empresaOriginal) ?? txt(item.empresa),
          contrato: txt(item.contrato),
          fecha_servicio: fServ,
          anio: item.anio && Number(item.anio) >= 2000 ? Number(item.anio) : fServ ? Number(fServ.slice(0, 4)) : null,
          unidad_funcional: txt(item.unidadFuncional),
          cups: cupsTxt,
          descripcion: descTxt,
          medico: txt(item.medico),
          autorizacion: txt(item.autorizacion),
          cantidad: Math.max(1, Math.round(num(item.cantidad) || 1)),
          valor_servicio: vServ,
          estado: estadoPend,
          factura_id: factAsocId,
          responsable_id: respId,
          observaciones: txt(item.observaciones),
          origen: {
            archivo: archivoNombre,
            hoja: strLimpio(item.hojaExcel) || "PENDIENTES",
            fila: Number(item.filaExcel) || null,
            cargado: hoyCarga,
            datos: (item.datosOriginales as Record<string, unknown>) || {},
          },
        };

        const claveP = `${strLimpio(pacNumTxt)}|${strLimpio(fServ)}|${strLimpio(cupsTxt)}|${Math.round(vServ)}|${normClaveTxt(descTxt)}`;
        const idPendExist = mapaPendNatural.get(claveP);
        if (idPendExist) {
          await db.from("cf_pendientes_facturar").update(valoresPend).eq("id", idPendExist);
          actualizados++;
        } else {
          const insP = await db.from("cf_pendientes_facturar").insert(valoresPend).select("id").maybeSingle();
          if (insP.data?.id) {
            mapaPendNatural.set(claveP, String(insP.data.id));
            creados++;
          }
        }
        pendientesProcesados++;
      }

      const totalProcesados = glosasProcesadas + pendientesProcesados + anuladasProcesadas;
      try {
        await db.from("cf_cargas").insert({
          archivo: archivoNombre,
          filas_leidas: totalProcesados,
          filas_cargadas: creados + actualizados,
          concilia: true,
          detalle: {
            creados,
            actualizados,
            glosasProcesadas,
            pendientesProcesados,
            anuladasProcesadas,
            usuario: unombre,
          },
          ejecutada_por: uid,
        });
      } catch {
        // Si cf_cargas no está activa en algún entorno, no bloquea el guardado principal.
      }

      return NextResponse.json({
        ok: true,
        importadas: creados + actualizados,
        resumen: {
          creados,
          actualizados,
          glosasProcesadas,
          pendientesProcesados,
          anuladasProcesadas,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Entidad desconocida: " + entidad }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error guardando" },
      { status: 500 }
    );
  }
}
