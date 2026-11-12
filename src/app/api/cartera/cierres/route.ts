import { NextResponse } from "next/server";
import { getCurrentAppUser, getMisModulos } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------------
   CIERRES MENSUALES DE CARTERA

   GET  · entrega lo guardado. Instantaneo. Lo lee quien tenga el modulo.
   POST · recalcula un rango pidiendoselo a SISMA mes a mes. Solo admin,
          porque son 10-15 segundos por mes y reescribe la historia.

   El GET NUNCA inventa. Si un mes no esta calculado, no sale en la lista
   y la grafica lo dice. Un hueco visible es mejor que un punto inventado:
   eso fue justo lo que nos tuvo mostrando una curva que no existia.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";
export const maxDuration = 300; // el recalculo es lento por diseno

const TABLA = "cartera_cierres_mensuales";

async function conPermiso() {
  const me = await getCurrentAppUser();
  if (!me || !me.activo) return null;
  if (me.isAdmin) return me;
  const modulos = await getMisModulos(me.id, false);
  return modulos.has("frecuencias") ? me : null; // el modulo de Cartera
}

/** Ultimo dia del mes, o el dia anterior cerrado si el mes es el actual. */
function fechaCorteDe(anio: number, mes: number): string {
  const hoy = new Date(Date.now() - 5 * 3600 * 1000); // Colombia
  const esActual = anio === hoy.getUTCFullYear() && mes === hoy.getUTCMonth() + 1;
  if (esActual) {
    const ayer = new Date(hoy.getTime());
    ayer.setUTCDate(ayer.getUTCDate() - 1);
    if (ayer.getUTCFullYear() === anio && ayer.getUTCMonth() + 1 === mes) {
      return ayer.toISOString().slice(0, 10);
    }
    return hoy.toISOString().slice(0, 10);
  }
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const me = await conPermiso();
  if (!me) return NextResponse.json({ ok: false, error: "sin-permiso" }, { status: 401 });

  const anio = new URL(req.url).searchParams.get("anio");
  const admin = createServiceClient();
  let q = admin.from(TABLA).select("*").order("anio").order("mes");
  if (anio) q = q.eq("anio", Number(anio));
  const { data, error } = await q;

  if (error) {
    // Si la tabla no existe todavia (migracion sin correr), se dice, no se
    // devuelve una lista vacia que parezca "no hay cartera".
    return NextResponse.json(
      { ok: false, error: error.message, sinTabla: /does not exist|schema cache/i.test(error.message) },
      { status: 500 },
    );
  }

  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return NextResponse.json({
    ok: true,
    cierres: (data ?? []).map((c) => ({
      anio: c.anio,
      mes: c.mes,
      etiqueta: MESES[c.mes - 1],
      fechaCorte: c.fecha_corte,
      carteraCorriente: Number(c.cartera_corriente),
      carteraVencida: Number(c.cartera_vencida),
      carteraTotal: Number(c.cartera_total),
      girosPorCruzar: Number(c.giros_por_cruzar),
      carteraReal: Number(c.cartera_real),
      filasFacturas: c.filas_facturas,
      esMesEnCurso: c.es_mes_en_curso,
      calculadoAt: c.calculado_at,
    })),
    anios: Array.from(new Set((data ?? []).map((c) => c.anio))).sort(),
  });
}

