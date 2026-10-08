import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0E245E",
        "navy-90": "#1A3174",
        "navy-70": "#3B4F8D",
        "navy-20": "#C7CDE0",
        "navy-10": "#E4E7F0",
        blue: "#0F2FF3",
        "blue-soft": "#6791F0",
        "blue-10": "#E7ECFE",
        aqua: "#B0FFFA",
        "aqua-50": "#D8FFFD",
        "aqua-20": "#EEFFFF",
        green: "#21814B",
        "green-10": "#DCEEE3",
        paper: "#F5F5F5",
        ink: "#0B1633",
        "ink-2": "#2A335A",
        "ink-3": "#5B6483",
        line: "#E1E4EC",
        "line-2": "#EFF1F6",
        ebbg: "#FAFBFC",
        // legacy aliases kept so existing classes don't break
        "navy-deep": "#0B1633",
        "blue-electric": "#0F2FF3",
        "mint-cyan": "#B0FFFA",
      },
      fontFamily: {
        display: ["var(--font-cuerpo)", "Questrial", "Outfit", "sans-serif"],
        body: ["var(--font-cuerpo)", "Inter", "sans-serif"],
        label: ["var(--font-titulo)", "Inter", "sans-serif"],
        // Para CIFRAS, nunca para texto. Monoespaciada y de ancho fijo por
        // digito, asi las columnas de numeros quedan alineadas. Es el detalle
        // que no se nota conscientemente y que separa un producto de una
        // plantilla (es lo que hace Vercel).
        cifra: [
          "ui-monospace",
          "SF Mono",
          "Cascadia Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
        heading: ["var(--font-cuerpo)", "Questrial", "sans-serif"],
        // Serif para los titulos. Es lo que da el aire de documento serio
        // frente al tablero generico: el titulo se lee como algo escrito,
        // no como una etiqueta de interfaz. Solo para titulos, nunca para
        // datos ni para cifras.
        titulo: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "18px",
        xl: "28px",
        "2xl": "40px",
        pill: "999px",
      },
      boxShadow: {
        "eb-1": "0 1px 2px rgba(14,36,94,0.04), 0 1px 1px rgba(14,36,94,0.04)",
        "eb-2": "0 4px 10px rgba(14,36,94,0.06), 0 1px 2px rgba(14,36,94,0.04)",
        "eb-3": "0 12px 28px rgba(14,36,94,0.10), 0 2px 6px rgba(14,36,94,0.06)",
        "eb-4": "0 24px 60px rgba(14,36,94,0.14), 0 8px 16px rgba(14,36,94,0.08)",
        "eb-focus": "0 0 0 4px rgba(15,47,243,0.18)",
      },
      letterSpacing: {
        label: "0.16em",
        overline: "0.12em",
      },
      transitionTimingFunction: {
        // LA CURVA DE ATTIO. Medida el 06-10-2026 directamente sobre
        // attio.com, que es la referencia que escogio Faber: arranca de una y
        // frena larguisimo. Es lo que hace que el movimiento se sienta caro en
        // vez de rebotado. Es su firma y aqui se adopta tal cual.
        attio: "cubic-bezier(0.2, 0, 0, 1)",
        "attio-sim": "cubic-bezier(0.65, 0, 0.35, 1)", // simetrica, para bucles
        "eb-out": "cubic-bezier(0.22, 1, 0.36, 1)",
        // Arranca rapido y frena suave. Es lo que hace que el movimiento se
        // sienta fisico y no mecanico. Mas pronunciada que eb-out: para
        // entradas y conteos, donde el frenado tiene que notarse.
        "eb-entrada": "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      // --- MOVIMIENTO ------------------------------------------------------
      // Tres gestos, y nada mas. Cada uno con su nombre, para que todas las
      // paginas se muevan igual y nadie invente uno nuevo.
      //
      //   entrar  -> el bloque sube 10px y se revela. Para secciones.
      //   crecer  -> la barra sale desde abajo. Para las barras de dias.
      //   abrir   -> se despliega de izquierda a derecha. Para composiciones.
      //
      // Ninguno pasa de 800ms: mas alla deja de ser elegante y empieza a
      // estorbarle a quien entra veinte veces al dia.
      keyframes: {
        entrar: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
        crecer: {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        // Attio no "aparece" los bloques desde lejos: los sube 8px. Poca
        // distancia y curva larga. Por eso se siente que el producto responde,
        // no que la pagina se esta armando delante de uno.
        asomar: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        // Latido lento de fondo, 3,6s, como el radar de su portada. Es lo unico
        // que se mueve solo, y casi no se nota: esa es la gracia.
        latir: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        entrar: "entrar .62s cubic-bezier(0.16,1,0.3,1) both",
        crecer: "crecer .56s cubic-bezier(0.16,1,0.3,1) both",
        asomar: "asomar .3s cubic-bezier(0.2,0,0,1) both",
        latir: "latir 3.6s cubic-bezier(0.65,0,0.35,1) infinite",
      },
      transitionDuration: {
        // Los tres tiempos de Attio, medidos en su sitio.
        micro: "150ms",   // hover, opacidad: tiene que sentirse instantaneo
        gesto: "300ms",   // color, transformaciones
        mover: "400ms",   // desplazamientos
        abrir: "700ms",   // barras que se despliegan
      },
    },
  },
  plugins: [],
};

export default config;
