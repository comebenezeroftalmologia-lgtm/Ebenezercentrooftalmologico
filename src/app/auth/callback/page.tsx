"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// El link de invitación/recuperación de Supabase no trae un `?code=`
// en la query (eso sería PKCE) — trae el token en el FRAGMENTO de la
// URL (`#access_token=...&refresh_token=...&type=invite|recovery`),
// que nunca llega al servidor.
//
// OJO: `@supabase/ssr`'s `createBrowserClient` fuerza `flowType:
// "pkce"` internamente (no se puede sobreescribir vía options), y en
// modo PKCE el SDK de Supabase SOLO revisa `?code=` para su
// `detectSessionInUrl` automático — nunca lee el fragmento con
// `access_token`. Por eso `getSession()`/`onAuthStateChange` nunca
// disparaban aunque el token sí se hubiera consumido en el servidor
// (confirmado viendo `last_sign_in_at` en Supabase). La solución es
// parsear el hash nosotros mismos y llamar `setSession(...)`
// explícitamente en vez de confiar en la detección automática.
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const next = searchParams.get("next") ?? "/invitacion";
    let cancelled = false;

    function goNext() {
      if (cancelled) return;
      cancelled = true;
      // Limpiamos el fragmento con los tokens de la URL antes de
      // navegar, para no dejarlos visibles/en el historial.
      window.history.replaceState(null, "", window.location.pathname);
      router.replace(next);
    }

    function fail(message: string) {
      if (cancelled) return;
      cancelled = true;
      setError(message);
    }

    async function run() {
      // 1) Caso PKCE: `?code=` en la query (por si en el futuro se
      // usa ese flujo desde algún lado).
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          fail("El link no es válido o ya expiró.");
        } else {
          goNext();
        }
        return;
      }

      // 2) Caso real: implicit flow, tokens en el hash de la URL.
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const hashError = hashParams.get("error") || hashParams.get("error_description");
      if (hashError) {
        fail(decodeURIComponent(hashError.replace(/\+/g, " ")));
        return;
      }

      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (setSessionError) {
          fail("El link de invitación no es válido o ya expiró.");
        } else {
          goNext();
        }
        return;
      }

      // 3) Nada de lo anterior: quizás la sesión ya se estableció
      // (recarga de la página, por ejemplo). Revisamos por si acaso.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        goNext();
      } else {
        fail("El link de invitación no es válido o ya expiró.");
      }
    }

    run();

    const timeout = setTimeout(() => {
      fail("El link de invitación no es válido o ya expiró.");
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-eb-4">
        {error ? (
          <>
            <p className="mb-4 text-sm text-[#B3261E]">{error}</p>
            <a href="/login" className="text-sm font-semibold text-blue underline">
              Volver a iniciar sesión
            </a>
          </>
        ) : (
          <p className="text-sm text-ink-3">Verificando tu invitación…</p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-navy p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-eb-4">
            <p className="text-sm text-ink-3">Cargando…</p>
          </div>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
