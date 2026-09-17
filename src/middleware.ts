import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protege TODO el sitio (tableros de mercadeo + /procesos): sin
// sesión, redirige a /login; con sesión, no deja volver a /login.
// Quedan fuera del gate (ver `matcher` abajo): /login,
// /recuperar-password (pedir el correo de recuperación, sin sesión
// todavía), /auth/callback (el callback de invitación/recuperación de
// Supabase), /api/**, los internos de Next (_next/static,
// _next/image) y cualquier archivo estático (imágenes, íconos, etc.
// — cualquier ruta con punto). /restablecer-password SÍ queda
// protegida a propósito: solo se llega ahí con una sesión de
// recuperación ya establecida por /auth/callback.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/login";

  if (!isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|recuperar-password|auth/callback|api|.*\\..*).*)"],
};
