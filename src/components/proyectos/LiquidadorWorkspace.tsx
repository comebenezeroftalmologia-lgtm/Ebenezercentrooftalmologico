"use client";

import { useState } from "react";
import { ExternalLink, FileSpreadsheet, Lock, Maximize2, Minimize2, RotateCw } from "lucide-react";

export function LiquidadorWorkspace({
  usuario,
}: {
  usuario: { id: string; nombre: string; email: string; esAdmin: boolean };
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const appUrl = `/api/liquidador-app?r=${reloadKey}`;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-white"
          : "flex h-full w-full flex-col overflow-hidden bg-white"
      }
      data-user={usuario.email}
    >
      {/* Barra superior institucional compacta */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[#DCE7F7] bg-[#F8FAFE] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#EBF3FE] text-[#1D4ED8]">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="hidden font-medium text-[#64748B] sm:inline">WorkCenter</span>
            <span className="hidden text-[#CBD5E1] sm:inline">/</span>
            <span className="truncate font-bold text-[#0E245E]">
              Liquidador de Honorarios Médicos
            </span>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-[#DCE7F7] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#1E293B] md:inline-flex">
            <Lock className="h-3 w-3 text-[#2563EB]" />
            Acceso individual con contraseña
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Recargar archivo"
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition hover:border-[#94A3B8] hover:text-[#0E245E]"
          >
            <RotateCw className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="hidden sm:inline">Recargar</span>
          </button>

          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Salir de pantalla completa" : "Ampliar a pantalla completa"}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#C9DDFB] bg-[#EBF3FE] px-2.5 py-1 text-[11.5px] font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
          >
            {fullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Mostrar menú</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Pantalla completa</span>
              </>
            )}
          </button>

          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en una pestaña independiente"
            className="inline-flex items-center gap-1 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition hover:border-[#94A3B8] hover:text-[#0E245E]"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="hidden lg:inline">Nueva pestaña</span>
          </a>
        </div>
      </div>

      {/* Lienzo completo del Liquidador de Honorarios Médicos original */}
      <div className="relative min-h-0 flex-1 w-full bg-white">
        <iframe
          key={reloadKey}
          src={appUrl}
          title="Liquidador de Honorarios Médicos — Centro Oftalmológico Ebenezer"
          className="h-full w-full border-0"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}
