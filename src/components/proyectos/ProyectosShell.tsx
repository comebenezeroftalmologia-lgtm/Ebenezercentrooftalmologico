"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { EspacioArbol } from "@/lib/proyectos/types";
import type { Modulo } from "@/lib/modulos";
import { ArbolEspacios } from "@/components/proyectos/ArbolEspacios";
import { EspacioModal } from "@/components/proyectos/CrearEspacioModal";
import { AvisosProvider } from "@/components/proyectos/ui";
import { BANDEJA_BLANCA_STYLE, RielGlobal, TramaArquitectonicaBandeja } from "@/components/Sidebar";

const ListaActivaCtx = createContext<string | null>(null);
const SetListaActivaCtx = createContext<(id: string | null) => void>(() => {});
export const useListaActiva = () => useContext(ListaActivaCtx);

export function MarcarListaActiva({ listaId }: { listaId: string }) {
  const set = useContext(SetListaActivaCtx);
  useEffect(() => {
    set(listaId);
    return () => set(null);
  }, [listaId, set]);
  return null;
}

export function ProyectosShell({
  arbol,
  usuario,
  modulos = [],
  children,
}: {
  arbol: EspacioArbol[];
  usuario: { id: string; nombre: string; esAdmin: boolean };
  modulos?: Modulo[];
  children: React.ReactNode;
}) {
  const [nuevoEspacio, setNuevoEspacio] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [abierto, setAbierto] = useState(true);
  const [listaActiva, setListaActiva] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setMenuMovil(false), [pathname]);

  return (
    <AvisosProvider>
      <ListaActivaCtx.Provider value={listaActiva}>
        <SetListaActivaCtx.Provider value={setListaActiva}>
          <div className="relative flex h-screen overflow-hidden bg-white">
            <RielGlobal
              modulos={modulos}
              isAdmin={usuario.esAdmin}
              onToggleBandeja={() => setAbierto((v) => !v)} onOpenBandeja={() => setAbierto(true)}
            />

            <aside style={BANDEJA_BLANCA_STYLE}
              className={`${
                menuMovil ? "fixed inset-y-0 left-[78px] z-40 flex w-[236px] shadow-eb-4" : "hidden"
              } relative shrink-0 flex-col overflow-hidden border-r border-[#DCE7F7] bg-[#FAFBFD] shadow-[4px_0_16px_rgba(14,36,94,0.035)] transition-all duration-200 ease-eb-out md:static md:flex md:shadow-none ${
                abierto ? "md:w-[236px]" : "md:w-0 md:overflow-hidden md:border-r-0"
              }`}
            >
              <TramaArquitectonicaBandeja /><div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2.5">
                <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#0E245E]">
                  Proyectos
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
                  href="/proyectos"
                  className={`group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition ${
                    pathname === "/proyectos"
                      ? "border border-[#C9DDFB] border-l-[3.5px] border-l-[#2563EB] bg-[#E6F0FD] font-semibold text-[#0E245E] shadow-[0_2px_6px_rgba(37,99,235,0.08)]"
                      : "text-[#334155] hover:bg-[#F3F7FD] hover:text-[#0E245E]"
                  }`}
                >
                  <LayoutGrid
                    className={`h-4 w-4 shrink-0 ${
                      pathname === "/proyectos" ? "text-[#1D58D8]" : "text-[#64748B] group-hover:text-[#0E245E]"
                    }`}
                    strokeWidth={1.85}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight">Resumen de Proyectos</p>
                    <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Espacios y tareas</p>
                  </div>
                </Link>
              </div>

              <ArbolEspacios
                arbol={arbol}
                yoId={usuario.id}
                onNuevoEspacio={() => setNuevoEspacio(true)}
              />
            </aside>

            {!abierto && (
              <button
                type="button"
                onClick={() => setAbierto(true)}
                title="Mostrar bandeja de Proyectos"
                className="hidden md:flex absolute left-[86px] top-3.5 z-20 items-center gap-1.5 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0E245E] shadow-sm transition hover:bg-[#F8FAFC]"
              >
                <PanelLeftOpen className="h-3.5 w-3.5 text-[#1D58D8]" strokeWidth={1.75} />
                <span>Espacios</span>
              </button>
            )}

            {menuMovil && (
              <div
                className="fixed inset-0 z-30 bg-ink/30 md:hidden"
                onClick={() => setMenuMovil(false)}
              />
            )}

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setMenuMovil(true)}
                  className="rounded-sm p-1.5 text-ink-2 hover:bg-line-2"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />                </button>
                <span className="text-sm font-semibold">Proyectos</span>
              </div>
              <main className="hoja-cuadriculada min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
            </div>
          </div>

          {nuevoEspacio && (
            <EspacioModal
              onCerrar={() => setNuevoEspacio(false)}
              onCreado={(id) => router.push(`/proyectos/espacio/${id}`)}
            />
          )}
        </SetListaActivaCtx.Provider>
      </ListaActivaCtx.Provider>
    </AvisosProvider>
  );
}