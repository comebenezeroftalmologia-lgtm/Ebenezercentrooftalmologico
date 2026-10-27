"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Download, FileText, Sparkles } from "lucide-react";
import { urlDescargaAction } from "@/lib/ayuda/actions";

type Fuente = { n: number; documentoId: string; titulo: string; codigo: string | null; version: string | null; esFormato: boolean };
type Mensaje =
  | { rol: "usuario"; texto: string }
  | { rol: "asistente"; texto: string; fuentes: Fuente[]; fragmentos?: { n: number; titulo: string; texto: string }[]; error?: boolean };

const SUGERENCIAS = [
  "¿Cómo se hace una solicitud de cita prioritaria?",
  "¿Dónde descargo el formato de consentimiento informado?",
  "¿Cuál es el procedimiento ante un evento adverso?",
];

function Texto({ texto }: { texto: string }) {
  // Resalta las citas [1] como pequeñas etiquetas.
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-ink">
      {texto.split(/\n+/).map((linea, i) => (
        <p key={i}>
          {linea.split(/(\[\d+\])/g).map((parte, j) =>
            /^\[\d+\]$/.test(parte) ? (
              <sup key={j} className="mx-0.5 rounded bg-[#E6F0FD] px-1 text-[10px] font-semibold text-[#1D58D8]">
                {parte.slice(1, -1)}
              </sup>
            ) : (
              <span key={j}>{parte}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

export function ConocimientoChat({
  nombre,
  formatos = [],
  compacto = false,
}: {
  nombre: string;
  formatos?: { id: string; titulo: string; codigo: string | null; proceso: string | null }[];
  /** Modo panel lateral: ocupa el alto del contenedor y desplaza solo los mensajes. */
  compacto?: boolean;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, cargando]);

  async function descargar(id: string) {
    setAviso(null);
    const r = await urlDescargaAction(id);
    if (!r.ok) return setAviso(r.error);
    window.open(r.url, "_blank");
  }

  async function preguntar(pregunta: string) {
    const p = pregunta.trim();
    if (p.length < 3 || cargando) return;
    const historial = mensajes
      .filter((m) => !(m.rol === "asistente" && m.error))
      .map((m) => ({ rol: m.rol, texto: m.texto }));
    setMensajes((m) => [...m, { rol: "usuario", texto: p }]);
    setTexto("");
    setCargando(true);
    try {
      const r = await fetch("/api/ayuda/preguntar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pregunta: p, historial }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMensajes((m) => [...m, { rol: "asistente", texto: j.error ?? "No se pudo responder.", fuentes: [], error: true }]);
      } else {
        setMensajes((m) => [...m, { rol: "asistente", texto: j.respuesta, fuentes: j.fuentes ?? [], fragmentos: j.fragmentos }]);
      }
    } catch {
      setMensajes((m) => [...m, { rol: "asistente", texto: "Sin conexión. Intenta de nuevo.", fuentes: [], error: true }]);
    } finally {
      setCargando(false);
    }
  }

  const vacio = mensajes.length === 0;

  const caja = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void preguntar(texto);
      }}
      className="flex items-end gap-2 rounded-[20px] border border-[#CBD8EE] bg-white p-2.5 shadow-[0_4px_20px_rgba(14,36,94,0.07)] focus-within:border-[#2563EB]"
    >
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void preguntar(texto);
          }
        }}
        rows={vacio ? 2 : 1}
        maxLength={600}
        placeholder="Pregunta sobre procesos, políticas o formatos de Ebenezer…"
        className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] text-ink outline-none placeholder:text-[#94A3B8]"
      />
      <button
        type="submit"
        disabled={cargando || texto.trim().length < 3}
        title="Enviar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D58D8] text-white transition hover:bg-navy-90 disabled:bg-[#CBD8EE]"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </form>
  );

  if (vacio) {
    return (
      <div className={`flex flex-col items-center justify-center ${compacto ? "h-full px-4" : "min-h-[70vh]"}`}>
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-aqua-20 text-navy">
          <Sparkles className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h1 className={`mb-1 text-center font-semibold text-navy ${compacto ? "text-[21px]" : "text-[26px]"}`}>Hola, {nombre}</h1>
        <p className="mb-7 text-center text-sm text-ink-3">¿Qué quieres saber sobre Ebenezer?</p>
        <div className="w-full">{caja}</div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void preguntar(s)}
              className="rounded-pill border border-[#DCE7F7] bg-white px-3 py-1.5 text-xs text-ink-2 transition hover:border-[#2563EB] hover:text-navy"
            >
              {s}
            </button>
          ))}
        </div>
        {formatos.length > 0 && (
          <div className="mt-10 w-full">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8E9BB0]">Formatos descargables</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {formatos.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => void descargar(f.id)}
                  className="flex items-center gap-2.5 rounded-xl border border-[#E6EEF8] bg-white px-3 py-2.5 text-left transition hover:border-[#C9DDFB]"
                >
                  <Download className="h-4 w-4 shrink-0 text-[#1D58D8]" strokeWidth={1.75} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-navy">{f.titulo}</span>
                    <span className="block truncate text-[11px] text-ink-3">{[f.codigo, f.proceso].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {aviso && <p className="mt-3 text-xs text-[#B3261E]">{aviso}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${compacto ? "h-full min-h-0" : "min-h-[78vh]"}`}>
      <div className={`flex-1 space-y-6 pb-6 pt-2 ${compacto ? "min-h-0 overflow-y-auto px-4" : ""}`}>
        {mensajes.map((m, i) =>
          m.rol === "usuario" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#E6F0FD] px-4 py-2.5 text-[15px] text-navy">{m.texto}</div>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aqua-20 text-navy">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                {m.error ? <p className="text-sm text-[#B3261E]">{m.texto}</p> : <Texto texto={m.texto} />}
                {m.fragmentos && m.fragmentos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.fragmentos.map((f, k) => (
                      <blockquote key={k} className="rounded-lg border-l-[3px] border-[#C9DDFB] bg-white px-3 py-2 text-[13px] text-ink-2">
                        <span className="mb-0.5 block text-[11px] font-semibold text-navy">[{f.n}] {f.titulo}</span>
                        {f.texto.length > 420 ? f.texto.slice(0, 420) + "…" : f.texto}
                      </blockquote>
                    ))}
                  </div>
                )}
                {m.fuentes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.fuentes.map((f) => (
                      <button
                        key={f.documentoId}
                        type="button"
                        onClick={() => void descargar(f.documentoId)}
                        title="Descargar el documento original"
                        className="flex items-center gap-1.5 rounded-pill border border-[#DCE7F7] bg-white px-2.5 py-1 text-xs text-ink-2 transition hover:border-[#2563EB] hover:text-navy"
                      >
                        <FileText className="h-3 w-3 text-[#1D58D8]" strokeWidth={1.75} />
                        <span className="font-semibold">[{f.n}]</span> {f.titulo}
                        {f.codigo ? ` · ${f.codigo}${f.version ? ` v${f.version}` : ""}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
        {cargando && (
          <div className="flex items-center gap-3 text-sm text-ink-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-aqua-20 text-navy">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.75} />
            </span>
            Buscando en los documentos…
          </div>
        )}
        {aviso && <p className="text-xs text-[#B3261E]">{aviso}</p>}
        <div ref={finRef} />
      </div>
      <div className={`sticky bottom-0 bg-gradient-to-t from-[#F8FAFE] via-[#F8FAFE] to-transparent pb-3 pt-2 ${compacto ? "px-4" : ""}`}>
        {caja}
        <p className="mt-2 text-center text-[11px] text-ink-3">
          Las respuestas se basan solo en los documentos publicados por Calidad. Verifica lo importante en el documento original.
        </p>
      </div>
    </div>
  );
}
