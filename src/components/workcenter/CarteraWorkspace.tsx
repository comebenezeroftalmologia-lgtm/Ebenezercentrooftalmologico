"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Plus, Search, X } from "lucide-react";

// Mesa de trabajo de Cartera.
//
// Aqui se registra y se resuelve; la vista de Analytics (/cartera) sigue
// siendo solo para mirar. Todo lo que se escribe aqui va a la base de datos
// compartida y queda en el historial con autor y fecha.

type Glosa = {
  id: string;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  fechaFactura: string;
  fechaRadicacion: string;
  valorRadicado: number;
  valorGlosado: number;
  motivoGlosa: string;
  observacionInterna: string;
  notaCredito: string;
  facturador: string;
  responsableAceptacion: string;
  tipoGlosa: string;
  estado: string;
};

const ESTADOS = [
  { id: "PENDIENTE", etiqueta: "Pendiente" },
  { id: "RESPONDIDA", etiqueta: "Respondida" },
  { id: "ACEPTADA", etiqueta: "Aceptada" },
  { id: "NO_ACEPTADA", etiqueta: "No aceptada" },
  { id: "LEGALIZADA", etiqueta: "Legalizada" },
];

const COLOR: Record<string, { fondo: string; texto: string; borde: string }> = {
  PENDIENTE:   { fondo: "#FFF7E8", texto: "#8A5A00", borde: "#E8C98A" },
  RESPONDIDA:  { fondo: "#EEF4FD", texto: "#1D4ED8", borde: "#B9CDF2" },
  ACEPTADA:    { fondo: "#EFF4DC", texto: "#4E6B08", borde: "#C2D487" },
  NO_ACEPTADA: { fondo: "#E8F0F8", texto: "#0E4C7E", borde: "#A9C4DE" },
  LEGALIZADA:  { fondo: "#F1F3F5", texto: "#475569", borde: "#CBD5E1" },
};

const pesos = (n: number) =>
  "$" + Math.round(n || 0).toLocaleString("es-CO");

