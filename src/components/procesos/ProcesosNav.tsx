"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  ChevronRight,
  FolderKanban,
  Home,
  Menu,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { AppUser, Area } from "@/lib/procesos/types";
import type { Modulo } from "@/lib/modulos/types";
import { RielGlobal } from "@/components/navegacion/RielGlobal";

interface Props {
  user: AppUser;
  puedeVerDashboard: boolean;
  areas?: Area[];
  modulos?: Modulo[];
}

export function ProcesosNav({
  user,
  puedeVerDashboard,
  areas = [],
  modulos = [],
}: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [areasExpandido, setAreasExpandido] = useState(true);

  const items = [
    { href: "/procesos", label: "Inicio", icon: Home, exact: true },
    { href: "/procesos/areas", label: "Mapa de Áreas", icon: FolderKanban, exact: false },
    { href: "/procesos/mis-tareas", label: "Mis Tareas", icon: CheckSquare, exact: false },
    ...(puedeVerDashboard
      ? [{ href: "/procesos/dashboard", label: "Dashboard General", icon: BarChart3, exact: false }]
      : []),
  ];

  const areasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.codigo.toLowerCase().includes(q)
    );
  }, [areas, busqueda]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-16 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm lg:hidden"
        aria-label="Abrir menú"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="relative z-40 flex h-screen shrink-0 select-none">
        <RielGlobal
          modulos={modulos}
          isAdmin={user.isAdmin}
          onToggleBandeja={() => setIsOpen((v) => !v)}
        />

        <aside
          className={cn(
            "flex h-screen flex-col border-r border-[#E6EBF2] bg-white transition-all duration-200 ease-out",
            isOpen
              ? "w-[228px] opacity-100"
              : "w-0 -translate-x-4 overflow-hidden border-r-0 opacity-0"
          )}
        >
          <div className="flex h-14 items-center justify-between px-4 pt-2">
            <span className="truncate text-[16px] font-bold tracking-tight text-[#0F172A]">
              Procesos y Áreas
            </span>
          </div>

          <div className="px-3 pb-3">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-8 pr-3 text-[12.5px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
            <div>
              <p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
                Navegación
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-all",
                        active
                          ? "bg-[#E6F0FD] font-semibold text-[#1D58D8]"
                          : "font-medium text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-[#1D58D8]"
                            : "text-[#64748B] group-hover:text-[#334155]"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {areas.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setAreasExpandido((v) => !v)}
                  className="mb-1.5 flex w-full items-center gap-1 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8] hover:text-[#475569]"
                >
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform",
                      areasExpandido && "rotate-90"
                    )}
                  />
                  <span>Áreas ({areasFiltradas.length})</span>
                </button>

                {areasExpandido && (
                  <div className="space-y-0.5">
                    {areasFiltradas.map((area) => {
                      const active = pathname === `/procesos/areas/${area.id}`;
                      return (
                        <Link
                          key={area.id}
                          href={`/procesos/areas/${area.id}`}
                          className={cn(
                            "flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[12.5px] transition-all",
                            active
                              ? "bg-[#E6F0FD] font-semibold text-[#1D58D8]"
                              : "font-medium text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              active ? "bg-[#1D58D8]" : "bg-[#CBD5E1]"
                            )}
                          />
                          <span className="truncate">{area.nombre}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="border-t border-[#E6EBF2] p-3">
            <div className="rounded-[10px] bg-[#F8FAFC] px-3 py-2">
              <p className="truncate text-[12px] font-semibold text-[#0F172A]">
                {user.nombre}
              </p>
              <p className="truncate text-[11px] text-[#64748B]">{user.email}</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}