"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente de navegador: usa la anon key + RLS. Para cuando se agregue
// login (equipo comercial, etc.) y las vistas necesiten filtrar por
// usuario/rol directamente desde el cliente.
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
