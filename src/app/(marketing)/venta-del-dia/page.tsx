import { requireModuloAccess } from "@/lib/auth";
import { AlertTriangle, CalendarCheck2, Info, Scissors, Stethoscope, UserCheck, XCircle } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { SingleDatePicker } from "@/components/SingleDatePicker";
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
  searchParams: { fecha?: string };
}) {
  await requireModuloAccess("venta_del_dia");
  const fecha = searchParams.fecha ?? todayISO();

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
      <SingleDatePicker fecha={fecha} />
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
  const asistidas = citasAtendidas.length;
  const baseAsistencia = programadas + asistidas;
  const pctAsistencia = baseAsistencia > 0 ? Math.round((asistidas / baseAsistencia) * 1000) / 10 : null;

  const atendidasConCategoria = citasAtendidas.map((c) => ({
    cita: c,
    categoria: categorizeAsunto(c.asunto),
  }));

  const porCategoria = CATEGORIA_ORDEN.map((cat) => ({
    stage: SISMA_CATEGORIA_LABELS[cat],
    count: atendidasConCategoria.filter((c) => c.categoria === cat).length,
    value: 0,
  })).filter((d) => d.count > 0);

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

      <h2 className="mb-3 text-lg font-semibold text-navy">Agendamiento y Asistencia</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Citas Programadas"
          value={formatNumber(programadas)}
          hint={`${fecha} · pendientes + confirmadas`}
          icon={CalendarCheck2}
        />
        <KpiCard
          label="Citas Atendidas"
          value={asistenciaError ? "—" : formatNumber(asistidas)}
          hint={pctAsistencia !== null ? `${pctAsistencia}% de asistencia` : "—"}
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
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
