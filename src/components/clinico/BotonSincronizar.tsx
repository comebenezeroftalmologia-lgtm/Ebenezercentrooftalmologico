"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { sincronizarAgendaAction } from "@/lib/clinico/actions";

export function BotonSincronizar() {
  const [pendiente, empezar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          empezar(async () => {
            setMsg(null);
            const r = await sincronizarAgendaAction();
            setMsg(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error });
          })
        }
        className="inline-flex items-center gap-2 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-90 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${pendiente ? "animate-spin" : ""}`} strokeWidth={2} />
        {pendiente ? "Sincronizando…" : "Sincronizar con SISMA"}
      </button>
      {msg && <p className={`max-w-[420px] text-right text-[12px] ${msg.ok ? "text-green" : "text-red-600"}`}>{msg.texto}</p>}
    </div>
  );
}
