import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";
import { traerUltimoDia } from "@/lib/diaTipico";
import { formatNumber } from "@/lib/text";
import { Cifra } from "@/components/eb";

/**
 * Inicio.
 *
 * Antes era un menú: saludo, frase y una rejilla de tarjetas con el nombre
 * del módulo dentro. Nada decía cómo va el negocio, que es lo primero que
 * uno quiere saber al entrar.
 *
 * Lo que cambia, sin quitar nada:
 *   · una línea arriba con el cierre del último día, contra un día igual de
 *     la semana. Es el único dato nuevo, y sale de un archivo pequeño que ya
 *     escribe el motor; si no se puede traer, la línea no aparece y la
 *     página sigue igual de servible.
 *   · las tarjetas con borde y sombra pasan a ser una lista con líneas
 *     finas, como en Attio. Los mismos módulos, los mismos enlaces.
 *   · el azul de Ebenezer aparece al pasar por encima, no en reposo.
 *
 * Procesos sigue estando: ahora como una fila más de la lista en vez de un
 * botón suelto al final, porque es un módulo como los otros.
 */

export const dynamic = "force-dynamic";

const DIA_SEMANA = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

export default async function Home() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const disponibles = MODULOS.filter((m) => modulos.has(m.slug));

  // Procesos salia SIEMPRE como un boton aparte al final, tuviera o no la
  // persona el modulo asignado. Se conserva tal cual: si no esta en su lista,
  // se agrega igual. Quitarlo seria perderle una puerta a alguien.
  const PROCESOS = MODULOS.find((m) => m.slug === "procesos");
  const filas =
    PROCESOS && !disponibles.some((m) => m.slug === "procesos")
      ? [...disponibles, PROCESOS]
      : disponibles;

  // Contexto, no dato esencial: si falla, la portada se muestra sin él.
  const ultimo = modulos.has("frecuencias") ? await traerUltimoDia() : null;
  const pct =
    ultimo?.tipico && ultimo.tipico > 0
      ? Math.round((ultimo.total / ultimo.tipico) * 100)
      : null;
  const nombreDia = ultimo
    ? DIA_SEMANA[new Date(ultimo.fecha + "T12:00:00").getDay()]
    : "";
  const fechaCorta = ultimo
    ? new Date(ultimo.fecha + "T12:00:00").toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="max-w-[760px]">
      <header className="animate-asomar">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Centro Oftalmológico Ebenezer
        </div>
        <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-ink">
          Hola, {user.nombreCompleto.split(" ")[0]}
        </h1>
      </header>

      {/* El pulso del negocio, en una línea. Se dice qué día es para que
          nadie lea el cierre de ayer como si fuera el de hoy. */}
      {ultimo && pct !== null ? (
        <section
          className="mt-7 border-t border-line-2 pt-6 animate-asomar"
          style={{ animationDelay: "60ms" }}
        >
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
            Último cierre · {nombreDia} {fechaCorta}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Cifra
              valor={ultimo.total}
              espera={120}
              mono={false}
              className="text-[40px] font-medium leading-none tracking-[-0.025em] text-ink"
            />
            <span className="text-[13.5px] text-ink-2">
              atenciones facturadas · un {nombreDia} típico cierra en{" "}
              <span className="font-cifra tabular-nums text-ink">
                {formatNumber(ultimo.tipico ?? 0)}
              </span>
            </span>
            <span
              className={`font-cifra text-[13.5px] font-medium tabular-nums ${
                pct >= 100 ? "text-green" : "text-[#B3541E]"
              }`}
            >
              {pct}%
            </span>
          </div>
        </section>
      ) : null}

      <section
        className="mt-7 border-t border-line-2 pt-6 animate-asomar"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Tableros
        </h2>

        {/* El aviso va cuando no hay NINGUN tablero asignado, igual que antes.
            La lista se muestra siempre, porque Procesos siempre esta. */}
        {disponibles.length === 0 ? (
          <p className="mb-4 mt-3 text-[13px] leading-[20px] text-ink-3">
            Todavía no tiene acceso a ningún tablero. Pídale a un administrador que le
            asigne un módulo desde <span className="text-ink">Procesos → Usuarios</span>.
          </p>
        ) : null}

        {filas.length > 0 ? (
          <ul>
            {filas.map((m, i) => (
              <li key={m.slug}>
                {/* Una fila, no una tarjeta. La flecha se separa al pasar por
                    encima: es el gesto de Attio, 300 ms con su curva. */}
                <Link
                  href={m.href}
                  className="group -mx-2 flex items-center justify-between gap-4 rounded-xs border-b border-line-2 px-2 py-3 transition-colors duration-micro ease-attio hover:bg-ebbg"
                  style={{ animationDelay: `${140 + i * 40}ms` }}
                >
                  <span className="text-[14.5px] text-ink transition-colors duration-micro ease-attio group-hover:text-blue">
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
