import { NextResponse } from "next/server";
import { getCurrentAppUser, getMisModulos } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------------
   DATOS POR REVISAR DE TALENTO HUMANO
   Escrito el 08-11-2026.

   POR QUE ESTO ES UNA CONSULTA Y NO UNA LISTA ESCRITA A MANO:

   El 08-11-2026 se paso la base de TH del Excel a la plataforma y
   quedaron datos sin resolver (fechas de ingreso vacias, cedulas con
   dedos cambiados, cursos sin fecha). Eso se dejo en un archivo en el
   computador del gerente. Nadie de TH lo veia, y peor: un archivo no
   sabe cuando ya lo arreglaron, asi que miente a los dos dias.

   Aqui no hay lista. Cada hallazgo se vuelve a calcular contra la base
   cada vez que alguien abre la pantalla. Si arreglan la fecha de
   ingreso, el hallazgo desaparece solo. Si manana meten un ausentismo
   con una cedula que no existe, aparece solo. Nadie tiene que acordarse
   de apagar nada.

   LO QUE NO SE PUEDE PONER AQUI: lo que la base no delata. Ejemplo: dos
   salarios donde el Excel traia un total que no cuadraba con sus propios
   sumandos. Ya no se puede saber cual de los dos numeros estaba mal
   porque el total no se guarda -- se calcula. Eso sigue siendo un aviso
   escrito a mano, aparte.

   Solo lee. No corrige nada: corregir es de quien sabe del tema.
   --------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

const HOY = new Date();
const HOY_ISO = HOY.toISOString().slice(0, 10);

type Detalle = { texto: string; buscar?: string };
type Hallazgo = {
  id: string;
  titulo: string;
  gravedad: "alta" | "media" | "baja";
  tabla: string;
  queHacer: string;
  detalles: Detalle[];
};

