import { MessageCircle, PhoneCall } from "lucide-react";
import { horaLegible } from "@/lib/clinico/fechas";
import { celularEnmascarado, nombreSede, titulo, type CitaAgenda, type EnvioRecordatorio } from "@/lib/clinico/tipos";

const ESTILO_ENVIO: Record<string, string> = {
  enviado: "bg-green-10 text-green",
  simulado: "bg-blue-10 text-navy-70",
  fallido: "bg-red-50 text-red-700",
  omitido: "bg-amber-50 text-amber-700",
  enviando: "bg-blue-10 text-navy-70",
};
const TEXTO_ENVIO: Record<string, string> = { enviado: "enviado", simulado: "simulado", fallido: "falló", omitido: "omitido", enviando: "enviando" };

function ChipEnvio({ e, regla }: { e: EnvioRecordatorio; regla: string }) {
  const Icono = e.canal === "llamada" ? PhoneCall : MessageCircle;
  return (
    <span
      title={[regla, e.motivo, e.resultado ? `Resultado: ${e.resultado}` : null].filter(Boolean).join(" · ")}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${ESTILO_ENVIO[e.estado] ?? "bg-line-2 text-ink-3"}`}
    >
      <Icono className="h-3 w-3" strokeWidth={2} />
      {TEXTO_ENVIO[e.estado] ?? e.estado}
      {e.resultado ? ` · ${e.resultado}` : ""}
    </span>
  );
}

export function AgendaTabla({ citas, envios, reglas }: { citas: CitaAgenda[]; envios: Map<number, EnvioRecordatorio[]>; reglas: Map<string, string> }) {
  if (!citas.length) return <p className="py-8 text-center text-sm text-ink-3">No hay citas para estos filtros.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-ink-3">
            <th className="py-2 pr-3 font-medium">Hora</th>
            <th className="py-2 pr-3 font-medium">Paciente</th>
            <th className="py-2 pr-3 font-medium">Médico</th>
            <th className="py-2 pr-3 font-medium">Sede</th>
            <th className="py-2 pr-3 font-medium">Estado</th>
            <th className="py-2 pr-3 font-medium">Celular</th>
            <th className="py-2 font-medium">Recordatorios</th>
          </tr>
        </thead>
        <tbody>
          {citas.map((c) => {
            const lista = envios.get(c.id_cita) ?? [];
            return (
              <tr key={c.id_cita} className="border-b border-line-2 align-top">
                <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink">{horaLegible(c.hora)}</td>
                <td className="py-2.5 pr-3">
                  <div className="text-ink">{titulo(c.paciente_nombre) || "—"}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {c.tipo_id ?? ""} {c.num_id ? `···${c.num_id.slice(-4)}` : ""}
                    {c.contrato_nombre ? ` · ${titulo(c.contrato_nombre)}` : ""}
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="text-ink">{titulo(c.medico_nombre) || "—"}</div>
                  {c.especialidad && <div className="text-[11.5px] text-ink-3">{titulo(c.especialidad)}</div>}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-ink-2">{nombreSede(c.id_sede)}</td>
                <td className="py-2.5 pr-3">
                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${c.estado === "CC" ? "bg-green-10 text-green" : "bg-line-2 text-ink-2"}`}>
                    {c.estado_descripcion ?? (c.estado === "CC" ? "Confirmada" : "Pendiente")}
                  </span>
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-ink-2">
                  {c.celular ? celularEnmascarado(c.celular) : <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">Sin celular</span>}
                </td>
                <td className="py-2.5">
                  {lista.length ? (
                    <div className="flex flex-wrap gap-1">
                      {lista.map((e) => (
                        <ChipEnvio key={e.id} e={e} regla={reglas.get(e.regla_id) ?? "Regla eliminada"} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
