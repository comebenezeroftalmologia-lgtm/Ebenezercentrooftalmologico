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
  const cirugiaSinAutoCanceladas = cirugiaItems.filter((qx) => !esCancelacionAutomatica(qx));
  const cirugiaProgramadas = cirugiaSinAutoCanceladas.filter((qx) => qx.estado === "Programada").length;
  const cirugiaRealizadas = cirugiaSinAutoCanceladas.filter((qx) => qx.estado === "Realizada").length;
  const cirugiaCanceladas = cirugiaSinAutoCanceladas.filter((qx) => qx.estado === "Cancelada").length;
  const cirugiaIncumplidas = cirugiaSinAutoCanceladas.filter((qx) => qx.estado === "Incumplida").length;

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
          <span>
            Asistencia real no disponible todavía: {asistenciaError}. En cuanto TIC emita la llave del
            API ampliado y se configure en Vercel, esta sección se activa sola.
          </span>
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
          <span>
            Programación de cirugía no disponible todavía: {cirugiaError}. En cuanto TIC emita la llave
            del API ampliado y se configure en Vercel, esta sección se activa sola.
          </span>
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
              label="Cirugías Programadas"
              value={formatNumber(cirugiaProgramadas)}
              hint={fecha}
              icon={Scissors}
            />
            <KpiCard
              label="Cirugías Realizadas"
              value={formatNumber(cirugiaRealizadas)}
              hint={fecha}
              icon={UserCheck}
            />
            <KpiCard
              label="Cirugías Canceladas"
              value={formatNumber(cirugiaCanceladas)}
              hint="Sin contar canceladas automáticas por edición"
              icon={XCircle}
            />
            <KpiCard
              label="Cirugías Incumplidas"
              value={formatNumber(cirugiaIncumplidas)}
              hint="Relativo a la fecha de hoy"
              icon={AlertTriangle}
            />
          </div>
        </>
      )}
    </div>
  );
}
