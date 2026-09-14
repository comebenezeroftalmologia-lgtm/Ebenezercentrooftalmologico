import { AlertTriangle, CalendarCheck2, ClipboardList, Scissors, Stethoscope, UserCheck } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { SingleDatePicker } from "@/components/SingleDatePicker";
import { StageFunnelChart } from "@/components/StageFunnelChart";
import {
  fetchCitasDia,
  fetchPacienteCitas,
  mapWithConcurrency,
  type SismaCitaHistorica,
  type SismaPacienteResumen,
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
  const fecha = searchParams.fecha ?? todayISO();

  let fetchError: string | null = null;
  let citasDia: Awaited<ReturnType<typeof fetchCitasDia>> = [];
  try {
    citasDia = await fetchCitasDia(fecha);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Error desconocido consultando SISMA.";
  }

  const header = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Venta del Día</h1>
        <p className="mt-1 text-sm text-ink-3">
          Agendamiento del día, cruzado con el histórico de SISMA para el estado real de
          cada cita.
        </p>
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
          <span>No se pudo consultar SISMA para el {fecha}: {fetchError}</span>
        </div>
      </div>
    );
  }

  // Pacientes únicos citados el día seleccionado.
  const pacientesById = new Map<number, SismaPacienteResumen>();
  for (const c of citasDia) pacientesById.set(c.paciente.autoid, c.paciente);
  const pacientes = Array.from(pacientesById.values());

  // Por cada paciente, su histórico desde `fecha` en adelante — trae la
  // cita de hoy con su estado REAL (citas/dia nunca lo da) y cualquier
  // cita futura ya agendada.
  const historyResults = await mapWithConcurrency(pacientes, 12, async (p) => {
    try {
      const historial = await fetchPacienteCitas(p.autoid, { desde: fecha });
      return { autoid: p.autoid, historial };
    } catch {
      return { autoid: p.autoid, historial: [] as SismaCitaHistorica[] };
    }
  });
  const historialByPaciente = new Map(historyResults.map((r) => [r.autoid, r.historial]));

  const citasEnriquecidas = citasDia.map((cita) => {
    const historial = historialByPaciente.get(cita.paciente.autoid) ?? [];
    const real = historial.find((h) => h.idCita === cita.idCita);
    return {
      cita,
      real,
      categoria: categorizeAsunto(real?.asunto ?? null),
      asistida: real?.estado === "A",
    };
  });

  const programadas = citasEnriquecidas.length;
  const asistidas = citasEnriquecidas.filter((c) => c.asistida).length;
  const pctAsistencia = programadas > 0 ? Math.round((asistidas / programadas) * 1000) / 10 : null;

  const porCategoria = CATEGORIA_ORDEN.map((cat) => ({
    stage: SISMA_CATEGORIA_LABELS[cat],
    count: citasEnriquecidas.filter((c) => c.categoria === cat).length,
    value: 0,
  })).filter((d) => d.count > 0);

  // Pacientes atendidos hoy con una próxima cita ya en agenda —
  // inferido por tipo de cita (nombre del "asunto"), SISMA no guarda
  // un vínculo causal entre una cita atendida y la que "resultó" de
  // ella (no hay fecha de creación del registro, solo fecha de la cita).
  const pacientesAtendidosIds = new Set(
    citasEnriquecidas.filter((c) => c.asistida).map((c) => c.cita.paciente.autoid)
  );

  const proximaPorPaciente = new Map<number, { categoria: SismaCategoria } | null>();
  for (const autoid of pacientesAtendidosIds) {
    const historial = historialByPaciente.get(autoid) ?? [];
    const futuras = historial
      .filter((h) => h.fecha > fecha && h.estado !== "C")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    proximaPorPaciente.set(
      autoid,
      futuras.length > 0 ? { categoria: categorizeAsunto(futuras[0].asunto) } : null
    );
  }
  const conProximaCita = Array.from(proximaPorPaciente.values()).filter((v) => v !== null).length;
  const pctConProxima =
    pacientesAtendidosIds.size > 0
      ? Math.round((conProximaCita / pacientesAtendidosIds.size) * 1000) / 10
      : null;

  const proximaPorCategoria = CATEGORIA_ORDEN.map((cat) => ({
    stage: SISMA_CATEGORIA_LABELS[cat],
    count: Array.from(proximaPorPaciente.values()).filter((v) => v?.categoria === cat).length,
    value: 0,
  })).filter((d) => d.count > 0);

  // Cirugía (parcial) — la reserva de quirófano en sí no está expuesta
  // en esta API; solo las consultas pre y pos-quirúrgicas, que sí se
  // agendan como citas normales.
  const preQuirurgicasHoy = citasEnriquecidas.filter((c) => c.categoria === "prequirurgico");
  const preQuirurgicasAsistidas = preQuirurgicasHoy.filter((c) => c.asistida).length;
  const posQuirurgicosAgendados = Array.from(proximaPorPaciente.values()).filter(
    (v) => v?.categoria === "posquirurgico"
  ).length;

  return (
    <div>
      {header}

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-line bg-white p-4 text-xs text-ink-3">
        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
        <span>
          &quot;Próxima cita en agenda&quot; se infiere por el tipo de cita (nombre del
          &quot;asunto&quot; en SISMA) — no es un vínculo garantizado entre la cita de hoy y la
          futura, porque SISMA no guarda esa relación.
        </span>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-navy">Agendamiento de Cita</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Citas Programadas"
          value={formatNumber(programadas)}
          hint={fecha}
          icon={CalendarCheck2}
        />
        <KpiCard
          label="Citas Asistidas"
          value={formatNumber(asistidas)}
          hint={pctAsistencia !== null ? `${pctAsistencia}% de asistencia` : "—"}
          icon={UserCheck}
        />
        <KpiCard
          label="Con Próxima Cita en Agenda"
          value={formatNumber(conProximaCita)}
          hint={
            pctConProxima !== null
              ? `${pctConProxima}% de los atendidos hoy (inferido)`
              : "Sin atendidos todavía"
          }
          icon={ClipboardList}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-navy">Citas de Hoy por Tipo</h3>
          <StageFunnelChart data={porCategoria} emptyMessage="Sin citas programadas este día." />
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-navy">
            Próxima Cita de los Atendidos, por Tipo
          </h3>
          <StageFunnelChart
            data={proximaPorCategoria}
            color="#21814B"
            emptyMessage="Sin atendidos con próxima cita en agenda todavía."
          />
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-navy">Cirugía (parcial)</h2>
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#F2C744] bg-[#FEF8E7] p-4 text-sm text-[#8A6D00]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span>
          Cirugías Programadas y Realizadas no están disponibles: la reserva de quirófano no
          se agenda como una &quot;cita&quot; en esta API — pendiente de un acceso ampliado a
          SISMA. Solo se muestran las consultas pre y pos-quirúrgicas, que sí son citas
          normales.
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Consultas Pre-quirúrgicas Programadas"
          value={formatNumber(preQuirurgicasHoy.length)}
          hint={fecha}
          icon={Stethoscope}
        />
        <KpiCard
          label="Consultas Pre-quirúrgicas Asistidas"
          value={formatNumber(preQuirurgicasAsistidas)}
          hint={
            preQuirurgicasHoy.length > 0
              ? `${Math.round((preQuirurgicasAsistidas / preQuirurgicasHoy.length) * 100)}% de asistencia`
              : "—"
          }
          icon={UserCheck}
        />
        <KpiCard
          label="Controles Post-quirúrgicos Agendados"
          value={formatNumber(posQuirurgicosAgendados)}
          hint="De los atendidos hoy (inferido)"
          icon={Scissors}
        />
      </div>
    </div>
  );
}
