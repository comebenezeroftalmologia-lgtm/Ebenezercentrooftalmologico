"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardCheck, Home, LayoutDashboard, BarChart3, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { AppUser } from "@/lib/procesos/types";

export function ProcesosNav({ user, puedeVerDashboard, tieneAnalytics }: { user: AppUser; puedeVerDashboard: boolean; tieneAnalytics?: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const items = [
    { href: "/procesos", label: "Inicio", icon: Home },
    { href: "/procesos/areas", label: "Áreas", icon: Building2 },
    { href: "/procesos/mis-tareas", label: "Mis Tareas", icon: ClipboardCheck },
    ...(puedeVerDashboard
      ? [{ href: "/procesos/dashboard", label: "Dashboard general", icon: LayoutDashboard }]
      : []),
    ...(tieneAnalytics
      ? [{ href: "/analytics", label: "Analytics", icon: BarChart3 }]
      : []),
  ];

  return (
    <aside
      className={`bg-[#F1F3F8]/40 border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out h-full overflow-hidden ${
        isOpen ? "w-64" : "w-[68px]"
      }`}
    >
      <div className="p-4 flex justify-between items-center border-b border-slate-200/60 min-h-[64px]">
        <div className={`flex flex-col transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
          <h2 className="font-semibold text-sm text-[#0B1B3D] tracking-tight whitespace-nowrap">Procesos</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.nombreCompleto.split(" ")[0]}</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-[#0B1B3D] transition-colors mx-auto p-1"
          title={isOpen ? "Contraer panel" : "Expandir panel"}
        >
          {isOpen ? <PanelLeftClose size={18} strokeWidth={1.5} /> : <PanelLeftOpen size={18} strokeWidth={1.5} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col p-3 gap-1 overflow-y-auto">
        {isOpen && (
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 mb-1 mt-1 uppercase tracking-widest whitespace-nowrap">
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
              className={`flex items-center gap-3 rounded-lg transition-all duration-200 ease-eb-out whitespace-nowrap ${
                active
                  ? "bg-white border border-slate-200/60 shadow-sm text-[#0B1B3D] font-medium"
                  : "text-slate-600 hover:bg-slate-200/50 border border-transparent"
              } ${isOpen ? "px-3 py-2.5 text-sm" : "px-0 py-3 justify-center"}`}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-aqua" : "text-slate-400"}`} strokeWidth={1.5} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
