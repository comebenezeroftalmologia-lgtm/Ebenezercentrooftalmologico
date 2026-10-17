import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  LineChart,
  Target,
  Wallet,
} from "lucide-react";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS, type Modulo } from "@/lib/modulos";
import { traerDiasTipicos } from "@/lib/diaTipico";
import { formatNumber } from "@/lib/text";
import { Cifra, Chispa } from "@/components/eb";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";

export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";

const DIA_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIA_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function hoyColombia(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const aFecha = (f: string) => new Date(f + "T12:00:00");

const SUBTITULOS: Record<Modulo, string> = {
  venta_del_dia: "Atenciones del día, oportunidad de primera vez y programación de cirugía.",
  frecuencias: "Producción histórica por unidad funcional, convenio, médico y facturación.",
  leads: "Captación de pacientes potenciales, inversión en pauta y retorno comercial.",
  quirurgicos: "Seguimiento de pacientes con orden de cirugía hasta programación efectiva.",
  no_quirurgicos: "Conversión de órdenes de exámenes diagnósticos y procedimientos.",
  redes_sociales: "Alcance digital, interacción y rendimiento de campañas.",
  procesos: "Mapa de las 13 áreas, Atención al Usuario (SIAU), procesos y tareas.",
  proyectos: "Espacios de trabajo, tableros Kanban y seguimiento de iniciativas.",
};

function IconoTarjeta({ slug }: { slug: Modulo }) {
  const cls = "h-[18px] w-[18px] shrink-0 text-[#1D58D8]";
  switch (slug) {
    case "venta_del_dia":
      return <CalendarClock className={cls} strokeWidth={1.9} />;
    case "frecuencias":
      return <LineChart className={cls} strokeWidth={1.9} />;
    case "leads":
      return <Target className={cls} strokeWidth={1.9} />;
    case "quirurgicos":
      return <Wallet className={cls} strokeWidth={1.9} />;
    case "no_quirurgicos":
      return <LineChart className={cls} strokeWidth={1.9} />;
    default:
      return <Target className={cls} strokeWidth={1.9} />;
  }
}

export default async function AnalyticsOverview() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const disponibles = MODULOS.filter(
    (m) => (modulos.has(m.slug) || user.isAdmin) && m.grupo === "Analytics"
  );

  const archivo =
    modulos.has("frecuencias") || modulos.has("venta_del_dia") || user.isAdmin
      ? await traerDiasTipicos()
      : null;
  const hoy = hoyColombia();
  const cerrados = Object.entries(archivo?.dias ?? {})
    .filter(([f]) => f < hoy)
    .sort(([a], [b]) => (a < b ? -1 : 1));

  const ultimas = cerrados.slice(-14).map(([fecha, d]) => ({
    fecha,
    total: d.total,
    tipico: d.tipico,
    etiqueta: `${DIA_CORTO[aFecha(fecha).getDay()]} ${aFecha(fecha).getDate()}`,
  }));

  const ultimo = cerrados.length ? cerrados[cerrados.length - 1] : null;
  const pct =
    ultimo && ultimo[1].tipico && ultimo[1].tipico > 0
      ? Math.round((ultimo[1].total / ultimo[1].tipico) * 100)
      : null;
  const nombreDia = ultimo ? DIA_SEMANA[aFecha(ultimo[0]).getDay()] : "";
  const fechaLarga = ultimo
    ? aFecha(ultimo[0]).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
    : "";

  const operacion = disponibles.filter(
    (m) => m.slug === "venta_del_dia" || m.slug === "frecuencias"
  );
  const comercial = disponibles.filter(
    (m) =>
      m.slug === "leads" ||
      m.slug === "quirurgicos" ||
      m.slug === "no_quirurgicos" ||
      m.slug === "redes_sociales"
  );

  const bloques = [
    {
      numero: "01",
      titulo: "Operación Clínica y Asistencial",
      subtitulo: "Pulso diario de atención, tiempos de espera y producción por unidad funcional.",
      items: operacion,
    },
    {
      numero: "02",
      titulo: "Embudo Comercial y Conversión de Pacientes",
      subtitulo: "Captación de pacientes, conversión de órdenes médicas y posicionamiento digital.",
      items: comercial,
    },
  ].filter((b) => b.items.length > 0);

  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <ExecutiveHeader
        overline="MÓDULO · ANALYTICS Y TABLEROS"
        title="Resumen de Analítica"
        subtitle="Indicadores operativos, financieros y comerciales consolidados por frente."
        variant="analytics"
      />

      {ultimo && pct !== null && (
        <section className="mb-6 grid grid-cols-1 gap-x-12 gap-y-6 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)] lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[#5B6B8C]">
              Último cierre operativo · {nombreDia} {fechaLarga}
            </div>
            <div className="flex items-baseline gap-2.5">
              <Cifra
                valor={ultimo[1].total}
                espera={120}
                mono={false}
                className="text-[40px] font-bold leading-none tracking-[-0.03em] text-[#0E245E]"
              />
              <span
                className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold tabular-nums ${
                  pct >= 100
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : pct >= 85
                    ? "bg-[#E6F0FD] text-[#1D58D8]"
                    : "bg-[#FEE2E2] text-[#DC2626]"
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="mt-2 text-[12.5px] leading-[18px] text-[#64748B]">
              atenciones facturadas · un {nombreDia} típico cierra en{" "}
              <span className="font-semibold tabular-nums text-[#0E245E]">
                {formatNumber(ultimo[1].tipico ?? 0)}
              </span>
            </div>
          </div>

          {ultimas.length > 2 && (
            <div className="min-w-0">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#5B6B8C]">
                  Últimos {ultimas.length} días cerrados
                </span>
                <span className="text-[11.5px] text-[#64748B]">
                  comparado contra su mismo día de la semana
                </span>
              </div>
              <Chispa dias={ultimas} />
              <div className="mt-2 flex justify-between text-[11px] text-[#64748B]">
                <span>{ultimas[0].etiqueta}</span>
                <span>{ultimas[ultimas.length - 1].etiqueta}</span>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="space-y-6">
        {bloques.map((bloque) => (
          <section
            key={bloque.numero}
            className="rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]"
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EEF2F8] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="rounded-[6px] bg-[#E6F0FD] px-2 py-0.5 text-[11px] font-bold tracking-wider text-[#1D58D8]">
                  {bloque.numero}
                </span>
                <h2 className="text-[16px] font-bold tracking-[-0.015em] text-[#0E245E]">
                  {bloque.titulo}
                </h2>
              </div>
              <p className="text-[12.5px] text-[#64748B]">{bloque.subtitulo}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bloque.items.map((m) => (
                <Link
                  key={m.slug}
                  href={m.href}
                  className="group flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] bg-[#FBFDFF] p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:bg-white hover:shadow-[0_6px_18px_rgba(14,36,94,0.06)]"
                >
                  <div>
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE]">
                          <IconoTarjeta slug={m.slug} />
                        </span>
                        <p className="text-[14.5px] font-bold text-[#0E245E] group-hover:text-[#1D58D8]">
                          {m.label}
                        </p>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#1D58D8]"
                        strokeWidth={2}
                      />
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-[#64748B]">
                      {SUBTITULOS[m.slug]}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}