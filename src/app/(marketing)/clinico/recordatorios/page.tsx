import { getMisModulos, requireModuloAccess } from "@/lib/auth";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { ClinicoNav } from "@/components/clinico/ClinicoNav";
import { ReglasRecordatorio } from "@/components/clinico/ReglasRecordatorio";
import { listarReglas, opcionesFiltro, ultimosEnvios } from "@/lib/clinico/queries";
import { modoEnvio } from "@/lib/clinico/recordatorios";
import { urlDapta } from "@/lib/clinico/dapta";
import { fechaCorta, fechaHoraLegible, horaLegible } from "@/lib/clinico/fechas";
import { celularEnmascarado, titulo } from "@/lib/clinico/tipos";

export const dynamic = "force-dynamic";

const ESTILO: Record<string, string> = {
  enviado: "bg-green-10 text-green", simulado: "bg-blue-10 text-navy-70", fallido: "bg-red-50 text-red-700", omitido: "bg-amber-50 text-amber-700", enviando: "bg-blue-10 text-navy-70",
};

export default async function RecordatoriosPage() {
  const user = await requireModuloAccess("clinico_recordatorios");
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const verAgenda = user.isAdmin || modulos.has("clinico_agenda");

  const [reglas, opciones, envios] = await Promise.all([listarReglas(), opcionesFiltro(), ultimosEnvios(60)]);

  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <ExecutiveHeader
        overline="MÓDULO CLÍNICO"
        title="Recordatorios de citas"
        subtitle="Configura cuándo, por qué canal y con qué texto se avisa a los pacientes. Las llamadas y los WhatsApp salen por Dapta."
        variant="analytics"
      />
      <ClinicoNav activo="recordatorios" verAgenda={verAgenda} verRecordatorios />

      <ReglasRecordatorio
        reglas={reglas}
        opciones={opciones}
        modo={modoEnvio()}
        canalesConfigurados={{ llamada: !!urlDapta("llamada"), whatsapp: !!urlDapta("whatsapp") }}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">Bitácora de envíos (últimos {envios.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-white px-4 py-2">
          {envios.length ? (
            <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-ink-3">
                  <th className="py-2 pr-3 font-medium">Registrado</th><th className="py-2 pr-3 font-medium">Regla</th><th className="py-2 pr-3 font-medium">Paciente</th>
                  <th className="py-2 pr-3 font-medium">Cita</th><th className="py-2 pr-3 font-medium">Celular</th><th className="py-2 pr-3 font-medium">Estado</th><th className="py-2 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {envios.map((e) => (
                  <tr key={e.id} className="border-b border-line-2 align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-2">{fechaHoraLegible(e.created_at)}</td>
                    <td className="py-2 pr-3 text-ink">{e.regla_nombre}{e.intento > 1 ? <span className="text-ink-3"> · intento {e.intento}</span> : null}</td>
                    <td className="py-2 pr-3 text-ink-2">{titulo(e.paciente_nombre) || "—"}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-2">{e.fecha ? `${fechaCorta(e.fecha)} · ${horaLegible(e.hora)}` : "—"}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-2">{celularEnmascarado(e.celular)}</td>
                    <td className="py-2 pr-3"><span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${ESTILO[e.estado] ?? "bg-line-2 text-ink-3"}`}>{e.estado}</span></td>
                    <td className="py-2 text-[12px] text-ink-3">{[e.motivo, e.resultado ? `Resultado: ${e.resultado}` : null].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-8 text-center text-sm text-ink-3">Todavía no hay envíos. Activa una regla o usa «Simular ahora».</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <details className="rounded-xl border border-line bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-2">Cómo se conecta con Dapta</summary>
          <div className="mt-3 space-y-2 text-[13px] text-ink-2">
            <p>La plataforma hace un POST con este JSON al webhook del flow de Dapta de cada canal (variables <code>DAPTA_WEBHOOK_WHATSAPP</code> y <code>DAPTA_WEBHOOK_LLAMADA</code>). Si el flow exige llave, va en <code>DAPTA_WEBHOOK_KEY</code>.</p>
            <pre className="overflow-x-auto rounded-lg bg-paper p-3 text-[12px] leading-relaxed">{`{
  "envio_id": 123,
  "canal": "whatsapp",
  "intento": 1,
  "mensaje": "Hola María, le recordamos su cita …",
  "telefono": "+573001234567",
  "paciente": { "nombre": "María Fernanda Pérez", "primer_nombre": "María" },
  "cita": { "id": 1652705, "fecha": "2026-11-11", "hora": "08:30", "medico": "…", "sede": "Sede 1" },
  "regla": { "id": "…", "nombre": "WhatsApp 48 horas antes" },
  "callback_url": "https://www.ebenezer-app.com/api/recordatorios/resultado"
}`}</pre>
            <p>Al terminar, Dapta puede avisar el resultado con un POST a <code>callback_url</code> (cabecera <code>x-bot-key</code>) y cuerpo <code>{`{"envio_id":123,"resultado":"confirmo"}`}</code>. Resultados sugeridos: confirmo, reprogramar, cancelo, no_contesto, buzon.</p>
          </div>
        </details>
      </section>
    </div>
  );
}