export async function POST(req: Request) {
  const me = await getCurrentAppUser();
  if (!me || !me.activo) return NextResponse.json({ ok: false, error: "sin-sesion" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ ok: false, error: "solo-administradores" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const desde = String(body.desde || "");  // "2026-01"
  const hasta = String(body.hasta || "");  // "2026-11"
  const m = /^(\d{4})-(\d{2})$/;
  if (!m.test(desde) || !m.test(hasta)) {
    return NextResponse.json({ ok: false, error: "Use desde y hasta como AAAA-MM." }, { status: 400 });
  }

  const [aD, mD] = desde.split("-").map(Number);
  const [aH, mH] = hasta.split("-").map(Number);
  const meses: { anio: number; mes: number }[] = [];
  for (let a = aD, me2 = mD; a < aH || (a === aH && me2 <= mH); ) {
    meses.push({ anio: a, mes: me2 });
    me2 += 1;
    if (me2 > 12) { me2 = 1; a += 1; }
  }
  if (meses.length === 0 || meses.length > 36) {
    return NextResponse.json({ ok: false, error: "El rango debe tener entre 1 y 36 meses." }, { status: 400 });
  }

  const base = new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";
  const admin = createServiceClient();
  const hoy = new Date(Date.now() - 5 * 3600 * 1000);

  const hechos: unknown[] = [];
  const fallos: { mes: string; motivo: string }[] = [];

  for (const { anio, mes } of meses) {
    const corte = fechaCorteDe(anio, mes);
    try {
      // Se reusa la ruta que YA existe y que ya sabe hablar con SISMA y
      // aplicar las reglas del tablero. No se reimplementa el calculo:
      // dos versiones de la misma cuenta terminan dando cifras distintas.
      const r = await fetch(`${base}/api/cartera/sisma?corte=${corte}`, {
        headers: { cookie },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok || !j.ok || !j.resumenCorte) {
        fallos.push({ mes: `${anio}-${String(mes).padStart(2, "0")}`, motivo: j.error || `HTTP ${r.status}` });
        continue;
      }
      // Si los giros por cruzar no llegaron, la Cartera Real de ese mes
      // es en realidad la Total. Guardarla seria dejar escrito para
      // siempre un cierre inflado, y despues nadie sabria distinguirlo
      // de uno bueno. Mejor que falte el mes a que mienta.
      if (j.girosIncompletos) {
        fallos.push({
          mes: `${anio}-${String(mes).padStart(2, "0")}`,
          motivo: `no llegaron los giros por cruzar (${j.girosMotivo ?? "sin detalle"}): no se guarda para no dejar un cierre inflado`,
        });
        continue;
      }
      const rc = j.resumenCorte;
      // Se toman las cifras TAL COMO las devuelve la ruta de SISMA, sin
      // recalcular ninguna. Si aqui volvieramos a restar giros por nuestra
      // cuenta, tendriamos dos versiones de la misma cuenta y algun dia
      // darian distinto: es exactamente el defecto de TOTAL SALARIO que
      // encontramos en el Excel de Talento Humano.
      const fila = {
        anio,
        mes,
        fecha_corte: corte,
        cartera_corriente: Math.round(Number(rc.carteraCorriente ?? 0)),
        cartera_vencida: Math.round(Number(rc.carteraVencida ?? 0)),
        cartera_total: Math.round(Number(rc.carteraTotal ?? 0)),
        giros_por_cruzar: Math.round(Number(rc.anticiposPorCruzar ?? 0)),
        cartera_real: Math.round(Number(rc.totalCarteraReal ?? 0)),
        filas_facturas: Number(j.filasFacturas ?? 0),
        es_mes_en_curso: anio === hoy.getUTCFullYear() && mes === hoy.getUTCMonth() + 1,
        calculado_at: new Date().toISOString(),
        calculado_por: me.id,
      };
      const { error } = await admin.from(TABLA).upsert(fila, { onConflict: "anio,mes" });
      if (error) fallos.push({ mes: `${anio}-${String(mes).padStart(2, "0")}`, motivo: error.message });
      else hechos.push({ mes: `${anio}-${String(mes).padStart(2, "0")}`, total: fila.cartera_total, real: fila.cartera_real });
    } catch (e) {
      fallos.push({ mes: `${anio}-${String(mes).padStart(2, "0")}`, motivo: e instanceof Error ? e.message : "error" });
    }
  }

  return NextResponse.json({ ok: fallos.length === 0, calculados: hechos.length, hechos, fallos });
}
