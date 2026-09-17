import { NextResponse, type NextRequest } from "next/server";
import { createSessionServerClient } from "@/lib/supabase/server";

// Recibe el link que Supabase Auth envía por correo (invitación o
// magic link): intercambia el `code` por una sesión real (cookies) y
// redirige a donde corresponda. Sin esto, el link del correo no deja
// una sesión iniciada — solo trae un código de un solo uso.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/invitacion";

  if (code) {
    const supabase = createSessionServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invitacion_invalida`);
}
