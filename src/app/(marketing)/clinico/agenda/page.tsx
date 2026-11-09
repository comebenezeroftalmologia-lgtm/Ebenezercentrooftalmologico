import Link from "next/link";
import { getMisModulos, requireModuloAccess } from "@/lib/auth";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { ClinicoNav } from "@/components/clinico/ClinicoNav";
import { BotonSincronizar } from "@/components/clinico/BotonSincronizar";
import { AgendaTabla } from "@/components/clinico/AgendaTabla";
import { FECHA_RE, fechaBogota, fechaCorta, fechaHoraLegible, sumarDias } from "@/lib/clinico/fechas";
import { citasDelDia, enviosDeCitas, listarReglas, opcionesFiltro, ultimaSincronizacion } from "@/lib/clinico/queries";
import { nombreSede, titulo, type EnvioRecordatorio } from "@/lib/clinico/tipos";

export const dynamic = "force-dynamic";

type Params = { fecha?: string; sede?: string; medico?: string; estado?: string; q?: string; vista?: string };

function Cifra({ etiqueta, valor, nota }: { etiqueta: string; valor: number | string; nota?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3">{etiqueta}</div>
      <div className="mt-1 font-display text-2xl text-ink">{valor}</div>
      {nota && <div className="text-[11.5px] text-ink-3">{nota}</div>}
    </div>
  );
}

