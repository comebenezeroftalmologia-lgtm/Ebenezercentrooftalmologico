"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
} from "lucide-react";
import type { AppUser } from "@/lib/procesos/types";
import { logoutAction } from "@/lib/procesos/actions";

/* ---------------------------------------------------------------------
   EL MENU DE PROCESOS.

   Vuelve al ORDEN que tenia el 18 de septiembre, que era el que servia:

     1. Quien soy y donde estoy  -> logo + "Procesos"
     2. Como me devuelvo         -> "Volver a modulos"
     3. A donde voy              -> Inicio / Areas / Mis Tareas / Dashboard
     4. Quien esta conectado     -> nombre, Mi perfil, Cerrar sesion

   Los pasos 2 y 4 se habian perdido y por eso Procesos quedaba sin salida:
   quien entraba no tenia como volver a los tableros ni como cerrar sesion.

   Lo unico nuevo es lo visual: fondo claro en vez del bloque navy, para que
   sea el mismo lenguaje del resto de la plataforma, y el boton de contraer.
   Analytics NO va aqui: es hermano de Procesos, no esta dentro, y ya tiene
   su lugar en el riel de los tableros.
   --------------------------------------------------------------------- */
export function ProcesosNav({ user, puedeVerDashboard }: { user: AppUser; puedeVerDashboard: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const items = [
    { href: "/procesos", label: "Inicio", icon: Home },
    { href: "/procesos/areas", label: "Áreas", icon: Building2 },
    { href: "/procesos/mis-tareas", label: "Mis Tareas", icon: ClipboardCheck },
    ...(puedeVerDashboard
      ? [{ href: "/procesos/dashboard", label: "Dashboard general", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-[#F1F3F8]/40 transition-all duration-300 ease-eb-out ${
        isOpen ? "w-64" : "w-[68px]"
      }`}
    >
      {/* 1. Donde estoy */}
      <div className="flex min-h-[64px] items-center justify-between gap-2 border-b border-line/60 p-4">
        <Link href="/procesos" className="flex items-center gap-2.5 overflow-hidden">
          <Image
            src="/brand/logo/logo-oscuro.png"
            alt="Ebenezer"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain"
          />
          {isOpen && (
            <span className="whitespace-nowrap font-titulo text-base text-navy">Procesos</span>
          )}
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1 text-ink-3 transition-colors duration-150 hover:text-navy ${isOpen ? "" : "mx-auto"}`}
          title={isOpen ? "Contraer panel" : "Expandir panel"}
        >
          {isOpen ? <PanelLeftClose size={18} strokeWidth={1.5} /> : <PanelLeftOpen size={18} strokeWidth={1.5} />}
        </button>
      </div>

      {/* 2. Como me devuelvo */}
      <Link
        href="/"
        className={`mx-3 mt-3 flex items-center gap-2 whitespace-nowrap rounded-lg text-xs text-ink-3 transition-colors duration-150 ease-eb-out hover:bg-white hover:text-navy ${
          isOpen ? "px-3 py-2" : "justify-center px-0 py-2.5"
        }`}
        title={!isOpen ? "Volver a módulos" : undefined}
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {isOpen && <span>Volver a módulos</span>}
      </Link>

      {/* 3. A donde voy */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {isOpen && (
          <div className="mb-1 mt-1 whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-3/70">
            Menú Principal
          </div>
        )}

        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/procesos" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg border transition-all duration-200 ease-eb-out ${
                active
                  ? "border-line/60 bg-white font-medium text-navy shadow-sm"
                  : "border-transparent text-ink-2 hover:bg-white/70"
              } ${isOpen ? "px-3 py-2.5 text-sm" : "justify-center px-0 py-3"}`}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-blue" : "text-ink-3"}`} strokeWidth={1.5} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 4. Quien esta conectado */}
      <div className="border-t border-line/60 p-3">
        {isOpen && (
          <div className="px-3 pb-2">
            <p className="truncate text-xs font-medium text-navy">{user.nombreCompleto}</p>
            <p className="text-[11px] text-ink-3">{user.isAdmin ? "Administrador" : "Usuario"}</p>
          </div>
        )}
        <Link
          href="/perfil"
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg text-xs text-ink-3 transition-colors duration-150 ease-eb-out hover:bg-white hover:text-navy ${
            isOpen ? "px-3 py-2" : "justify-center px-0 py-2.5"
          }`}
          title={!isOpen ? "Mi perfil" : undefined}
        >
          <UserCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          {isOpen && <span>Mi perfil</span>}
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg text-xs text-ink-3 transition-colors duration-150 ease-eb-out hover:bg-white hover:text-navy ${
              isOpen ? "px-3 py-2" : "justify-center px-0 py-2.5"
            }`}
            title={!isOpen ? "Cerrar sesión" : undefined}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {isOpen && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
