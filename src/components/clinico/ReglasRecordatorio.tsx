"use client";

import { useRef, useState, useTransition } from "react";
import { BellRing, MessageCircle, Pencil, PhoneCall, Play, Plus, Trash2 } from "lucide-react";
import { alternarReglaAction, eliminarReglaAction, guardarReglaAction, simularRecordatoriosAction, type ReglaInput } from "@/lib/clinico/actions";
import { anticipacionLegible } from "@/lib/clinico/fechas";
import {
  CANALES, DIAS_SEMANA, ESTADOS_CITA, VARIABLES_PLANTILLA, nombreSede, renderPlantilla, titulo,
  type Canal, type ReglaRecordatorio,
} from "@/lib/clinico/tipos";

type Unidad = "minutos" | "horas" | "dias";
const FACTOR: Record<Unidad, number> = { minutos: 1, horas: 60, dias: 1440 };

interface Editor extends Omit<ReglaInput, "anticipacionMinutos"> {
  cantidad: number;
  unidad: Unidad;
}

function aEditor(r?: ReglaRecordatorio): Editor {
  if (!r) {
    return {
      nombre: "", activa: false, canal: "whatsapp", cantidad: 24, unidad: "horas", ventanaDesde: "07:00", ventanaHasta: "19:00",
      diasSemana: [1, 2, 3, 4, 5, 6], sedes: [], medicos: [], especialidades: [], estados: ["P", "CC"],
      maxRetrasoMinutos: 720, minAntelacionMinutos: 60, maxIntentos: 1, reintentoMinutos: 120,
      plantilla: "Hola {primer_nombre}, le recordamos su cita en el Centro Oftalmológico Ebenezer el {fecha} a las {hora} con {medico}.",
    };
  }
  const m = r.anticipacion_minutos;
  const unidad: Unidad = m % 1440 === 0 ? "dias" : m % 60 === 0 ? "horas" : "minutos";
  return {
    id: r.id, nombre: r.nombre, activa: r.activa, canal: r.canal, cantidad: m / FACTOR[unidad], unidad,
    ventanaDesde: r.ventana_desde.slice(0, 5), ventanaHasta: r.ventana_hasta.slice(0, 5), diasSemana: r.dias_semana,
    sedes: r.sedes ?? [], medicos: r.medicos ?? [], especialidades: r.especialidades ?? [], estados: r.estados,
    maxRetrasoMinutos: r.max_retraso_minutos, minAntelacionMinutos: r.min_antelacion_minutos,
    maxIntentos: r.max_intentos, reintentoMinutos: r.reintento_minutos, plantilla: r.plantilla,
  };
}

const campo = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink";
const rotulo = "mb-1 block text-[11px] uppercase tracking-[0.06em] text-ink-3";

