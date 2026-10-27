"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  cambiarEstadoDocumentoAction,
  editarDocumentoAction,
  eliminarDocumentoAction,
  prepararSubidaAction,
  registrarDocumentoAction,
  urlDescargaAction,
} from "@/lib/ayuda/actions";
import type { DocumentoConocimiento } from "@/lib/ayuda/queries";

const ESTADO_CLASE: Record<string, string> = {
  borrador: "bg-[#FEF3E2] text-[#B54708]",
  publicado: "bg-green-10 text-green",
  obsoleto: "bg-line-2 text-ink-3",
};

function tamano(b: number | null): string {
  if (!b) return "";
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

function EditorDocumento({ d, onListo }: { d: DocumentoConocimiento; onListo: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const r = await editarDocumentoAction(d.id, {
        titulo: String(fd.get("titulo") ?? ""),
        descripcion: String(fd.get("descripcion") ?? ""),
        proceso: String(fd.get("proceso") ?? ""),
        codigo: String(fd.get("codigo") ?? ""),
        version: String(fd.get("version") ?? ""),
        esFormato: fd.get("esFormato") === "on",
      });
      if (!r.ok) return setError(r.error);
      router.refresh();
      onListo();
    });
  }

  return (
    <form onSubmit={guardar} className="mt-3 grid w-full grid-cols-1 gap-3 rounded-lg border border-line-2 bg-paper p-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={etiqueta}>Título</label>
        <input name="titulo" required defaultValue={d.titulo} maxLength={200} className={campo} />
      </div>
      <div>
        <label className={etiqueta}>Proceso o área</label>
        <input name="proceso" defaultValue={d.proceso ?? ""} maxLength={120} className={campo} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={etiqueta}>Código</label>
          <input name="codigo" defaultValue={d.codigo ?? ""} maxLength={60} className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Versión</label>
          <input name="version" defaultValue={d.version ?? ""} maxLength={30} className={campo} />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className={etiqueta}>Descripción</label>
        <input name="descripcion" defaultValue={d.descripcion ?? ""} maxLength={1000} className={campo} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input name="esFormato" type="checkbox" defaultChecked={d.esFormato} className="h-4 w-4 rounded border-line" />
        Es un formato descargable
      </label>
      <div className="flex items-center gap-2 sm:justify-end">
        <button type="submit" disabled={pending} className="rounded-md bg-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-90 disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar (queda en el historial)"}
        </button>
        <button type="button" onClick={onListo} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-navy-20">
          Cancelar
        </button>
      </div>
      {error && <p className="text-xs text-[#B3261E] sm:col-span-2">{error}</p>}
    </form>
  );
}

const campo = "w-full rounded-lg border border-line px-3 py-2 text-sm text-ink";
const etiqueta = "eb-label mb-1 block text-[11px] text-ink-3";

