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
import type { DatosPortada } from "@/lib/portadaReal";
import { SelectorFechaPortada } from "@/components/SelectorFechaPortada";

/* La curva de la tarjeta de atenciones se DIBUJA con la serie real de los
   ultimos dias. Antes los cuatro trazos eran curvas a mano que siempre
   subian: una linea de tendencia inventada enganna igual que una cifra
   inventada, y encima cuesta mas notarlo. Las tarjetas que no tienen
   serie propia ya no llevan curva. */
function trazo(valores: number[]): { linea: string; area: string; x: number; y: number } | null {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const pts = valores.map((v, i) => {
    const x = 2 + (i * 74) / (valores.length - 1);
    const y = 32 - ((v - min) / rango) * 26;
    return [x, y] as const;
  });
  const linea = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const fin = pts[pts.length - 1];
  return {
    linea,
    area: `${linea} L ${fin[0].toFixed(1)} 36 L 2 36 Z`,
    x: fin[0],
    y: fin[1],
  };
}

export function ExecutiveOverview({
  mode,
  userName,
  datos,
}: {
  mode: "inicio" | "analytics";
  userName?: string;
  datos: DatosPortada;
}) {
  const primerNombre = userName ? userName.trim().split(/\s+/)[0] : "Pedro";

  const curvaAtenciones = trazo(datos.serie.map((p) => p.valor));

  const kpis = [
    {
      titulo: "Atenciones facturadas",
      ...datos.atenciones,
      href: "/frecuencias",
      Icono: Users,
      borderColor: "#2563EB",
      iconBg: "#DCEBFE",
      iconColor: "#1D4ED8",
      sparkColor: "#2563EB",
      sparkGradId: "eb-kpi-spark-1",
      curva: curvaAtenciones,
    },
    {
      titulo: "Asistencia del día",
      ...datos.asistencia,
      href: "/venta-del-dia",
      Icono: CircleDollarSign,
      borderColor: "#10B981",
      iconBg: "#D1FAE5",
      iconColor: "#059669",
      sparkColor: "#10B981",
      sparkGradId: "eb-kpi-spark-2",
      curva: null,
    },
    {
      titulo: "Tiempo en el centro",
      ...datos.espera,
      href: "/digiturno-contact",
      Icono: Clock,
      borderColor: "#8B5CF6",
      iconBg: "#EDE9FE",
      iconColor: "#7C3AED",
      sparkColor: "#8B5CF6",
      sparkGradId: "eb-kpi-spark-3",
      curva: null,
    },
    {
      titulo: "Cirugías programadas",
      ...datos.cirugias,
      href: "/quirurgicos",
      Icono: Calendar,
      borderColor: "#F59E0B",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      sparkColor: "#F59E0B",
      sparkGradId: "eb-kpi-spark-4",
      curva: null,
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
        fechaISO={mode === "inicio" ? datos.fecha : undefined}
        rightControls={
          mode === "inicio" ? (
            <SelectorFechaPortada fecha={datos.fecha} maximo={datos.hoy} />
          ) : undefined
        }
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
                    <span
                      className={`text-[26px] font-extrabold leading-none tracking-[-0.03em] tabular-nums ${
                        kpi.hayDato ? "text-[#0E245E]" : "text-[#94A3B8]"
                      }`}
                    >
                      {kpi.valor}
                    </span>
                    {/* La capsula solo aparece cuando hay comparacion de verdad.
                        Y el color sigue a la flecha: antes era verde siempre,
                        asi que un dato a la baja se veia como una mejora. */}
                    {kpi.delta && kpi.flecha ? (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                          kpi.flecha === "up"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : "bg-[#FEE2E2] text-[#B91C1C]"
                        }`}
                      >
                        {kpi.flecha === "up" ? (
                          <ArrowUp className="h-2.5 w-2.5" strokeWidth={2.5} />
                        ) : (
                          <ArrowDown className="h-2.5 w-2.5" strokeWidth={2.5} />
                        )}
                        {kpi.delta}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[11.5px] font-medium text-[#64748B]">
                    {kpi.subtitulo}
                  </p>
                </div>

                {/* Mini-gráfica: solo donde hay serie real que dibujar. */}
                {kpi.curva ? (
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
                      <path d={kpi.curva.area} fill={`url(#${kpi.sparkGradId})`} />
                      <path
                        d={kpi.curva.linea}
                        stroke={kpi.sparkColor}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx={kpi.curva.x}
                        cy={kpi.curva.y}
                        r="2.8"
                        fill="#FFFFFF"
                        stroke={kpi.sparkColor}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </section>

      {/* Fila 2: Producción reciente — serie real del motor */}
      <ProduccionRecienteChart
        serie={datos.serie}
        meta={datos.metaSerie}
        max={datos.maxSerie}
        titulo={datos.tituloSerie}
        subtitulo={datos.subtituloSerie}
      />

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