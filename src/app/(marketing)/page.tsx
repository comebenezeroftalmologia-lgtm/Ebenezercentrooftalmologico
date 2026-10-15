import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  FolderKanban,
  KanbanSquare,
  Megaphone,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS, type Modulo } from "@/lib/modulos";
import { traerDiasTipicos } from "@/lib/diaTipico";
import { formatNumber } from "@/lib/text";
import { Cifra, Chispa } from "@/components/eb";

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
  const cls = "h-4 w-4 shrink-0 text-blue";
  switch (slug) {
    case "venta_del_dia":
      return <CalendarCheck2 className={cls} strokeWidth={1.75} />;
    case "frecuencias":
      return <Activity className={cls} strokeWidth={1.75} />;
    case "leads":
      return <UserPlus className={cls} strokeWidth={1.75} />;
    case "quirurgicos":
      return <Stethoscope className={cls} strokeWidth={1.75} />;
    case "no_quirurgicos":
      return <BarChart3 className={cls} strokeWidth={1.75} />;
    case "redes_sociales":
      return <Megaphone className={cls} strokeWidth={1.75} />;
    case "procesos":
      return <FolderKanban className={cls} strokeWidth={1.75} />;
    case "proyectos":
      return <KanbanSquare className={cls} strokeWidth={1.75} />;
  }
}

export default async function Home() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const disponibles = MODULOS.filter((m) => modulos.has(m.slug) || user.isAdmin);

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
  const gobierno = disponibles.filter(
    (m) => m.slug === "procesos" || m.slug === "proyectos"
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
      titulo: "Embudo Comercial y Pacientes",
      subtitulo: "Captación de pacientes, conversión de órdenes médicas y posicionamiento digital.",
      items: comercial,
    },
    {
      numero: "03",
      titulo: "Gobierno Organizacional y Ejecución",
      subtitulo: "Gestión por áreas, Atención al Usuario (SIAU), procesos y proyectos internos.",
      items: gobierno,
    },
  ].filter((b) => b.items.length > 0);

  return (
    <div className="max-w-[1080px] pb-12">
      <header className="animate-asomar">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Centro Oftalmológico Ebenezer
        </div>
        <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-ink">
          Hola, {user.nombreCompleto.split(" ")[0]}
        </h1>
        <p className="mt-2 text-[14px] text-ink-3">
          Selecciona un tablero o área en la bandeja izquierda, o entra directo desde aquí.
        </p>
      </header>

      {ultimo && pct !== null ? (
        <section
          className="mt-7 grid grid-cols-1 gap-x-14 gap-y-6 rounded-xl border border-line bg-white p-6 shadow-xs lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] animate-asomar"
          style={{ animationDelay: "60ms" }}
        >
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
              Último cierre operativo · {nombreDia} {fechaLarga}
            </div>
            <div className="flex items-baseline gap-2.5">
              <Cifra
                valor={ultimo[1].total}
                espera={120}
                mono={false}
                className="text-[42px] font-medium leading-none tracking-[-0.03em] text-ink"
              />
              <span
                className={`text-[15px] font-medium tabular-nums ${
                  pct >= 100 ? "text-green" : pct >= 85 ? "text-ink-3" : "text-[#C0392B]"
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="mt-2 text-[12.5px] leading-[18px] text-ink-3">
              atenciones facturadas · un {nombreDia} típico cierra en{" "}
              <span className="font-cifra tabular-nums text-ink-2">
                {formatNumber(ultimo[1].tipico ?? 0)}
              </span>
            </div>
          </div>

          {ultimas.length > 2 ? (
            <div className="min-w-0">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
                  Últimos {ultimas.length} días cerrados
                </span>
                <span className="text-[11.5px] text-ink-3">
                  comparado contra su mismo día de la semana
                </span>
              </div>
              <Chispa dias={ultimas} />
              <div className="mt-2 flex justify-between text-[11px] text-ink-3">
                <span>{ultimas[0].etiqueta}</span>
                <span>{ultimas[ultimas.length - 1].etiqueta}</span>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {disponibles.length === 0 ? (
        <div className="mt-8 rounded-xl border border-line bg-white p-6 text-sm text-ink-3">
          Todavía no tienes acceso a ningún módulo. Pídele a un administrador que te asigne acceso
          desde <span className="font-medium text-navy">Usuarios</span>.
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {bloques.map((bloque) => (
            <section key={bloque.numero} className="animate-asomar">
              <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-navy px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-aqua">
                    {bloque.numero}
                  </span>
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-navy">
                    {bloque.titulo}
                  </h2>
                </div>
                <p className="text-xs text-ink-3">{bloque.subtitulo}</p>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {bloque.items.map((m) => (
                  <Link
                    key={m.slug}
                    href={m.href}
                    className="group flex flex-col justify-between rounded-xl border border-line bg-white p-4 shadow-xs transition-all duration-150 ease-eb-out hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-sm"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F5F9] transition-colors group-hover:bg-blue/10">
                            <IconoTarjeta slug={m.slug} />
                          </span>
                          <p className="text-[14px] font-semibold text-navy group-hover:text-blue">
                            {m.label}
                          </p>
                        </div>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-blue"
                          strokeWidth={1.75}
                        />
                      </div>
                      <p className="text-xs leading-relaxed text-ink-3">
                        {SUBTITULOS[m.slug]}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

