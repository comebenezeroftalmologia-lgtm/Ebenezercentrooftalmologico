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

const txt = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fecha = (v: unknown) => {
  const s = txt(v);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

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
  accion: "CREAR" | "EDITAR" | "CAMBIO_ESTADO" | "CLASIFICAR",
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
      "cf_facturas(numero, anio, fecha_elaboracion, fecha_radicacion, valor_radicado, " +
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
    ((r.cf_empresas as Fila | null)?.nombre as string) ||
    (r.empresa_nombre_original as string) ||
    "";

  const filaFactura = (r: Fila, i: number) => ({
    id: String(r.id),
    numero: i + 1,
    empresa: emp(r),
    empresaOriginal: (r.empresa_nombre_original as string) || emp(r),
    fechaFactura: (r.fecha_elaboracion as string) || "",
    periodo: (r.periodo as string) || "",
    anio: r.anio ? String(r.anio) : "",
    factura: r.numero as string,
    fechaRadicacion: (r.fecha_radicacion as string) || "",
    valorRadicado: Number(r.valor_radicado) || 0,
    copagos: Number(r.copagos) || 0,
    valorGlosaDevolucion: Number(r.valor_glosa_devolucion) || 0,
    tipo: "GLOSA",
    motivo: (r.motivo_anulacion_texto as string) || "",
    facturaReemplaza: r.reemplaza_a_id ? "SI" : "",
    fechaAnulacion: (r.fecha_anulacion as string) || "",
    fechaRadicacionReemplazo: "",
    rips: (r.rips as string) || "",
    revisionFinanciera: (r.revision_financiera as string) || "",
    preagrupado: "",
    responsable: ((r.cf_responsables as Fila | null)?.nombre as string) || "SIN ASIGNAR",
    estadoGestion: (r.estado as string) || "RADICADA",
  });

  const todas = (facturas.data || []) as unknown as Fila[];
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
        ((f.cf_empresas as Fila | null)?.nombre as string) ||
        (f.empresa_nombre_original as string) ||
        "",
      empresaOriginal: (f.empresa_nombre_original as string) || "",
      fechaFactura: (f.fecha_elaboracion as string) || "",
      periodo: "",
      anio: f.anio ? String(f.anio) : "",
      factura: (f.numero as string) || "",
      fechaRadicacion: (r.fecha_glosa as string) || (f.fecha_radicacion as string) || "",
      valorRadicado: Number(f.valor_radicado) || 0,
      valorFactura: Number(f.valor_radicado) || 0,
      valorGlosado: Number(r.valor_glosado) || 0,
      // null se conserva como null a proposito: "sin resolver" no es "cero
      // aceptado". Si se volviera 0 la pantalla mostraria "no aceptada" en
      // glosas que nadie ha mirado.
      valorAceptado:
        r.valor_aceptado === null || r.valor_aceptado === undefined
          ? null
          : Number(r.valor_aceptado),
      // La causal de la norma y el texto que escribio Facturacion son dos
      // cosas distintas y las dos se conservan: el codigo para medir, el
      // texto porque es el que cuenta que paso de verdad.
      motivoCodigo: (r.motivo_codigo as string) || "",
      motivoGlosa: (r.motivo_texto as string) || "",
      facturador: ((r.facturador as Fila | null)?.nombre as string) || "",
      responsableAceptacion: ((r.aceptacion as Fila | null)?.nombre as string) || "",
      observacionInterna: (r.observacion as string) || "",
      notaCredito: (r.nota_credito as string) || "",
      tipoGlosa: (r.tipo as string) || "GLOSA",
      // null = todavia sin definir. No se rellena con un valor por defecto:
      // la pantalla lo muestra en blanco para que se note.
      alcance: (r.alcance as string) || "",
      estado: (r.estado as string) || "PENDIENTE",
    };
  });

  const filasPendiente = ((pendientes.data || []) as unknown as Fila[]).map((r) => ({
    id: String(r.id),
    empresa: emp(r),
    empresaOriginal: (r.empresa_nombre_original as string) || emp(r),
    contrato: (r.contrato as string) || "",
    unidadFuncional: (r.unidad_funcional as string) || "",
    cups: (r.cups as string) || "",
    descripcion: (r.descripcion as string) || "",
    fechaServicio: (r.fecha_servicio as string) || "",
    anio: r.anio ? String(r.anio) : "",
    medico: (r.medico as string) || "",
    valorServicio: Number(r.valor_servicio) || 0,
    responsable: ((r.cf_responsables as Fila | null)?.nombre as string) || "",
    observaciones: (r.observaciones as string) || "",
    estado: (r.estado as string) || "PENDIENTE",
  }));

  // Catalogos para los desplegables de la mesa. Los motivos no salen de
  // cf_motivos (que exige codigo y categoria) sino de lo que Facturacion ya
  // escribio: asi la lista refleja el trabajo real y no hay catalogo que
  // alguien tenga que mantener aparte. Lo que se escriba nuevo aparece en la
  // lista la proxima vez, solo.
  const unicos = (xs: (string | undefined)[]) =>
    Array.from(new Set(xs.filter((x): x is string => !!x && x.trim() !== "").map((x) => x.trim())))
      .sort((a, b) => a.localeCompare(b, "es"));

  // Empresas y facturadores salen del catalogo (solo los activos), no de lo
  // que haya escrito en las glosas: asi uno recien creado aparece de una, y
  // uno desactivado deja de ofrecerse sin que su historico se toque.
  const catalogos = {
    empresas: unicos((empresasCat.data || []).map((x) => x.nombre as string)),
    responsables: unicos((responsablesCat.data || []).map((x) => x.nombre as string)),
    motivos: unicos(filasGlosa.map((g) => g.motivoGlosa)),
    causales: (causales.data || []) as { codigo: string; familia: string; nombre: string }[],
    anios: unicos(filasGlosa.map((g) => g.anio)),
  };

  return NextResponse.json({
    ok: true,
    origen: "base de datos",
    catalogos,
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

  let body: { entidad?: string; accion?: string; fila?: Fila };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo invalido" }, { status: 400 });
  }

  const { entidad, accion = "EDITAR", fila } = body;
  if (!entidad || !fila) {
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
      const codigo = txt(fila.motivoCodigo);
      if (!texto || !codigo) {
        return NextResponse.json(
          { ok: false, error: "Falta el texto del motivo o el codigo" },
          { status: 400 }
        );
      }
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
        return NextResponse.json({ ok: false, error: "Falta el numero de factura" }, { status: 400 });
      }
      const empresaId = await idCatalogo(db, "cf_empresas", fila.empresa);
      const facturaId = await idFactura(db, numero, {
        empresa_id: empresaId,
        empresa_nombre_original: txt(fila.empresaOriginal) ?? txt(fila.empresa),
        valor_radicado: num(fila.valorRadicado),
        fecha_elaboracion: fecha(fila.fechaFactura),
        fecha_radicacion: fecha(fila.fechaRadicacion),
      });
      if (!facturaId) throw new Error("No se pudo resolver la factura de la glosa");

      const factId = await idCatalogo(db, "cf_responsables", fila.facturador);
      const acepId = await idCatalogo(db, "cf_responsables", fila.responsableAceptacion);

      const estado = String(fila.estado || fila.subtabla || "PENDIENTE").toUpperCase();
      const valores = {
        factura_id: facturaId,
        tipo: String(fila.tipoGlosa || "GLOSA").toUpperCase().startsWith("DEVOL") ? "DEVOLUCION" : "GLOSA",
        alcance: ["PARCIAL", "TOTAL"].includes(String(fila.alcance || "").toUpperCase())
          ? String(fila.alcance).toUpperCase()
          : null,
        motivo_codigo: txt(fila.motivoCodigo),
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
        fecha_glosa: fecha(fila.fechaRadicacion),
        nota_credito: txt(fila.notaCredito),
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

    return NextResponse.json({ ok: false, error: "Entidad desconocida: " + entidad }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error guardando" },
      { status: 500 }
    );
  }
}
