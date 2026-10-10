"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserCircle, Users } from "lucide-react";
import { MODULOS, type Modulo } from "@/lib/modulos";
import { logoutAction } from "@/lib/procesos/actions";

/**
 * La barra de navegación, arriba y en el azul de Ebenezer.
 *
 * ANTES: un riel vertical de 96px en azul oscuro con seis íconos sin
 * nombre y un panel que había que desplegar para ver los tableros. Dos
 * problemas reales, no de gusto: nadie sabe qué es cada ícono sin pasar el
 * cursor, y 96px del color más saturado de la interfaz estaban puestos en
 * el sitio que menos información lleva.
 *
 * AHORA: una franja arriba con los tableros escritos. El contenido gana
 * todo el ancho de la pantalla, que es donde están los números.
 *
 * NO SE PIERDE NINGUNA PUERTA. Están Inicio, cada tablero permitido,
 * Procesos, Usuarios (solo admin), Mi perfil y Cerrar sesión, con los
 * mismos enlaces y exactamente los mismos permisos de antes. Lo único que
 * desaparece es el panel desplegable, porque ya no esconde nada.
 *
 * El azul se queda donde significa: fondo de la barra, y el tablero en el
 * que uno está marcado con el aqua de la marca.
 */

const ANALYTICS = MODULOS.filter((m) => m.grupo === "Analytics");

/** Nombre corto SOLO para la barra: los oficiales no caben en una fila y
 *  salían cortados, que es peor que abreviar. El completo va en el tooltip
 *  y sigue intacto en Inicio, en /usuarios y en el título de cada página. */
const CORTO: Partial<Record<Modulo, string>> = {
  leads: "Clientes Potenciales",
  no_quirurgicos: "Ord. No Quirúrgicos",
  quirurgicos: "Ord. Quirúrgicos",
};

function Pestana({
  href,
  texto,
  completo,
  activo,
}: {
  href: string;
  texto: string;
  completo?: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      title={completo && completo !== texto ? completo : undefined}
      aria-current={activo ? "page" : undefined}
      className={`relative whitespace-nowrap px-3 py-[17px] text-[12.5px] transition-colors duration-micro ease-attio ${
        activo ? "font-medium text-aqua" : "text-white/75 hover:text-white"
      }`}
    >
      {texto}
      {activo ? (
        <span className="absolute inset-x-2.5 bottom-0 h-[2px] rounded-t-sm bg-aqua" />
      ) : null}
    </Link>
  );
}

export function BarraSuperior({
  modulos,
  isAdmin,
  nombre,
}: {
  modulos: Modulo[];
  isAdmin: boolean;
  nombre: string;
}) {
  const permitidos = new Set(modulos);
  const analytics = ANALYTICS.filter((m) => permitidos.has(m.slug));
  const procesos = permitidos.has("procesos");
  const pathname = usePathname();

  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="flex h-[54px] shrink-0 items-center gap-5 bg-navy px-5">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <Image
          src="/brand/logo/logo-claro.png"
          alt="Ebenezer"
          width={64}
          height={64}
          quality={95}
          className="h-7 w-7 object-contain"
          priority
        />
        <span className="text-[13.5px] font-medium tracking-[-0.01em] text-white">
          Ebenezer
        </span>
      </Link>

      {/* La fila de tableros. Se desplaza sola si no caben, en vez de
          apretarse hasta volverse ilegible. */}
      <nav className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Pestana href="/" texto="Inicio" activo={pathname === "/"} />
        {analytics.map((m) => (
          <Pestana
            key={m.slug}
            href={m.href}
            texto={CORTO[m.slug] ?? m.label}
            completo={m.label}
            activo={pathname === m.href}
          />
        ))}
        {procesos ? (
          <Pestana
            href="/procesos"
            texto="Procesos"
            activo={pathname === "/procesos" || pathname.startsWith("/procesos/")}
          />
        ) : null}
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        {isAdmin ? (
          <Link
            href="/usuarios"
            title="Usuarios"
            aria-label="Usuarios"
            className={`flex h-8 w-8 items-center justify-center rounded-xs transition-colors duration-micro ease-attio ${
              pathname === "/usuarios"
                ? "bg-white/15 text-aqua"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Users className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </Link>
        ) : null}

        <Link
          href="/perfil"
          title={nombre}
          className={`flex items-center gap-2 rounded-xs px-2 py-1.5 transition-colors duration-micro ease-attio ${
            pathname === "/perfil" ? "bg-white/15" : "hover:bg-white/10"
          }`}
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-white/16 text-[10.5px] font-medium text-white">
            {iniciales || <UserCircle className="h-4 w-4" strokeWidth={1.75} />}
          </span>
          <span className="hidden text-[12.5px] text-white/75 sm:inline">
            {nombre.split(" ")[0]}
          </span>
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-xs text-white/60 transition-colors duration-micro ease-attio hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </header>
  );
}
