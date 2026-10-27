"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportarFallaAction } from "@/lib/ayuda/actions";

const campo = "w-full rounded-lg border border-line px-3 py-2 text-sm text-ink";
const etiqueta = "eb-label mb-1 block text-[11px] text-ink-3";

export function FormularioFalla({ modulos }: { modulos: string[] }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      const r = await reportarFallaAction({
        titulo: String(fd.get("titulo") ?? ""),
        descripcion: String(fd.get("descripcion") ?? ""),
        modulo: String(fd.get("modulo") ?? ""),
        gravedad: String(fd.get("gravedad") ?? "media") as "baja" | "media" | "alta",
      });
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      ref.current?.reset();
      setMsg({ ok: true, texto: "Reporte enviado. Gracias: lo revisaremos y verás su estado abajo." });
      router.refresh();
    });
  }

  return (
    <form ref={ref} onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className={etiqueta}>¿Qué falló? (título corto)</label>
          <input name="titulo" required maxLength={160} className={campo} placeholder="Ej.: No me deja guardar la lista" />
        </div>
        <div>
          <label className={etiqueta}>¿En qué módulo?</label>
          <select name="modulo" defaultValue="" className={`${campo} bg-white`}>
            <option value="">No sé / otro</option>
            {modulos.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={etiqueta}>¿Qué tan grave es?</label>
          <select name="gravedad" defaultValue="media" className={`${campo} bg-white`}>
            <option value="baja">Baja — molesta pero puedo trabajar</option>
            <option value="media">Media — me estorba</option>
            <option value="alta">Alta — no puedo trabajar</option>
          </select>
        </div>
      </div>
      <div>
        <label className={etiqueta}>Cuéntanos qué pasó</label>
        <textarea
          name="descripcion"
          required
          rows={4}
          maxLength={4000}
          className={campo}
          placeholder="¿Qué estabas haciendo? ¿Qué esperabas que pasara y qué pasó? Si salió un mensaje de error, cópialo aquí."
        />
      </div>
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-xs ${msg.ok ? "bg-green-10 text-green" : "bg-[#FBEAE8] text-[#B3261E]"}`}>{msg.texto}</p>
      )}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-90 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar reporte"}
        </button>
      </div>
    </form>
  );
}
