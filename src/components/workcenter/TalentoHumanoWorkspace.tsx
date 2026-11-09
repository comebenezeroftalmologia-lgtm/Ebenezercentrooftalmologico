"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X, Pencil, Trash2, AlertTriangle, Check } from "lucide-react";
import { TABLAS_TH, type Campo, type TablaTH } from "@/lib/talentoHumanoTablas";
import { PanelRevisionTH } from "@/components/workcenter/PanelRevisionTH";

/* ---------------------------------------------------------------------
   MESA DE TRABAJO DE TALENTO HUMANO
   Escrito el 08-11-2026.

   Hasta hoy estos datos vivian en un Excel que alguien mantenia y volvia
   a subir. Decision de Faber: se meten y se editan aqui.

   Lo que se ve es una lista por cada una de las ocho tablas y un
   formulario para agregar o corregir. Nada mas. Los indicadores siguen
   en el tablero de Analytics; esto es la mesa donde se diligencia.

   DOS COSAS QUE LA PANTALLA HACE A PROPOSITO:

   1. No calcula el TOTAL SALARIO: lo muestra sumando salario + auxilio
      en el momento. En el Excel era una columna aparte y en dos filas
      no cuadraba con sus propios sumandos.

   2. Avisa en vez de corregir sola. Si los dias de un ausentismo no
      cuadran con las fechas, lo marca y deja el dato como lo escribio
      quien sabe del tema; no lo "arregla" por su cuenta.
   --------------------------------------------------------------------- */

type Fila = Record<string, unknown>;
type Area = { id: number; nombre: string };

const HOY = new Date();

function fmtDinero(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || v === null || v === "") return "—";
  return "$" + n.toLocaleString("es-CO");
}

function fmtFecha(v: unknown): string {
  if (!v) return "—";
  const s = String(v).slice(0, 10);
  const [a, m, d] = s.split("-");
  return a && m && d ? `${d}/${m}/${a}` : s;
}

function diasHasta(v: unknown): number | null {
  if (!v) return null;
  const d = new Date(String(v).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - HOY.getTime()) / 86_400_000);
}

