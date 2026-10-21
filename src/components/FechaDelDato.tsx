/* ---------------------------------------------------------------------
   DE CUANDO ES LO QUE ESTOY VIENDO.
   Escrito el 21-10-2026.

   Hay tres pantallas que no consultan su fuente cada vez: leen un archivo
   que alguien tiene que regenerar. Los datos son reales, pero envejecen
   sin decirlo, y una cifra vieja con cara de cifra de hoy hace tomar
   decisiones equivocadas. El 20-10-2026 el tablero de Frecuencias estuvo
   una semana mostrando el cierre del 13 sin que nadie lo notara.

   Esto no automatiza nada. Solo pone a la vista la edad del dato, y lo
   dice mas fuerte a medida que pasa el tiempo. Es la diferencia entre
   enterarse el mismo dia y enterarse a la semana.

   Los umbrales van por parametro porque no todo envejece igual: el
   digiturno se actualiza a diario, los ordenamientos son mensuales.
   --------------------------------------------------------------------- */

function dias(desde: Date): number {
  return Math.floor((Date.now() - desde.getTime()) / 86_400_000);
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/* Para los archivos que NO traen fecha de extraccion. No se inventa una:
   se dice hasta donde llegan los datos, que si se puede comprobar mirando
   el propio archivo, y se advierte que no se sabe cuando se sacaron. */
export function CoberturaDelDato({
  hastaMes,
  comoSeActualiza,
}: {
  /** El ultimo periodo con datos, en formato "2026-10". */
  hastaMes: string | null | undefined;
  comoSeActualiza?: string;
}) {
  if (!hastaMes) return null;
  const [a, m] = hastaMes.split("-");
  const idx = Number(m) - 1;
  const nombre = MESES[idx] ?? m;

  const hoy = new Date();
  const mesesAtras =
    (hoy.getFullYear() - Number(a)) * 12 + (hoy.getMonth() - idx);
  const viejo = mesesAtras >= 2;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${
        viejo
          ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]"
          : "border-[#DCE8FA] bg-[#F5F9FF] text-[#475569]"
      }`}
      title={comoSeActualiza ? `Para actualizar: ${comoSeActualiza}` : undefined}
    >
      {viejo ? <span aria-hidden="true">⚠</span> : null}
      Datos hasta {nombre} {a} · sin fecha de extracción
    </span>
  );
}

export function FechaDelDato({
  fecha,
  avisaA = 2,
  alarmaA = 7,
  queEs = "Datos",
  comoSeActualiza,
}: {
  /** Fecha del dato. Acepta "2026-10-19", "19/10/2026" o un Date. */
  fecha: string | Date | null | undefined;
  /** Dias a partir de los cuales se ve ambar. */
  avisaA?: number;
  /** Dias a partir de los cuales se ve rojo. */
  alarmaA?: number;
  queEs?: string;
  /** Que hay que hacer para refrescarlo. Sale solo cuando ya esta viejo. */
  comoSeActualiza?: string;
}) {
  let d: Date | null = null;
  if (fecha instanceof Date) {
    d = fecha;
  } else if (typeof fecha === "string" && fecha.trim()) {
    const t = fecha.trim();
    // dd/mm/aaaa o aaaa-mm-dd
    const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : t.slice(0, 10);
    const p = new Date(iso + "T12:00:00");
    if (!Number.isNaN(p.getTime())) d = p;
  }

  // Sin fecha no se calla: no saber de cuando es un dato es peor que
  // saber que es viejo.
  if (!d) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[11.5px] font-semibold text-[#92400E]">
        <span aria-hidden="true">⚠</span>
        {queEs} sin fecha de actualización
      </span>
    );
  }

  const n = dias(d);
  const cuando = d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hace = n <= 0 ? "hoy" : n === 1 ? "hace 1 día" : `hace ${n} días`;
  const nivel = n >= alarmaA ? "alarma" : n >= avisaA ? "aviso" : "bien";

  const estilo =
    nivel === "alarma"
      ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]"
      : nivel === "aviso"
        ? "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
        : "border-[#DCE8FA] bg-[#F5F9FF] text-[#475569]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${estilo}`}
      title={
        comoSeActualiza && nivel !== "bien"
          ? `Para actualizar: ${comoSeActualiza}`
          : `${queEs} con corte al ${cuando}`
      }
    >
      {nivel !== "bien" ? <span aria-hidden="true">⚠</span> : null}
      {queEs} al {cuando} · {hace}
      {nivel === "alarma" && comoSeActualiza ? (
        <span className="font-medium"> — {comoSeActualiza}</span>
      ) : null}
    </span>
  );
}
