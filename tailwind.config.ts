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
        heading: ["var(--font-cuerpo)", "Questrial", "sans-serif"],
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
        "eb-out": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
