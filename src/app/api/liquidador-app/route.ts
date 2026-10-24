import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  // Limpia cualquier sesión automática de prueba previa para que siempre exija el login propio de cada usuario
  const cleanScript = `<script>try{var u=JSON.parse(sessionStorage.getItem("liq_usuario")||"{}");if(u&&u.perfil==="admin"){sessionStorage.removeItem("liq_usuario");sessionStorage.removeItem("liq_quien");}}catch(e){}</script>`;
  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n${cleanScript}`);
  } else {
    html = `${cleanScript}\n${html}`;
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
