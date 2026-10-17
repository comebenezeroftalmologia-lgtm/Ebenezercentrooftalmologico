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
      borderColor: "#2563EB",
      iconBg: "#DCEBFE",
      iconColor: "#1D4ED8",
      sparkColor: "#2563EB",
      sparkGradId: "eb-kpi-spark-1",
      sparkPath: "M 2 30 C 14 29, 20 23, 30 24 C 40 25, 48 15, 58 14 C 65 13, 70 8, 76 6",
      sparkArea: "M 2 30 C 14 29, 20 23, 30 24 C 40 25, 48 15, 58 14 C 65 13, 70 8, 76 6 L 76 36 L 2 36 Z",
      endX: 76,
      endY: 6,
    },
    {
      titulo: "Producción del día",
      valor: "$ 28,4 M",
      delta: "+8,2%",
      flecha: "up" as const,
      subtitulo: "Acumulado mes: $ 342,0 M",
      href: "/venta-del-dia",
      Icono: CircleDollarSign,
      borderColor: "#10B981",
      iconBg: "#D1FAE5",
      iconColor: "#059669",
      sparkColor: "#10B981",
      sparkGradId: "eb-kpi-spark-2",
      sparkPath: "M 2 31 C 14 28, 22 26, 32 21 C 42 16, 50 19, 60 12 C 67 8, 71 7, 76 5",
      sparkArea: "M 2 31 C 14 28, 22 26, 32 21 C 42 16, 50 19, 60 12 C 67 8, 71 7, 76 5 L 76 36 L 2 36 Z",
      endX: 76,
      endY: 5,
    },
    {
      titulo: "Tiempo promedio de espera",
      valor: "14 min",
      delta: "-2,3%",
      flecha: "down" as const,
      subtitulo: "Meta institucional: < 18 min",
      href: "/procesos",
      Icono: Clock,
      borderColor: "#8B5CF6",
      iconBg: "#EDE9FE",
      iconColor: "#7C3AED",
      sparkColor: "#8B5CF6",
      sparkGradId: "eb-kpi-spark-3",
      sparkPath: "M 2 29 C 14 27, 22 24, 32 22 C 42 20, 50 16, 60 11 C 67 8, 71 7, 76 6",
      sparkArea: "M 2 29 C 14 27, 22 24, 32 22 C 42 20, 50 16, 60 11 C 67 8, 71 7, 76 6 L 76 36 L 2 36 Z",
      endX: 76,
      endY: 6,
    },
    {
      titulo: "Cirugías programadas",
      valor: "38",
      delta: "+6,4%",
      flecha: "up" as const,
      subtitulo: "Quirófano principal y láser",
      href: "/quirurgicos",
      Icono: Calendar,
      borderColor: "#F59E0B",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      sparkColor: "#10B981",
      sparkGradId: "eb-kpi-spark-4",
      sparkPath: "M 2 30 C 14 28, 22 23, 32 22 C 42 21, 50 14, 60 11 C 67 9, 71 7, 76 5",
      sparkArea: "M 2 30 C 14 28, 22 23, 32 22 C 42 21, 50 14, 60 11 C 67 9, 71 7, 76 5 L 76 36 L 2 36 Z",
      endX: 76,
      endY: 5,
    },
  ];

  const areas = [
    {
      titulo: "Operación Clínica y Asistencial",
      descripcion: "Producción, tiempos de espera, y atención clínica.",
      href: "/frecuencias",
      Icono: Target,
      borde: "border-l-[#2563EB]",
      fondoIcono: "bg-[#EBF2FF] text-[#1D58D8]",
    },
    {
      titulo: "Embudo Comercial y Pacientes",
      descripcion: "Captación, conversión y seguimiento de pacientes potenciales.",
      href: "/clientes-potenciales",
      Icono: BarChart2,
      borde: "border-l-[#10B981]",
      fondoIcono: "bg-[#E6F9F1] text-[#059669]",
    },
    {
      titulo: "Ordenamientos No Quirúrgicos",
      descripcion: "Conversión de órdenes de exámenes diagnósticos y procedimientos.",
      href: "/no-quirurgicos",
      Icono: FileText,
      borde: "border-l-[#8B5CF6]",
      fondoIcono: "bg-[#F3EEFF] text-[#7C3AED]",
    },
    {
      titulo: "Ordenamientos Quirúrgicos",
      descripcion: "Seguimiento de pacientes con orden de cirugía hasta programación efectiva.",
      href: "/quirurgicos",
      Icono: Sparkles,
      borde: "border-l-[#F59E0B]",
      fondoIcono: "bg-[#FEF5E7] text-[#D97706]",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px]">
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

      {/* Fila 1: 4 KPIs ejecutivos (Combinación Ganadora: Opción 3 + Mini-gráfica Opción 1) */}
      <section className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.Icono;
          return (
            <Link
              key={kpi.titulo}
              href={kpi.href}
              style={{ borderLeftColor: kpi.borderColor }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-[#E2ECF8] border-l-[3.5px] bg-white shadow-[0_6px_18px_-8px_rgba(14,36,94,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:shadow-[0_12px_24px_-10px_rgba(29,88,216,0.16)]"
            >
              {/* Franja superior azul hielo suave con título completo sin recortar (Opción 3) */}
              <div className="flex items-center justify-between gap-2 bg-gradient-to-b from-[#EDF4FD]/90 via-[#F5F9FF]/65 to-white px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    style={{ backgroundColor: kpi.iconBg, color: kpi.iconColor }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]"
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span className="text-[12.5px] font-semibold leading-snug tracking-[-0.01em] text-[#334155] group-hover:text-[#0E245E]">
                    {kpi.titulo}
                  </span>
                </div>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1D58D8]"
                  strokeWidth={2}
                />
              </div>

              {/* Cuerpo: Valor + cápsula verde a la izquierda y mini-gráfica de área a la derecha (Opción 1) */}
              <div className="flex items-end justify-between gap-2 px-4 pb-3.5 pt-1">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[26px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[#0E245E]">
                      {kpi.valor}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#15803D]">
                      {kpi.flecha === "up" ? (
                        <ArrowUp className="h-2.5 w-2.5" strokeWidth={2.5} />
                      ) : (
                        <ArrowDown className="h-2.5 w-2.5" strokeWidth={2.5} />
                      )}
                      {kpi.delta}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] font-medium text-[#64748B]">
                    {kpi.subtitulo}
                  </p>
                </div>

                {/* Mini-gráfica de área integrada en la tarjeta (Opción 1) */}
                <div className="shrink-0 pt-1">
                  <svg
                    className="h-[38px] w-[76px] overflow-visible"
                    viewBox="0 0 80 38"
                    fill="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id={kpi.sparkGradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={kpi.sparkColor} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={kpi.sparkColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={kpi.sparkArea} fill={`url(#${kpi.sparkGradId})`} />
                    <path
                      d={kpi.sparkPath}
                      stroke={kpi.sparkColor}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx={kpi.endX}
                      cy={kpi.endY}
                      r="2.8"
                      fill="#FFFFFF"
                      stroke={kpi.sparkColor}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
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