import { requireModuloAccess } from "@/lib/auth";
import { AlertTriangle, CalendarCheck2, Info, Scissors, Stethoscope, UserCheck, XCircle } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { SingleDatePicker, type SedeFiltro } from "@/components/SingleDatePicker";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import {
  esCancelacionAutomatica,
  fetchCitasAtendidas,
  fetchCitasDia,
  fetchProgramacionQx,
  type SismaCitaAtendida,
  type SismaProgramacionQx,
} from "@/lib/integrations/sisma";
import { categorizeAsunto, SISMA_CATEGORIA_LABELS, type SismaCategoria } from "@/lib/sismaCategories";
import { formatNumber } from "@/lib/text";
import { traerDiaTipico } from "@/lib/diaTipico";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORIA_ORDEN: SismaCategoria[] = [
  "primera_vez",
  "control",
  "posquirurgico",
  "prequirurgico",
  "diagnostico",
  "otro",
];

export default async function VentaDelDiaPage({
  searchParams,
}: {
  searchParams: { fecha?: string; sede?: string };
}) {
  await requireModuloAccess("venta_del_dia");
  const fecha = searchParams.fecha ?? todayISO();

  // --- Sede ---
  // SISMA no manda la sede en las citas atendidas, pero no hace falta:
  // Mutual se atiende en la Sede 2 y todo lo demás en la Sede 1. Es la
  // misma regla que usa el tablero de Frecuencias (SEDE_MAP), así que las
  // dos pantallas dicen lo mismo. Si algún día hubiera una sede nueva que
  // no sea Mutual, esta regla deja de servir y hay que pedirle la sede al
  // sistema.
  const sede: SedeFiltro =
    searchParams.sede === "1" || searchParams.sede === "2"
      ? searchParams.sede
      : "todas";
  const esMutual = (empresa: string | null | undefined) =>
    /MUTUAL/i.test(String(empresa ?? ""));
  const pasaSede = (empresa: string | null | undefined) =>
    sede === "todas" ? true : sede === "2" ? esMutual(empresa) : !esMutual(empresa);

  // Los errores técnicos no se le muestran a quien consulta el tablero:
  // "SISMA_NODE_API_KEY no configurada", "Unexpected token…" o un código
  // HTTP no le dicen nada a gerencia ni a facturación. Se traducen a una
  // frase que explique qué pasa y a quién avisarle.
  function mensajeClaro(error: string, que: string): string {
    if (error === "SIN_LLAVE") {
      return `Todavía no está configurado el acceso al sistema para consultar ${que}. Avísele a quien administra la plataforma.`;
    }
    if (/not valid JSON|Unexpected token/i.test(error)) {
      return `El sistema respondió con un formato que la plataforma no pudo leer al consultar ${que}. Ya quedó reportado; si sigue apareciendo, avísenos.`;
    }
    if (/\b(401|403)\b/.test(error)) {
      return `El acceso al sistema no tiene permiso para consultar ${que}. Hay que revisar la llave configurada.`;
    }
    if (/\b(5\d\d)\b/.test(error)) {
      return `SISMA no respondió al consultar ${que}. Suele ser momentáneo: vuelva a intentar en unos minutos.`;
    }
    return `No se pudo consultar ${que} en este momento. Intente de nuevo en unos minutos.`;
  }

  // Agenda del día (pendientes + confirmadas) — API antigua, siempre
  // disponible con la llave actual. Si esto falla, no hay nada que
  // mostrar en la página.
  let fetchError: string | null = null;
  let citasDia: Awaited<ReturnType<typeof fetchCitasDia>> = [];
  try {
    citasDia = await fetchCitasDia(fecha);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Error desconocido consultando SISMA.";
  }

  // Asistencia real del día — API ampliado (node), requiere la llave
  // nueva que TIC todavía no ha emitido. Se degrada por sección: si
  // falla, el resto de la página sigue funcionando.
  let asistenciaError: string | null = null;
  let citasAtendidas: SismaCitaAtendida[] = [];
  if (!fetchError) {
    try {
      citasAtendidas = await fetchCitasAtendidas(fecha, fecha);
    } catch (e) {
      asistenciaError = e instanceof Error ? e.message : "Error desconocido consultando SISMA (node).";
    }
  }

  // Programación de cirugía — mismo API ampliado.
  let cirugiaError: string | null = null;
  let cirugiaItems: SismaProgramacionQx[] = [];
  let cirugiaAviso: string | null = null;
  if (!fetchError) {
    try {
      const result = await fetchProgramacionQx(fecha, fecha);
      cirugiaItems = result.items;
      cirugiaAviso = result.aviso;
    } catch (e) {
      cirugiaError = e instanceof Error ? e.message : "Error desconocido consultando SISMA (node).";
    }
  }

  const header = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Venta del Día</h1>
        <p className="mt-1 text-sm text-ink-3">Agendamiento, asistencia real y cirugía del día.</p>
      </div>
      <SingleDatePicker fecha={fecha} sede={sede} />
    </div>
  );

  if (fetchError) {
    return (
      <div>
        {header}
        <div className="flex items-start gap-3 rounded-lg border border-[#F2C744] bg-[#FEF8E7] p-4 text-sm text-[#8A6D00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>
            No se pudo consultar SISMA para el {fecha}: {fetchError}
          </span>
        </div>
      </div>
    );
  }

  // --- Agendamiento (pendientes/confirmadas) ---
  const programadas = citasDia.length;

  // --- Asistencia real (node API) ---
  // El filtro se aplica aquí, antes de contar: así todo lo que viene
  // despues (categorías, pre/pos-quirúrgicas, el porcentaje) ya sale por
  // sede sin tener que acordarse de filtrarlo en cada sitio.
  if (sede !== "todas") citasAtendidas = citasAtendidas.filter((c) => pasaSede(c.empresa));

  const asistidas = citasAtendidas.length;
  // --- Cuánto de la agenda del día ya se atendió ---
  //
  // Esto NO es el porcentaje de asistencia, aunque antes se llamaba así.
  // `programadas` son las citas que todavía no se han atendido, así que el
  // cociente sube solo con el correr del día y a las 6 p.m. siempre da
  // cerca del 100%: medía qué tan tarde era, no cuánta gente vino.
  //
  // Mientras el día está en curso es "lo que llevamos de la agenda". Solo al
  // cerrar el día, cuando ya no quedan pendientes por procesar, se puede
  // leer como asistencia — y aun así los que faltan no son necesariamente
  // inasistentes. Para asistencia real hace falta que SISMA mande el estado
  // de inasistencia, que hoy no llega.
  // OJO con el filtro de sede: las citas AGENDADAS que devuelve SISMA no
  // traen empresa, solo las atendidas. Si se filtran las atendidas y las
  // agendadas no, el porcentaje compara peras con manzanas y nadie se daría
  // cuenta. Por eso, con una sede escogida, el agendado y el porcentaje se
  // marcan como no disponibles en vez de mostrar un numero equivocado.
  const hayAgendado = sede === "todas";
  const agendaDia = programadas + asistidas;
  const pctAgenda =
    hayAgendado && agendaDia > 0
      ? Math.round((asistidas / agendaDia) * 1000) / 10
      : null;

  // --- Contexto: ¿cómo se compara con un día igual? ---
  // Lo calcula el motor de Frecuencias con la misma regla que su tarjeta de
  // cierre (promedio del mismo día de la semana, 4 semanas atrás). Si no se
  // puede traer, la página sigue igual: es contexto, no un dato esencial.
  const diaTipico = await traerDiaTipico(fecha);
  const pctTipico =
    diaTipico?.tipico && diaTipico.tipico > 0
      ? Math.round((diaTipico.total / diaTipico.tipico) * 100)
      : null;
  const DIA_SEMANA = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
  ];
  const nombreDia = DIA_SEMANA[new Date(fecha + "T12:00:00").getDay()];

  const atendidasConCategoria = citasAtendidas.map((c) => ({
    cita: c,
    categoria: categorizeAsunto(c.asunto),
  }));

  const porCategoria = CATEGORIA_ORDEN.map((cat) => ({
    stage: SISMA_CATEGORIA_LABELS[cat],
    count: atendidasConCategoria.filter((c) => c.categoria === cat).length,
    value: 0,
  })).filter((d) => d.count > 0);

  // --- OPORTUNIDAD ---
  // Dias entre que el paciente pide la cita y se la atienden. Llega en cada
  // cita atendida y no lo estaba leyendo nadie. Es EL indicador de calidad
  // que se reporta, asi que vale mas que casi todo lo demas de esta pagina.
  //
  // Se usa la MEDIANA, no el promedio: un paciente que esperó 300 dias
  // (reprogramaciones, un control lejano pedido a proposito) mueve el
  // promedio y no mueve la mediana. La mediana dice "la mitad espero menos
  // de esto", que es lo que uno quiere saber.
  // Y se separa PRIMERA VEZ de CONTROL, que es lo que hace que el numero
  // signifique algo. Un control se agenda a proposito para dentro de meses:
  // eso no es falta de oportunidad, es el plan del medico. Mezclarlos da un
  // numero que parece malo y no dice nada. La oportunidad que se reporta es
  // la de primera vez por especialista.
  const diasDe = (cs: typeof atendidasConCategoria) =>
    cs
      .map((c) => c.cita.diasOportunidad)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);

  const dias = diasDe(atendidasConCategoria);
  const diasPrimera = diasDe(
    atendidasConCategoria.filter((c) => c.categoria === "primera_vez"),
  );
  const diasControl = diasDe(
    atendidasConCategoria.filter((c) => c.categoria === "control"),
  );
  const mediana = (xs: number[]) =>
    xs.length === 0
      ? null
      : xs.length % 2
        ? xs[(xs.length - 1) / 2]
        : Math.round(((xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2) * 10) / 10;
  const oportunidad = mediana(diasPrimera);
  const oportunidadControl = mediana(diasControl);
  // El dia mismo cuenta como 0: son las que se atendieron sin espera.
  const mismoDia = diasPrimera.filter((d) => d <= 0).length;

  const preQuirurgicas = atendidasConCategoria.filter((c) => c.categoria === "prequirurgico").length;
  const posQuirurgicos = atendidasConCategoria.filter((c) => c.categoria === "posquirurgico").length;

  // --- Cirugía (programación de quirófano) ---
  //
  // Se cuenta por el estado que DEVUELVE el sistema, no por una lista
  // fija. El código anterior buscaba "Realizada", y el valor real que
  // manda SISMA es "Atendida": habría dado cero para siempre.
  const cirugiaSinAutoCanceladas = cirugiaItems.filter((qx) => !esCancelacionAutomatica(qx));

  const porEstado = new Map<string, number>();
  for (const qx of cirugiaSinAutoCanceladas) {
    porEstado.set(qx.estado, (porEstado.get(qx.estado) ?? 0) + 1);
  }
  const estadosCirugia = Array.from(porEstado.entries()).sort((a, b) => b[1] - a[1]);
  const cirugiaTotal = cirugiaSinAutoCanceladas.length;
  const autoCanceladas = cirugiaItems.length - cirugiaTotal;

  const ICONO_ESTADO: Record<string, typeof Scissors> = {
    atendida: UserCheck,
    realizada: UserCheck,
    programada: Scissors,
    cancelada: XCircle,
    incumplida: AlertTriangle,
  };

  return (
    <div>
      {header}

      {/* Contexto que aporta Frecuencias: el número del día contra un día
          igual. Sin esto, "386 atenciones" no dice nada por sí solo. */}
      {diaTipico && pctTipico !== null && hayAgendado && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
          <div className="text-sm text-ink-2">
            Se cerraron <strong className="text-navy">{formatNumber(diaTipico.total)}</strong>{" "}
            atenciones. Un {nombreDia} típico cierra en{" "}
            <strong className="text-navy">{formatNumber(diaTipico.tipico ?? 0)}</strong>.
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`text-sm font-semibold ${
                pctTipico >= 100 ? "text-[#21814B]" : "text-[#B3541E]"
              }`}
            >
              {pctTipico}% de un {nombreDia} típico
            </span>
            <a
              href={`/frecuencias?dia=${fecha}`}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-navy hover:bg-ebbg"
            >
              Ver el detalle en Frecuencias
            </a>
          </div>
        </div>
      )}

      {/* La espera, dicha como una frase. Antes era una tarjeta que decia
          "Oportunidad 1ª vez (mediana) — 37 días" con cuatro cifras pegadas
          abajo: eso es jerga, no informacion. Un numero sin referencia no
          dice nada; la frase trae la referencia adentro. */}
      {oportunidad !== null && (
        <div className="mb-6 rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink-2">
          De los <strong className="text-navy">{formatNumber(diasPrimera.length)}</strong>{" "}
          pacientes que vinieron <strong className="text-navy">por primera vez</strong>, la
          mitad esperó más de{" "}
          <strong className="text-navy">
            {oportunidad} {oportunidad === 1 ? "día" : "días"}
          </strong>{" "}
          desde que pidió la cita.{" "}
          {mismoDia > 0 ? (
            <>
              Solo <strong className="text-navy">{formatNumber(mismoDia)}</strong> se
              atendieron el mismo día.
            </>
          ) : (
            <>Ninguno se atendió el mismo día.</>
          )}
          {oportunidadControl !== null && (
            <span className="text-ink-3">
              {" "}
              Los controles esperaron {oportunidadControl}{" "}
              {oportunidadControl === 1 ? "día" : "días"}.
            </span>
          )}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-navy">Agendamiento y Asistencia</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Citas Programadas"
          value={hayAgendado ? formatNumber(programadas) : "—"}
          hint={
            hayAgendado
              ? `${fecha} · pendientes + confirmadas`
              : "SISMA no manda la sede en lo agendado"
          }
          icon={CalendarCheck2}
        />
        <KpiCard
          label="Citas Atendidas"
          value={asistenciaError ? "—" : formatNumber(asistidas)}
          hint={
            pctAgenda !== null
              ? `${pctAgenda}% de las ${formatNumber(agendaDia)} agendadas del día`
              : hayAgendado
                ? "—"
                : sede === "2"
                  ? "Mutual (Sede 2)"
                  : "Sin Mutual (Sede 1)"
          }
          icon={UserCheck}
        />
        <KpiCard
          label="Consultas Pre/Pos-quirúrgicas Atendidas"
          value={asistenciaError ? "—" : formatNumber(preQuirurgicas + posQuirurgicos)}
          hint={`Pre: ${preQuirurgicas} · Pos: ${posQuirurgicos}`}
          icon={Stethoscope}
        />
      </div>

      {asistenciaError && (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-[#F2C744] bg-[#FEF8E7] p-4 text-sm text-[#8A6D00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{mensajeClaro(asistenciaError, "la asistencia del día")}</span>
        </div>
      )}

      {!asistenciaError && (
        <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-navy">Atendidas de Hoy por Tipo</h3>
          <StageFunnelChart data={porCategoria} emptyMessage="Sin citas atendidas este día todavía." />
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-navy">Cirugía</h2>

      {cirugiaError ? (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-[#F2C744] bg-[#FEF8E7] p-4 text-sm text-[#8A6D00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{mensajeClaro(cirugiaError, "la programación de cirugía")}</span>
        </div>
      ) : (
        <>
          {cirugiaAviso && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-line bg-white p-4 text-xs text-ink-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
              <span>{cirugiaAviso}</span>
            </div>
          )}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Cirugías del día"
              value={formatNumber(cirugiaTotal)}
              hint={
                autoCanceladas > 0
                  ? `${fecha} · ${autoCanceladas} edición(es) no contada(s)`
                  : fecha
              }
              icon={Scissors}
            />
            {estadosCirugia.map(([estado, n]) => (
              <KpiCard
                key={estado}
                label={estado}
                value={formatNumber(n)}
                hint={
                  cirugiaTotal > 0
                    ? `${Math.round((n / cirugiaTotal) * 100)}% del día`
                    : fecha
                }
                icon={ICONO_ESTADO[estado.toLowerCase()] ?? Scissors}
              />
            ))}
          </div>

          {cirugiaTotal === 0 && (
            <p className="mb-8 text-sm text-ink-3">
              No hay cirugías programadas para el {fecha}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
