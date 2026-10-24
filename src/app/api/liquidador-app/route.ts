import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NATIVE_EBENEZER_STYLE = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style id="ebz-native-frecuencias-theme">
  :root {
    --bg: #F8FAFC !important;
    --bg2: #FFFFFF !important;
    --card: #FFFFFF !important;
    --card2: #F1F5F9 !important;
    --line: #E2E8F0 !important;
    --ink: #0F172A !important;
    --ink2: #475569 !important;
    --muted: #64748B !important;
    --acc: #1D4ED8 !important;
    --acc2: #0284C7 !important;
    --accdark: #0E245E !important;
    --brand: #1D4ED8 !important;
    --grad: linear-gradient(135deg, #0E245E 0%, #1D4ED8 60%, #2563EB 100%) !important;
    --shadow: 0 2px 12px rgba(14, 36, 94, 0.05) !important;
    --r: 16px !important;
  }

  body {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif !important;
    background: #F8FAFC !important;
    color: #0F172A !important;
    padding-bottom: 48px !important;
  }

  h1, h2, h3, .kpi .v, .semtot, .actatop .an, .actatop .at {
    font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif !important;
  }

  .wrap {
    max-width: 1400px !important;
    padding: 16px 24px !important;
  }

  /* Encabezado estilo ExecutiveHeader de Frecuencias (conservando todos sus botones e indicadores) */
  .hero {
    margin-top: 4px !important;
    padding: 20px 24px !important;
    border-radius: 18px !important;
    background: linear-gradient(115deg, #081A3A 0%, #0E245E 48%, #1D4ED8 100%) !important;
    box-shadow: 0 10px 28px rgba(14, 36, 94, 0.14) !important;
    border: 1px solid rgba(96, 165, 250, 0.28) !important;
    color: #FFFFFF !important;
  }

  .hero .brand {
    gap: 16px !important;
  }

  .hero .logo {
    width: 64px !important;
    height: 64px !important;
    padding: 8px !important;
    border-radius: 14px !important;
    background: #FFFFFF !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16) !important;
  }

  .hero h1 {
    color: #FFFFFF !important;
    font-size: 22px !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
  }

  .hero h1 .grad {
    background: none !important;
    -webkit-background-clip: initial !important;
    background-clip: initial !important;
    color: #93C5FD !important;
  }

  .hero .sub {
    color: #DBEAFE !important;
    font-size: 13px !important;
    opacity: 0.92 !important;
  }

  /* Píldoras de estado de nube y barra de usuario (equipo / salir) perfectamente visibles */
  .hero .npill {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
  }

  .hero .userbadge,
  #userBadge {
    background: #FFFFFF !important;
    border: 1px solid #DCE7F7 !important;
    color: #0F172A !important;
    border-radius: 99px !important;
    padding: 7px 16px !important;
    font-size: 12.5px !important;
    box-shadow: 0 2px 8px rgba(14, 36, 94, 0.08) !important;
  }

  #userBadge b {
    color: #0E245E !important;
    font-weight: 700 !important;
  }

  #userBadge a {
    color: #1D4ED8 !important;
    font-weight: 600 !important;
  }

  #userBadge a:hover {
    text-decoration: underline !important;
  }

  /* Paneles y tarjetas al estilo de Frecuencias */
  .panel {
    background: #FFFFFF !important;
    border: 1px solid #E6EEF8 !important;
    border-radius: 16px !important;
    box-shadow: 0 2px 12px rgba(14, 36, 94, 0.04) !important;
    padding: 20px 22px !important;
  }

  .cg-bloque {
    background: #F8FAFC !important;
    border: 1px solid #E2E8F0 !important;
    border-radius: 14px !important;
    padding: 16px !important;
  }

  .cg-bloque.g2 {
    background: #F8FAFF !important;
    border-color: #DCE7F7 !important;
  }

  .cg-grupo.g2 b {
    color: #1D4ED8 !important;
  }

  .carga {
    background: #FFFFFF !important;
    border: 1.5px dashed #CBD5E1 !important;
    border-radius: 14px !important;
    box-shadow: 0 1px 4px rgba(14, 36, 94, 0.03) !important;
  }

  .carga:hover {
    border-color: #2563EB !important;
    background: #F0F7FF !important;
  }

  .carga.comparar {
    border-color: #BFDBFE !important;
    background: linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 100%) !important;
  }

  .carga.comparar .cg-tit {
    color: #0E245E !important;
  }

  /* KPIs ejecutivos estilo Frecuencias */
  .kpi {
    background: #FFFFFF !important;
    border: 1px solid #E6EEF8 !important;
    border-radius: 16px !important;
    box-shadow: 0 2px 12px rgba(14, 36, 94, 0.04) !important;
  }

  .kpi::before {
    background: linear-gradient(90deg, #0E245E 0%, #2563EB 100%) !important;
    height: 3.5px !important;
  }

  .kpi .l {
    color: #64748B !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
  }

  .kpi .v {
    color: #0F172A !important;
  }

  /* Controles, selectores y botones */
  input[type=text], input[type=search], input[type=password], input[type=email], select, input[type=date] {
    border: 1px solid #CBD8EE !important;
    border-radius: 10px !important;
    background: #FFFFFF !important;
    color: #0F172A !important;
    font-size: 13.5px !important;
  }

  input:focus, select:focus {
    border-color: #2563EB !important;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
  }

  .btn {
    background: linear-gradient(135deg, #0E245E 0%, #1D4ED8 100%) !important;
    border-radius: 10px !important;
    box-shadow: 0 4px 12px rgba(29, 78, 216, 0.18) !important;
    font-weight: 600 !important;
  }

  .btn.quiet, .btn.ghost {
    background: #FFFFFF !important;
    color: #0E245E !important;
    border: 1px solid #DCE7F7 !important;
    box-shadow: 0 1px 3px rgba(14, 36, 94, 0.05) !important;
  }

  .btn.quiet:hover:not(:disabled), .btn.ghost:hover:not(:disabled) {
    background: #EBF3FE !important;
    border-color: #93C5FD !important;
    color: #1D4ED8 !important;
  }

  /* Pestañas laterales y tablas */
  .tabwrap > .tabs {
    background: #FFFFFF !important;
    border: 1px solid #E6EEF8 !important;
    border-radius: 16px !important;
    box-shadow: 0 2px 12px rgba(14, 36, 94, 0.04) !important;
  }

  .tab.active {
    background: #E6F0FD !important;
    color: #0E245E !important;
    border: 1px solid #C9DDFB !important;
    border-left: 3.5px solid #2563EB !important;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08) !important;
    font-weight: 700 !important;
  }

  .tab.active .tbadge {
    background: #1D4ED8 !important;
    color: #FFFFFF !important;
  }

  /* Ventana de inicio de sesión con contraseña estilo plataforma Ebenezer */
  #gate {
    background: rgba(8, 26, 58, 0.62) !important;
    backdrop-filter: blur(8px) !important;
  }

  .gatecard {
    background: #FFFFFF !important;
    border: 1px solid #DCE7F7 !important;
    border-radius: 20px !important;
    box-shadow: 0 24px 64px rgba(8, 26, 58, 0.28) !important;
  }

  .gatecard h2 {
    color: #0E245E !important;
    font-weight: 700 !important;
  }
</style>
`;

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "https://www.ebenezer-app.com")
    );
  }

  const origPath = path.join(process.cwd(), "public", "liquidador-ebenezer", "original.html");
  const indexPath = path.join(process.cwd(), "public", "liquidador-ebenezer", "index.html");
  let html = "";
  try {
    html = fs.readFileSync(fs.existsSync(origPath) ? origPath : indexPath, "utf-8");
  } catch {
    const res = await fetch("https://liquidador-ebenezer.pages.dev/", { cache: "no-store" });
    html = await res.text();
  }

  // Limpia cualquier sesión automática de prueba previa y aplica únicamente el tema visual nativo
  const cleanScript = `<script>try{var u=JSON.parse(sessionStorage.getItem("liq_usuario")||"{}");if(u&&u.perfil==="admin"){sessionStorage.removeItem("liq_usuario");sessionStorage.removeItem("liq_quien");}}catch(e){}</script>`;
  const injection = `${cleanScript}\n${NATIVE_EBENEZER_STYLE}`;

  if (html.includes("</head>")) {
    html = html.replace("</head>", `${injection}\n</head>`);
  } else if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n${injection}`);
  } else {
    html = `${injection}\n${html}`;
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
