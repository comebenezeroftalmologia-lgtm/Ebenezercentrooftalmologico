"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente de navegador: usa la anon key y guarda la sesión en cookies
// (no solo localStorage), para que el servidor (middleware, Server
// Components) la vea en la siguiente petición. Se usa únicamente en
// /auth/callback, para procesar el link de invitación/recuperación
// que Supabase manda por correo — ese link trae el token en el
// fragmento (#) de la URL, que solo el navegador puede leer.
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
