import type { Metadata } from "next";
import localFont from "next/font/local";
import { Sidebar } from "@/components/Sidebar";
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
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
