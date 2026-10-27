"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoIA } from "@/components/IconoIA";

/** Acceso flotante a la IA del Centro de Conocimiento, visible en toda la plataforma. */
export function BotonFlotanteIA() {
  const pathname = usePathname();
  // Ya estás en el Centro de Conocimiento: no hace falta el atajo.
  if (pathname.startsWith("/ayuda/conocimiento")) return null;

  return (
    <Link
      href="/ayuda/conocimiento"
      aria-label="Preguntar a la IA de Ebenezer"
      className="group fixed bottom-5 right-5 z-40 flex items-center"
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
    </Link>
  );
}
