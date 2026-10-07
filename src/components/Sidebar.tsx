"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
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

// Solo íconos — el slug/label/href/grupo de cada módulo vive en
// lib/modulos.ts (fuente única, la comparte también /usuarios).
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

export function Sidebar({ modulos, isAdmin }: { modulos: Modulo[]; isAdmin: boolean }) {
  const allowed = new Set(modulos);
  const analyticsAllowed = ANALYTICS_ITEMS.filter((m) => allowed.has(m.slug));
  const procesosPermitido = allowed.has("procesos");

  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const analyticsActivo = analyticsAllowed.some((m) => pathname === m.href);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={panelRef} className="relative flex shrink-0">
      {/* Riel de íconos, siempre visible */}
      <aside className="flex w-[96px] shrink-0 flex-col items-center bg-navy py-5">
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

      {/* Panel flotante de Analytics */}
      {open && analyticsAllowed.length > 0 && (
        <div className="absolute left-[96px] top-4 z-30 w-80 rounded-xl border border-line bg-white p-3 shadow-eb-4">
          <p className="eb-label px-3 pb-2 pt-1 text-[12px] text-blue">Analytics</p>
          <div className="flex flex-col gap-1">
            {analyticsAllowed.map((item) => {
              const active = pathname === item.href;
              const Icon = ICONOS[item.slug];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ease-eb-out ${
                    active ? "bg-aqua-50 font-semibold text-navy" : "text-ink-2 hover:bg-aqua-20"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ${
                      active ? "bg-aqua text-navy" : "bg-aqua-20 text-navy"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
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
