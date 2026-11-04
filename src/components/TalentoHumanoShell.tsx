"use client";

import { useRef, useState } from "react";
import { Upload, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

/* ---------------------------------------------------------------------
   EL MARCO DEL TABLERO DE TALENTO HUMANO

   El tablero se alimenta solo del archivo de trabajo. Aqui arriba solo
   esta lo que no puede vivir dentro de el: de que archivo salen los
   numeros, y el boton para reemplazarlo.

   El boton lo ve SOLO un administrador. Reemplazar la base la cambia
   para todos los que tengan el modulo, asi que no es una accion que
   deba quedar al alcance de cualquiera que entre a mirar.
   --------------------------------------------------------------------- */

export function TalentoHumanoShell({
  esAdmin,
  descripcionArchivo,
}: {
  esAdmin: boolean;
  /** "base.xlsx · 1,2 MB · subido el 03 nov 2026 por Pedro", o null. */
  descripcionArchivo: string | null;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [version, setVersion] = useState(0); // recarga el marco al cambiar
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function subir(archivo: File) {
    setSubiendo(true);
    setMensaje(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const r = await fetch("/api/talento-humano/archivo", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `No se pudo subir (HTTP ${r.status}).`);
      setMensaje({ tipo: "ok", texto: `Listo: ahora el tablero lee «${j.nombre}».` });
      // Se recarga el marco para que lea el archivo nuevo. Sin esto
      // seguiria mostrando el anterior y nadie sabria por que.
      setVersion((v) => v + 1);
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "Falló la subida." });
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE5F2] bg-white px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-[#0E245E]">Talento Humano</h1>
          <p className="truncate text-[12px] text-[#5B6B8C]">
            {descripcionArchivo ?? "Aún no se ha subido el archivo de trabajo"}
          </p>
        </div>

        {esAdmin ? (
          <div className="flex items-center gap-2">
            {mensaje ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  mensaje.tipo === "ok"
                    ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                    : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
                }`}
              >
                {mensaje.tipo === "ok" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {mensaje.texto}
              </span>
            ) : null}

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void subir(f);
              }}
            />
            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#1D58D8] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1748B4] disabled:opacity-60"
            >
              {subiendo ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Upload className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {subiendo ? "Subiendo…" : "Actualizar archivo de trabajo"}
            </button>
          </div>
        ) : null}
      </div>

      <iframe
        key={version}
        src="/api/talento-humano-app"
        title="Reporte de Talento Humano"
        className="w-full flex-1 border-0"
        /* allow-same-origin es necesario: dentro del marco el tablero pide
           el archivo de trabajo a /api/talento-humano/archivo, y esa ruta
           exige la sesion. Sin este permiso el navegador manda la peticion
           sin sesion y el tablero abriria siempre vacio.
           El archivo que se sirve es nuestro y esta revisado; no viene de
           fuera ni lo puede cambiar un tercero. */
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
      />
    </div>
  );
}
