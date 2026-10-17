"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import type { AppUser, Area } from "@/lib/procesos/types";
import type { Modulo } from "@/lib/modulos";
import { RielGlobal } from "@/components/Sidebar";
import { agruparAreasPorCadenaDeValor } from "@/lib/procesos/ordenAreas";

export function ProcesosNav({
  user,
  puedeVerDashboard,
  areas = [],
  modulos = [],
}: {
  user: AppUser;
  puedeVerDashboard: boolean;
  areas?: Area[];
  modulos?: Modulo[];
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const items = [
    { href: "/procesos", label: "Mapa de Áreas", sub: "13 áreas organizacionales", icon: Home },
    { href: "/procesos/mis-tareas", label: "Mis Tareas", sub: "Seguimiento operativo", icon: ClipboardCheck },
    ...(puedeVerDashboard
      ? [{ href: "/procesos/dashboard", label: "Dashboard General", sub: "Indicadores y KPIs", icon: LayoutDashboard }]
      : []),
  ];

  const q = busqueda.trim().toLowerCase();
  const areasFiltradas = q
    ? areas.filter((a) => a.nombre.toLowerCase().includes(q))
    : areas;
  const bloques = agruparAreasPorCadenaDeValor(areasFiltradas);

  return (
    <div className="relative flex h-full shrink-0">
      <RielGlobal
        modulos={modulos}
        isAdmin={user.isAdmin}
        onToggleBandeja={() => setIsOpen((v) => !v)}
      />

      <aside
        className={`hidden h-full shrink-0 flex-col border-r border-[#E6ECF5] bg-white transition-all duration-200 ease-eb-out md:flex ${
          isOpen ? "w-[236px]" : "w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
          <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#0E245E]">
            Procesos y Áreas
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            title="Contraer bandeja lateral"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#DCE4F0] bg-white text-[#475569] transition hover:border-[#94A3B8] hover:text-[#0E245E]"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-3.5 pb-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]"
              strokeWidth={2}
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar área (ej. SIAU)..."
              className="w-full rounded-[9px] border border-[#E6ECF5] bg-[#F7F9FC] py-1.5 pl-8 pr-3 text-[12px] text-[#0E245E] placeholder:text-[#94A3B8] transition focus:border-[#2563EB] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {!q && (
            <div className="mb-4">
              <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">
                Vistas Globales
              </div>
              <div className="flex flex-col gap-1">
                {items.map((item) => {
                  const active =
                    item.href === "/procesos"
                      ? pathname === "/procesos" || pathname === "/procesos/areas"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-2.5 rounded-[10px] px-3 py-2 transition ${
                        active
                          ? "border-l-[3px] border-l-[#2563EB] bg-[#E6F0FD] font-semibold text-[#0E245E]"
                          : "text-[#334155] hover:bg-[#F3F7FD] hover:text-[#0E245E]"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-[#1D58D8]" : "text-[#64748B] group-hover:text-[#0E245E]"
                        }`}
                        strokeWidth={1.85}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] leading-tight">{item.label}</p>
                        <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">{item.sub}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {bloques.map((bloque) => (
            <div key={bloque.id} className="mb-4">
              <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">
                {bloque.id === "atencion"
                  ? "Atención y Comercial"
                  : bloque.id === "direccion"
                    ? "Dirección y Gobierno"
                    : "Soporte y Operación"}
              </div>
              <div className="flex flex-col gap-1">
                {bloque.areas.map((area) => {
                  const href = `/procesos/areas/${area.id}`;
                  const active = pathname === href || pathname.startsWith(href + "/");
                  const esSiau =
                    area.nombre.toLowerCase().includes("siau") ||
                    area.nombre.toLowerCase().includes("atención al usuario");
                  return (
                    <Link
                      key={area.id}
                      href={href}
                      className={`group flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-[13px] transition ${
                        active
                          ? "border-l-[3px] border-l-[#2563EB] bg-[#E6F0FD] font-semibold text-[#0E245E]"
                          : "text-[#334155] hover:bg-[#F3F7FD] hover:text-[#0E245E]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Building2
                          className={`h-4 w-4 shrink-0 ${
                            active ? "text-[#1D58D8]" : "text-[#64748B] group-hover:text-[#0E245E]"
                          }`}
                          strokeWidth={1.85}
                        />
                        <span className="truncate">{area.nombre}</span>
                      </span>
                      {esSiau && (
                        <span className="shrink-0 rounded-full bg-[#DBEAFE] px-1.5 py-0.5 text-[9.5px] font-bold text-[#1D58D8]">
                          SIAU
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Mostrar bandeja de Procesos"
          className="hidden md:flex absolute left-[86px] top-3.5 z-20 items-center gap-1.5 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0E245E] shadow-sm transition hover:bg-[#F8FAFC]"
        >
          <PanelLeftOpen className="h-3.5 w-3.5 text-[#1D58D8]" strokeWidth={1.75} />
          <span>Áreas</span>
        </button>
      )}
    </div>
  );
}