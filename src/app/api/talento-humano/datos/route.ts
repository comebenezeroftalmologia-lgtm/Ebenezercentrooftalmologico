import { NextResponse } from "next/server";
import { getCurrentAppUser, getMisModulos } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { tablaPorSlug, type Campo } from "@/lib/talentoHumanoTablas";

/* ---------------------------------------------------------------------
   DATOS DE TALENTO HUMANO: LEER Y ESCRIBIR
   Escrito el 08-11-2026.

   Aqui pasan nombres, cedulas, salarios, diagnosticos y contactos de
   emergencia. Las tablas tienen la seguridad de Supabase prendida y
   NIEGAN el acceso directo, asi que este es el unico camino, y lo
   primero que hace es preguntar si quien llama tiene el modulo
   "talento_humano" -- que se asigna persona por persona.

   DOS CANDADOS MAS, por si el primero fallara:
     1. Solo se tocan las tablas descritas en talentoHumanoTablas.ts.
        Un slug que no este ahi no existe para esta ruta.
     2. Solo se escriben las columnas descritas ahi. Lo que llegue de
        mas se ignora en silencio -- no se guarda ni rompe nada.

   Es a proposito que no haya un "update generico por id y columna":
   eso permitiria escribir en cualquier campo desde el navegador.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

async function conPermiso() {
  const me = await getCurrentAppUser();
  if (!me || !me.activo) return null;
  if (me.isAdmin) return me;
  const modulos = await getMisModulos(me.id, false);
  return modulos.has("talento_humano") ? me : null;
}

/** Convierte lo que llega del formulario al tipo que espera la columna.
 *  Si viene vacio se guarda null, no cadena vacia: una fecha vacia no es
 *  "", es que no se sabe. */
function valor(campo: Campo, bruto: unknown): unknown {
  if (bruto === undefined || bruto === null || bruto === "") return null;
  switch (campo.tipo) {
    case "numero":
    case "dinero":
    case "area": {
      const n = Number(String(bruto).replace(/[^\d-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "siNo":
      return bruto === true || bruto === "true" || bruto === "si" || bruto === "Si";
    default:
      return String(bruto).trim() || null;
  }
}

function limpiar(slug: string, cuerpo: Record<string, unknown>) {
  const t = tablaPorSlug(slug);
  if (!t) return null;
  const fila: Record<string, unknown> = {};
  for (const c of t.campos) {
    if (c.col in cuerpo) fila[c.col] = valor(c, cuerpo[c.col]);
  }
  return { tabla: t, fila };
}

function faltantes(slug: string, fila: Record<string, unknown>): string[] {
  const t = tablaPorSlug(slug);
  if (!t) return [];
  return t.campos
    .filter((c) => c.obligatorio && (fila[c.col] === null || fila[c.col] === undefined))
    .map((c) => c.etiqueta);
}

export async function GET(req: Request) {
  const me = await conPermiso();
  if (!me) return NextResponse.json({ ok: false, error: "sin-permiso" }, { status: 401 });

  const slug = new URL(req.url).searchParams.get("tabla") ?? "";
  const t = tablaPorSlug(slug);
  if (!t) return NextResponse.json({ ok: false, error: "tabla-desconocida" }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin
    .from(t.tabla)
    .select("*")
    .order(t.orden.col, { ascending: t.orden.asc, nullsFirst: false })
    .limit(2000);

  if (error) {
    // No se devuelve una lista vacia cuando la consulta fallo: una
    // pantalla en blanco se lee como "no hay nada", que es mentira.
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Las areas se mandan siempre: el formulario de empleados las necesita
  // para el desplegable.
  const { data: areas } = await admin.from("th_areas").select("id, nombre").order("nombre");

  return NextResponse.json({ ok: true, filas: data ?? [], areas: areas ?? [] });
}

export async function POST(req: Request) {
  const me = await conPermiso();
  if (!me) return NextResponse.json({ ok: false, error: "sin-permiso" }, { status: 401 });

  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const slug = String(cuerpo.tabla ?? "");
  const limpio = limpiar(slug, cuerpo);
  if (!limpio) return NextResponse.json({ ok: false, error: "tabla-desconocida" }, { status: 400 });

  const faltan = faltantes(slug, limpio.fila);
  if (faltan.length) {
    return NextResponse.json(
      { ok: false, error: `Falta por llenar: ${faltan.join(", ")}.` },
      { status: 400 },
    );
  }

  const admin = createServiceClient();
  const fila = { ...limpio.fila, actualizado_por: me.id };
  const { data, error } = await admin.from(limpio.tabla.tabla).insert(fila).select().single();

  if (error) {
    const dup = /duplicate key|unique constraint/i.test(error.message);
    return NextResponse.json(
      { ok: false, error: dup ? "Ya existe un registro con ese documento." : error.message },
      { status: 400 },
    );
  }

  // Un retiro apaga al empleado. Antes esto se hacia a mano en el Excel
  // y se olvidaba: quedaba gente retirada contando como planta activa.
  if (slug === "retiros" && fila.num_documento) {
    await admin.from("th_empleados").update({ activo: false }).eq("num_documento", fila.num_documento);
  }

  return NextResponse.json({ ok: true, fila: data });
}

export async function PATCH(req: Request) {
  const me = await conPermiso();
  if (!me) return NextResponse.json({ ok: false, error: "sin-permiso" }, { status: 401 });

  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const slug = String(cuerpo.tabla ?? "");
  const id = Number(cuerpo.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "falta-id" }, { status: 400 });

  const limpio = limpiar(slug, cuerpo);
  if (!limpio) return NextResponse.json({ ok: false, error: "tabla-desconocida" }, { status: 400 });

  const faltan = faltantes(slug, limpio.fila);
  if (faltan.length) {
    return NextResponse.json({ ok: false, error: `Falta por llenar: ${faltan.join(", ")}.` }, { status: 400 });
  }

  const admin = createServiceClient();
  const fila: Record<string, unknown> = { ...limpio.fila, actualizado_por: me.id };
  if (slug === "empleados") fila.actualizado_at = new Date().toISOString();

  const { data, error } = await admin
    .from(limpio.tabla.tabla)
    .update(fila)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, fila: data });
}

export async function DELETE(req: Request) {
  const me = await conPermiso();
  if (!me) return NextResponse.json({ ok: false, error: "sin-permiso" }, { status: 401 });
  // Borrar es de administrador. Quien diligencia puede corregir, no
  // hacer desaparecer: un registro borrado por error no deja rastro.
  if (!me.isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Solo un administrador puede borrar. Corrija el registro o pida que lo borren." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("tabla") ?? "";
  const id = Number(url.searchParams.get("id"));
  const t = tablaPorSlug(slug);
  if (!t || !Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "peticion-incompleta" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin.from(t.tabla).delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
