"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Expand, RotateCcw, X } from "lucide-react";
import { IconoIA } from "@/components/IconoIA";
import { ConocimientoChat } from "@/app/(marketing)/ayuda/conocimiento/ConocimientoChat";

/**
 * Acceso flotante a la IA del Centro de Conocimiento, visible en toda la plataforma.
 * Abre un panel lateral (como el asistente de Meta) sin salir de la pantalla actual.
 */
export function BotonFlotanteIA({ nombre }: { nombre?: string }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false); // el chat se monta al abrir por primera vez y conserva la conversación
  const [version, setVersion] = useState(0); // cambiar la clave reinicia la conversación
  const [listo, setListo] = useState(false); // el portal necesita document.body

  useEffect(() => setListo(true), []);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  // Ya estás en el Centro de Conocimiento: no hace falta el atajo.
  if (!listo || pathname.startsWith("/ayuda/conocimiento")) return null;

  const primerNombre = (nombre ?? "").trim().split(/\s+/)[0] || "equipo";

  // Se pinta en <body> (portal) para quedar por encima de cualquier capa de la página, p. ej. el encabezado fijo.
  return createPortal(
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => {
            setMontado(true);
            setAbierto(true);
          }}
          aria-label="Preguntar a la IA de Ebenezer"
          className="group fixed bottom-5 right-5 z-[90] flex items-center"
        >
          <span className="pointer-events-none mr-2 translate-x-2 whitespace-nowrap rounded-full bg-[#081A3A] px-3 py-1.5 text-[12px] font-medium text-[#CFE3FF] opacity-0 shadow-[0_4px_14px_rgba(8,26,58,0.3)] transition duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            Pregúntale a la IA de Ebenezer
          </span>
          <span
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#7DD3FC]/50 shadow-[0_6px_22px_rgba(8,26,58,0.45),0_0_20px_rgba(96,165,250,0.45),0_0_30px_rgba(168,85,247,0.3)] transition duration-200 group-hover:scale-105 group-active:scale-95"
            style={{ backgroundImage: "linear-gradient(135deg, #081A3A 0%, #0F2A5E 55%, #2A1B5C 100%)" }}
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-[#60A5FA]/20 [animation-duration:2.8s]" />
            <IconoIA size={38} className="relative" />
          </span>
        </button>
      )}

      {/* Panel lateral */}
      <aside
        role="dialog"
        aria-label="Asistente IA de Ebenezer"
        aria-hidden={!abierto}
        className={`select-text text-[#0F172A] fixed inset-y-0 right-0 z-[100] flex w-full max-w-[430px] flex-col border-l border-[#DCE7F7] bg-[#F8FAFE] shadow-[-12px_0_40px_rgba(8,26,58,0.18)] transition-transform duration-300 ease-out ${
          abierto ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header
          className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3 text-white"
          style={{ backgroundImage: "linear-gradient(135deg, #081A3A 0%, #0F2A5E 55%, #2A1B5C 100%)" }}
        >
          <IconoIA size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight">IA de Ebenezer</p>
            <p className="truncate text-[11px] text-[#A5C8FF]">Responde con los documentos de Calidad</p>
          </div>
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            title="Nueva conversación"
            className="rounded-lg p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <Link
            href="/ayuda/conocimiento"
            onClick={() => setAbierto(false)}
            title="Abrir en pantalla completa"
            className="rounded-lg p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <Expand className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            title="Cerrar"
            className="rounded-lg p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </header>
        <div className="min-h-0 flex-1 pt-3">
          {montado && <ConocimientoChat key={version} nombre={primerNombre} compacto />}
        </div>
      </aside>
    </>,
    document.body
  );
}
