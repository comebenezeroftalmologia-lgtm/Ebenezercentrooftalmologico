import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de servidor: usa la service_role key (nunca se expone al
// navegador). Se usa en Server Components, route handlers de
// sincronización, etc. — y en el módulo de Procesos, para las
// operaciones de administración de usuarios que requieren privilegios
// que la sesión normal no tiene (crear un login nuevo).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/** Cliente atado a la sesión del usuario autenticado actual (cookies de
 * Supabase Auth) — usa la llave anon, así que Row Level Security aplica
 * normalmente. Es el cliente que debe usarse para leer/escribir datos
 * del módulo de Procesos: la autorización real vive en las políticas
 * RLS de la base, no en este código. */
export function createSessionServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno"
    );
  }
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Llamado desde un Server Component sin poder escribir
          // cookies — el middleware ya se encarga de refrescar la
          // sesión en cada request. No hace falta lanzar aquí.
        }
      },
    },
  });
}
