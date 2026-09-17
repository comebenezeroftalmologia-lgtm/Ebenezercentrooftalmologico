import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protege /procesos/**: sin sesión, redirige a /procesos/login; con
// sesión, no deja volver a /procesos/login. El resto del sitio
// (tableros de mercadeo) no pasa por aquí — ver `matcher` abajo — así
// que sigue público, sin cambios.
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
  const isLoginPage = path === "/procesos/login";

  if (!isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/procesos/login";
    return NextResponse.redirect(url);
  }
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/procesos";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/procesos/:path*"],
};
