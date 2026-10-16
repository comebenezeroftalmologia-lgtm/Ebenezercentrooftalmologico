import Link from "next/link";
import { Calendar, ChevronDown, User } from "lucide-react";

export type HeaderVariant =
  | "inicio"
  | "analytics"
  | "leads"
  | "quirurgicos"
  | "no_quirurgicos"
  | "redes_sociales";

function fechaHoyFormateada(): string {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${dias[d.getUTCDay()]}, ${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function WatermarkArtwork({ variant }: { variant: HeaderVariant }) {
  if (variant === "inicio") {
    return (
      <div
        className="pointer-events-none absolute -right-4 -top-8 h-[215px] w-[470px] select-none overflow-hidden opacity-95"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 88% 85% at 76% 42%, rgba(0,0,0,1) 32%, rgba(0,0,0,0.55) 62%, transparent 86%)",
          maskImage:
            "radial-gradient(ellipse 88% 85% at 76% 42%, rgba(0,0,0,1) 32%, rgba(0,0,0,0.55) 62%, transparent 86%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/headers/header-ojo.jpg"
          alt=""
          className="h-full w-full object-cover object-right"
        />
      </div>
    );
  }

  if (variant === "analytics") {
    return (
      <svg
        viewBox="0 0 460 180"
        fill="none"
        className="pointer-events-none absolute -right-2 -top-6 h-[185px] w-[460px] select-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="eb-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D9CE0" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#6D9CE0" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="eb-bar-grad-strong" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A82D6" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#4A82D6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Barras de gráfica sutiles en el costado derecho */}
        <rect x="210" y="96" width="22" height="74" rx="4" fill="url(#eb-bar-grad)" />
        <rect x="242" y="74" width="22" height="96" rx="4" fill="url(#eb-bar-grad)" />
        <rect x="274" y="84" width="22" height="86" rx="4" fill="url(#eb-bar-grad)" />
        <rect x="306" y="54" width="22" height="116" rx="4" fill="url(#eb-bar-grad-strong)" />
        <rect x="338" y="66" width="22" height="104" rx="4" fill="url(#eb-bar-grad)" />
        <rect x="370" y="38" width="22" height="132" rx="4" fill="url(#eb-bar-grad-strong)" />
        <rect x="402" y="50" width="22" height="120" rx="4" fill="url(#eb-bar-grad)" />

        {/* Curvas finas de tendencia */}
        <path
          d="M 120 0 C 175 110, 275 145, 460 110"
          stroke="#7CA6E2"
          strokeWidth="1.25"
          strokeOpacity="0.32"
        />
        <path
          d="M 185 0 C 235 90, 325 120, 460 72"
          stroke="#6A98DC"
          strokeWidth="1.25"
          strokeOpacity="0.38"
        />
        <path
          d="M 255 0 C 295 62, 365 82, 460 35"
          stroke="#8BB2E8"
          strokeWidth="1.15"
          strokeOpacity="0.28"
        />

        {/* Nodos sutiles */}
        <circle cx="232" cy="96" r="3.5" fill="#7CA6E2" fillOpacity="0.38" />
        <circle cx="317" cy="54" r="4" fill="#5B8DD8" fillOpacity="0.42" />
        <circle cx="381" cy="38" r="4" fill="#4A82D6" fillOpacity="0.45" />
        <circle cx="155" cy="92" r="2.5" fill="#7CA6E2" fillOpacity="0.3" />
      </svg>
    );
  }

  if (variant === "leads") {
    return (
      <svg
        viewBox="0 0 440 180"
        fill="none"
        className="pointer-events-none absolute -right-2 -top-6 h-[185px] w-[440px] select-none"
        aria-hidden="true"
      >
        <circle cx="330" cy="64" r="128" stroke="#7CA6E2" strokeWidth="1.2" strokeOpacity="0.22" />
        <circle cx="330" cy="64" r="94" stroke="#7CA6E2" strokeWidth="10" strokeOpacity="0.08" />
        <circle cx="330" cy="64" r="64" stroke="#6A98DC" strokeWidth="12" strokeOpacity="0.11" />
        <circle cx="330" cy="64" r="34" stroke="#5B8DD8" strokeWidth="10" strokeOpacity="0.14" />
        <circle cx="330" cy="64" r="10" fill="#5B8DD8" fillOpacity="0.16" />
        <line x1="175" y1="64" x2="440" y2="64" stroke="#7CA6E2" strokeWidth="1" strokeOpacity="0.18" />
        <line x1="330" y1="0" x2="330" y2="175" stroke="#7CA6E2" strokeWidth="1" strokeOpacity="0.18" />
      </svg>
    );
  }

  if (variant === "quirurgicos") {
    return (
      <svg
        viewBox="0 0 440 180"
        fill="none"
        className="pointer-events-none absolute -right-2 -top-6 h-[185px] w-[440px] select-none"
        aria-hidden="true"
      >
        <circle cx="325" cy="68" r="95" stroke="#7CA6E2" strokeWidth="1.15" strokeOpacity="0.22" strokeDasharray="4 4" />
        <circle cx="325" cy="68" r="68" stroke="#6A98DC" strokeWidth="1.4" strokeOpacity="0.28" />
        <circle cx="325" cy="68" r="44" fill="#6A98DC" fillOpacity="0.10" stroke="#5B8DD8" strokeWidth="1.5" strokeOpacity="0.32" />
        {/* Hápticos estilizados de lente intraocular (LIO) */}
        <path
          d="M 285 48 C 245 18, 285 -6, 345 12"
          stroke="#5B8DD8"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.22"
        />
        <path
          d="M 365 88 C 405 118, 365 142, 305 124"
          stroke="#5B8DD8"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.22"
        />
        <circle cx="258" cy="108" r="3" fill="#5B8DD8" fillOpacity="0.35" />
        <circle cx="392" cy="28" r="3" fill="#5B8DD8" fillOpacity="0.35" />
      </svg>
    );
  }

  if (variant === "no_quirurgicos") {
    return (
      <svg
        viewBox="0 0 440 180"
        fill="none"
        className="pointer-events-none absolute -right-2 -top-6 h-[185px] w-[440px] select-none"
        aria-hidden="true"
      >
        {/* Anillos de topografía corneal diagnóstica */}
        <ellipse cx="330" cy="68" rx="115" ry="78" stroke="#7CA6E2" strokeWidth="1.2" strokeOpacity="0.20" />
        <ellipse cx="330" cy="68" rx="88" ry="58" stroke="#6A98DC" strokeWidth="1.3" strokeOpacity="0.25" />
        <ellipse cx="330" cy="68" rx="62" ry="40" stroke="#5B8DD8" strokeWidth="1.4" strokeOpacity="0.30" />
        <ellipse cx="330" cy="68" rx="36" ry="23" stroke="#4A82D6" strokeWidth="1.5" strokeOpacity="0.34" />
        <circle cx="330" cy="68" r="7" fill="#4A82D6" fillOpacity="0.22" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 440 180"
      fill="none"
      className="pointer-events-none absolute -right-2 -top-6 h-[185px] w-[440px] select-none"
      aria-hidden="true"
    >
      {/* Nodos y órbitas de alcance digital */}
      <path d="M 190 130 Q 280 20 420 50" stroke="#6A98DC" strokeWidth="1.3" strokeOpacity="0.28" />
      <path d="M 220 155 Q 310 65 430 95" stroke="#7CA6E2" strokeWidth="1.2" strokeOpacity="0.24" />
      <circle cx="285" cy="68" r="26" fill="#6A98DC" fillOpacity="0.09" stroke="#5B8DD8" strokeWidth="1.2" strokeOpacity="0.28" />
      <circle cx="365" cy="48" r="16" fill="#6A98DC" fillOpacity="0.12" stroke="#5B8DD8" strokeWidth="1.2" strokeOpacity="0.32" />
      <circle cx="340" cy="105" r="12" fill="#6A98DC" fillOpacity="0.10" stroke="#5B8DD8" strokeWidth="1.2" strokeOpacity="0.28" />
      <circle cx="285" cy="68" r="4" fill="#4A82D6" fillOpacity="0.45" />
      <circle cx="365" cy="48" r="3.5" fill="#4A82D6" fillOpacity="0.45" />
      <circle cx="340" cy="105" r="3" fill="#4A82D6" fillOpacity="0.40" />
    </svg>
  );
}

export function ExecutiveHeader({
  overline = "CENTRO OFTALMOLÓGICO EBENEZER",
  title,
  subtitle,
  variant,
  rightControls,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  variant: HeaderVariant;
  rightControls?: React.ReactNode;
}) {
  const fechaTexto = fechaHoyFormateada();

  return (
    <header className="relative mb-5 flex flex-wrap items-start justify-between gap-4 pt-1 pb-2">
      <WatermarkArtwork variant={variant} />

      <div className="relative z-10 min-w-0">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B6B8C]">
          {overline}
        </div>
        <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.022em] text-[#0E245E]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[13.5px] font-normal text-[#52627C]">{subtitle}</p>
        )}
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-2.5">
        {rightControls ?? (
          <div className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-[#DCE5F2] bg-white/95 px-3.5 text-[12.5px] font-medium text-[#0E245E] shadow-[0_1px_3px_rgba(14,36,94,0.04)]">
            <Calendar className="h-3.5 w-3.5 text-[#1D58D8]" strokeWidth={2} />
            <span>{fechaTexto}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" strokeWidth={2} />
          </div>
        )}
        <Link
          href="/perfil"
          title="Mi perfil"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[#DCE5F2] bg-white/95 text-[#0E245E] shadow-[0_1px_3px_rgba(14,36,94,0.04)] transition hover:border-[#94A3B8]"
        >
          <User className="h-4 w-4" strokeWidth={1.85} />
        </Link>
      </div>
    </header>
  );
}
