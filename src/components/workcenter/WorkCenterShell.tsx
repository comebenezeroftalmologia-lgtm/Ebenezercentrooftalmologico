"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileSpreadsheet,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import type { Modulo } from "@/lib/modulos";
import { BANDEJA_BLANCA_STYLE, RielGlobal, TramaArquitectonicaBandeja } from "@/components/Sidebar";

const ARCHIVOS_TRABAJO = [
  {
    id: "liquidador",
    nombre: "Liquidador de Honorarios",
    subtitulo: "Archivo de trabajo · Clave propia",
    href: "/workcenter/liquidador",
  },
];

export function WorkCenterShell({
  usuario,
  modulos = [],
  children,
}: {
  usuario: { id: string; nombre: string; esAdmin: boolean };
  modulos?: Modulo[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(true);
  const [menuMovil, setMenuMovil] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => setMenuMovil(false), [pathname]);

  const q = busqueda.trim().toLowerCase();
  const filtrados = ARCHIVOS_TRABAJO.filter(
    (h) =>
      !q ||
      h.nombre.toLowerCase().includes(q) ||
      h.subtitulo.toLowerCase().includes(q)
  );

  return (
    <div className="relative flex h-screen overflow-hidden bg-white">
      <RielGlobal
        modulos={modulos}
        isAdmin={usuario.esAdmin}
        onToggleBandeja={() => setAbierto((v) => !v)}
        onOpenBandeja={() => setAbierto(true)}
      />

      <aside
        style={BANDEJA_BLANCA_STYLE}
        className={`${
          menuMovil ? "fixed inset-y-0 left-[78px] z-40 flex w-[236px] shadow-eb-4" : "hidden"
        } relative shrink-0 flex-col overflow-hidden border-r border-[#DCE7F7] bg-[#FAFBFD] shadow-[4px_0_16px_rgba(14,36,94,0.035)] transition-all duration-200 ease-eb-out md:static md:flex md:shadow-none ${
          abierto ? "md:w-[236px]" : "md:w-0 md:overflow-hidden md:border-r-0"
        }`}
      >
        <TramaArquitectonicaBandeja />

        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2.5">
          <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#0E245E]">
            WorkCenter
          </p>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            title="Contraer bandeja lateral"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#DCE4F0] bg-white text-[#475569] transition hover:border-[#94A3B8] hover:text-[#0E245E] md:flex"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded-sm p-1 text-ink-3 hover:bg-line-2 md:hidden"
            onClick={() => setMenuMovil(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative z-10 px-3 pt-1 pb-2">
          <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">
            Vista General
          </div>
          <Link
            href="/workcenter"
            className={`group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition ${
              pathname === "/workcenter"
                ? "border border-[#C9DDFB] border-l-[3.5px] border-l-[#2563EB] bg-[#E6F0FD] font-semibold text-[#0E245E] shadow-[0_2px_6px_rgba(37,99,235,0.08)]"
                : "text-[#334155] hover:bg-[#F3F7FD] hover:text-[#0E245E]"
            }`}
          >
            <LayoutGrid
              className={`h-4 w-4 shrink-0 ${
                pathname === "/workcenter"
                  ? "text-[#1D58D8]"
                  : "text-[#64748B] group-hover:text-[#0E245E]"
              }`}
              strokeWidth={1.85}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight">Archivos de Trabajo</p>
              <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">
                Catálogo de archivos activos
              </p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 px-3.5 pb-3 pt-1">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]"
              strokeWidth={2}
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar archivo..."
              className="w-full rounded-[10px] border border-[#CBD8EE] bg-white/95 py-1.5 pl-8 pr-3 text-[12px] text-[#0E245E] shadow-[0_1px_4px_rgba(14,36,94,0.04)] placeholder:text-[#94A3B8] transition focus:border-[#2563EB] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-1">
          <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">
            Archivos de Trabajo
          </div>
          <div className="flex flex-col gap-1">
            {filtrados.map((h) => {
              const activo = pathname === h.href || pathname.startsWith(`${h.href}/`);
              return (
                <Link
                  key={h.id}
                  href={h.href}
                  className={`group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition ${
                    activo
                      ? "border border-[#C9DDFB] border-l-[3.5px] border-l-[#2563EB] bg-[#E6F0FD] font-semibold text-[#0E245E] shadow-[0_2px_6px_rgba(37,99,235,0.08)]"
                      : "text-[#334155] hover:bg-[#F3F7FD] hover:text-[#0E245E]"
                  }`}
                >
                  <FileSpreadsheet
                    className={`h-4 w-4 shrink-0 ${
                      activo ? "text-[#1D58D8]" : "text-[#2563EB] group-hover:text-[#0E245E]"
                    }`}
                    strokeWidth={1.85}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight">{h.nombre}</p>
                    <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">
                      {h.subtitulo}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {menuMovil && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setMenuMovil(false)}
        />
      )}

      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          title="Mostrar bandeja lateral"
          className="hidden md:flex absolute left-[88px] top-3 z-20 items-center gap-1.5 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0E245E] shadow-sm transition hover:bg-[#F8FAFC]"
        >
          <PanelLeftOpen className="h-3.5 w-3.5 text-[#1D58D8]" strokeWidth={1.75} />
          <span>Menú</span>
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3 md:hidden">
          <button
            type="button"
            className="rounded-sm p-1.5 text-ink-2 hover:bg-surface-2"
            onClick={() => setMenuMovil(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="truncate text-sm font-semibold text-ink">WorkCenter</span>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
