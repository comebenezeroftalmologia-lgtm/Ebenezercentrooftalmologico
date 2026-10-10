"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { colorAvatar, iniciales } from "@/lib/proyectos/utils";

// ---------------------------------------------------------------------------
// Avatares
// ---------------------------------------------------------------------------
export function Avatar({
  id,
  nombre,
  size = 24,
  ring = false,
}: {
  id: string;
  nombre: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      title={nombre}
      className={`inline-flex shrink-0 items-center justify-center rounded-pill font-semibold text-white ${
        ring ? "ring-2 ring-white" : ""
      }`}
      style={{ width: size, height: size, background: colorAvatar(id), fontSize: Math.max(9, size * 0.4) }}
    >
      {iniciales(nombre)}
    </span>
  );
}

export function AvatarStack({
  ids,
  nombres,
  size = 22,
  max = 3,
}: {
  ids: string[];
  nombres: Map<string, string>;
  size?: number;
  max?: number;
}) {
  const visibles = ids.slice(0, max);
  const resto = ids.length - visibles.length;
  return (
    <span className="inline-flex items-center">
      {visibles.map((id, i) => (
        <span key={id} style={{ marginLeft: i === 0 ? 0 : -6 }}>
          <Avatar id={id} nombre={nombres.get(id) ?? "Usuario"} size={size} ring />
        </span>
      ))}
      {resto > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-pill bg-line text-[10px] font-semibold text-ink-2 ring-2 ring-white"
          style={{ width: size, height: size, marginLeft: -6 }}
        >
          +{resto}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Clic fuera / Escape
// ---------------------------------------------------------------------------
export function useClickAfuera<T extends HTMLElement>(activo: boolean, cerrar: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!activo) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [activo, cerrar]);
  return ref;
}

// ---------------------------------------------------------------------------
// Popover anclado a su botón (se posiciona con position:fixed para no ser
// recortado por contenedores con overflow)
// ---------------------------------------------------------------------------
export function Popover({
  boton,
  children,
  ancho = 260,
  alinear = "izquierda",
  abierto: abiertoExterno,
  onAbrir,
  claseWrapper = "",
}: {
  boton: (props: { abierto: boolean; alternar: () => void }) => React.ReactNode;
  children: (cerrar: () => void) => React.ReactNode;
  ancho?: number;
  alinear?: "izquierda" | "derecha";
  abierto?: boolean;
  onAbrir?: (abierto: boolean) => void;
  claseWrapper?: string;
}) {
  const [interno, setInterno] = useState(false);
  const abierto = abiertoExterno ?? interno;
  const set = useCallback(
    (v: boolean) => {
      if (onAbrir) onAbrir(v);
      else setInterno(v);
    },
    [onAbrir]
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!abierto) return;
    const calc = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      const alto = panelRef.current?.offsetHeight ?? 0;
      let left = alinear === "izquierda" ? r.left : r.right - ancho;
      left = Math.max(8, Math.min(left, window.innerWidth - ancho - 8));
      let top = r.bottom + 6;
      if (alto && top + alto > window.innerHeight - 8) top = Math.max(8, r.top - alto - 6);
      setPos({ top, left });
    };
    calc();
    const t = setTimeout(calc, 0);
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [abierto, ancho, alinear]);

  useEffect(() => {
    if (!abierto) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      set(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") set(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto, set]);

  return (
    <div ref={wrapRef} className={`relative inline-block ${claseWrapper}`}>
      {boton({ abierto, alternar: () => set(!abierto) })}
      {abierto &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[70] rounded-md border border-line bg-white p-1.5 shadow-eb-3"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: ancho, visibility: pos ? "visible" : "hidden" }}
          >
            {children(() => set(false))}
          </div>,
          document.body
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({
  titulo,
  onCerrar,
  children,
  ancho = 460,
  pie,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  ancho?: number;
  pie?: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="w-full rounded-lg bg-white shadow-eb-4"
        style={{ maxWidth: ancho }}
      >
        <div className="flex items-center justify-between border-b border-line-2 px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-sm p-1 text-ink-3 hover:bg-line-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {pie && <div className="flex justify-end gap-2 border-t border-line-2 px-5 py-3">{pie}</div>}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Avisos (toast)
// ---------------------------------------------------------------------------
interface Aviso {
  id: number;
  texto: string;
  tipo: "error" | "ok";
}
const ToastCtx = createContext<(texto: string, tipo?: "error" | "ok") => void>(() => {});
export const useAviso = () => useContext(ToastCtx);

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const contador = useRef(0);
  const mostrar = useCallback((texto: string, tipo: "error" | "ok" = "error") => {
    const id = ++contador.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 flex-col gap-2">
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className={`pointer-events-auto rounded-md px-4 py-2.5 text-sm text-white shadow-eb-3 ${
              a.tipo === "error" ? "bg-[#B42318]" : "bg-navy"
            }`}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Botones comunes
// ---------------------------------------------------------------------------
export function BotonPrimario({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm bg-blue px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0B25C9] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-line-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Insignia({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-xs px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: `${color}22`, color }}
    >
      {children}
    </span>
  );
}

export function IconoBandera({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
      <path d="M3 1.5v13h1.5V9.5h8.2c.5 0 .8-.6.5-1L11.4 6l1.8-2.5c.3-.4 0-1-.5-1H4.5V1.5H3z" />
    </svg>
  );
}
