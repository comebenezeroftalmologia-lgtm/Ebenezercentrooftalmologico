import TableroCarteraAnalytics from "./TableroCarteraAnalytics";
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
  void Chispa;
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

  const maxTotal14 = ultimas.length
    ? Math.max(...ultimas.map((d) => d.total), 1)
    : 1;
  const acumulado14 = ultimas.reduce((acc, d) => acc + d.total, 0);
  const promedio14 = ultimas.length
    ? Math.round(acumulado14 / ultimas.length)
    : 0;
  const diaPico14 = ultimas.length
    ? ultimas.reduce((best, d) => (d.total > best.total ? d : best), ultimas[0])
    : null;

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
        <section className="mb-6 overflow-hidden rounded-[18px] border border-[#DCE8F8] border-l-[4px] border-l-[#2563EB] bg-white shadow-[0_8px_24px_-10px_rgba(14,36,94,0.10)]">
          {/* Franja superior azul hielo de la tarjeta (Opción 3) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6EEF8] bg-gradient-to-r from-[#EDF4FE] via-[#F5F9FF] to-[#EDF4FE] px-6 py-2.5">
            <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#1E3A8A]">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              <span>Último cierre operativo · {nombreDia} {fechaLarga}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[12px]">
              <span className="text-[#475569]">
                Acumulado 14 días:{" "}
                <strong className="font-extrabold tabular-nums text-[#0E245E]">
                  {formatNumber(acumulado14)}
                </strong>
              </span>
              <span className="hidden text-[#CBD5E1] sm:inline">|</span>
              <span className="text-[#475569]">
                Promedio diario:{" "}
                <strong className="font-extrabold tabular-nums text-[#0E245E]">
                  {formatNumber(promedio14)}
                </strong>
              </span>
              {diaPico14 && (
                <>
                  <span className="hidden text-[#CBD5E1] sm:inline">|</span>
                  <span className="text-[#475569]">
                    Día pico ({diaPico14.etiqueta}):{" "}
                    <strong className="font-extrabold tabular-nums text-[#1D4ED8]">
                      {formatNumber(diaPico14.total)}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-10 gap-y-6 p-6 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)]">
            {/* Columna izquierda: Cifra principal del cierre */}
            <div className="flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] bg-gradient-to-b from-[#F5F9FF] to-white p-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#475569]">
                  Atenciones facturadas
                </span>
                <div className="mt-2 flex items-baseline gap-2.5">
                  <Cifra
                    valor={ultimo[1].total}
                    espera={120}
                    mono={false}
                    className="text-[42px] font-extrabold leading-none tracking-[-0.03em] text-[#0E245E]"
                  />
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-bold tabular-nums ${
                      pct >= 100
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : pct >= 85
                        ? "bg-[#E6F0FD] text-[#1D58D8]"
                        : "bg-[#FEF3C7] text-[#B45309]"
                    }`}
                  >
                    {pct}% vs típico
                  </span>
                </div>
                <div className="mt-2.5 text-[12.5px] leading-[18px] text-[#52627C]">
                  Un <span className="font-semibold text-[#0E245E]">{nombreDia}</span> típico cierra en{" "}
                  <span className="font-extrabold tabular-nums text-[#0E245E]">
                    {formatNumber(ultimo[1].tipico ?? 0)}
                  </span>{" "}
                  atenciones.
                </div>
              </div>

              <div className="mt-4 border-t border-[#E6EEF8] pt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-[#475569]">
                  <span>Cumplimiento del día típico</span>
                  <span className="font-bold tabular-nums text-[#0E245E]">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2ECF8]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#10B981]"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Columna derecha: Gráfica de los últimos 14 días cerrados CON DATOS Y FECHAS EN CADA BARRA */}
            {ultimas.length > 2 && (
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#0E245E]">
                      Últimos {ultimas.length} días cerrados
                    </span>
                    <span className="ml-2 text-[11.5px] font-medium text-[#64748B]">
                      (cifra diaria de atenciones comparado contra su mismo día de la semana)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#475569]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#5B95F5]" />
                      Sobre el típico
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" />
                      Bajo el típico
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#1D4ED8]" />
                      Último cierre
                    </span>
                  </div>
                </div>

                {/* Lienzo de barras con onda de fondo y etiquetas completas */}
                <div className="relative pt-5">
                  {/* Onda suave de fondo */}
                  <div className="pointer-events-none absolute inset-x-0 top-3 bottom-6 z-0 overflow-hidden">
                    <svg
                      className="h-full w-full"
                      viewBox="0 0 700 130"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="eb-cierre-14d-wave" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.16" />
                          <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 65 C 50 52, 100 68, 150 42 C 200 18, 250 58, 300 54 C 350 50, 400 72, 450 62 C 500 52, 550 68, 600 44 C 650 24, 675 30, 700 34 L 700 130 L 0 130 Z"
                        fill="url(#eb-cierre-14d-wave)"
                      />
                    </svg>
                  </div>

                  <div
                    className="relative z-10 grid items-end gap-1.5 sm:gap-2"
                    style={{ gridTemplateColumns: `repeat(${ultimas.length}, minmax(0, 1fr))` }}
                  >
                    {ultimas.map((d, idx) => {
                      const esUltimo = idx === ultimas.length - 1;
                      const esPico = diaPico14 ? d.fecha === diaPico14.fecha : false;
                      const pctDia =
                        d.tipico && d.tipico > 0
                          ? Math.round((d.total / d.tipico) * 100)
                          : 100;
                      const bajoTipico = pctDia < 92;
                      const alturaPx = Math.max(
                        24,
                        Math.round((d.total / maxTotal14) * 104)
                      );

                      return (
                        <div
                          key={d.fecha}
                          title={`${d.etiqueta}: ${formatNumber(d.total)} atenciones (${pctDia}% del típico ${formatNumber(d.tipico ?? 0)})`}
                          className="group flex flex-col items-center justify-end"
                        >
                          {/* Cifra exacta encima de CADA barra */}
                          <span
                            className={`mb-1 whitespace-nowrap tabular-nums leading-none ${
                              esUltimo || esPico
                                ? "rounded-full border border-[#93C5FD] bg-white px-1.5 py-0.5 text-[10.5px] font-extrabold text-[#0E245E] shadow-[0_2px_6px_rgba(29,78,216,0.15)]"
                                : bajoTipico
                                ? "text-[10.5px] font-bold text-[#B45309]"
                                : "text-[10.5px] font-bold text-[#1E3A8A]"
                            }`}
                          >
                            {formatNumber(d.total)}
                          </span>

                          {/* Barra vertical con degradado ejecutivo */}
                          <div className="flex h-[108px] w-full items-end justify-center">
                            <div
                              style={{
                                height: `${alturaPx}px`,
                                background: esUltimo
                                  ? "linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)"
                                  : bajoTipico
                                  ? "linear-gradient(180deg, #F59E0B 0%, #FBBF24 100%)"
                                  : "linear-gradient(180deg, #5B95F5 0%, #9DC2FA 100%)",
                              }}
                              className={`w-full max-w-[38px] rounded-t-[6px] transition-all duration-200 ${
                                esUltimo
                                  ? "shadow-[0_4px_12px_rgba(29,78,216,0.35)] ring-1 ring-[#1D4ED8]/25"
                                  : "group-hover:brightness-95"
                              }`}
                            />
                          </div>

                          {/* Fecha corta debajo de CADA barra */}
                          <span
                            className={`mt-1.5 truncate text-[10px] leading-tight ${
                              esUltimo || esPico
                                ? "font-extrabold text-[#0E245E]"
                                : "font-semibold text-[#475569]"
                            }`}
                          >
                            {d.etiqueta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
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
                  className="group flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] border-l-[3.5px] border-l-[#2563EB] bg-[#FBFDFF] p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:border-l-[#1D4ED8] hover:bg-white hover:shadow-[0_6px_18px_rgba(14,36,94,0.06)]"
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
    
      <TableroCarteraAnalytics />
    </div>
  );
}