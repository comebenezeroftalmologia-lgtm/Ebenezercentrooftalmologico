import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";
import { traerDiasTipicos } from "@/lib/diaTipico";
import { formatNumber } from "@/lib/text";
import { Cifra, Chispa } from "@/components/eb";

export const dynamic = "force-dynamic";

const DIA_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIA_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function hoyColombia(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const aFecha = (f: string) => new Date(f + "T12:00:00");

export default async function AnalyticsOverview() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const disponibles = MODULOS.filter((m) => modulos.has(m.slug) && m.grupo === "Analytics");

  const archivo = modulos.has("frecuencias") ? await traerDiasTipicos() : null;
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

  return (
    <div className="max-w-[1040px]">
      <header className="animate-asomar">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Módulo
        </div>
        <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-ink">
          Analytics y Tableros
        </h1>
        <p className="mt-2 text-[14px] text-ink-3">
          Indicadores operativos, financieros y comerciales consolidados.
        </p>
      </header>

      {ultimo && pct !== null ? (
        <section
          className="mt-7 grid grid-cols-1 gap-x-14 gap-y-7 border-t border-line-2 pt-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] animate-asomar"
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
                className="text-[44px] font-medium leading-none tracking-[-0.03em] text-ink"
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
                  cada día contra uno igual de la semana
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

      <section
        className="mt-8 border-t border-line-2 pt-6 animate-asomar"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Tableros Disponibles
        </h2>

        {disponibles.length === 0 ? (
          <p className="mb-4 mt-3 text-[13px] leading-[20px] text-ink-3">
            Todavía no tiene acceso a ningún tablero de Analytics. Pídale a un administrador que le
            asigne un módulo desde <span className="text-ink">Procesos → Usuarios</span>.
          </p>
        ) : null}

        {disponibles.length > 0 ? (
          <ul className="grid grid-cols-1 gap-x-14 sm:grid-cols-2">
            {disponibles.map((m) => (
              <li key={m.slug}>
                <Link
                  href={m.href}
                  className="group -mx-2 flex items-center justify-between gap-4 rounded-xs border-b border-line-2 px-2 py-3 transition-colors duration-micro ease-attio hover:bg-ebbg"
                >
                  <span className="text-[14px] text-ink transition-colors duration-micro ease-attio group-hover:text-blue">
                    {m.label}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-ink-3 transition-all duration-gesto ease-attio group-hover:translate-x-1 group-hover:text-blue"
                    strokeWidth={1.75}
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
