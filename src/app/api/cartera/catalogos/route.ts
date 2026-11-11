import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth";

/* ---------------------------------------------------------------------
   CATALOGOS DE CARTERA — facturadores y empresas

   Hasta hoy estas dos tablas no tenian pantalla: se podia agregar un
   facturador escribiendolo en una glosa, pero no corregirlo ni quitarlo.
   Asi fue como en los datos quedaron "ERIKA" y "ERIKA ALZATE" como dos
   personas distintas, partiendo las metricas por facturador.

   TRES REGLAS QUE EXPLICAN EL DISENO

   1. RENOMBRAR ES SEGURO Y ARREGLA EL HISTORICO.
      Las glosas y facturas apuntan al id, no al texto. Corregir el nombre
      arregla de una todas las filas de esa persona, sin tocarlas.

   2. NO SE BORRA LO QUE ESTA EN USO.
      La FK es 'on delete set null': borrar un facturador con glosas las
      dejaria sin responsable y se perderia quien las trabajo. Por eso
      eliminar solo procede cuando el conteo es cero; para alguien que ya
      no esta, lo correcto es desactivar, que lo saca de los desplegables
      y deja el historico intacto.

   3. FUSIONAR MUEVE, NO BORRA DATOS.
      Primero reapunta todas las referencias al que se queda y solo
      entonces elimina el duplicado, que para ese momento ya no tiene
      nada colgando.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

type Tabla = "cf_empresas" | "cf_responsables";

/** Donde esta referenciada cada tabla. Es lo que permite contar el uso. */
const REFERENCIAS: Record<Tabla, { tabla: string; col: string }[]> = {
  cf_empresas: [
    { tabla: "cf_facturas", col: "empresa_id" },
    { tabla: "cf_pendientes_facturar", col: "empresa_id" },
  ],
  cf_responsables: [
    { tabla: "cf_glosas", col: "facturador_id" },
    { tabla: "cf_glosas", col: "responsable_aceptacion_id" },
    { tabla: "cf_facturas", col: "responsable_id" },
    { tabla: "cf_pendientes_facturar", col: "responsable_id" },
  ],
};

const esTabla = (x: unknown): x is Tabla =>
  x === "cf_empresas" || x === "cf_responsables";

const limpiarUtf8 = (s: string): string => {
  if (!s || (!s.includes("Ã") && !s.includes("Â") && !s.includes("ã"))) return s;
  try {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code > 255) throw new Error("non-latin1");
      bytes[i] = code;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s
      .replace(/Ã‘/g, "Ñ").replace(/Ã±/g, "ñ")
      .replace(/Ã\u0081/g, "Á").replace(/Ã¡/g, "á")
      .replace(/Ã‰/g, "É").replace(/Ã©/g, "é")
      .replace(/Ã\u008d/g, "Í").replace(/Ã­/g, "í")
      .replace(/Ã“/g, "Ó").replace(/Ã³/g, "ó")
      .replace(/Ãš/g, "Ú").replace(/Ãº/g, "ú")
      .replace(/Ãœ/g, "Ü").replace(/Ã¼/g, "ü");
  }
};

async function contarUso(
  db: ReturnType<typeof createServiceClient>,
  tabla: Tabla,
  id: string
): Promise<number> {
  let total = 0;
  for (const r of REFERENCIAS[tabla]) {
    const { count } = await db
      .from(r.tabla)
      .select("id", { count: "exact", head: true })
      .eq(r.col, id);
    total += count ?? 0;
  }
  return total;
}

// ---------------------------------------------------------------------------
// GET — los dos catalogos con cuantas filas cuelgan de cada uno
// ---------------------------------------------------------------------------

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const db = createServiceClient();

  const salida: Record<string, unknown[]> = {};
  for (const tabla of ["cf_empresas", "cf_responsables"] as Tabla[]) {
    const { data, error } = await db
      .from(tabla)
      .select("id, nombre, activo")
      .order("nombre");
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    const filas = [];
    for (const f of data || []) {
      filas.push({
        id: f.id as string,
        nombre: limpiarUtf8(String(f.nombre ?? "")),
        activo: f.activo as boolean,
        usos: await contarUso(db, tabla, f.id as string),
      });
    }
    salida[tabla === "cf_empresas" ? "empresas" : "responsables"] = filas;
  }

  return NextResponse.json({ ok: true, ...salida });
}