export function GestorDocumentos({
  documentos,
  sinRespuesta,
}: {
  documentos: DocumentoConocimiento[];
  sinRespuesta: { pregunta: string; veces: number; ultima: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pending, start] = useTransition();
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const archivo = fd.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) return setMensaje({ tipo: "error", texto: "Elige un archivo." });

    setSubiendo(true);
    setMensaje(null);
    try {
      const prep = await prepararSubidaAction({ nombreArchivo: archivo.name, tamano: archivo.size });
      if (!prep.ok) return setMensaje({ tipo: "error", texto: prep.error });

      const sb = createBrowserSupabaseClient();
      const { error: upError } = await sb.storage.from("conocimiento").uploadToSignedUrl(prep.path, prep.token, archivo);
      if (upError) return setMensaje({ tipo: "error", texto: "No se pudo subir el archivo: " + upError.message });

      const reg = await registrarDocumentoAction({
        path: prep.path,
        nombreArchivo: archivo.name,
        mime: archivo.type,
        tamano: archivo.size,
        titulo: String(fd.get("titulo") ?? ""),
        descripcion: String(fd.get("descripcion") ?? ""),
        proceso: String(fd.get("proceso") ?? ""),
        codigo: String(fd.get("codigo") ?? ""),
        version: String(fd.get("version") ?? ""),
        esFormato: fd.get("esFormato") === "on",
      });
      if (!reg.ok) return setMensaje({ tipo: "error", texto: reg.error });

      formRef.current?.reset();
      setMensaje({
        tipo: "ok",
        texto:
          reg.fragmentos > 0
            ? `Documento cargado como borrador (${reg.fragmentos} fragmentos de texto indexados). Revísalo y publícalo.`
            : "Documento cargado como borrador. No se pudo leer su texto (p. ej. una planilla o imagen): se encontrará por título y descripción y servirá como formato descargable.",
      });
      router.refresh();
    } finally {
      setSubiendo(false);
    }
  }

  function accion(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMensaje(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMensaje({ tipo: "error", texto: r.error ?? "Error desconocido." });
      else router.refresh();
    });
  }

  async function descargar(id: string) {
    const r = await urlDescargaAction(id);
    if (!r.ok) return setMensaje({ tipo: "error", texto: r.error });
    window.open(r.url, "_blank");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
        <h2 className="mb-4 text-base font-semibold text-navy">Subir documento</h2>
        <form ref={formRef} onSubmit={subir} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={etiqueta}>Título</label>
              <input name="titulo" required maxLength={200} className={campo} placeholder="Ej.: Procedimiento de consentimiento informado" />
            </div>
            <div>
              <label className={etiqueta}>Proceso o área</label>
              <input name="proceso" maxLength={120} className={campo} placeholder="Ej.: Calidad, Facturación, SIAU" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={etiqueta}>Código</label>
                <input name="codigo" maxLength={60} className={campo} placeholder="Ej.: CAL-PR-004" />
              </div>
              <div>
                <label className={etiqueta}>Versión</label>
                <input name="version" maxLength={30} className={campo} placeholder="Ej.: 3" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={etiqueta}>Descripción corta (ayuda a encontrarlo)</label>
              <input name="descripcion" maxLength={1000} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Archivo (PDF, Word, Excel, texto — máx. 25 MB)</label>
              <input name="archivo" type="file" required accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg" className="w-full text-sm text-ink-2" />
            </div>
            <label className="flex items-center gap-2 self-end text-sm text-ink-2">
              <input name="esFormato" type="checkbox" className="h-4 w-4 rounded border-line" />
              Es un formato descargable (plantilla)
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={subiendo}
              className="flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-90 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" strokeWidth={1.75} />
              {subiendo ? "Subiendo e indexando…" : "Subir como borrador"}
            </button>
          </div>
        </form>
        {mensaje && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${mensaje.tipo === "ok" ? "bg-green-10 text-green" : "bg-[#FBEAE8] text-[#B3261E]"}`}>
            {mensaje.texto}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-navy">Documentos ({documentos.length})</h2>
        {documentos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">Aún no hay documentos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documentos.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-navy">
                    <span className="truncate">{d.titulo}</span>
                    <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASE[d.estado]}`}>{d.estado}</span>
                    {d.esFormato && <span className="shrink-0 rounded-pill bg-aqua-20 px-2 py-0.5 text-[11px] text-navy">formato</span>}
                  </p>
                  <p className="truncate text-xs text-ink-3">
                    {[d.codigo && `${d.codigo}${d.version ? ` v${d.version}` : ""}`, d.proceso, d.nombreArchivo, tamano(d.tamanoBytes), !d.textoExtraido && "sin texto legible"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => setEditandoId(editandoId === d.id ? null : d.id)} title="Editar datos" className="rounded-md border border-line p-1.5 text-ink-2 hover:border-navy-20">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button type="button" onClick={() => void descargar(d.id)} title="Descargar original" className="rounded-md border border-line p-1.5 text-ink-2 hover:border-navy-20">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  {d.estado !== "publicado" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => accion(() => cambiarEstadoDocumentoAction(d.id, "publicado"))}
                      className="rounded-md bg-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-navy-90 disabled:opacity-60"
                    >
                      Publicar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => accion(() => cambiarEstadoDocumentoAction(d.id, "obsoleto"))}
                      className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-navy-20 disabled:opacity-60"
                    >
                      Marcar obsoleto
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`¿Eliminar «${d.titulo}» definitivamente? Esta acción no se puede deshacer.`)) {
                        accion(() => eliminarDocumentoAction(d.id));
                      }
                    }}
                    className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-[#B3261E] hover:border-[#B3261E] disabled:opacity-60"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                  </button>
                </div>
                {editandoId === d.id && <EditorDocumento d={d} onListo={() => setEditandoId(null)} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-base font-semibold text-navy">Preguntas sin respuesta</h2>
        <p className="mb-3 text-xs text-ink-3">Lo que el equipo preguntó en los últimos 60 días y no se encontró en los documentos: buenas pistas de qué documentar.</p>
        {sinRespuesta.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-5 text-center text-sm text-ink-3">Nada por ahora.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sinRespuesta.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-2">
                <span className="truncate">{p.pregunta}</span>
                {p.veces > 1 && <span className="shrink-0 rounded-pill bg-[#FEF3E2] px-2 py-0.5 text-[11px] font-medium text-[#B54708]">{p.veces} veces</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