/** Nombres comparables: sin acentos, sin dobles espacios, en mayuscula. */
function norm(s: unknown): string {
  return String(s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Solo los digitos: asi "1.047.424.192" y "1047424192" son el mismo. */
function soloDigitos(s: unknown): string {
  return String(s ?? "").replace(/\D/g, "");
}

function dias(desde: unknown): number | null {
  if (!desde) return null;
  const d = new Date(String(desde).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - HOY.getTime()) / 86_400_000);
}

export async function GET() {
  const me = await getCurrentAppUser();
  if (!me || !me.activo) return NextResponse.json({ ok: false, error: "sin-permiso" }, { status: 401 });
  if (!me.isAdmin) {
    const modulos = await getMisModulos(me.id, false);
    if (!modulos.has("talento_humano")) {
      return NextResponse.json({ ok: false, error: "sin-permiso" }, { status: 401 });
    }
  }

  const admin = createServiceClient();

  const [emp, ret, aus, inc, cur, cap, acc] = await Promise.all([
    admin.from("th_empleados").select("nombre_completo, num_documento, fecha_ingreso, salario, area_id, activo"),
    admin.from("th_retiros").select("nombre_completo, num_documento, fecha_retiro"),
    admin.from("th_ausentismos").select("nombre_completo, num_documento, fecha_inicio, fecha_fin, numero_dias"),
    admin.from("th_incapacidades").select("nombre_completo, num_documento, estado, valor, fecha_pago"),
    admin.from("th_cursos").select("nombre_completo, num_documento, vence_bls, vence_violencia, vence_poliza"),
    admin.from("th_capacitaciones").select("nombre, fecha_programada, fecha_ejecutada, se_realizo"),
    admin.from("th_accidentes").select("anio, mes"),
  ]);

  // Si una consulta falla NO se devuelve "no hay nada por revisar": eso
  // seria exactamente la mentira que esta pantalla existe para evitar.
  const roto = [emp, ret, aus, inc, cur, cap, acc].find((r) => r.error);
  if (roto?.error) {
    return NextResponse.json({ ok: false, error: roto.error.message }, { status: 500 });
  }

  const empleados = emp.data ?? [];
  const retiros = ret.data ?? [];
  const ausentismos = aus.data ?? [];
  const incapacidades = inc.data ?? [];
  const cursos = cur.data ?? [];
  const capacitaciones = cap.data ?? [];
  const accidentes = acc.data ?? [];

  const hallazgos: Hallazgo[] = [];
  const agregar = (h: Hallazgo) => {
    if (h.detalles.length) hallazgos.push(h);
  };

  /* 1. Empleados activos sin fecha de ingreso -------------------------
     Sin esa fecha no hay antiguedad ni liquidacion. */
  agregar({
    id: "sin-fecha-ingreso",
    titulo: "Empleados activos sin fecha de ingreso",
    gravedad: "alta",
    tabla: "empleados",
    queHacer: "Sin esta fecha no se puede calcular antigüedad ni liquidación. Búsquela en el contrato.",
    detalles: empleados
      .filter((e) => e.activo !== false && !e.fecha_ingreso)
      .map((e) => ({
        texto: `${e.nombre_completo} · ${e.num_documento}`,
        buscar: String(e.num_documento ?? ""),
      })),
  });

  /* 2. Empleados activos sin salario o sin area ----------------------- */
  agregar({
    id: "sin-salario",
    titulo: "Empleados activos sin salario",
    gravedad: "alta",
    tabla: "empleados",
    queHacer: "La nómina mensual que ve el tablero no los está contando.",
    detalles: empleados
      .filter((e) => e.activo !== false && (e.salario == null || Number(e.salario) <= 0))
      .map((e) => ({ texto: `${e.nombre_completo} · ${e.num_documento}`, buscar: String(e.num_documento ?? "") })),
  });

  agregar({
    id: "sin-area",
    titulo: "Empleados activos sin área asignada",
    gravedad: "media",
    tabla: "empleados",
    queHacer: "No aparecen en ningún corte por área del tablero.",
    detalles: empleados
      .filter((e) => e.activo !== false && e.area_id == null)
      .map((e) => ({ texto: `${e.nombre_completo} · ${e.num_documento}`, buscar: String(e.num_documento ?? "") })),
  });

  /* 3. El mismo nombre con dos cedulas distintas ----------------------
     Esto es casi siempre dedos cambiados al digitar. Se mira en TODAS
     las tablas juntas, porque el error suele estar en el ausentismo o
     en el curso, no en la ficha del empleado. */
  const docsPorNombre = new Map<string, Map<string, Set<string>>>();
  const anotar = (nombre: unknown, doc: unknown, donde: string) => {
    const n = norm(nombre);
    const d = soloDigitos(doc);
    if (!n || !d) return;
    if (!docsPorNombre.has(n)) docsPorNombre.set(n, new Map());
    const m = docsPorNombre.get(n)!;
    if (!m.has(d)) m.set(d, new Set());
    m.get(d)!.add(donde);
  };
  empleados.forEach((r) => anotar(r.nombre_completo, r.num_documento, "empleados"));
  retiros.forEach((r) => anotar(r.nombre_completo, r.num_documento, "retiros"));
  ausentismos.forEach((r) => anotar(r.nombre_completo, r.num_documento, "ausentismos"));
  incapacidades.forEach((r) => anotar(r.nombre_completo, r.num_documento, "incapacidades"));
  cursos.forEach((r) => anotar(r.nombre_completo, r.num_documento, "cursos"));

  const choques: Detalle[] = [];
  for (const [nombre, m] of docsPorNombre) {
    if (m.size < 2) continue;
    const partes = [...m.entries()].map(([d, dondes]) => `${d} (${[...dondes].join(", ")})`);
    const ds = [...m.keys()];
    // Si se diferencian en un solo digito es casi seguro un error de dedo.
    const parecidas = ds.some((a) =>
      ds.some((b) => a !== b && a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1),
    );
    choques.push({
      texto: `${nombre} aparece con ${m.size} documentos: ${partes.join(" · ")}${
        parecidas ? "  ←  se diferencian en un dígito" : ""
      }`,
      buscar: nombre.split(" ")[0],
    });
  }
  agregar({
    id: "cedulas-que-no-cuadran",
    titulo: "Un mismo nombre con dos documentos distintos",
    gravedad: "alta",
    tabla: "empleados",
    queHacer: "Una de las dos cédulas está mal digitada. Corrija la equivocada en la tabla donde esté.",
    detalles: choques,
  });

  /* 4. Registros colgando de una cedula que no existe -----------------
     Ojo: que no este en la planta activa NO es error -- puede haberse
     retirado. Solo es error si tampoco esta en retiros: entonces esa
     persona no existe en ninguna parte de la base. */
  const conocidos = new Set<string>();
  empleados.forEach((e) => conocidos.add(soloDigitos(e.num_documento)));
  retiros.forEach((r) => conocidos.add(soloDigitos(r.num_documento)));

  const huerfanos: Detalle[] = [];
  const revisarHuerfanos = (filas: { nombre_completo?: unknown; num_documento?: unknown }[], donde: string) => {
    for (const f of filas) {
      const d = soloDigitos(f.num_documento);
      if (!d || conocidos.has(d)) continue;
      huerfanos.push({ texto: `${donde}: ${f.nombre_completo} · ${d}`, buscar: d });
    }
  };
  revisarHuerfanos(ausentismos, "Ausentismo");
  revisarHuerfanos(incapacidades, "Incapacidad");
  revisarHuerfanos(cursos, "Curso");
  agregar({
    id: "sin-persona",
    titulo: "Registros con una cédula que no está ni en la planta ni en retiros",
    gravedad: "alta",
    tabla: "retiros",
    queHacer:
      "Si la persona se retiró, registre el retiro y esto desaparece. Si la cédula está mal, corríjala en el registro.",
    detalles: huerfanos,
  });

  /* 5. Cursos: vencidos y por vencer ---------------------------------- */
  const CURSO: Record<string, string> = {
    vence_bls: "BLS",
    vence_violencia: "Violencia sexual",
    vence_poliza: "Póliza",
  };
  const vencidos: Detalle[] = [];
  const porVencer: Detalle[] = [];
  const sinFecha: Detalle[] = [];
  for (const c of cursos) {
    for (const col of Object.keys(CURSO)) {
      const v = (c as Record<string, unknown>)[col];
      const quien = `${c.nombre_completo} · ${CURSO[col]}`;
      const buscar = String(c.num_documento ?? "");
      if (!v) {
        sinFecha.push({ texto: quien, buscar });
        continue;
      }
      const d = dias(v);
      if (d === null) continue;
      if (d < 0) vencidos.push({ texto: `${quien} · venció hace ${-d} días`, buscar });
      else if (d <= 60) porVencer.push({ texto: `${quien} · faltan ${d} días`, buscar });
    }
  }
  agregar({
    id: "cursos-vencidos",
    titulo: "Cursos y pólizas ya vencidos",
    gravedad: "alta",
    tabla: "cursos",
    queHacer: "Renovar y actualizar la fecha de vencimiento.",
    detalles: vencidos,
  });
  agregar({
    id: "cursos-por-vencer",
    titulo: "Cursos y pólizas que vencen en menos de 60 días",
    gravedad: "media",
    tabla: "cursos",
    queHacer: "Programar la renovación antes de la fecha.",
    detalles: porVencer,
  });
  agregar({
    id: "cursos-sin-fecha",
    titulo: "Cursos sin fecha de vencimiento",
    gravedad: "baja",
    tabla: "cursos",
    queHacer:
      "Búsquela en el certificado. Si ese curso de verdad no vence, déjela vacía: aquí seguirá apareciendo como pendiente, pero es la única forma de distinguir 'no se sabe' de 'no aplica'.",
    detalles: sinFecha,
  });

  /* 6. Ausentismos donde los dias no cuadran con las fechas -----------
     No se corrige: a veces la EPS cuenta distinto. Se muestra. */
  const descuadrados: Detalle[] = [];
  for (const a of ausentismos) {
    const i = a.fecha_inicio ? new Date(String(a.fecha_inicio).slice(0, 10)) : null;
    const f = a.fecha_fin ? new Date(String(a.fecha_fin).slice(0, 10)) : null;
    const d = Number(a.numero_dias);
    if (!i || !f || !Number.isFinite(d)) continue;
    const calc = Math.round((f.getTime() - i.getTime()) / 86_400_000) + 1;
    if (calc !== d) {
      descuadrados.push({
        texto: `${a.nombre_completo} · dice ${d} día(s), entre las fechas hay ${calc}`,
        buscar: String(a.num_documento ?? ""),
      });
    }
  }
  agregar({
    id: "dias-descuadrados",
    titulo: "Ausentismos donde los días no cuadran con las fechas",
    gravedad: "media",
    tabla: "ausentismos",
    queHacer:
      "Puede estar bien: a veces la EPS cuenta distinto. Confirme y, si es así, déjelo como está — queda aquí a la vista.",
    detalles: descuadrados,
  });

  /* 7. Incapacidades radicadas que nadie cerro ------------------------ */
  agregar({
    id: "incapacidades-sin-cerrar",
    titulo: "Incapacidades con valor pero sin fecha de pago",
    gravedad: "media",
    tabla: "incapacidades",
    queHacer: "Verificar con la EPS si ya pagó. Es plata pendiente de cobro.",
    detalles: incapacidades
      .filter((i) => Number(i.valor) > 0 && !i.fecha_pago && norm(i.estado) !== "ANULADA")
      .map((i) => ({
        texto: `${i.nombre_completo} · $${Number(i.valor).toLocaleString("es-CO")} · ${i.estado ?? "sin estado"}`,
        buscar: String(i.num_documento ?? ""),
      })),
  });

  /* 8. Meses de accidentalidad sin registrar --------------------------
     Un mes sin fila no es "cero accidentes": es un mes sin revisar. */
  const anio = HOY.getFullYear();
  const registrados = new Set(
    accidentes.filter((a) => Number(a.anio) === anio).map((a) => Number(a.mes)),
  );
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const faltantes: Detalle[] = [];
  for (let m = 1; m <= HOY.getMonth() + 1; m++) {
    if (!registrados.has(m)) faltantes.push({ texto: `${MESES[m - 1]} de ${anio}` });
  }
  agregar({
    id: "meses-accidentes",
    titulo: "Meses de accidentalidad sin registrar",
    gravedad: "media",
    tabla: "accidentes",
    queHacer:
      "Registre el mes incluso si no pasó nada, marcando «¿Hubo accidente?» en No. Un mes sin fila no es cero accidentes: es un mes sin revisar.",
    detalles: faltantes,
  });

  /* 9. Capacitaciones que ya pasaron y nadie cerro -------------------- */
  agregar({
    id: "capacitaciones-sin-cerrar",
    titulo: "Capacitaciones cuya fecha ya pasó y no se cerraron",
    gravedad: "media",
    tabla: "capacitaciones",
    queHacer: "Marque si se realizó (con fecha y asistentes) o si se reprogramó.",
    detalles: capacitaciones
      .filter(
        (c) =>
          c.fecha_programada &&
          String(c.fecha_programada).slice(0, 10) < HOY_ISO &&
          !c.fecha_ejecutada &&
          c.se_realizo !== true,
      )
      .map((c) => ({
        texto: `${c.nombre} · programada ${String(c.fecha_programada).slice(0, 10)}`,
        buscar: String(c.nombre ?? ""),
      })),
  });

  const orden = { alta: 0, media: 1, baja: 2 } as const;
  hallazgos.sort((a, b) => orden[a.gravedad] - orden[b.gravedad]);

  return NextResponse.json({
    ok: true,
    calculadoAt: new Date().toISOString(),
    total: hallazgos.reduce((s, h) => s + h.detalles.length, 0),
    porGravedad: {
      alta: hallazgos.filter((h) => h.gravedad === "alta").reduce((s, h) => s + h.detalles.length, 0),
      media: hallazgos.filter((h) => h.gravedad === "media").reduce((s, h) => s + h.detalles.length, 0),
      baja: hallazgos.filter((h) => h.gravedad === "baja").reduce((s, h) => s + h.detalles.length, 0),
    },
    hallazgos,
  });
}
