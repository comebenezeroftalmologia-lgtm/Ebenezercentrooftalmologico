"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import type { EspacioArbol } from "@/lib/proyectos/types";
import { ArbolEspacios } from "@/components/proyectos/ArbolEspacios";
import { EspacioModal } from "@/components/proyectos/CrearEspacioModal";
import { AvisosProvider } from "@/components/proyectos/ui";
import { useRouter } from "next/navigation";

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
  children,
}: {
  arbol: EspacioArbol[];
  usuario: { id: string; nombre: string; esAdmin: boolean };
  children: React.ReactNode;
}) {
  const [nuevoEspacio, setNuevoEspacio] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [listaActiva, setListaActiva] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setMenuMovil(false), [pathname]);

  return (
    <AvisosProvider>
      <ListaActivaCtx.Provider value={listaActiva}>
        <SetListaActivaCtx.Provider value={setListaActiva}>
          <div className="flex h-screen overflow-hidden bg-white">
            {/* Barra lateral */}
            <aside
              className={`${
                menuMovil ? "fixed inset-y-0 left-0 z-40 shadow-eb-4" : "hidden"
              } w-[280px] shrink-0 flex-col border-r border-line bg-ebbg md:static md:flex md:shadow-none`}
            >
              <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
                <Image
                  src="/brand/logo/logo-claro.png"
                  alt="Ebenezer"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-sm bg-navy object-contain p-0.5"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-sm font-semibold text-ink">Proyectos</p>
                  <p className="truncate text-[11px] text-ink-3">{usuario.nombre}</p>
                </div>
                <button
                  type="button"
                  className="rounded-sm p-1 text-ink-3 hover:bg-line-2 md:hidden"
                  onClick={() => setMenuMovil(false)}
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Link
                href="/proyectos"
                className="mx-2 mb-1 rounded-sm px-2.5 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-line-2"
              >
                Inicio
              </Link>

              <ArbolEspacios arbol={arbol} yoId={usuario.id} onNuevoEspacio={() => setNuevoEspacio(true)} />

              <div className="border-t border-line p-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs text-ink-3 hover:bg-line-2 hover:text-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver a módulos
                </Link>
              </div>
            </aside>
            {menuMovil && <div className="fixed inset-0 z-30 bg-ink/30 md:hidden" onClick={() => setMenuMovil(false)} />}

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
