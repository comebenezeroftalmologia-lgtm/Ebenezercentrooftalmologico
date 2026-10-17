import Link from "next/link";
import {
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
      subtitulo: "vs. mismo período anterior",
      href: "/frecuencias",
      icono: Users,
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
      subtitulo: "Acumulado mes: $ 342,0 M",
      href: "/venta-del-dia",
      icono: CircleDollarSign,
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
      subtitulo: "Meta institucional: < 18 min",
      href: "/procesos",
      icono: Clock,
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
      subtitulo: "Quirófano principal y láser",
      href: "/quirurgicos",
      icono: Calendar,
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
      titulo: "Tableros y Analítica",
      descripcion:
        "Indicadores de demanda, frecuencias de atención, comportamiento quirúrgico y facturación diaria.",
      href: "/analytics",
      icono: Compass,
      acento: "border-t-[#2B6BE4]",
      fondoIcono: "bg-[#EBF2FF] text-[#1D58D8]",
    },
    {
      titulo: "Procesos y Calidad",
      descripcion:
        "Mapa de procesos institucional, caracterizaciones, formatos vigentes y mejora continua.",
      href: "/procesos",
      icono: FileText,
      acento: "border-t-[#0EA5E9]",
      fondoIcono: "bg-[#E0F2FE] text-[#0284C7]",
    },
    {
      titulo: "Proyectos e Innovación",
      descripcion:
        "Portafolio estratégico de iniciativas, seguimiento de hitos, responsables y entregables.",
      href: "/proyectos",
      icono: Target,
      acento: "border-t-[#6366F1]",
      fondoIcono: "bg-[#EEF2FF] text-[#4F46E5]",
    },
    {
      titulo: "Crecimiento y Pacientes",
      descripcion:
        "Embudo de clientes potenciales, alcance en redes sociales y conversión de campañas.",
      href: "/clientes-potenciales",
      icono: Sparkles,
      acento: "border-t-[#14B8A6]",
      fondoIcono: "bg-[#CCFBF1] text-[#0D9488]",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <ExecutiveHeader
        overline={
          mode === "inicio"
            ? "CENTRO OFTALMOLÓGICO EBENEZER · PORTAL EJECUTIVO"
            : "CENTRO OFTALMOLÓGICO EBENEZER · ANALÍTICA CLÍNICA"
        }
        title={
          mode === "inicio"
            ? `Bienvenido, ${primerNombre}`
            : "Resumen Ejecutivo de Analítica"
        }
        subtitle={
          mode === "inicio"
            ? "Vista consolidada de operación clínica, producción diaria y desempeño asistencial."
            : "Monitoreo integral de productividad, demanda de servicios y eficiencia operativa."
        }
        illustration={mode === "inicio" ? "inicio" : "analytics"}
      />

      {/* 4 Tarjetas Ejecutivas de KPIs (Combinación Ganadora: Opción 3 + Mini-Gráfica Opción 1) */}
      <section aria-label="Indicadores principales" className="mb-5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icono;
            return (
              <Link
                key={kpi.titulo}
                href={kpi.href}
                style={{ borderLeftColor: kpi.borderColor }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-[#E2ECF8] border-l-[3.5px] bg-white shadow-[0_6px_18px_-8px_rgba(14,36,94,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C5DAF6] hover:shadow-[0_12px_24px_-10px_rgba(29,88,216,0.16)]"
              >
                {/* Franja superior azul hielo suave con ícono circular y título completo sin recortar (Opción 3) */}
                <div className="flex items-center gap-2.5 bg-gradient-to-b from-[#EDF4FD]/90 via-[#F5F9FF]/65 to-white px-4 pt-3.5 pb-2">
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

                {/* Cuerpo de la tarjeta: Valor + cápsula verde a la izquierda y mini-gráfica de área a la derecha (Opción 1) */}
                <div className="flex items-end justify-between gap-2 px-4 pb-3.5 pt-1">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[25px] font-extrabold leading-none tracking-[-0.03em] text-[#0E245E]">
                        {kpi.valor}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#15803D]">
                        <svg
                          className="h-2.5 w-2.5"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2.5 8.5 9.5 2.5" />
                          <path d="M4.5 2.5h5v5" />
                        </svg>
                        {kpi.delta}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] font-medium text-[#64748B]">
                      {kpi.subtitulo}
                    </p>
                  </div>

                  {/* Mini-gráfica de tendencia dentro del recuadro (Opción 1) */}
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
        </div>
      </section>

      <ProduccionRecienteChart />

      <section aria-label="Áreas de trabajo">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-[#0E245E]">
            Áreas de trabajo
          </h2>
          <span className="text-[11.5px] font-medium text-[#64748B]">
            Acceso directo a módulos operativos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {areas.map((area) => {
            const Icon = area.icono;
            return (
              <Link
                key={area.titulo}
                href={area.href}
                className={`group flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] border-t-[3px] ${area.acento} bg-white p-4 shadow-[0_2px_8px_rgba(14,36,94,0.03)] transition-all hover:-translate-y-0.5 hover:border-[#BFD3EE] hover:shadow-[0_8px_20px_rgba(14,36,94,0.07)]`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${area.fondoIcono}`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <h3 className="text-[13.5px] font-bold text-[#0E245E]">
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

export default ExecutiveOverview;