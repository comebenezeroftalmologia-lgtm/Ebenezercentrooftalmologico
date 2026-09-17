import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fuentes reales de la marca (Ebenezer Design System).
// Cada familia llega en dos archivos que cubren rangos de peso distintos.
const cuerpo = localFont({
  src: [
    { path: "../../public/brand/fonts/Cuerpo.otf", weight: "300 500", style: "normal" },
    { path: "../../public/brand/fonts/Cuerpo-2.otf", weight: "600 700", style: "normal" },
  ],
  variable: "--font-cuerpo",
  display: "swap",
});

const titulo = localFont({
  src: [
    { path: "../../public/brand/fonts/Titulo.ttf", weight: "700", style: "normal" },
    { path: "../../public/brand/fonts/Titulo-2.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-titulo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ebenezer — Tableros comerciales",
  description: "Tableros de control de Centro Oftalmológico Ebenezer",
};

// Layout raíz — solo html/body/fuentes/estilos globales. El wrapper con
// el Sidebar de mercadeo vive en (marketing)/layout.tsx: /procesos es
// una sección aparte, con su propio login y su propia navegación, y no
// debe llevar el sidebar de tableros comerciales.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${cuerpo.variable} ${titulo.variable} font-body bg-ebbg text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