// ---------------------------------------------------------------------------
// POST — crear, renombrar, activar/desactivar, eliminar y fusionar
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { tabla?: string; accion?: string; id?: string; nombre?: string; haciaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo invalido" }, { status: 400 });
  }

  const { tabla, accion, id, nombre, haciaId } = body;
  if (!esTabla(tabla) || !accion) {
    return NextResponse.json({ ok: false, error: "Faltan tabla o accion" }, { status: 400 });
  }

  // Eliminar y fusionar cambian el historico de forma que no se deshace con
  // un clic. Esas dos quedan para administradores.
  if ((accion === "ELIMINAR" || accion === "FUSIONAR") && !user.isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Solo un administrador puede eliminar o fusionar" },
      { status: 403 }
    );
  }

  const db = createServiceClient();
  const etiqueta = tabla === "cf_empresas" ? "empresa" : "facturador";

  try {
    if (accion === "CREAR") {
      const n = (nombre || "").trim();
      if (!n) return NextResponse.json({ ok: false, error: "Falta el nombre" }, { status: 400 });
      const { data: ya } = await db.from(tabla).select("id").ilike("nombre", n).maybeSingle();
      if (ya) {
        return NextResponse.json({ ok: false, error: `Ya existe un ${etiqueta} con ese nombre` }, { status: 409 });
      }
      const { error } = await db.from(tabla).insert({ nombre: n });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mensaje: `${etiqueta} creado.` });
    }

    if (!id) return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });

    if (accion === "RENOMBRAR") {
      const n = (nombre || "").trim();
      if (!n) return NextResponse.json({ ok: false, error: "Falta el nombre" }, { status: 400 });
      const { data: ya } = await db.from(tabla).select("id").ilike("nombre", n).maybeSingle();
      if (ya && ya.id !== id) {
        return NextResponse.json(
          { ok: false, error: `Ya existe otro ${etiqueta} con ese nombre. Úsalo para fusionar.` },
          { status: 409 }
        );
      }
      const { error } = await db.from(tabla).update({ nombre: n }).eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mensaje: "Nombre corregido en todo el histórico." });
    }

    if (accion === "ACTIVAR" || accion === "DESACTIVAR") {
      const { error } = await db.from(tabla).update({ activo: accion === "ACTIVAR" }).eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({
        ok: true,
        mensaje: accion === "ACTIVAR" ? "Vuelve a estar disponible." : "Sale de los desplegables; el histórico no se toca.",
      });
    }

    if (accion === "ELIMINAR") {
      const usos = await contarUso(db, tabla, id);
      if (usos > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `No se puede eliminar: tiene ${usos} registros asociados. Desactívalo, o fusiónalo con otro.`,
          },
          { status: 409 }
        );
      }
      const { error } = await db.from(tabla).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mensaje: `${etiqueta} eliminado.` });
    }

    if (accion === "FUSIONAR") {
      if (!haciaId || haciaId === id) {
        return NextResponse.json({ ok: false, error: "Falta hacia cuál fusionar" }, { status: 400 });
      }
      // Primero se mueven TODAS las referencias. Solo cuando no queda nada
      // colgando se borra el duplicado; si algo fallara en el camino, el
      // duplicado sigue ahi y no se pierde ninguna fila.
      let movidas = 0;
      for (const r of REFERENCIAS[tabla]) {
        const { data, error } = await db
          .from(r.tabla)
          .update({ [r.col]: haciaId })
          .eq(r.col, id)
          .select("id");
        if (error) throw new Error(error.message);
        movidas += (data || []).length;
      }
      const quedan = await contarUso(db, tabla, id);
      if (quedan > 0) {
        return NextResponse.json(
          { ok: false, error: `Quedaron ${quedan} referencias sin mover. No se eliminó nada.` },
          { status: 500 }
        );
      }
      const { error } = await db.from(tabla).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mensaje: `${movidas} registros quedaron a nombre del que se conserva.` });
    }

    return NextResponse.json({ ok: false, error: "Acción desconocida: " + accion }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
