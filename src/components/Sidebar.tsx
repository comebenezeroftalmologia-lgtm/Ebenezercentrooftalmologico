"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Home,
  FolderKanban,
  KanbanSquare,
  Users,
  UserCircle,
  LogOut,
} from "lucide-react";
import { MODULOS, type Modulo } from "@/lib/modulos";
import { logoutAction } from "@/lib/procesos/actions";

const ANALYTICS_ITEMS = MODULOS.filter((m) => m.grupo === "Analytics");

export function Sidebar({ modulos, isAdmin }: { modulos: Modulo[]; isAdmin: boolean }) {
  const allowed = new Set(modulos);
  const analyticsAllowed = ANALYTICS_ITEMS.filter((m) => allowed.has(m.slug));
  const procesosPermitido = allowed.has("procesos");
  const proyectosPermitido = allowed.has("proyectos");

  const pathname = usePathname();
  const analyticsActivo = pathname === "/analytics" || analyticsAllowed.some((m) => pathname === m.href);

  return (
    <div className="relative flex shrink-0">
      <aside className="flex w-[96px] shrink-0 flex-col items-center bg-navy py-5 min-h-screen">
        {/* Textura viva sutil: un gradiente que simula un cristal oscuro superior */}
        

        <Link href="/" className="mb-5 flex h-20 w-20 items-center justify-center">
          <Image
            src="/brand/logo/logo-claro.png"
            alt="Ebenezer"
            width={80}
            height={80}
            className="h-20 w-20 object-contain"
            priority
          />
        </Link>

        <div className="mb-2 h-px w-8 bg-white/10" />

        <nav className="flex flex-1 flex-col items-center gap-2">
          <Link
            href="/"
            aria-label="Inicio"
            title="Inicio"
            className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
              pathname === "/" ? "bg-aqua text-navy" : "text-white/80 hover:bg-navy-90 hover:text-aqua"
            }`}
          >
            <Home className="h-5 w-5" strokeWidth={1.75} />
          </Link>

          {analyticsAllowed.length > 0 && (
            <Link
              href="/analytics"
              aria-label="Analytics"
              title="Analytics"
              className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
                analyticsActivo
                  ? "bg-aqua text-navy"
                  : "text-white/80 hover:bg-navy-90 hover:text-aqua"
              }`}
            >
              <LayoutGrid className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          )}

          {procesosPermitido && (
            <Link
              href="/procesos"
              aria-label="Procesos"
              title="Procesos"
              className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
                pathname === "/procesos" || pathname.startsWith("/procesos/")
                  ? "bg-aqua text-navy"
                  : "text-white/80 hover:bg-navy-90 hover:text-aqua"
              }`}
            >
              <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          )}

          {proyectosPermitido && (
            <Link
              href="/proyectos"
              aria-label="Proyectos"
              title="Proyectos"
              className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
                pathname === "/proyectos" || pathname.startsWith("/proyectos/")
                  ? "bg-aqua text-navy"
                  : "text-white/80 hover:bg-navy-90 hover:text-aqua"
              }`}
            >
              <KanbanSquare className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          )}
        </nav>

        <div className="mt-2 flex flex-col items-center gap-2">
          {isAdmin && (
            <Link
              href="/usuarios"
              aria-label="Usuarios"
              title="Usuarios"
              className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
                pathname === "/usuarios"
                  ? "bg-aqua text-navy"
                  : "text-white/80 hover:bg-navy-90 hover:text-aqua"
              }`}
            >
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          )}
          <Link
            href="/perfil"
            aria-label="Mi perfil"
            title="Mi perfil"
            className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
              pathname === "/perfil"
                ? "bg-aqua text-navy"
                : "text-white/80 hover:bg-navy-90 hover:text-aqua"
            }`}
          >
            <UserCircle className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex h-11 w-11 items-center justify-center rounded-pill text-white/60 transition-colors duration-150 ease-eb-out hover:bg-navy-90 hover:text-white"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
