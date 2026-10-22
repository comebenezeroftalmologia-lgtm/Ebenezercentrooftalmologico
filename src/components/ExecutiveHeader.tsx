import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { HeaderDatePicker } from "@/components/HeaderDatePicker";

export type HeaderVariant =
  | "inicio"
  | "analytics"
  | "leads"
  | "quirurgicos"
  | "no_quirurgicos"
  | "redes_sociales" | "procesos" | "proyectos";

/* Con un selector de fecha arriba, el rotulo NO puede seguir diciendo
   "hoy": las dos cosas se contradicen en la misma franja y quien mira no
   sabe de que dia son las cifras. Si le pasan una fecha, muestra esa. */
function fechaFormateada(iso?: string): string {
  const d = iso
    ? new Date(iso + "T12:00:00Z")
    : new Date(Date.now() - 5 * 60 * 60 * 1000);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${dias[d.getUTCDay()]}, ${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function WatermarkArtwork({ variant }: { variant: HeaderVariant }) {
  if (variant === "inicio") {
    return (
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-[480px] select-none overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.65) 28%, rgba(0,0,0,1) 58%)",
          maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.65) 28%, rgba(0,0,0,1) 58%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/headers/header-ojo.jpg"
          alt=""
          className="h-full w-full object-cover object-right contrast-[1.38] saturate-[1.45] brightness-[0.92]"
        />
      </div>
    );
  }

  if (variant === "analytics") {
    return (
      <svg viewBox="0 0 460 165" fill="none" className="pointer-events-none absolute right-0 top-0 h-full w-[460px] select-none" aria-hidden="true">
        <defs>
          <linearGradient id="eb-bar-1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="eb-bar-2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.76" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="eb-wave-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d="M 110 165 L 110 115 C 185 95, 255 68, 340 44 C 390 30, 425 26, 460 18 L 460 165 Z" fill="url(#eb-wave-a)" />
        <rect x="202" y="88" width="24" height="77" rx="5" fill="url(#eb-bar-1)" stroke="#2563EB" strokeOpacity="0.45" strokeWidth="1" />
        <rect x="236" y="66" width="24" height="99" rx="5" fill="url(#eb-bar-1)" stroke="#2563EB" strokeOpacity="0.45" strokeWidth="1" />
        <rect x="270" y="76" width="24" height="89" rx="5" fill="url(#eb-bar-1)" stroke="#2563EB" strokeOpacity="0.45" strokeWidth="1" />
        <rect x="304" y="44" width="24" height="121" rx="5" fill="url(#eb-bar-2)" stroke="#1D4ED8" strokeOpacity="0.65" strokeWidth="1.2" />
        <rect x="338" y="56" width="24" height="109" rx="5" fill="url(#eb-bar-1)" stroke="#2563EB" strokeOpacity="0.45" strokeWidth="1" />
        <rect x="372" y="28" width="24" height="137" rx="5" fill="url(#eb-bar-2)" stroke="#1D4ED8" strokeOpacity="0.72" strokeWidth="1.2" />
        <rect x="406" y="40" width="24" height="125" rx="5" fill="url(#eb-bar-1)" stroke="#2563EB" strokeOpacity="0.50" strokeWidth="1" />
        <path d="M 85 138 C 165 122, 248 78, 316 44 C 362 22, 412 20, 460 12" stroke="#1D4ED8" strokeWidth="2.2" strokeOpacity="0.82" />
        <path d="M 135 152 C 210 132, 285 98, 384 54 C 415 40, 440 36, 460 30" stroke="#2563EB" strokeWidth="1.7" strokeOpacity="0.62" />
        <path d="M 160 8 C 215 74, 305 104, 460 68" stroke="#3B82F6" strokeWidth="1.4" strokeOpacity="0.52" strokeDasharray="4 4" />
        <circle cx="248" cy="66" r="6" fill="#3B82F6" fillOpacity="0.28" />
        <circle cx="248" cy="66" r="3.5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2" />
        <circle cx="316" cy="44" r="7" fill="#2563EB" fillOpacity="0.32" />
        <circle cx="316" cy="44" r="4" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
        <circle cx="384" cy="28" r="7" fill="#1D4ED8" fillOpacity="0.35" />
        <circle cx="384" cy="28" r="4" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
      </svg>
    );
  }

  if (variant === "leads") {
    return (
      <svg viewBox="0 0 460 165" fill="none" className="pointer-events-none absolute right-0 top-0 h-full w-[460px] select-none" aria-hidden="true">
        <circle cx="348" cy="78" r="118" stroke="#3B82F6" strokeWidth="1.6" strokeOpacity="0.45" />
        <circle cx="348" cy="78" r="88" fill="#3B82F6" fillOpacity="0.12" stroke="#2563EB" strokeWidth="2" strokeOpacity="0.58" />
        <circle cx="348" cy="78" r="58" fill="#2563EB" fillOpacity="0.16" stroke="#1D4ED8" strokeWidth="2.2" strokeOpacity="0.68" />
        <circle cx="348" cy="78" r="30" fill="#1D4ED8" fillOpacity="0.24" stroke="#1E40AF" strokeWidth="2.2" strokeOpacity="0.78" />
        <circle cx="348" cy="78" r="9" fill="#1D4ED8" fillOpacity="0.85" />
        <line x1="205" y1="78" x2="455" y2="78" stroke="#2563EB" strokeWidth="1.3" strokeOpacity="0.42" strokeDasharray="4 4" />
        <line x1="348" y1="0" x2="348" y2="165" stroke="#2563EB" strokeWidth="1.3" strokeOpacity="0.42" strokeDasharray="4 4" />
        <circle cx="260" cy="78" r="4.5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
        <circle cx="290" cy="42" r="4.5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
        <circle cx="392" cy="116" r="4.5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
      </svg>
    );
  }

  if (variant === "quirurgicos") {
    return (
      <svg viewBox="0 0 460 165" fill="none" className="pointer-events-none absolute right-0 top-0 h-full w-[460px] select-none" aria-hidden="true">
        <defs>
          <radialGradient id="eb-iol" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#2563EB" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.68" />
          </radialGradient>
        </defs>
        <circle cx="342" cy="80" r="92" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.48" strokeDasharray="5 5" />
        <circle cx="342" cy="80" r="68" stroke="#2563EB" strokeWidth="1.8" strokeOpacity="0.62" />
        <circle cx="342" cy="80" r="44" fill="url(#eb-iol)" stroke="#1D4ED8" strokeWidth="2.4" strokeOpacity="0.85" />
        <path d="M 316 62 A 28 28 0 0 1 362 56" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.85" />
        <path d="M 302 58 C 252 22, 292 -4, 366 14" stroke="#1D4ED8" strokeWidth="4.2" strokeLinecap="round" strokeOpacity="0.72" />
        <path d="M 382 102 C 432 138, 392 164, 318 146" stroke="#1D4ED8" strokeWidth="4.2" strokeLinecap="round" strokeOpacity="0.72" />
        <circle cx="274" cy="112" r="4" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2" />
        <circle cx="410" cy="48" r="4" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2" />
      </svg>
    );
  }

  if (variant === "no_quirurgicos") {
    return (
      <svg viewBox="0 0 460 165" fill="none" className="pointer-events-none absolute right-0 top-0 h-full w-[460px] select-none" aria-hidden="true">
        <ellipse cx="344" cy="80" rx="112" ry="72" stroke="#3B82F6" strokeWidth="1.6" strokeOpacity="0.46" />
        <ellipse cx="344" cy="80" rx="86" ry="55" fill="#3B82F6" fillOpacity="0.10" stroke="#2563EB" strokeWidth="1.9" strokeOpacity="0.60" />
        <ellipse cx="344" cy="80" rx="60" ry="38" fill="#2563EB" fillOpacity="0.15" stroke="#1D4ED8" strokeWidth="2.1" strokeOpacity="0.72" />
        <ellipse cx="344" cy="80" rx="34" ry="22" fill="#1D4ED8" fillOpacity="0.24" stroke="#1E40AF" strokeWidth="2.2" strokeOpacity="0.82" />
        <circle cx="344" cy="80" r="8" fill="#1D4ED8" fillOpacity="0.85" />
        <line x1="215" y1="80" x2="455" y2="80" stroke="#1D4ED8" strokeWidth="1.2" strokeOpacity="0.40" />
        <line x1="344" y1="4" x2="344" y2="156" stroke="#1D4ED8" strokeWidth="1.2" strokeOpacity="0.40" />
      </svg>
    );
  }

  if (variant === "procesos") {
    return (
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-[480px] select-none overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, transparent 24%, rgba(0,0,0,0.65) 52%, rgba(0,0,0,1) 78%)",
          maskImage: "linear-gradient(90deg, transparent 0%, transparent 24%, rgba(0,0,0,0.65) 52%, rgba(0,0,0,1) 78%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/headers/header-procesos.jpg"
          alt=""
          className="h-full w-full object-cover object-right contrast-[1.08] saturate-[1.12]"
        />
      </div>
    );
  }

  if (variant === "proyectos") {
    return (
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-[480px] select-none overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, transparent 18%, rgba(0,0,0,0.68) 46%, rgba(0,0,0,1) 76%)",
          maskImage: "linear-gradient(90deg, transparent 0%, transparent 18%, rgba(0,0,0,0.68) 46%, rgba(0,0,0,1) 76%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/headers/header-proyectos.jpg"
          alt=""
          className="h-full w-full object-cover object-right contrast-[1.08] saturate-[1.12]"
        />
      </div>
    );
  }

  return (
    <svg viewBox="0 0 460 165" fill="none" className="pointer-events-none absolute right-0 top-0 h-full w-[460px] select-none" aria-hidden="true">
      <path d="M 165 138 Q 275 18 445 48" stroke="#1D4ED8" strokeWidth="2.2" strokeOpacity="0.72" />
      <path d="M 205 156 Q 315 58 450 96" stroke="#2563EB" strokeWidth="1.8" strokeOpacity="0.58" />
      <circle cx="290" cy="70" r="28" fill="#2563EB" fillOpacity="0.18" stroke="#1D4ED8" strokeWidth="2" strokeOpacity="0.72" />
      <circle cx="378" cy="46" r="20" fill="#2563EB" fillOpacity="0.22" stroke="#1D4ED8" strokeWidth="2" strokeOpacity="0.76" />
      <circle cx="352" cy="112" r="15" fill="#3B82F6" fillOpacity="0.20" stroke="#2563EB" strokeWidth="1.8" strokeOpacity="0.68" />
      <circle cx="290" cy="70" r="5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.4" />
      <circle cx="378" cy="46" r="4.5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.4" />
      <circle cx="352" cy="112" r="4" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
    </svg>
  );
}

