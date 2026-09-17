"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// El link de invitación de Supabase no trae un `?code=` en la query
// (eso sería PKCE) — trae el token en el fragmento de la URL
// (`#access_token=...&refresh_token=...`), que nunca llega al
// servidor. Por eso este procesamiento tiene que ser en el cliente:
// el SDK de Supabase lee ese fragmento solo (detectSessionInUrl) al
// crear el cliente de navegador, y dispara onAuthStateChange en
// cuanto arma la sesión — createBrowserSupabaseClient además la deja
// en cookies para que el servidor la vea después.
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const next = searchParams.get("next") ?? "/invitacion";
    let redirected = false;

    function goNext() {
      if (redirected) return;
      redirected = true;
      router.replace(next);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goNext();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goNext();
    });

    const timeout = setTimeout(() => {
      if (!redirected) {
        setError("El link de invitación no es válido o ya expiró.");
      }
    }, 6000);

    return () => {
      subscription.unsubscribe();
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