export function CarteraWorkspace({
  usuario,
}: {
  usuario: { id: string; nombre: string; esAdmin: boolean };
}) {
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/cartera/registros", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error || "No se pudo leer la base de datos.");
        return;
      }
      setGlosas((json.glosas || []) as Glosa[]);
    } catch {
      setError("Sin conexion con la base de datos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const avisar = (m: string) => {
    setAviso(m);
    window.setTimeout(() => setAviso(""), 4000);
  };

  const guardar = async (fila: Partial<Glosa>, accion: "CREAR" | "EDITAR") => {
    setGuardando(String(fila.id ?? "nueva"));
    try {
      const res = await fetch("/api/cartera/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidad: "glosas", accion, fila }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        avisar("NO SE GUARDO: " + (json?.error || res.statusText));
        return false;
      }
      await cargar();
      avisar(accion === "CREAR" ? "Glosa registrada." : "Cambio guardado.");
      return true;
    } catch {
      avisar("NO SE GUARDO: sin conexion.");
      return false;
    } finally {
      setGuardando(null);
    }
  };

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return glosas.filter((g) => {
      if (soloPendientes && g.estado !== "PENDIENTE") return false;
      if (!q) return true;
      return (
        g.factura.toUpperCase().includes(q) ||
        g.empresa.toUpperCase().includes(q) ||
        (g.motivoGlosa || "").toUpperCase().includes(q)
      );
    });
  }, [glosas, busqueda, soloPendientes]);

  const pendientes = glosas.filter((g) => g.estado === "PENDIENTE");
  const valorPendiente = pendientes.reduce((a, g) => a + (g.valorGlosado || 0), 0);
  const activa = glosas.find((g) => g.id === seleccion) || null;
  const hermanas = activa ? glosas.filter((g) => g.factura === activa.factura) : [];

  return (
    <div className="h-full overflow-y-auto bg-[#F6F8FA]">
      <div className="mx-auto max-w-[1360px] px-6 pb-24 pt-6">
        {/* encabezado */}
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
            WORKCENTER · CARTERA
          </p>
          <h1 className="mt-1.5 font-display text-[28px] font-semibold leading-tight text-[#0F1F2C]">
            Mesa de trabajo de glosas
          </h1>
          <p className="mt-1 text-[13px] text-[#5B6B79]">
            Lo que registres aqui queda en la base compartida, con tu nombre y la fecha.
            {usuario.esAdmin ? " Entras como administrador." : ""}
          </p>
        </div>

        {/* cifras */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tarjeta titulo="Glosas sin resolver" valor={String(pendientes.length)} pie="esperan desenlace" />
          <Tarjeta titulo="Plata sin clasificar" valor={pesos(valorPendiente)} pie="de glosas pendientes" destacar />
          <Tarjeta titulo="Registradas en total" valor={String(glosas.length)} pie="glosas y devoluciones" />
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-[12px] border border-[#E8C2BE] bg-[#FDF4F3] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9E2A20]" />
            <div className="text-[13px] text-[#7A2219]">
              <strong className="font-semibold">{error}</strong>
              <p className="mt-0.5 text-[#9E4A42]">
                Nada de lo que escribas se va a guardar mientras esto no se resuelva.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* columna izquierda: la cola de trabajo */}
          <div className="rounded-[14px] border border-[#DCE4EC] bg-white">
            <div className="border-b border-[#EDF1F5] p-3.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A98A6]" />
                <input
                  id="cartera-busqueda"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Factura, empresa o motivo…"
                  className="w-full rounded-[9px] border border-[#D7DFE8] bg-[#FBFCFD] py-2 pl-9 pr-3 text-[13px] text-[#0F1F2C] outline-none focus:border-[#0E4C7E]"
                />
              </div>
              <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[12.5px] text-[#475569]">
                <input
                  id="cartera-solo-pendientes"
                  type="checkbox"
                  checked={soloPendientes}
                  onChange={(e) => setSoloPendientes(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#0E4C7E]"
                />
                Mostrar solo las que faltan por resolver
              </label>
            </div>

            <div className="max-h-[560px] overflow-y-auto">
              {cargando && (
                <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#64748B]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </div>
              )}
              {!cargando && filtradas.length === 0 && (
                <p className="px-4 py-10 text-center text-[13px] text-[#64748B]">
                  {glosas.length === 0
                    ? "No hay glosas en la base todavia."
                    : "Nada coincide con lo que buscas."}
                </p>
              )}
              {filtradas.slice(0, 300).map((g) => {
                const c = COLOR[g.estado] || COLOR.PENDIENTE;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSeleccion(g.id)}
                    className={`block w-full border-b border-[#F1F4F7] px-4 py-3 text-left transition hover:bg-[#F8FAFC] ${
                      seleccion === g.id ? "bg-[#F2F7FC]" : ""
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[13px] font-semibold text-[#0E4C7E]">
                        {g.factura}
                      </span>
                      <span className="font-mono text-[12.5px] tabular-nums text-[#0F1F2C]">
                        {pesos(g.valorGlosado)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-[#475569]">
                      {g.empresa} · {g.motivoGlosa || "sin motivo registrado"}
                    </p>
                    <span
                      className="mt-1.5 inline-block rounded-[5px] border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
                      style={{ background: c.fondo, color: c.texto, borderColor: c.borde }}
                    >
                      {ESTADOS.find((e) => e.id === g.estado)?.etiqueta || g.estado}
                    </span>
                  </button>
                );
              })}
              {filtradas.length > 300 && (
                <p className="px-4 py-3 text-center text-[12px] text-[#8A98A6]">
                  Mostrando 300 de {filtradas.length}. Afina la busqueda.
                </p>
              )}
            </div>
          </div>

          {/* columna derecha: la ficha */}
          <div className="rounded-[14px] border border-[#DCE4EC] bg-white">
            {!activa && (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-[14px] font-medium text-[#0F1F2C]">
                  Elige una glosa de la izquierda
                </p>
                <p className="max-w-[46ch] text-[13px] text-[#64748B]">
                  Se abre la ficha de su factura con todas las glosas que tenga, y desde ahi
                  defines el desenlace de cada una.
                </p>
                <button
                  type="button"
                  onClick={() => setNuevaAbierta(true)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-[9px] bg-[#0E4C7E] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0B3D66]"
                >
                  <Plus className="h-4 w-4" /> Registrar una glosa nueva
                </button>
              </div>
            )}

            {activa && (
              <FichaFactura
                activa={activa}
                hermanas={hermanas}
                guardando={guardando}
                onGuardar={guardar}
                onCerrar={() => setSeleccion(null)}
                onNueva={() => setNuevaAbierta(true)}
              />
            )}
          </div>
        </div>
      </div>

      {nuevaAbierta && (
        <ModalNueva
          facturaSugerida={activa?.factura || ""}
          empresaSugerida={activa?.empresa || ""}
          guardando={guardando === "nueva"}
          onCerrar={() => setNuevaAbierta(false)}
          onGuardar={async (fila) => {
            const ok = await guardar(fila, "CREAR");
            if (ok) setNuevaAbierta(false);
          }}
        />
      )}

      {aviso && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-[10px] bg-[#0F1F2C] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  titulo, valor, pie, destacar,
}: { titulo: string; valor: string; pie: string; destacar?: boolean }) {
  return (
    <div
      className="rounded-[13px] border bg-white px-4 py-3.5"
      style={{ borderColor: destacar ? "#C2D487" : "#DCE4EC" }}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#64748B]">{titulo}</p>
      <p className="mt-1.5 font-display text-[26px] font-semibold leading-none tabular-nums text-[#0F1F2C]">
        {valor}
      </p>
      <p className="mt-1.5 text-[12px] text-[#7A8794]">{pie}</p>
    </div>
  );
}

function FichaFactura({
  activa, hermanas, guardando, onGuardar, onCerrar, onNueva,
}: {
  activa: Glosa;
  hermanas: Glosa[];
  guardando: string | null;
  onGuardar: (fila: Partial<Glosa>, accion: "CREAR" | "EDITAR") => Promise<boolean>;
  onCerrar: () => void;
  onNueva: () => void;
}) {
  const totalGlosado = hermanas.reduce((a, g) => a + (g.valorGlosado || 0), 0);
  const excede = activa.valorRadicado > 0 && totalGlosado > activa.valorRadicado;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EDF1F5] bg-[#FAFCFD] px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[19px] font-semibold text-[#0F1F2C]">{activa.factura}</p>
          <p className="mt-0.5 text-[12.5px] text-[#5B6B79]">
            {activa.empresa}
            {activa.fechaRadicacion ? ` · radicada ${activa.fechaRadicacion}` : ""}
            {activa.facturador ? ` · ${activa.facturador}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-[7px] border border-[#D7DFE8] p-1.5 text-[#64748B] transition hover:bg-white"
          aria-label="Cerrar ficha"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-[#EDF1F5] px-5 py-4 sm:grid-cols-4">
        <Dato etiqueta="Valor radicado" valor={pesos(activa.valorRadicado)} />
        <Dato etiqueta="Total glosado" valor={pesos(totalGlosado)} alerta={excede} />
        <Dato etiqueta="Glosas" valor={String(hermanas.length)} />
        <Dato etiqueta="Elaboracion" valor={activa.fechaFactura || "—"} />
      </div>

      {excede && (
        <div className="flex items-start gap-2 border-b border-[#EDF1F5] bg-[#FDF8F3] px-5 py-2.5 text-[12.5px] text-[#8A5A00]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Lo glosado supera el valor de la factura. Verifica antes de cerrar.
        </div>
      )}

      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
            Glosas de esta factura
          </p>
          <button
            type="button"
            onClick={onNueva}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D7DFE8] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#0E4C7E] transition hover:bg-[#F2F7FC]"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva
          </button>
        </div>

        <div className="space-y-2.5">
          {hermanas.map((g) => (
            <LineaGlosa
              key={g.id}
              glosa={g}
              guardando={guardando === g.id}
              onGuardar={onGuardar}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A98A6]">{etiqueta}</p>
      <p
        className="mt-0.5 text-[14px] font-medium tabular-nums"
        style={{ color: alerta ? "#9E2A20" : "#0F1F2C" }}
      >
        {valor}
      </p>
    </div>
  );
}

function LineaGlosa({
  glosa, guardando, onGuardar,
}: {
  glosa: Glosa;
  guardando: boolean;
  onGuardar: (fila: Partial<Glosa>, accion: "CREAR" | "EDITAR") => Promise<boolean>;
}) {
  const [estado, setEstado] = useState(glosa.estado);
  const [obs, setObs] = useState(glosa.observacionInterna || "");
  const [nota, setNota] = useState(glosa.notaCredito || "");

  useEffect(() => {
    setEstado(glosa.estado);
    setObs(glosa.observacionInterna || "");
    setNota(glosa.notaCredito || "");
  }, [glosa.id, glosa.estado, glosa.observacionInterna, glosa.notaCredito]);

  const cambiado =
    estado !== glosa.estado ||
    obs !== (glosa.observacionInterna || "") ||
    nota !== (glosa.notaCredito || "");
  const c = COLOR[estado] || COLOR.PENDIENTE;

  return (
    <div className="rounded-[11px] border border-[#E4EAF0] bg-[#FCFDFE] p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 flex-1 text-[13.5px] text-[#0F1F2C]">
          {glosa.motivoGlosa || "Sin motivo registrado"}
        </p>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-[#0F1F2C]">
          {pesos(glosa.valorGlosado)}
        </span>
      </div>
      <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-[#8A98A6]">
        {glosa.tipoGlosa === "DEVOLUCION" ? "Devolucion" : "Glosa"}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[170px_minmax(0,1fr)]">
        <div>
          <label
            htmlFor={`estado-${glosa.id}`}
            className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A98A6]"
          >
            Desenlace
          </label>
          <select
            id={`estado-${glosa.id}`}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full rounded-[8px] border px-2.5 py-1.5 text-[13px] font-semibold outline-none"
            style={{ background: c.fondo, color: c.texto, borderColor: c.borde }}
          >
            {ESTADOS.map((e) => (
              <option key={e.id} value={e.id}>{e.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`obs-${glosa.id}`}
            className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A98A6]"
          >
            Observacion
          </label>
          <input
            id={`obs-${glosa.id}`}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Que se hizo con esta glosa…"
            className="w-full rounded-[8px] border border-[#D7DFE8] bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0E4C7E]"
          />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-end justify-between gap-2.5">
        <div className="min-w-[180px] flex-1">
          <label
            htmlFor={`nota-${glosa.id}`}
            className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A98A6]"
          >
            Nota credito
          </label>
          <input
            id={`nota-${glosa.id}`}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="N/A"
            className="w-full rounded-[8px] border border-[#D7DFE8] bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0E4C7E]"
          />
        </div>
        <button
          type="button"
          disabled={!cambiado || guardando}
          onClick={() =>
            void onGuardar(
              { ...glosa, estado, observacionInterna: obs, notaCredito: nota },
              "EDITAR"
            )
          }
          className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[#C3CCD6]"
          style={cambiado && !guardando ? { background: "#0E4C7E" } : undefined}
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {guardando ? "Guardando…" : cambiado ? "Guardar" : "Sin cambios"}
        </button>
      </div>
    </div>
  );
}

function ModalNueva({
  facturaSugerida, empresaSugerida, guardando, onCerrar, onGuardar,
}: {
  facturaSugerida: string;
  empresaSugerida: string;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (fila: Partial<Glosa>) => void;
}) {
  const [f, setF] = useState({
    factura: facturaSugerida,
    empresa: empresaSugerida,
    tipoGlosa: "GLOSA",
    motivoGlosa: "",
    valorGlosado: "",
    observacionInterna: "",
    estado: "PENDIENTE",
  });
  const completo = f.factura.trim() !== "" && f.motivoGlosa.trim() !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1F2C]/45 p-4">
      <div className="w-full max-w-[560px] rounded-[14px] border border-[#DCE4EC] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EDF1F5] px-5 py-3.5">
          <p className="text-[15px] font-semibold text-[#0F1F2C]">Registrar glosa</p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-[7px] p-1.5 text-[#64748B] transition hover:bg-[#F1F4F7]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 px-5 py-4 sm:grid-cols-2">
          <Campo id="nf" etiqueta="Numero de factura">
            <input
              id="nf"
              value={f.factura}
              onChange={(e) => setF({ ...f, factura: e.target.value.toUpperCase() })}
              placeholder="FCOE00000"
              className="w-full rounded-[8px] border border-[#D7DFE8] px-2.5 py-2 font-mono text-[13px] outline-none focus:border-[#0E4C7E]"
            />
          </Campo>
          <Campo id="emp" etiqueta="Empresa">
            <input
              id="emp"
              value={f.empresa}
              onChange={(e) => setF({ ...f, empresa: e.target.value.toUpperCase() })}
              className="w-full rounded-[8px] border border-[#D7DFE8] px-2.5 py-2 text-[13px] outline-none focus:border-[#0E4C7E]"
            />
          </Campo>
          <Campo id="tipo" etiqueta="Tipo">
            <select
              id="tipo"
              value={f.tipoGlosa}
              onChange={(e) => setF({ ...f, tipoGlosa: e.target.value })}
              className="w-full rounded-[8px] border border-[#D7DFE8] px-2.5 py-2 text-[13px] outline-none focus:border-[#0E4C7E]"
            >
              <option value="GLOSA">Glosa</option>
              <option value="DEVOLUCION">Devolucion</option>
            </select>
          </Campo>
          <Campo id="val" etiqueta="Valor glosado">
            <input
              id="val"
              value={f.valorGlosado}
              onChange={(e) => setF({ ...f, valorGlosado: e.target.value })}
              placeholder="0"
              className="w-full rounded-[8px] border border-[#D7DFE8] px-2.5 py-2 text-[13px] tabular-nums outline-none focus:border-[#0E4C7E]"
            />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="mot" etiqueta="Motivo">
              <input
                id="mot"
                value={f.motivoGlosa}
                onChange={(e) => setF({ ...f, motivoGlosa: e.target.value })}
                placeholder="Por que la glosaron"
                className="w-full rounded-[8px] border border-[#D7DFE8] px-2.5 py-2 text-[13px] outline-none focus:border-[#0E4C7E]"
              />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <Campo id="obs2" etiqueta="Observacion">
              <input
                id="obs2"
                value={f.observacionInterna}
                onChange={(e) => setF({ ...f, observacionInterna: e.target.value })}
                className="w-full rounded-[8px] border border-[#D7DFE8] px-2.5 py-2 text-[13px] outline-none focus:border-[#0E4C7E]"
              />
            </Campo>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#EDF1F5] px-5 py-3.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-[8px] border border-[#D7DFE8] px-3.5 py-2 text-[13px] font-semibold text-[#475569] transition hover:bg-[#F8FAFC]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!completo || guardando}
            onClick={() => onGuardar({ ...f, valorGlosado: Number(String(f.valorGlosado).replace(/[^0-9]/g, "")) || 0 })}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#0E4C7E] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0B3D66] disabled:cursor-not-allowed disabled:bg-[#C3CCD6]"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ id, etiqueta, children }: { id: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A98A6]">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
