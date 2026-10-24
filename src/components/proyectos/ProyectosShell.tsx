"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
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

const ANCHO_INICIAL = 236;
const ANCHO_MIN = 200;
const ANCHO_MAX = 560;
const CLAVE_ANCHO = "proyectos:anchoBandeja";
const limitarAncho = (n: number) => Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, Math.round(n)));

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
  const [ancho, setAncho] = useState(ANCHO_INICIAL);
  const [redimensionando, setRedimensionando] = useState(false);
  const arrastre = useRef<{ x: number; ancho: number } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setMenuMovil(false), [pathname]);

  // El ancho de la bandeja se recuerda entre visitas (si no hay almacenamiento,
  // simplemente vuelve al ancho por defecto).
  useEffect(() => {
    try {
      const guardado = Number(localStorage.getItem(CLAVE_ANCHO));
      if (Number.isFinite(guardado) && guardado > 0) setAncho(limitarAncho(guardado));
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  function guardarAncho(n: number) {
    try {
      localStorage.setItem(CLAVE_ANCHO, String(n));
    } catch {
      /* sin almacenamiento */
    }
  }

  // Atajo ⌘\ / Ctrl+\ para contraer o abrir la bandeja.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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

            <aside
              style={{ ...BANDEJA_BLANCA_STYLE, "--ancho-bandeja": `${ancho}px` } as React.CSSProperties}
              className={`${
                menuMovil ? "fixed inset-y-0 left-[78px] z-40 flex w-[236px] shadow-eb-4" : "hidden"
              } relative shrink-0 flex-col overflow-hidden border-r border-[#DCE7F7] bg-[#FAFBFD] shadow-[4px_0_16px_rgba(14,36,94,0.035)] ${
                redimensionando ? "" : "transition-all duration-200 ease-eb-out"
              } md:static md:flex md:shadow-none ${
                abierto ? "md:w-[var(--ancho-bandeja)]" : "md:w-0 md:overflow-hidden md:border-r-0"
              }`}
            >
              <TramaArquitectonicaBandeja /><div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2.5">
                <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#0E245E]">
                  Tareas
                </p>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  title="Contraer bandeja lateral (Ctrl/⌘ + \)"
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
                    <p className="truncate text-[13px] leading-tight">Resumen de Tareas</p>
                    <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Espacios y tareas</p>
                  </div>
                </Link>
              </div>

              <ArbolEspacios
                arbol={arbol}
                yoId={usuario.id}
                onNuevoEspacio={() => setNuevoEspacio(true)}
              />

              {abierto && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Cambiar el ancho de la bandeja"
                  aria-valuemin={ANCHO_MIN}
                  aria-valuemax={ANCHO_MAX}
                  aria-valuenow={ancho}
                  tabIndex={0}
                  title="Arrastra para cambiar el ancho · doble clic para restablecer"
                  className={`absolute inset-y-0 right-0 z-30 hidden w-1.5 cursor-col-resize touch-none transition-colors hover:bg-[#2563EB]/30 focus-visible:bg-[#2563EB]/40 focus-visible:outline-none md:block ${
                    redimensionando ? "bg-[#2563EB]/40" : ""
                  }`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    arrastre.current = { x: e.clientX, ancho };
                    setRedimensionando(true);
                  }}
                  onPointerMove={(e) => {
                    const a = arrastre.current;
                    if (!a) return;
                    setAncho(limitarAncho(a.ancho + (e.clientX - a.x)));
                  }}
                  onPointerUp={(e) => {
                    if (!arrastre.current) return;
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    arrastre.current = null;
                    setRedimensionando(false);
                    guardarAncho(ancho);
                  }}
                  onPointerCancel={() => {
                    arrastre.current = null;
                    setRedimensionando(false);
                  }}
                  onDoubleClick={() => {
                    setAncho(ANCHO_INICIAL);
                    guardarAncho(ANCHO_INICIAL);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      const n = limitarAncho(ancho + (e.key === "ArrowRight" ? 16 : -16));
                      setAncho(n);
                      guardarAncho(n);
                    } else if (e.key === "Home") {
                      e.preventDefault();
                      setAncho(ANCHO_INICIAL);
                      guardarAncho(ANCHO_INICIAL);
                    }
                  }}
                />
              )}
            </aside>

            {!abierto && (
              <button
                type="button"
                onClick={() => setAbierto(true)}
                title="Mostrar bandeja de Tareas"
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
                <span className="text-sm font-semibold">Tareas</span>
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