export function TalentoHumanoWorkspace({ esAdmin }: { esAdmin: boolean }) {
  const [slug, setSlug] = useState(TABLAS_TH[0].slug);
  const tabla = useMemo(() => TABLAS_TH.find((t) => t.slug === slug) as TablaTH, [slug]);

  const [filas, setFilas] = useState<Fila[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Fila | null>(null);
  const [esNuevo, setEsNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Sube cada vez que algo se guarda o se borra: es la señal para que la
  // franja de "datos por revisar" vuelva a calcularse. Si acaban de
  // arreglar una fecha, el pendiente tiene que desaparecer en el acto.
  const [revision, setRevision] = useState(0);

  // Lo que el panel de revisión quiere dejar escrito en el buscador al
  // llegar a otra pestaña. Va en un ref y no en estado porque el efecto
  // que limpia el buscador al cambiar de tabla se lo comeria.
  const buscarAlLlegar = useRef<string | null>(null);

  function irA(destino: string, buscar?: string) {
    if (destino === slug) {
      setBusqueda(buscar ?? "");
      return;
    }
    buscarAlLlegar.current = buscar ?? null;
    setSlug(destino);
  }

  const traer = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const r = await fetch(`/api/talento-humano/datos?tabla=${slug}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setFilas(j.filas);
      setAreas(j.areas);
    } catch (e) {
      // Si la consulta falla NO se deja la lista vacia: una pantalla en
      // blanco se lee como "no hay registros", que es otra cosa.
      setFallo(e instanceof Error ? e.message : "No se pudieron traer los datos.");
    } finally {
      setCargando(false);
    }
  }, [slug]);

  useEffect(() => { traer(); }, [traer]);
  useEffect(() => {
    setBusqueda(buscarAlLlegar.current ?? "");
    buscarAlLlegar.current = null;
    setEditando(null);
  }, [slug]);

  const nombreArea = useCallback(
    (id: unknown) => areas.find((a) => a.id === Number(id))?.nombre ?? "—",
    [areas],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) =>
      Object.values(f).some((v) => v != null && String(v).toLowerCase().includes(q)),
    );
  }, [filas, busqueda]);

  const columnas = tabla.campos.filter((c) => c.enLista);

  async function guardar(datos: Fila) {
    setGuardando(true);
    setAviso(null);
    try {
      const esEdicion = !esNuevo && datos.id != null;
      const r = await fetch("/api/talento-humano/datos", {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, tabla: slug }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setEditando(null);
      setAviso(esEdicion ? "Cambios guardados." : `Se agregó el ${tabla.singular}.`);
      setRevision((v) => v + 1);
      await traer();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(id: unknown) {
    if (!confirm("¿Borrar este registro? No se puede deshacer.")) return;
    try {
      const r = await fetch(`/api/talento-humano/datos?tabla=${slug}&id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setAviso("Registro borrado.");
      setRevision((v) => v + 1);
      await traer();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo borrar.");
    }
  }

  function celda(f: Fila, c: Campo) {
    const v = f[c.col];
    if (c.tipo === "area") return nombreArea(v);
    if (c.tipo === "dinero") return fmtDinero(v);
    if (c.tipo === "fecha") {
      const txt = fmtFecha(v);
      // Vencimientos: rojo a 60 dias, y ya vencido en rojo fuerte.
      if (c.col.startsWith("vence_") && v) {
        const d = diasHasta(v);
        if (d !== null && d < 0) return <span className="font-semibold text-[#B91C1C]">{txt} · vencido</span>;
        if (d !== null && d <= 60) return <span className="font-semibold text-[#B45309]">{txt} · faltan {d} d</span>;
      }
      return txt;
    }
    if (c.tipo === "siNo") return v === true ? "Sí" : v === false ? "No" : "—";
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  }

  /** Dias escritos vs dias entre fechas. Se avisa, no se corrige. */
  function diasDescuadrados(f: Fila): boolean {
    if (slug !== "ausentismos") return false;
    const i = f.fecha_inicio ? new Date(String(f.fecha_inicio).slice(0, 10)) : null;
    const fin = f.fecha_fin ? new Date(String(f.fecha_fin).slice(0, 10)) : null;
    const d = Number(f.numero_dias);
    if (!i || !fin || !Number.isFinite(d)) return false;
    const calc = Math.round((fin.getTime() - i.getTime()) / 86_400_000) + 1;
    return calc !== d;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Datos por revisar. Sale de la base, no de una lista escrita a
          mano: cuando el dato queda bien, el pendiente desaparece solo. */}
      <PanelRevisionTH recargar={revision} onIr={irA} />

      {/* Pestañas: una por tabla */}
      <div className="flex flex-wrap gap-1.5">
        {TABLAS_TH.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setSlug(t.slug)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
              t.slug === slug
                ? "bg-[#0E245E] text-white"
                : "border border-[#DCE8FA] bg-white text-[#47597A] hover:border-[#94A3B8]"
            }`}
          >
            {t.titulo}
          </button>
        ))}
      </div>

      <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-[#0E245E]">{tabla.titulo}</h2>
            <p className="mt-0.5 text-[12px] text-[#64748B]">{tabla.descripcion}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-48 rounded-lg border border-[#DCE8FA] py-1.5 pl-8 pr-2 text-[12.5px] outline-none focus:border-[#1D58D8]"
              />
            </div>
            <button
              type="button"
              onClick={() => { setEditando({}); setEsNuevo(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#1747B0]"
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </button>
          </div>
        </div>

        {aviso && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[12.5px] font-medium text-[#166534]">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{aviso}</span>
            <button type="button" onClick={() => setAviso(null)}><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {fallo && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-semibold text-[#B91C1C]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              No se pudieron traer los datos: {fallo}. La lista de abajo está vacía porque falló la
              consulta, no porque no haya registros.
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                {columnas.map((c) => (<th key={c.col} className="py-2 pr-3">{c.etiqueta}</th>))}
                {slug === "empleados" && <th className="py-2 pr-3">Total</th>}
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={columnas.length + 2} className="py-6 text-center text-[#94A3B8]">Cargando…</td></tr>
              )}
              {!cargando && visibles.length === 0 && !fallo && (
                <tr><td colSpan={columnas.length + 2} className="py-6 text-center text-[#94A3B8]">
                  {busqueda ? "Nada coincide con la búsqueda." : "Todavía no hay registros."}
                </td></tr>
              )}
              {visibles.map((f) => (
                <tr key={String(f.id)} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  {columnas.map((c) => (
                    <td key={c.col} className="py-2 pr-3 align-top text-[#0E245E]">
                      {celda(f, c)}
                      {c.col === "numero_dias" && diasDescuadrados(f) && (
                        <span className="ml-1.5 text-[11px] font-semibold text-[#B45309]">⚠ no cuadra con las fechas</span>
                      )}
                    </td>
                  ))}
                  {slug === "empleados" && (
                    <td className="py-2 pr-3 align-top font-semibold text-[#0E245E]">
                      {fmtDinero((Number(f.salario) || 0) + (Number(f.auxilio_vivienda) || 0))}
                    </td>
                  )}
                  <td className="py-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => { setEditando(f); setEsNuevo(false); }}
                      title="Editar"
                      className="mr-1 rounded p-1 text-[#47597A] hover:bg-[#EEF4FD]"
                    ><Pencil className="h-3.5 w-3.5" /></button>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => borrar(f.id)}
                        title="Borrar"
                        className="rounded p-1 text-[#B91C1C] hover:bg-[#FEF2F2]"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!cargando && !fallo && (
          <p className="mt-3 text-[11.5px] text-[#64748B]">
            {visibles.length} de {filas.length} registros
          </p>
        )}
      </div>

      {editando && (
        <Formulario
          tabla={tabla}
          areas={areas}
          inicial={editando}
          esNuevo={esNuevo}
          guardando={guardando}
          onCancelar={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}
    </div>
  );
}

function Formulario({
  tabla, areas, inicial, esNuevo, guardando, onCancelar, onGuardar,
}: {
  tabla: TablaTH;
  areas: Area[];
  inicial: Fila;
  esNuevo: boolean;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (f: Fila) => void;
}) {
  const [datos, setDatos] = useState<Fila>(inicial);
  useEffect(() => setDatos(inicial), [inicial]);

  const set = (col: string, v: unknown) => setDatos((d) => ({ ...d, [col]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="mt-8 w-full max-w-3xl rounded-[16px] border border-[#D5E3F7] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-bold text-[#0E245E]">
              {esNuevo ? `Nuevo ${tabla.singular}` : `Editar ${tabla.singular}`}
            </h3>
            <p className="mt-0.5 text-[12px] text-[#64748B]">
              Los campos con <span className="font-semibold text-[#B91C1C]">*</span> son obligatorios.
              Lo que se deje vacío queda vacío: no se inventa nada.
            </p>
          </div>
          <button type="button" onClick={onCancelar} className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {tabla.campos.map((c) => (
            <div key={c.col} className={c.tipo === "textarea" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#47597A]">
                {c.etiqueta}{c.obligatorio && <span className="text-[#B91C1C]"> *</span>}
              </label>

              {c.tipo === "area" ? (
                <select
                  value={String(datos[c.col] ?? "")}
                  onChange={(e) => set(c.col, e.target.value)}
                  className="w-full rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8]"
                >
                  <option value="">— sin área —</option>
                  {areas.map((a) => (<option key={a.id} value={a.id}>{a.nombre}</option>))}
                </select>
              ) : c.tipo === "siNo" ? (
                <select
                  value={datos[c.col] === true ? "true" : datos[c.col] === false ? "false" : ""}
                  onChange={(e) => set(c.col, e.target.value === "" ? null : e.target.value === "true")}
                  className="w-full rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8]"
                >
                  <option value="">— sin dato —</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              ) : c.tipo === "textarea" ? (
                <textarea
                  rows={2}
                  value={String(datos[c.col] ?? "")}
                  onChange={(e) => set(c.col, e.target.value)}
                  className="w-full rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8]"
                />
              ) : (
                <input
                  type={c.tipo === "fecha" ? "date" : c.tipo === "numero" || c.tipo === "dinero" ? "number" : "text"}
                  value={
                    c.tipo === "fecha"
                      ? String(datos[c.col] ?? "").slice(0, 10)
                      : String(datos[c.col] ?? "")
                  }
                  onChange={(e) => set(c.col, e.target.value)}
                  className="w-full rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8]"
                />
              )}

              {c.ayuda && <p className="mt-1 text-[11px] leading-snug text-[#94A3B8]">{c.ayuda}</p>}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-[#DCE8FA] px-4 py-2 text-[12.5px] font-semibold text-[#47597A] hover:border-[#94A3B8]"
          >Cancelar</button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => onGuardar(datos)}
            className="rounded-lg bg-[#1D58D8] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1747B0] disabled:opacity-60"
          >{guardando ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
