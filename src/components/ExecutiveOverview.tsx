import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Compass,
  FileText,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { ProduccionRecienteChart } from "@/components/ProduccionRecienteChart";

export function ExecutiveOverview({
  mode,
  userName,
}: {
  mode: "inicio" | "analytics";
  userName?: string;
}) {
  const primerNombre = userName ? userName.trim().split(/\s+/)[0] : "Pedro";

  const kpis = [
    {
      titulo: "Atenciones facturadas",
      valor: "453",
      delta: "+11,5%",
      flecha: "up" as const,
      subtitulo: "vs. mismo período anterior",
      href: "/frecuencias",
      Icono: Users,
    },
    {
      titulo: "Producción del día",
      valor: "$28,4 M",
      delta: "+8,2%",
      flecha: "down" as const,
      subtitulo: "Total facturado hoy",
      href: "/frecuencias",
      Icono: CircleDollarSign,
    },
    {
      titulo: "Tiempo promedio de espera",
      valor: "24 min",
      delta: "-18,4%",
      flecha: "up" as const,
      subtitulo: "Desde la llegada del paciente",
      href: "/venta-del-dia",
      Icono: Clock,
    },
    {
      titulo: "Cirugías programadas",
      valor: "18",
      delta: "+6,7%",
      flecha: "up" as const,
      subtitulo: "Para los próximos 7 días",
      href: "/quirurgicos",
      Icono: Calendar,
    },
  ];

  const areas = [
    {
      titulo: "Operación Clínica y Asistencial",
      descripcion: "Producción, tiempos de espera, y atención clínica.",
      href: "/frecuencias",
      borde: "border-l-[#2563EB]",
      fondoIcono: "bg-[#EBF3FE] text-[#2563EB]",
      Icono: Target,
    },
    {
      titulo: "Embudo Comercial y Pacientes",
      descripcion: "Captación, conversión y seguimiento de pacientes potenciales.",
      href: "/leads",
      borde: "border-l-[#10B981]",
      fondoIcono: "bg-[#E6F8F1] text-[#10B981]",
      Icono: BarChart2,
    },
    {
      titulo: "Ordenamientos No Quirúrgicos",
      descripcion: "Conversión de órdenes de exámenes diagnósticos y procedimientos.",
      href: "/no-quirurgicos",
      borde: "border-l-[#8B5CF6]",
      fondoIcono: "bg-[#F3EEFF] text-[#8B5CF6]",
      Icono: FileText,
    },
    {
      titulo: "Ordenamientos Quirúrgicos",
      descripcion: "Seguimiento de pacientes con orden de cirugía hasta programación efectiva.",
      href: "/quirurgicos",
      borde: "border-l-[#F59E0B]",
      fondoIcono: "bg-[#FEF3E2] text-[#F59E0B]",
      Icono: Sparkles,
    },
  ];

  return (
    <div className="mx-auto max-w-[1360px] pb-8">
      <ExecutiveHeader
        overline="CENTRO OFTALMOLÓGICO EBENEZER"
        title={mode === "inicio" ? `Hola, ${primerNombre}` : "Resumen de Analítica"}
        subtitle={
          mode === "inicio"
            ? "Selecciona un tablero o área en la bandeja izquierda, o entra directo desde aquí."
            : "Pulso consolidado de operación clínica y embudo comercial."
        }
        variant={mode}
      />

      {/* Fila 1: 4 tarjetas KPI ejecutivas */}
      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.Icono;
          return (
            <Link
              key={kpi.titulo}
              href={kpi.href}
              className="group relative flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:shadow-[0_6px_20px_rgba(14,36,94,0.07)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#1D58D8]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                  <span className="truncate text-[13px] font-bold tracking-[-0.01em] text-[#0E245E]">
                    {kpi.titulo}
                  </span>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[#64748B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1D58D8]"
                  strokeWidth={2}
                />
              </div>

              <div className="mt-3.5 flex items-baseline gap-2.5">
                <span className="text-[31px] font-bold leading-none tracking-[-0.025em] tabular-nums text-[#0E245E]">
                  {kpi.valor}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums text-[#15803D]">
                  {kpi.flecha === "up" ? (
                    <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                  ) : (
                    <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
                  )}
                  {kpi.delta}
                </span>
              </div>

              <p className="mt-2 text-[12px] text-[#64748B]">{kpi.subtitulo}</p>
            </Link>
          );
        })}
      </section>

      {/* Fila 2: Producción reciente (14 días) */}
      <ProduccionRecienteChart />

      {/* Fila 3: Accesos por área */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="h-[18px] w-[18px] text-[#1D58D8]" strokeWidth={2} />
            <h2 className="text-[15.5px] font-bold tracking-[-0.015em] text-[#0E245E]">
              Accesos por área
            </h2>
          </div>
          <Link
            href="/frecuencias"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#64748B] transition hover:text-[#0E245E]"
          >
            <span>Pulsa un tablero para ver más detalles</span>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {areas.map((area) => {
            const Icon = area.Icono;
            return (
              <Link
                key={area.titulo}
                href={area.href}
                className={`group flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] border-l-[3.5px] ${area.borde} bg-white p-4 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:shadow-[0_6px_20px_rgba(14,36,94,0.07)]`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${area.fondoIcono}`}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                      <h3 className="text-[13px] font-bold leading-snug tracking-[-0.01em] text-[#0E245E]">
                        {area.titulo}
                      </h3>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[#64748B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0E245E]"
                      strokeWidth={2}
                    />
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-[#52627C]">
                    {area.descripcion}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
