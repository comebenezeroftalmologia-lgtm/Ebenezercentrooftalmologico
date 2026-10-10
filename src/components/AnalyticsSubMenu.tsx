"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LayoutDashboard } from "lucide-react";
import type { Modulo } from "@/lib/modulos";

interface AnalyticsSubMenuProps {
  tableros: { slug: Modulo; label: string; href: string }[];
}

export function AnalyticsSubMenu({ tableros }: AnalyticsSubMenuProps) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div
      className={`bg-[#F1F3F8]/30 border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out h-full overflow-hidden ${
        isOpen ? "w-64" : "w-[64px]"
      }`}
    >
      <div className="p-4 flex justify-between items-center border-b border-slate-100 min-h-[64px]">
        <h2
          className={`font-semibold text-sm text-[#0B1B3D] tracking-tight whitespace-nowrap transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0 w-0 hidden"
          }`}
        >
          Analytics
        </h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-[#0B1B3D] transition-colors mx-auto"
          title={isOpen ? "Contraer panel" : "Expandir panel"}
        >
          {isOpen ? <PanelLeftClose size={18} strokeWidth={1.5} /> : <PanelLeftOpen size={18} strokeWidth={1.5} />}
        </button>
      </div>

      <div className="flex flex-col p-2 gap-1 overflow-y-auto mt-2">
        {isOpen && (
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest whitespace-nowrap">
            Tableros Activos
          </div>
        )}

        {tableros.map((t) => {
          // Si estamos en /analytics, marcamos "Frecuencias" como activo temporalmente por diseño,
          // pero idealmente usaríamos t.href real de cada ruta.
          const active = pathname === t.href || pathname.startsWith(t.href + "/") || (pathname === "/analytics" && t.slug === "frecuencias");
          
          return (
            <Link
              key={t.slug}
              href={t.href === "/frecuencias" ? "/analytics" : t.href} // Redirigimos frecuencias al home de analytics temporalmente para ver la data actual
              className={`flex items-center rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-white border border-slate-200/60 shadow-sm text-[#0B1B3D] font-medium"
                  : "text-slate-600 hover:bg-slate-100/50 border border-transparent"
              } ${isOpen ? "px-3 py-2 text-sm" : "px-0 py-3 justify-center"}`}
              title={!isOpen ? t.label : undefined}
            >
              {!isOpen && (
                <LayoutDashboard
                  size={18}
                  strokeWidth={1.5}
                  className={active ? "text-aqua" : "text-slate-400"}
                />
              )}
              {isOpen && <span>{t.label}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
