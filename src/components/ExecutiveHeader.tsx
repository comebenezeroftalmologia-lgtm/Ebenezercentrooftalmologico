import React from "react";

export type HeaderVariant =
  | "inicio"
  | "analytics"
  | "venta"
  | "embudo"
  | "quirurgicos"
  | "no-quirurgicos"
  | "redes"
  | "procesos"
  | "proyectos";

interface ExecutiveHeaderProps {
  title: string;
  subtitle?: string;
  variant?: HeaderVariant;
  rightContent?: React.ReactNode;
}

export function ExecutiveHeader({
  title,
  subtitle = " Centro Oftalmológico Ebenezer",
  variant = "inicio",
  rightContent,
}: ExecutiveHeaderProps) {
  return (
    <header className="relative -mx-4 -mt-4 mb-5 overflow-hidden px-4 pt-4 pb-3 sm:-mx-7 sm:-mt-5 sm:px-7 sm:pt-5 sm:pb-3.5">
      {/* Resplandor azul ejecutivo en la esquina superior derecha */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-[420px] select-none"
        style={{
          background:
            "radial-gradient(ellipse 95% 90% at 88% 18%, rgba(147, 197, 253, 0.42) 0%, rgba(191, 219, 254, 0.22) 48%, rgba(234, 242, 252, 0) 80%)",
        }}
      />

      {variant === "inicio" && (
        <div
          className="pointer-events-none absolute inset-0 select-none"
          style={{
            backgroundImage: "url('/brand/headers/header-ojo.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}

      {(variant === "analytics" || variant === "venta") && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[380px] select-none">
          <svg viewBox="0 0 380 120" fill="none" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
            <defs>
              <linearGradient id="agBar1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.18" />
              </linearGradient>
              <linearGradient id="agBar2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.24" />
              </linearGradient>
              <linearGradient id="agBar3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.86" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.30" />
              </linearGradient>
            </defs>
            <circle cx="330" cy="18" r="95" fill="#93C5FD" fillOpacity="0.22" />
            <line x1="120" y1="98" x2="365" y2="98" stroke="#60A5FA" strokeOpacity="0.4" strokeWidth="1.5" />
            <rect x="150" y="68" width="20" height="30" rx="5" fill="url(#agBar1)" />
            <rect x="180" y="54" width="20" height="44" rx="5" fill="url(#agBar1)" />
            <rect x="210" y="60" width="20" height="38" rx="5" fill="url(#agBar1)" />
            <rect x="240" y="42" width="22" height="56" rx="5" fill="url(#agBar2)" />
            <rect x="270" y="48" width="22" height="50" rx="5" fill="url(#agBar2)" />
            <rect x="300" y="28" width="24" height="70" rx="5" fill="url(#agBar2)" />
            <rect x="332" y="14" width="26" height="84" rx="6" fill="url(#agBar3)" />
            <path
              d="M145 72 C 185 62, 220 48, 255 44 C 290 40, 320 24, 350 12"
              stroke="#1D58D8"
              strokeOpacity="0.65"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="255" cy="44" r="4" fill="#1D58D8" fillOpacity="0.7" />
            <circle cx="312" cy="28" r="4" fill="#1D58D8" fillOpacity="0.8" />
            <circle cx="350" cy="12" r="5" fill="#1D58D8" fillOpacity="0.9" />
          </svg>
        </div>
      )}

      {(variant === "embudo" || variant === "redes") && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[380px] select-none">
          <svg viewBox="0 0 380 120" fill="none" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
            <circle cx="320" cy="58" r="78" stroke="#60A5FA" strokeOpacity="0.32" strokeWidth="1.5" />
            <circle cx="320" cy="58" r="54" stroke="#3B82F6" strokeOpacity="0.42" strokeWidth="2" />
            <circle cx="320" cy="58" r="32" fill="#93C5FD" fillOpacity="0.28" stroke="#2563EB" strokeOpacity="0.5" strokeWidth="2" />
            <rect x="195" y="18" width="145" height="16" rx="8" fill="#60A5FA" fillOpacity="0.48" />
            <rect x="215" y="42" width="105" height="16" rx="8" fill="#3B82F6" fillOpacity="0.62" />
            <rect x="235" y="66" width="65" height="16" rx="8" fill="#2563EB" fillOpacity="0.76" />
            <rect x="250" y="90" width="35" height="14" rx="7" fill="#1D4ED8" fillOpacity="0.88" />
          </svg>
        </div>
      )}

      {(variant === "quirurgicos" || variant === "no-quirurgicos") && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[380px] select-none">
          <svg viewBox="0 0 380 120" fill="none" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
            <circle cx="315" cy="58" r="64" fill="#93C5FD" fillOpacity="0.22" stroke="#60A5FA" strokeOpacity="0.45" strokeWidth="1.8" />
            <circle cx="315" cy="58" r="42" fill="#60A5FA" fillOpacity="0.22" stroke="#3B82F6" strokeOpacity="0.55" strokeWidth="2" />
            <rect x="306" y="30" width="18" height="56" rx="5" fill="#2563EB" fillOpacity="0.72" />
            <rect x="287" y="49" width="56" height="18" rx="5" fill="#2563EB" fillOpacity="0.72" />
            <path
              d="M140 76 L195 76 L210 52 L226 92 L244 38 L260 80 L274 66 L365 66"
              stroke="#1D58D8"
              strokeOpacity="0.65"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {(variant === "procesos" || variant === "proyectos") && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[380px] select-none">
          <svg viewBox="0 0 380 120" fill="none" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
            <circle cx="330" cy="30" r="80" fill="#93C5FD" fillOpacity="0.22" />
            <path d="M185 68 H245 L270 38 H330" stroke="#3B82F6" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M245 68 L270 90 H340" stroke="#60A5FA" strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="155" y="52" width="44" height="30" rx="8" fill="#60A5FA" fillOpacity="0.45" stroke="#2563EB" strokeOpacity="0.5" strokeWidth="1.5" />
            <rect x="255" y="22" width="52" height="30" rx="8" fill="#3B82F6" fillOpacity="0.62" stroke="#1D4ED8" strokeOpacity="0.6" strokeWidth="1.5" />
            <rect x="265" y="72" width="52" height="30" rx="8" fill="#2563EB" fillOpacity="0.52" stroke="#1D4ED8" strokeOpacity="0.5" strokeWidth="1.5" />
            <rect x="325" y="18" width="38" height="84" rx="8" fill="#1D4ED8" fillOpacity="0.75" />
            <circle cx="245" cy="68" r="5" fill="#1D58D8" fillOpacity="0.85" />
          </svg>
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#0F172A] sm:text-[25px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-medium text-[#475569]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#64748B]" />
              <span>{subtitle}</span>
            </p>
          )}
        </div>
        {rightContent && <div className="flex items-center gap-2.5">{rightContent}</div>}
      </div>
    </header>
  );
}