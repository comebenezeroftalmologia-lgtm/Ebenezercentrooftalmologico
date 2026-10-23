import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "https://www.ebenezer-app.com"));
  }

  const filePath = path.join(process.cwd(), "public", "liquidador-ebenezer", "index.html");
  let html = "";
  try {
    html = fs.readFileSync(filePath, "utf-8");
  } catch {
    const res = await fetch("https://liquidador-ebenezer.pages.dev/", { cache: "no-store" });
    html = await res.text();
  }

  const ssoPayload = JSON.stringify({
    id: user.id,
    nombre: user.nombreCompleto,
    email: user.email,
    usuario: (user.email || "admin").split("@")[0],
    esAdmin: true,
    rol: "admin",
    perfil: "admin",
  });

  const userScript = `<script>window.__EBZ_SSO_USER = ${ssoPayload};</script>`;
  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n${userScript}`);
  } else {
    html = `${userScript}\n${html}`;
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
