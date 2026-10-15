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
    { href: "/procesos", label: "Mapa de Áreas", icon: Home },
    { href: "/procesos/mis-tareas", label: "Mis Tareas", icon: ClipboardCheck },
    ...(puedeVerDashboard
      ? [{ href: "/procesos/dashboard", label: "Dashboard General", icon: LayoutDashboard }]
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
        className={`hidden h-full shrink-0 flex-col border-r border-line bg-[#F8FAFC] transition-all duration-200 ease-eb-out md:flex ${
          isOpen ? "w-[264px]" : "w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-line bg-white px-3.5">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-navy">
              Procesos y Áreas
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            title="Contraer bandeja lateral"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink-3 transition hover:border-navy-20 hover:text-navy"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="border-b border-line/60 bg-white px-3 py-2.5">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar área (ej. SIAU)..."
            className="w-full rounded-md border border-line bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-blue focus:bg-white focus:outline-none"
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {!q && (
            <div className="mb-3">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
                Vistas Globales
              </div>
              <div className="flex flex-col gap-0.5">
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
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition ${
                        active
                          ? "border border-blue/20 bg-white font-semibold text-blue shadow-xs"
                          : "text-ink-2 hover:bg-white/80 hover:text-navy"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${active ? "text-blue" : "text-ink-3"}`}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {bloques.map((bloque) => (
            <div key={bloque.id} className="mb-3">
              <div className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
                {bloque.id === "atencion"
                  ? "Atención y Comercial"
                  : bloque.id === "direccion"
                    ? "Dirección y Gobierno"
                    : "Soporte y Operación"}
              </div>
              <div className="flex flex-col gap-0.5">
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
                      className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] transition ${
                        active
                          ? "border border-blue/20 bg-white font-semibold text-blue shadow-xs"
                          : "text-ink-2 hover:bg-white/80 hover:text-navy"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Building2
                          className={`h-3.5 w-3.5 shrink-0 ${
                            active ? "text-blue" : "text-ink-3 group-hover:text-navy"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{area.nombre}</span>
                      </span>
                      {esSiau && (
                        <span className="shrink-0 rounded-full bg-blue/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-blue">
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
          className="hidden md:flex absolute left-[84px] top-3 z-20 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-navy shadow-sm transition hover:border-navy-20 hover:bg-[#F8FAFC]"
        >
          <PanelLeftOpen className="h-3.5 w-3.5 text-blue" strokeWidth={1.75} />
          <span>Áreas</span>
        </button>
      )}
    </div>
  );
}

