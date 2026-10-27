"use client";

import { useState, useTransition } from "react";
import { setPreferenciaAction } from "@/lib/notificaciones/actions";
import { GRUPOS_NOTIFICACION, INFO_TIPO, TIPOS_NOTIFICACION, type TipoNotificacion } from "@/lib/notificaciones/tipos";
import type { PreferenciasNotificacion } from "@/lib/notificaciones/queries";

function Interruptor({ activo, onChange, disabled, label }: { activo: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!activo)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${activo ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${activo ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export function PreferenciasNotificaciones({
  inicial,
  rol,
  correoActivo,
}: {
  inicial: PreferenciasNotificacion;
  rol: string;
  correoActivo: boolean;
}) {
  const [prefs, setPrefs] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function cambiar(tipo: TipoNotificacion, canal: "enApp" | "email", valor: boolean) {
    const anterior = prefs;
    setPrefs({ ...prefs, [tipo]: { ...prefs[tipo], [canal]: valor } });
    setError(null);
    start(async () => {
      const r = await setPreferenciaAction(tipo, canal, valor);
      if (!r.ok) {
        setPrefs(anterior);
        setError(r.error);
      }
    });
  }

  const visibles = TIPOS_NOTIFICACION.filter((t) => !INFO_TIPO[t].soloRoles || INFO_TIPO[t].soloRoles!.includes(rol));

  return (
    <div>
      {!correoActivo && (
        <p className="mb-4 rounded-lg bg-[#FEF3E2] px-3 py-2 text-xs text-[#B54708]">
          El envío por correo aún no está activado en la plataforma. Tus preferencias se guardan igual y aplicarán cuando se active.
        </p>
      )}
      <div className="mb-2 hidden grid-cols-[1fr_88px_88px] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3 sm:grid">
        <span />
        <span className="text-center">En la plataforma</span>
        <span className="text-center">Por correo</span>
      </div>
      <div className="flex flex-col gap-5">
        {GRUPOS_NOTIFICACION.map((grupo) => {
          const tipos = visibles.filter((t) => INFO_TIPO[t].grupo === grupo);
          if (tipos.length === 0) return null;
          return (
            <div key={grupo}>
              <p className="mb-1.5 text-xs font-semibold text-navy">{grupo}</p>
              <ul className="divide-y divide-[#F1F5F9] rounded-xl border border-line">
                {tipos.map((t) => (
                  <li key={t} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_88px_88px]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{INFO_TIPO[t].label}</p>
                      <p className="text-xs text-ink-3">{INFO_TIPO[t].descripcion}</p>
                    </div>
                    <div className="flex justify-center">
                      <Interruptor activo={prefs[t].enApp} onChange={(v) => cambiar(t, "enApp", v)} label={`${INFO_TIPO[t].label}: en la plataforma`} />
                    </div>
                    <div className="flex justify-center">
                      <Interruptor activo={prefs[t].email} onChange={(v) => cambiar(t, "email", v)} label={`${INFO_TIPO[t].label}: por correo`} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-xs text-[#B3261E]">{error}</p>}
      {pending && <p className="mt-3 text-xs text-ink-3">Guardando…</p>}
    </div>
  );
}
