"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  Stethoscope,
  Scissors,
  Share2,
  BarChart3,
  ClipboardList,
  FolderKanban,
  Users,
  UserCircle,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { MODULOS, type Modulo } from "@/lib/modulos";
import { logoutAction } from "@/lib/procesos/actions";

/**
 * La barra lateral.
 *
 * ANTES: un riel azul oscuro de 96px con seis íconos sin nombre y un panel
 * que había que desplegar para ver los tableros de Analytics. Dos problemas
 * reales, no de gusto:
 *   · nadie sabe qué es cada ícono sin pasar el cursor por encima, así que
 *     para ir a un tablero había que adivinar o abrir el panel;
 *   · 96px de azul fuerte en todas las pantallas es lo que más hacía ver la
 *     plataforma antigua. El color más saturado de la interfaz estaba en el
 *     sitio que menos información lleva.
 *
 * AHORA: clara, 216px, con los nombres escritos y todo a la vista. Es lo que
 * hacen Attio y Linear, y la razón es la misma: la navegación debe leerse,
 * no adivinarse. El azul de Ebenezer no se va — se concentra en el ítem
 * activo, que es donde significa algo.
 *
 * NO SE PIERDE NINGUNA PUERTA: están Inicio, cada tablero permitido,
 * Procesos, Usuarios (solo admin), Mi perfil y Cerrar sesión, con los mismos
 * enlaces y los mismos permisos de antes. El panel desplegable desaparece
 * porque ya no hace falta: lo que escondía ahora está escrito.
 */

const ICONOS: Record<Modulo, LucideIcon> = {
  leads: Target,
  no_quirurgicos: Stethoscope,
  quirurgicos: Scissors,
  redes_sociales: Share2,
  frecuencias: BarChart3,
  venta_del_dia: ClipboardList,
  procesos: FolderKanban,
};

const ANALYTICS_ITEMS = MODULOS.filter((m) => m.grupo === "Analytics");

/** Una fila de la barra. Una sola forma para todas, así nada se desalinea. */
function Fila({
  href,
  icono: Icono,
  texto,
  activo,
}: {
  href: string;
  icono: LucideIcon;
  texto: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 rounded-xs px-2.5 py-[7px] text-[13px] transition-colors duration-micro ease-attio ${
        activo
          ? "bg-blue-10 font-medium text-blue"
          : "text-ink-2 hover:bg-ebbg hover:text-ink"
      }`}
    >
      {/* La marca de lo activo: una barrita a la izquierda. Es el detalle que
          deja saber dónde está uno sin tener que pintar toda la fila. */}
      <span
        className={`absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-pill bg-blue transition-opacity duration-micro ease-attio ${
          activo ? "opacity-100" : "opacity-0"
        }`}
      />
      <Icono
        className={`h-[15px] w-[15px] shrink-0 ${activo ? "text-blue" : "text-ink-3 group-hover:text-ink-2"}`}
        strokeWidth={1.75}
      />
      <span className="truncate">{texto}</span>
    </Link>
  );
}

export function Sidebar({ modulos, isAdmin }: { modulos: Modulo[]; isAdmin: boolean }) {
  const allowed = new Set(modulos);
  const analyticsAllowed = ANALYTICS_ITEMS.filter((m) => allowed.has(m.slug));
  const procesosPermitido = allowed.has("procesos");
  const pathname = usePathname();

  return (
    <aside className="flex w-[216px] shrink-0 flex-col border-r border-line bg-white">
      <Link
        href="/"
        className="flex h-[62px] shrink-0 items-center gap-2.5 border-b border-line-2 px-4"
      >
        <Image
          src="/brand/logo/logo-oscuro.png"
          alt="Ebenezer"
          width={34}
          height={34}
          className="h-[34px] w-[34px] object-contain"
          priority
        />
        <span className="text-[13.5px] font-medium tracking-[-0.01em] text-ink">
          Ebenezer
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <Fila href="/" icono={Home} texto="Inicio" activo={pathname === "/"} />

        {analyticsAllowed.length > 0 && (
          <>
            <div className="mb-1 mt-4 px-2.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-ink-3">
              Analytics
            </div>
            {analyticsAllowed.map((m) => (
              <Fila
                key={m.slug}
                href={m.href}
                icono={ICONOS[m.slug]}
                texto={m.label}
                activo={pathname === m.href}
              />
            ))}
          </>
        )}

        {procesosPermitido && (
          <>
            <div className="mb-1 mt-4 px-2.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-ink-3">
              Procesos
            </div>
            <Fila
              href="/procesos"
              icono={FolderKanban}
              texto="Procesos"
              activo={pathname === "/procesos" || pathname.startsWith("/procesos/")}
            />
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-line-2 px-2.5 py-2.5">
        {isAdmin && (
          <Fila
            href="/usuarios"
            icono={Users}
            texto="Usuarios"
            activo={pathname === "/usuarios"}
          />
        )}
        <Fila
          href="/perfil"
          icono={UserCircle}
          texto="Mi perfil"
          activo={pathname === "/perfil"}
        />
        <form action={logoutAction}>
          <button
            type="submit"
            className="group flex w-full items-center gap-2.5 rounded-xs px-2.5 py-[7px] text-[13px] text-ink-3 transition-colors duration-micro ease-attio hover:bg-ebbg hover:text-ink"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