export default async function AgendaPage({ searchParams }: { searchParams?: Params }) {
  const user = await requireModuloAccess("clinico_agenda");
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const verRecordatorios = user.isAdmin || modulos.has("clinico_recordatorios");

  const hoy = fechaBogota(0);
  const fecha = searchParams?.fecha && FECHA_RE.test(searchParams.fecha) ? searchParams.fecha : hoy;
  const sede = searchParams?.sede ? Number(searchParams.sede) : null;
  const medico = searchParams?.medico ? Number(searchParams.medico) : null;
  const estado = searchParams?.estado === "P" || searchParams?.estado === "CC" ? searchParams.estado : "";
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const vista = searchParams?.vista === "medico" ? "medico" : "hora";

  const [todas, opciones, sync, reglas] = await Promise.all([citasDelDia(fecha), opcionesFiltro(), ultimaSincronizacion(), listarReglas()]);
  const citas = todas.filter(
    (c) =>
      (sede == null || c.id_sede === sede) &&
      (medico == null || c.cod_medico === medico) &&
      (!estado || c.estado === estado) &&
      (!q || (c.paciente_nombre ?? "").toLowerCase().includes(q) || (c.num_id ?? "").includes(q)),
  );

  const envios = new Map<number, EnvioRecordatorio[]>();
  for (const e of await enviosDeCitas(citas.map((c) => c.id_cita))) envios.set(e.id_cita, [...(envios.get(e.id_cita) ?? []), e]);
  const nombresReglas = new Map(reglas.map((r) => [r.id, r.nombre]));

  const confirmadas = citas.filter((c) => c.estado === "CC").length;
  const sinCelular = citas.filter((c) => !c.celular).length;
  const conAviso = citas.filter((c) => (envios.get(c.id_cita) ?? []).some((e) => e.estado === "enviado" || e.estado === "simulado")).length;

  const enlace = (f: string) => {
    const p = new URLSearchParams();
    p.set("fecha", f);
    if (sede != null) p.set("sede", String(sede));
    if (medico != null) p.set("medico", String(medico));
    if (estado) p.set("estado", estado);
    if (q) p.set("q", q);
    if (vista === "medico") p.set("vista", "medico");
    return `/clinico/agenda?${p.toString()}`;
  };

  const porMedico = new Map<string, typeof citas>();
  if (vista === "medico") for (const c of citas) porMedico.set(c.medico_nombre ?? "Sin médico", [...(porMedico.get(c.medico_nombre ?? "Sin médico") ?? []), c]);

  const campo = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink";

  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <ExecutiveHeader
        overline="MÓDULO CLÍNICO"
        title="Agenda"
        subtitle="Citas pendientes y confirmadas cargadas desde SISMA, con el estado de sus recordatorios."
        variant="analytics"
        fechaISO={fecha}
      />
      <ClinicoNav activo="agenda" verAgenda verRecordatorios={verRecordatorios} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-[12.5px] text-ink-3">
          {sync
            ? `Última sincronización: ${fechaHoraLegible(sync.terminada_at ?? sync.iniciada_at)}${sync.ok === false ? " — con error" : ""}${sync.citas != null ? ` · ${sync.citas} citas` : ""}`
            : "Aún no se ha sincronizado la agenda. Usa el botón para cargarla."}
          {sync?.ok === false && sync.error ? <span className="block text-red-600">{sync.error}</span> : null}
        </p>
        <BotonSincronizar />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra etiqueta="Citas del día" valor={citas.length} nota={fecha === hoy ? "hoy" : fechaCorta(fecha)} />
        <Cifra etiqueta="Confirmadas" valor={confirmadas} nota={citas.length ? `${Math.round((confirmadas / citas.length) * 100)} %` : undefined} />
        <Cifra etiqueta="Con recordatorio" valor={conAviso} nota="enviado o simulado" />
        <Cifra etiqueta="Sin celular" valor={sinCelular} nota="no se les puede avisar" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={enlace(sumarDias(fecha, -1))} className={`${campo} hover:bg-blue-10`} aria-label="Día anterior">←</Link>
        <Link href={enlace(hoy)} className={`${campo} hover:bg-blue-10`}>Hoy</Link>
        <Link href={enlace(sumarDias(fecha, 1))} className={`${campo} hover:bg-blue-10`} aria-label="Día siguiente">→</Link>
        <span className="mx-1 text-sm font-medium text-ink">{fechaCorta(fecha)}</span>
        <form method="get" action="/clinico/agenda" className="flex flex-wrap items-center gap-2">
          <input type="date" name="fecha" defaultValue={fecha} className={campo} />
          <select name="sede" defaultValue={sede ?? ""} className={campo}>
            <option value="">Todas las sedes</option>
            {opciones.sedes.map((s) => <option key={s} value={s}>{nombreSede(s)}</option>)}
          </select>
          <select name="medico" defaultValue={medico ?? ""} className={`${campo} max-w-[220px]`}>
            <option value="">Todos los médicos</option>
            {opciones.medicos.map((m) => <option key={m.codigo} value={m.codigo}>{titulo(m.nombre)}</option>)}
          </select>
          <select name="estado" defaultValue={estado} className={campo}>
            <option value="">Todos los estados</option>
            <option value="P">Pendiente</option>
            <option value="CC">Confirmada</option>
          </select>
          <select name="vista" defaultValue={vista} className={campo}>
            <option value="hora">Por hora</option>
            <option value="medico">Por médico</option>
          </select>
          <input type="search" name="q" defaultValue={q} placeholder="Paciente o documento" className={`${campo} w-[180px]`} />
          <button type="submit" className="rounded-lg bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-90">Aplicar</button>
        </form>
      </div>

      <div className="rounded-xl border border-line bg-white px-4 py-3">
        {vista === "medico" ? (
          Array.from(porMedico).map(([nombre, lista]) => (
            <section key={nombre} className="mb-6 last:mb-0">
              <h3 className="mb-1 text-sm font-semibold text-ink">
                {titulo(nombre)} <span className="font-normal text-ink-3">· {lista.length} {lista.length === 1 ? "cita" : "citas"}</span>
              </h3>
              <AgendaTabla citas={lista} envios={envios} reglas={nombresReglas} />
            </section>
          ))
        ) : (
          <AgendaTabla citas={citas} envios={envios} reglas={nombresReglas} />
        )}
        {vista === "medico" && !porMedico.size && <p className="py-8 text-center text-sm text-ink-3">No hay citas para estos filtros.</p>}
      </div>
    </div>
  );
}
