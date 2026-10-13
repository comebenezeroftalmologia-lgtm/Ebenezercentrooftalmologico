"use client";

import { useEffect, useRef, useState } from "react";

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

  /* El panel de Analytics: se abre con el boton del riel y se cierra solo
     al hacer clic por fuera, con Escape, o al cambiar de pagina. */
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function alClic(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclado);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={panelRef} className="relative flex shrink-0">
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
          {/* ANALYTICS ES UN BOTON, NO UN ENLACE.
              Abre el panel flotante con los tableros y se va directo al que
              se escoja. Como pagina intermedia obligaba a una carga entera
              solo para elegir, y a Frecuencias se entra todos los dias. */}
          {analyticsAllowed.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Analytics"
              title="Analytics"
              className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
                open || analyticsActivo
                  ? "bg-aqua text-navy"
                  : "text-white/80 hover:bg-navy-90 hover:text-aqua"
              }`}
            >
              <LayoutGrid className="h-5 w-5" strokeWidth={1.75} />
            </button>
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

      {/* Panel flotante de Analytics: los tableros a un clic, sin cargar
          una pagina intermedia. Se dibuja por encima del contenido. */}
      {open && analyticsAllowed.length > 0 && (
        <div className="absolute left-[96px] top-4 z-30 w-80 rounded-xl border border-line bg-white p-3 shadow-eb-4">
          <p className="eb-label px-3 pb-2 pt-1 text-[12px] text-blue">Analytics</p>
          <div className="flex flex-col gap-1">
            {analyticsAllowed.map((item) => {
              const activo = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ease-eb-out ${
                    activo ? "bg-aqua-50 font-semibold text-navy" : "text-ink-2 hover:bg-aqua-20"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ${
                      activo ? "bg-aqua text-navy" : "bg-aqua-20 text-navy"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