export function ExecutiveHeader({
  overline = "CENTRO OFTALMOLÓGICO EBENEZER",
  title,
  subtitle,
  variant,
  rightControls,
  fechaISO,
  selectableDate = false,
  availableDates,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  variant: HeaderVariant;
  rightControls?: React.ReactNode;
  /** Dia que se esta mostrando. Si no viene, se muestra hoy. */
  fechaISO?: string;
  /** Si es true, la pildora de fecha abre un calendario interactivo. */
  selectableDate?: boolean;
  /** Fechas con datos disponibles para resaltar en el calendario. */
  availableDates?: string[];
}) {
  const fechaTexto = fechaFormateada(fechaISO);

  return (
    <header className="mb-5">
      <div className="relative rounded-[18px] border border-[#D5E3F7] bg-gradient-to-r from-[#EEF4FD] via-[#E5EFFC] to-[#D4E5FA] px-6 py-5 shadow-[0_2px_10px_rgba(14,36,94,0.04)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]">
          <WatermarkArtwork variant={variant} />
        </div>

        <Link
          href="/perfil"
          title="Mi perfil"
          className="absolute right-2.5 top-2.5 z-20 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#CBD9EE] bg-white/90 text-[#0E245E] shadow-[0_2px_6px_rgba(14,36,94,0.06)] backdrop-blur-sm transition hover:border-[#94A3B8] hover:bg-white"
        >
          <User className="h-4 w-4" strokeWidth={1.9} />
        </Link>

        <div className="relative z-20 flex flex-wrap items-start justify-between gap-4 pr-10">
          <div className="min-w-0 max-w-[680px]">
            <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#47597A]">
                {overline}
              </span>
              {selectableDate ? (
                <HeaderDatePicker
                  fechaISO={fechaISO}
                  fechaTexto={fechaTexto}
                  availableDates={availableDates}
                />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CBD9EE] bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-[#0E245E] shadow-[0_1px_3px_rgba(14,36,94,0.04)]">
                  <Calendar className="h-3 w-3 text-[#1D58D8]" strokeWidth={2} />
                  <span>{fechaTexto}</span>
                </span>
              )}
            </div>
            <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.022em] text-[#0E245E]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-[13.5px] font-medium text-[#47597A]">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {rightControls && (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 rounded-[14px] border border-[#E2EBF8] bg-white px-5 py-3 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
            {variant === "procesos" || variant === "proyectos" ? "Acciones rápidas" : "Filtros del tablero"}
          </span>
          <div className="flex flex-wrap items-end gap-3">{rightControls}</div>
        </div>
      )}
    </header>
  );
}