export function ReglasRecordatorio({
  reglas, opciones, modo, canalesConfigurados,
}: {
  reglas: ReglaRecordatorio[];
  opciones: { medicos: { codigo: number; nombre: string }[]; especialidades: string[]; sedes: number[] };
  modo: "produccion" | "simulacion";
  canalesConfigurados: Record<Canal, boolean>;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pendiente, empezar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const areaTexto = useRef<HTMLTextAreaElement>(null);

  const ejecutar = (fn: () => Promise<{ ok: boolean; error?: string; mensaje?: string }>, alTerminar?: () => void) =>
    empezar(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.ok ? { ok: true, texto: r.mensaje ?? "Listo." } : { ok: false, texto: r.error ?? "No se pudo completar." });
      if (r.ok) alTerminar?.();
    });

  const guardar = () => {
    if (!editor) return;
    const { cantidad, unidad, ...resto } = editor;
    ejecutar(() => guardarReglaAction({ ...resto, anticipacionMinutos: Math.round(cantidad * FACTOR[unidad]) }), () => setEditor(null));
  };

  const set = <K extends keyof Editor>(k: K, v: Editor[K]) => setEditor((e) => (e ? { ...e, [k]: v } : e));
  const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const insertar = (clave: string) => {
    const el = areaTexto.current;
    if (!editor) return;
    const txt = `{${clave}}`;
    if (!el) return set("plantilla", editor.plantilla + txt);
    const { selectionStart: a, selectionEnd: b } = el;
    set("plantilla", editor.plantilla.slice(0, a) + txt + editor.plantilla.slice(b));
  };

  const ejemplo = Object.fromEntries(VARIABLES_PLANTILLA.map((v) => [v.clave, v.ejemplo]));
  const resumenFiltros = (r: ReglaRecordatorio) => {
    const partes: string[] = [];
    if (r.sedes?.length) partes.push(r.sedes.map(nombreSede).join(", "));
    if (r.medicos?.length) partes.push(`${r.medicos.length} médico${r.medicos.length > 1 ? "s" : ""}`);
    if (r.especialidades?.length) partes.push(r.especialidades.map(titulo).join(", "));
    return partes.length ? partes.join(" · ") : "Todas las citas";
  };

  return (
    <div>
      <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${modo === "produccion" ? "border-green/30 bg-green-10 text-green" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        {modo === "produccion" ? (
          <>Modo <strong>producción</strong>: las reglas activas envían llamadas y WhatsApp reales por Dapta.</>
        ) : (
          <>Modo <strong>simulación</strong>: el motor arma los recordatorios pero <strong>no llama ni escribe a nadie</strong>. Para enviar de verdad se activa la variable <code>RECORDATORIOS_ENVIAR=true</code> en Vercel.</>
        )}
        <div className="mt-1 text-[12px] opacity-90">
          Conexión con Dapta — WhatsApp: {canalesConfigurados.whatsapp ? "configurado" : "falta DAPTA_WEBHOOK_WHATSAPP"} · Llamada: {canalesConfigurados.llamada ? "configurado" : "falta DAPTA_WEBHOOK_LLAMADA"}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditor(aEditor())} className="inline-flex items-center gap-2 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-90">
          <Plus className="h-4 w-4" strokeWidth={2} /> Nueva regla
        </button>
        <button type="button" disabled={pendiente} onClick={() => ejecutar(() => simularRecordatoriosAction())} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-blue-10 disabled:opacity-60">
          <Play className="h-4 w-4" strokeWidth={2} /> {pendiente ? "Procesando…" : "Simular ahora"}
        </button>
        {msg && <span className={`text-[12.5px] ${msg.ok ? "text-green" : "text-red-600"}`}>{msg.texto}</span>}
      </div>

      {!reglas.length && <p className="rounded-xl border border-line bg-white py-8 text-center text-sm text-ink-3">Aún no hay reglas. Crea la primera.</p>}
      <ul className="flex flex-col gap-2.5">
        {reglas.map((r) => {
          const Icono = r.canal === "llamada" ? PhoneCall : MessageCircle;
          return (
            <li key={r.id} className="rounded-xl border border-line bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-10 text-navy"><Icono className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{r.nombre}</div>
                    <div className="text-[12px] text-ink-3">
                      {anticipacionLegible(r.anticipacion_minutos)} antes · {r.ventana_desde.slice(0, 5)}–{r.ventana_hasta.slice(0, 5)} · {r.dias_semana.map((d) => DIAS_SEMANA[d - 1]?.corto).join(" ")} · {resumenFiltros(r)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
                    <input type="checkbox" checked={r.activa} disabled={pendiente} onChange={(e) => ejecutar(() => alternarReglaAction(r.id, e.target.checked), undefined)} />
                    {r.activa ? "Activa" : "Apagada"}
                  </label>
                  <button type="button" onClick={() => setEditor(aEditor(r))} className="rounded-lg p-2 text-ink-2 hover:bg-blue-10" title="Editar"><Pencil className="h-4 w-4" /></button>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => { if (window.confirm(`¿Eliminar la regla «${r.nombre}»? También se borra su bitácora de envíos.`)) ejecutar(() => eliminarReglaAction(r.id)); }}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    title="Eliminar"
                  ><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {r.plantilla && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink-2">{renderPlantilla(r.plantilla, ejemplo)}</p>}
            </li>
          );
        })}
      </ul>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8" role="dialog" aria-modal="true">
          <div className="w-full max-w-[720px] rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink"><BellRing className="h-5 w-5" /> {editor.id ? "Editar regla" : "Nueva regla"}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={rotulo}>Nombre</label>
                <input className={campo} value={editor.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej.: WhatsApp 48 horas antes" maxLength={80} />
              </div>
              <div>
                <label className={rotulo}>Canal</label>
                <select className={campo} value={editor.canal} onChange={(e) => set("canal", e.target.value as Canal)}>
                  {CANALES.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={rotulo}>Cuánto antes de la cita</label>
                <div className="flex gap-2">
                  <input type="number" min={1} className={campo} value={editor.cantidad} onChange={(e) => set("cantidad", Number(e.target.value))} />
                  <select className={campo} value={editor.unidad} onChange={(e) => set("unidad", e.target.value as Unidad)}>
                    <option value="minutos">minutos</option><option value="horas">horas</option><option value="dias">días</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={rotulo}>Enviar desde</label>
                <input type="time" className={campo} value={editor.ventanaDesde} onChange={(e) => set("ventanaDesde", e.target.value)} />
              </div>
              <div>
                <label className={rotulo}>Enviar hasta</label>
                <input type="time" className={campo} value={editor.ventanaHasta} onChange={(e) => set("ventanaHasta", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Días en que se puede enviar</label>
                <div className="flex flex-wrap gap-3">
                  {DIAS_SEMANA.map((d) => (
                    <label key={d.valor} className="inline-flex items-center gap-1.5 text-sm text-ink-2">
                      <input type="checkbox" checked={editor.diasSemana.includes(d.valor)} onChange={() => set("diasSemana", alternar(editor.diasSemana, d.valor))} /> {d.corto}
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Estados de cita a los que aplica</label>
                <div className="flex flex-wrap gap-4">
                  {ESTADOS_CITA.map((s) => (
                    <label key={s.valor} className="inline-flex items-center gap-1.5 text-sm text-ink-2">
                      <input type="checkbox" checked={editor.estados.includes(s.valor)} onChange={() => set("estados", alternar(editor.estados, s.valor))} /> {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={rotulo}>Sedes (vacío = todas)</label>
                <select multiple size={Math.min(4, Math.max(2, opciones.sedes.length))} className={campo} value={editor.sedes.map(String)} onChange={(e) => set("sedes", Array.from(e.target.selectedOptions, (o) => Number(o.value)))}>
                  {opciones.sedes.map((s) => <option key={s} value={s}>{nombreSede(s)}</option>)}
                </select>
              </div>
              <div>
                <label className={rotulo}>Especialidades (vacío = todas)</label>
                <select multiple size={4} className={campo} value={editor.especialidades} onChange={(e) => set("especialidades", Array.from(e.target.selectedOptions, (o) => o.value))}>
                  {opciones.especialidades.map((s) => <option key={s} value={s}>{titulo(s)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Médicos (vacío = todos)</label>
                <select multiple size={6} className={campo} value={editor.medicos.map(String)} onChange={(e) => set("medicos", Array.from(e.target.selectedOptions, (o) => Number(o.value)))}>
                  {opciones.medicos.map((m) => <option key={m.codigo} value={m.codigo}>{titulo(m.nombre)}</option>)}
                </select>
                <p className="mt-1 text-[11.5px] text-ink-3">Ctrl/Cmd + clic para elegir varios. Las opciones salen de la agenda cargada.</p>
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>{editor.canal === "whatsapp" ? "Texto del WhatsApp" : "Texto de apoyo para la llamada (opcional)"}</label>
                <textarea ref={areaTexto} rows={4} maxLength={1000} className={campo} value={editor.plantilla} onChange={(e) => set("plantilla", e.target.value)} />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {VARIABLES_PLANTILLA.map((v) => (
                    <button key={v.clave} type="button" title={v.descripcion} onClick={() => insertar(v.clave)} className="rounded-md bg-blue-10 px-2 py-0.5 text-[11.5px] text-navy hover:bg-navy-10">{`{${v.clave}}`}</button>
                  ))}
                </div>
                {editor.plantilla && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink-2"><span className="text-ink-3">Vista previa: </span>{renderPlantilla(editor.plantilla, ejemplo)}</p>}
              </div>
              <details className="sm:col-span-2 rounded-lg border border-line-2 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-ink-2">Ajustes avanzados</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className={rotulo}>Intentos máximos</label><input type="number" min={1} max={5} className={campo} value={editor.maxIntentos} onChange={(e) => set("maxIntentos", Number(e.target.value))} /></div>
                  <div><label className={rotulo}>Minutos entre reintentos</label><input type="number" min={15} className={campo} value={editor.reintentoMinutos} onChange={(e) => set("reintentoMinutos", Number(e.target.value))} /></div>
                  <div><label className={rotulo}>No avisar si faltan menos de (min)</label><input type="number" min={0} className={campo} value={editor.minAntelacionMinutos} onChange={(e) => set("minAntelacionMinutos", Number(e.target.value))} /></div>
                  <div><label className={rotulo}>Tolerancia de retraso (min)</label><input type="number" min={30} className={campo} value={editor.maxRetrasoMinutos} onChange={(e) => set("maxRetrasoMinutos", Number(e.target.value))} /></div>
                </div>
                <p className="mt-2 text-[11.5px] text-ink-3">La tolerancia evita avisar tarde: si la cita llegó a la agenda cuando ya había pasado la hora del recordatorio por más de este tiempo, se omite.</p>
              </details>
              <label className="inline-flex items-center gap-2 text-sm text-ink-2 sm:col-span-2">
                <input type="checkbox" checked={editor.activa} onChange={(e) => set("activa", e.target.checked)} /> Regla activa
              </label>
            </div>
            {msg && !msg.ok && <p className="mt-3 text-sm text-red-600">{msg.texto}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setEditor(null); setMsg(null); }} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 hover:bg-paper">Cancelar</button>
              <button type="button" disabled={pendiente} onClick={guardar} className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-navy-90 disabled:opacity-60">{pendiente ? "Guardando…" : "Guardar regla"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
