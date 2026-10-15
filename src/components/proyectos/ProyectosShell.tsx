"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { EspacioArbol } from "@/lib/proyectos/types";
import type { Modulo } from "@/lib/modulos";
import { ArbolEspacios } from "@/components/proyectos/ArbolEspacios";
import { EspacioModal } from "@/components/proyectos/CrearEspacioModal";
import { AvisosProvider } from "@/components/proyectos/ui";
import { RielGlobal } from "@/components/Sidebar";

// Las pantallas de tarea le dicen al árbol cuál es su lista, para resaltarla.
const ListaActivaCtx = createContext<string | null>(null);
const SetListaActivaCtx = createContext<(id: string | null) => void>(() => {});
export const useListaActiva = () => useContext(ListaActivaCtx);

/** Se monta dentro de la pantalla de una tarea para resaltar su lista en el árbol. */
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
              onToggleBandeja={() => setAbierto((v) => !v)}
            />

            {/* Bandeja lateral acoplada estilo Clientify */}
            <aside
              className={`${
                menuMovil ? "fixed inset-y-0 left-[76px] z-40 flex w-[264px] shadow-eb-4" : "hidden"
              } shrink-0 flex-col border-r border-line bg-[#F8FAFC] transition-all duration-200 ease-eb-out md:static md:flex md:shadow-none ${
                abierto ? "md:w-[264px]" : "md:w-0 md:overflow-hidden md:border-r-0"
              }`}
            >
              <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-line bg-white px-3.5">
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-navy">
                    Proyectos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  title="Contraer bandeja lateral"
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink-3 transition hover:border-navy-20 hover:text-navy md:flex"
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

              <div className="p-2.5 pb-1">
                <Link
                  href="/proyectos"
                  className={`block rounded-lg px-2.5 py-2 text-[12.5px] transition ${
                    pathname === "/proyectos"
                      ? "border border-blue/20 bg-white font-semibold text-blue shadow-xs"
                      : "text-ink-2 hover:bg-white/80 hover:text-navy"
                  }`}
                >
                  Resumen de Proyectos
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
                className="hidden md:flex absolute left-[84px] top-3 z-20 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-navy shadow-sm transition hover:border-navy-20 hover:bg-[#F8FAFC]"
              >
                <PanelLeftOpen className="h-3.5 w-3.5 text-blue" strokeWidth={1.75} />
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
                  <Menu className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold">Proyectos</span>
              </div>
              <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
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

