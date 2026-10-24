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
          ? "fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]"
          : "flex h-full w-full flex-col overflow-hidden bg-[#F8FAFC]"
      }
      data-user={usuario.email}
    >
      {/* Barra superior integrada al lienzo #F8FAFC */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[#E6EEF8] bg-[#F8FAFC] px-6">
        <div className="flex min-w-0 items-center gap-2">
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#1D4ED8]" />
          <div className="flex min-w-0 items-center gap-1.5 text-[12px]">
            <span className="hidden font-semibold uppercase tracking-[0.08em] text-[#64748B] sm:inline">
              WorkCenter
            </span>
            <span className="hidden text-[#CBD5E1] sm:inline">·</span>
            <span className="truncate font-semibold text-[#0E245E]">
              Liquidador de Honorarios Médicos
            </span>
          </div>
          <span className="hidden items-center gap-1 rounded-full border border-[#DCE7F7] bg-white px-2 py-0.5 text-[10.5px] font-medium text-[#475569] md:inline-flex">
            <Lock className="h-2.5 w-2.5 text-[#2563EB]" />
            Sesión individual con contraseña
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Recargar vista"
            className="inline-flex items-center gap-1 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155] transition hover:border-[#94A3B8] hover:text-[#0E245E]"
          >
            <RotateCw className="h-3 w-3 text-[#64748B]" />
            <span className="hidden sm:inline">Recargar</span>
          </button>

          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Salir de pantalla completa" : "Ampliar a pantalla completa"}
            className="inline-flex items-center gap-1 rounded-[8px] border border-[#C9DDFB] bg-[#EBF3FE] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
          >
            {fullscreen ? (
              <>
                <Minimize2 className="h-3 w-3" />
                <span>Mostrar menú</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" />
                <span>Pantalla completa</span>
              </>
            )}
          </button>

          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en una pestaña independiente"
            className="inline-flex items-center gap-1 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155] transition hover:border-[#94A3B8] hover:text-[#0E245E]"
          >
            <ExternalLink className="h-3 w-3 text-[#64748B]" />
            <span className="hidden lg:inline">Nueva pestaña</span>
          </a>
        </div>
      </div>

      {/* Lienzo nativo del Liquidador */}
      <div className="relative min-h-0 flex-1 w-full bg-[#F8FAFC]">
        <iframe
          key={reloadKey}
          src={appUrl}
          title="Liquidador de Honorarios Médicos — Centro Oftalmológico Ebenezer"
          className="h-full w-full border-0 bg-[#F8FAFC]"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}
