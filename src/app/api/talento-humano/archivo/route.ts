import { NextResponse } from "next/server";
import { getCurrentAppUser, getMisModulos } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { BUCKET_TH, RUTA_TH, TIPOS_EXCEL, MAX_BYTES } from "@/lib/talentoHumano";

/* ---------------------------------------------------------------------
   EL ARCHIVO DE TRABAJO: ENTREGARLO Y REEMPLAZARLO.

   GET  · lo descarga quien tenga el modulo 'talento_humano'.
   POST · lo reemplaza SOLO un administrador.

   Las dos cosas pasan por aqui a proposito. El bucket es privado: sin
   sesion y sin permiso, Supabase no lo entrega, y no hay ninguna URL
   publica del archivo dando vueltas.

   /api/** queda fuera del middleware, asi que la sesion se valida aqui,
   igual que en /api/avatar.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

/** Devuelve el usuario si tiene el modulo; si no, null. */
async function conPermiso() {
  const me = await getCurrentAppUser();
  if (!me || !me.activo) return null;
  if (me.isAdmin) return me;
  const modulos = await getMisModulos(me.id, false);
  return modulos.has("talento_humano") ? me : null;
}

export async function GET() {
  const me = await conPermiso();
  if (!me) return new NextResponse(null, { status: 401 });

  const admin = createServiceClient();
  const { data, error } = await admin.storage.from(BUCKET_TH).download(RUTA_TH);

  if (error || !data) {
    // 404 y no un archivo vacio: el tablero distingue "todavia no han
    // subido la base" de "la base esta pero no tiene datos". Son dos
    // problemas distintos y se arreglan distinto.
    return NextResponse.json({ error: "sin-archivo" }, { status: 404 });
  }

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // Nunca en cache: lleva datos de personal detras de un permiso.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(req: Request) {
  const me = await getCurrentAppUser();
  if (!me || !me.activo) return NextResponse.json({ error: "sin-sesion" }, { status: 401 });
  // Reemplazar la base la cambia para TODOS. Solo administradores.
  if (!me.isAdmin) return NextResponse.json({ error: "solo-administradores" }, { status: 403 });

  const form = await req.formData();
  const crudo = form.get("archivo");
  // Se comprueba por lo que SABE HACER, no con `instanceof File`: File solo
  // es global desde Node 20, y una ruta que depende de la version de Node
  // funciona en un sitio y falla en otro sin decir por que.
  const esArchivo =
    typeof crudo === "object" &&
    crudo !== null &&
    typeof (crudo as Blob).arrayBuffer === "function" &&
    typeof (crudo as Blob).size === "number";
  if (!esArchivo) {
    return NextResponse.json({ error: "falta el archivo" }, { status: 400 });
  }
  const archivo = crudo as Blob & { name?: string };
  if (archivo.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `El archivo pesa más de ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }
  const nombre = archivo.name || "talento-humano.xlsx";
  const esExcel = TIPOS_EXCEL.includes(archivo.type) || /\.xlsx?$|\.xlsm$/i.test(nombre);
  if (!esExcel) {
    return NextResponse.json(
      { error: "Eso no parece un Excel. Debe ser .xlsx, .xlsm o .xls." },
      { status: 400 },
    );
  }

  const admin = createServiceClient();
  const bytes = await archivo.arrayBuffer();

  const { error: errSubida } = await admin.storage
    .from(BUCKET_TH)
    .upload(RUTA_TH, bytes, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true, // se reemplaza el vigente, no se acumulan copias
    });
  if (errSubida) {
    return NextResponse.json(
      { error: `No se pudo guardar: ${errSubida.message}` },
      { status: 500 },
    );
  }

  // El rastro se guarda DESPUES de que el archivo quedo arriba: si lo
  // anotaramos antes y la subida fallara, la tabla diria que hay una base
  // nueva que en realidad no existe.
  const { error: errFila } = await admin.from("talento_humano_archivo").upsert({
    id: true,
    ruta: RUTA_TH,
    nombre_original: nombre,
    bytes: archivo.size,
    subido_por: me.id,
    subido_at: new Date().toISOString(),
  });
  if (errFila) {
    return NextResponse.json(
      {
        error:
          "El archivo se guardó pero no se pudo anotar quién lo subió: " +
          errFila.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, nombre, bytes: archivo.size });
}
