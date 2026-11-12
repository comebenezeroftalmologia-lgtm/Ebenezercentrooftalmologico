import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth";

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
  const n = txt(nombre)?.trim();
  if (!n) return null;
  const { data } = await db.from(tabla).select("id").ilike("nombre", n).maybeSingle();
  if (data?.id) return data.id as string;
  const ins = await db.from(tabla).insert({ nombre: n }).select("id").maybeSingle();
  return (ins.data?.id as string) ?? null;
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
      "id, tipo, alcance, motivo_codigo, motivo_texto, observacion, valor_glosado, valor_aceptado, estado, fecha_glosa, nota_credito, " +
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

  const filaFactura = (r: Fila, i: number) => ({
    id: String(r.id),
    numero: i + 1,
    empresa: emp(r),
    empresaOriginal: strLimpio(r.empresa_nombre_original) || emp(r),
    fechaFactura: (r.fecha_elaboracion as string) || "",
    periodo: strLimpio(r.periodo),
    anio: r.anio ? String(r.anio) : "",
    factura: strLimpio(r.numero),
    fechaRadicacion: (r.fecha_radicacion as string) || "",
    valorRadicado: Number(r.valor_radicado) || 0,
    copagos: Number(r.copagos) || 0,
    valorGlosaDevolucion: Number(r.valor_glosa_devolucion) || 0,
    tipo: "GLOSA",
    motivo: strLimpio(r.motivo_anulacion_texto),
    facturaReemplaza: r.reemplaza_a_id ? "SI" : "",
    fechaAnulacion: (r.fecha_anulacion as string) || "",
    fechaRadicacionReemplazo: "",
    rips: strLimpio(r.rips),
    revisionFinanciera: strLimpio(r.revision_financiera),
    preagrupado: "",
    responsable: strLimpio((r.cf_responsables as Fila | null)?.nombre) || "SIN ASIGNAR",
    estadoGestion: strLimpio(r.estado) || "RADICADA",
  });

  const todas = (facturas.data || []) as unknown as Fila[];
  const todasFacturasBase = todas.map(filaFactura);
  const anuladas = todas
    .filter((r) => ["ANULADA", "REEMPLAZADA", "PENDIENTE_REEMPLAZO"].includes(String(r.estado)))
    .map(filaFactura);
  const legalizadas = todas
    .filter((r) => String(r.estado) === "LEGALIZADA")
    .map(filaFactura);

  const filasGlosa = ((glosas.data || []) as unknown as Fila[]).map((r) => {
    const f = (r.cf_facturas as Fila | null) || {};
    return {
      id: String(r.id),
      subtabla: String(r.estado),
      empresa:
        strLimpio((f.cf_empresas as Fila | null)?.nombre) ||
        strLimpio(f.empresa_nombre_original) ||
        "",
      empresaOriginal: strLimpio(f.empresa_nombre_original),
      fechaFactura: (f.fecha_elaboracion as string) || "",
      periodo: strLimpio(f.periodo),
      anio: f.anio ? String(f.anio) : "",
      factura: strLimpio(f.numero),
      fechaRadicacion: (f.fecha_radicacion as string) || "",
      fechaNotificacionGlosa: (r.fecha_glosa as string) || "",
      valorRadicado: Number(f.valor_radicado) || 0,
      valorFactura: Number(f.valor_radicado) || 0,
      valorFacturado: Number(f.valor_radicado) || 0,
      valorGlosado: Number(r.valor_glosado) || 0,
      // null se conserva como null a propósito: "sin resolver" no es "cero
      // aceptado". Si se volviera 0 la pantalla mostraría "no aceptada" en
      // glosas que nadie ha mirado.
      valorAceptado:
        r.valor_aceptado === null || r.valor_aceptado === undefined
          ? null
          : Number(r.valor_aceptado),
      motivoCodigo: strLimpio(r.motivo_codigo),
      motivoGlosa: strLimpio(r.motivo_texto),
      facturador: strLimpio((r.facturador as Fila | null)?.nombre),
      responsableAceptacion: strLimpio((r.aceptacion as Fila | null)?.nombre),
      responsableRespuesta: strLimpio((r.aceptacion as Fila | null)?.nombre),
      observacionInterna: strLimpio(r.observacion),
      notaCredito: strLimpio(r.nota_credito),
      tipoGlosa: strLimpio(r.tipo) || "GLOSA",
      alcance: strLimpio(r.alcance),
      estado: strLimpio(r.estado) || "PENDIENTE",
    };
  });

  const filasPendiente = ((pendientes.data || []) as unknown as Fila[]).map((r) => ({
    id: String(r.id),
    empresa: emp(r),
    empresaOriginal: strLimpio(r.empresa_nombre_original) || emp(r),
    contrato: strLimpio(r.contrato),
    unidadFuncional: strLimpio(r.unidad_funcional),
    cups: strLimpio(r.cups),
    descripcion: strLimpio(r.descripcion),
    fechaServicio: (r.fecha_servicio as string) || "",
    anio: r.anio ? String(r.anio) : "",
    medico: strLimpio(r.medico),
    valorServicio: Number(r.valor_servicio) || 0,
    responsable: strLimpio((r.cf_responsables as Fila | null)?.nombre),
    observaciones: strLimpio(r.observaciones),
    estado: strLimpio(r.estado) || "PENDIENTE",
  }));

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
    empresas: unicos((empresasCat.data || []).map((x) => x.nombre as string)),
    responsables: unicos((responsablesCat.data || []).map((x) => x.nombre as string)),
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

  let body: { entidad?: string; accion?: string; fila?: Fila; filas?: Fila[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const { entidad, accion = "EDITAR" } = body;
  const fila: Fila = (body.fila && !Array.isArray(body.fila) ? body.fila : {}) as Fila;
  if (!entidad || (!body.fila && !Array.isArray(body.filas))) {
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
      const { data: empresa } = await db
        .from("cf_empresas").select("id").eq("nombre", txt(fila.empresa) ?? "").maybeSingle();
      const { data: resp } = await db
        .from("cf_responsables").select("id").eq("nombre", txt(fila.responsable) ?? "").maybeSingle();

      const valores = {
        empresa_id: empresa?.id ?? null,
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
        responsable_id: resp?.id ?? null,
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
      const codigo = codigoRaw ? codigoRaw.trim().toUpperCase() : null;
      if (!texto || !codigo) {
        return NextResponse.json(
          { ok: false, error: "Falta el texto del motivo o el código" },
          { status: 400 }
        );
      }
      await asegurarCausalNormativa(db, codigo);
      const { data: afectadas, error } = await db
        .from("cf_glosas")
        .update({ motivo_codigo: codigo })
        .eq("motivo_texto", texto)
        .is("motivo_codigo", null)
        .select("id");
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
      const codCausal = txt(fila.motivoCodigo)?.trim().toUpperCase() || null;
      await asegurarCausalNormativa(db, codCausal);

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
      };

      const existente = esNuevo
        ? null
        : (await db.from("cf_glosas").select("id, estado").eq("id", String(fila.id)).maybeSingle()).data;

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
      const { data: empresa } = await db
        .from("cf_empresas").select("id").eq("nombre", txt(fila.empresa) ?? "").maybeSingle();
      const { data: resp } = await db
        .from("cf_responsables").select("id").eq("nombre", txt(fila.responsable) ?? "").maybeSingle();

      const estado = String(fila.estado || "PENDIENTE").toUpperCase();
      const valores = {
        empresa_id: empresa?.id ?? null,
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
        responsable_id: resp?.id ?? null,
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

      // Validación estricta previa: Nota Crédito obligatoria (con número o N/A) sin inventar valores
      for (let i = 0; i < listaFilas.length; i++) {
        const item = listaFilas[i];
        const numFact = String(item.factura || "").trim().toUpperCase().replace(/\s+/g, "");
        if (!numFact) continue;
        if (!esNotaCreditoValida(item.notaCredito)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Fila ${i + 1} (${numFact}): la Nota Crédito es obligatoria. Ingresa el número consecutivo o N/A.`,
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
        const nc =
          rawNc.toUpperCase() === "NA" || rawNc.toUpperCase() === "NO APLICA" ? "N/A" : rawNc;
        const codCausal = txt(item.motivoCodigo)?.trim().toUpperCase() || null;
        await asegurarCausalNormativa(db, codCausal);

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

    return NextResponse.json({ ok: false, error: "Entidad desconocida: " + entidad }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error guardando" },
      { status: 500 }
    );
  }
}
