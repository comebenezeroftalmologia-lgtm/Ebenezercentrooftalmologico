/** Icono "IA": anillo de neón (cian → violeta) con las letras AI. Original de Ebenezer, sin dependencias. */
export function IconoIA({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 0 5px rgba(99,179,255,0.55)) drop-shadow(0 0 9px rgba(167,110,255,0.35))" }}
    >
      <defs>
        <linearGradient id="eb-ia-anillo" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5EEAD4" />
          <stop offset="0.5" stopColor="#60A5FA" />
          <stop offset="1" stopColor="#C084FC" />
        </linearGradient>
        <linearGradient id="eb-ia-texto" x1="14" y1="16" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A5F3FC" />
          <stop offset="1" stopColor="#E9D5FF" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" stroke="url(#eb-ia-anillo)" strokeWidth="2.6" />
      <circle cx="24" cy="24" r="14.5" stroke="url(#eb-ia-anillo)" strokeOpacity="0.28" strokeWidth="1" />
      <text
        x="24"
        y="29.5"
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="url(#eb-ia-texto)"
        letterSpacing="0.5"
      >
        AI
      </text>
      {/* destellos */}
      <path d="M38 9.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#E0F2FE" />
    </svg>
  );
}
