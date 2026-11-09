"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Tags,
  Users,
  X,
} from "lucide-react";

/* ---------------------------------------------------------------------
   MESA DE TRABAJO DE CARTERA — GLOSAS Y DEVOLUCIONES

   TRES DECISIONES QUE EXPLICAN TODO LO DEMAS

   1. SE TRABAJA COMO EN EL EXCEL, PERO NO SE PIERDE NADA.
      Cuadricula, edicion en la celda, guardado al salir del campo. Pero el
      Excel obliga a elegir entre ver poco y leer todo; aqui la fila lleva
      lo que se consulta de un vistazo y se despliega para ver el resto
      completo, sin recortes y sin esconder columnas.

   2. EL MOTIVO AHORA SON DOS COSAS.
      La CAUSAL es el codigo de la Resolucion 2284 de 2023, que es lo que la
      EPS exige y lo unico con lo que se puede medir. La OBSERVACION DEL
      MOTIVO es el texto que escribio Facturacion, que se conserva palabra
      por palabra porque es el que cuenta que paso de verdad. Mas la
      OBSERVACION GENERAL, que es la nota interna.

   3. LAS METRICAS VIVEN AQUI.
      Quien resuelve glosas necesita saber por que nos glosan mientras las
      resuelve, no en otro tablero al que hay que ir. Por eso la cabecera
      mide sobre lo filtrado: si filtras por COLSANITAS y 2026, las cifras
      son de COLSANITAS y 2026.
   --------------------------------------------------------------------- */

type Glosa = {
  id: string;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  fechaFactura: string;
  fechaRadicacion: string;
  anio: string;
  valorRadicado: number;
  valorGlosado: number;
  valorAceptado: number | null;
  motivoCodigo: string;
  motivoGlosa: string;
  observacionInterna: string;
  notaCredito: string;
  facturador: string;
  responsableAceptacion: string;
  tipoGlosa: string;
  alcance: string;
  estado: string;
};

type Causal = { codigo: string; familia: string; nombre: string };
type Catalogos = {
  empresas: string[];
  responsables: string[];
  motivos: string[];
  causales: Causal[];
  anios: string[];
};

const ESTADOS = [
  { id: "PENDIENTE", etiqueta: "Pendiente" },
  { id: "RESPONDIDA", etiqueta: "Respondida" },
  { id: "ACEPTADA", etiqueta: "Aceptada" },
  { id: "NO_ACEPTADA", etiqueta: "No aceptada" },
  { id: "LEGALIZADA", etiqueta: "Legalizada" },
];
const ETIQUETA: Record<string, string> = Object.fromEntries(ESTADOS.map((e) => [e.id, e.etiqueta]));

const PASTILLA: Record<string, string> = {
  PENDIENTE: "border-[#DCE8FA] bg-[#EEF4FD] text-[#1A3174]",
  RESPONDIDA: "border-[#C7CDE0] bg-[#F4F6FB] text-[#3B4F8D]",
  ACEPTADA: "border-[#BFE0CC] bg-[#DCEEE3] text-[#146138]",
  NO_ACEPTADA: "border-[#BBD2F0] bg-[#E7ECFE] text-[#13359B]",
  LEGALIZADA: "border-[#D8DEE9] bg-[#F1F3F7] text-[#47597A]",
};

/* Color por familia de causal. Se diferencian ademas por claridad, no solo
   por tono, para que se distingan tambien en gris o impresas. */
const FAMILIA_COLOR: Record<string, string> = {
  Devoluciones: "#0E245E",
  Tarifas: "#1D58D8",
  Facturación: "#6791F0",
  Soportes: "#21814B",
  Autorizaciones: "#B45309",
  Cobertura: "#7C3AED",
  Calidad: "#0F766E",
  "Seguimiento a los acuerdos": "#94A3B8",
  Respuestas: "#C7CDE0",
};

const CLASES = [
  { id: "", etiqueta: "— sin definir —", tipo: "GLOSA", alcance: "" },
  { id: "GLOSA|PARCIAL", etiqueta: "Glosa parcial", tipo: "GLOSA", alcance: "PARCIAL" },
  { id: "GLOSA|TOTAL", etiqueta: "Glosa total", tipo: "GLOSA", alcance: "TOTAL" },
  { id: "DEVOLUCION|TOTAL", etiqueta: "Devolución", tipo: "DEVOLUCION", alcance: "TOTAL" },
];
const claseDe = (g: { tipoGlosa: string; alcance: string }) =>
  g.tipoGlosa === "DEVOLUCION" ? "DEVOLUCION|TOTAL" : g.alcance ? `GLOSA|${g.alcance}` : "";

const pesos = (n: number) => "$" + Math.round(n || 0).toLocaleString("es-CO");
const pesosCorto = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (v >= 1_000) return "$" + Math.round(n / 1_000) + "k";
  return "$" + Math.round(n);
};
const soloNumero = (s: string) => {
  const n = Number(String(s).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fecha = (s: string) => {
  if (!s) return "—";
  const [a, m, d] = s.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : s;
};

function clasePago(g: Glosa): { texto: string; clase: string } | null {
  if (g.valorAceptado === null || g.valorAceptado === undefined) return null;
  if (g.valorAceptado <= 0) return { texto: "nada", clase: "text-[#64748B]" };
  if (g.valorGlosado > 0 && g.valorAceptado >= g.valorGlosado)
    return { texto: "total", clase: "text-[#146138]" };
  return { texto: "parcial", clase: "text-[#B45309]" };
}

const VACIO: Catalogos = { empresas: [], responsables: [], motivos: [], causales: [], anios: [] };

export function CarteraWorkspace({
  usuario,
}: {
  usuario: { id: string; nombre: string; esAdmin: boolean };
}) {
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [cat, setCat] = useState<Catalogos>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [aviso, setAviso] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [fEstado, setFEstado] = useState("SIN_RESOLVER");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fAnio, setFAnio] = useState("");
  const [fFacturador, setFFacturador] = useState("");
  const [fFamilia, setFFamilia] = useState("");
  const [soloSinCausal, setSoloSinCausal] = useState(false);

  const [guardando, setGuardando] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [fichaDe, setFichaDe] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [clasificarAbierto, setClasificarAbierto] = useState(false);
  const [catalogosAbierto, setCatalogosAbierto] = useState(false);

  const traer = useCallback(async () => {
    setCargando(true);
    setFallo("");
    try {
      const r = await fetch("/api/cartera/registros", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setGlosas((j.glosas || []) as Glosa[]);
      if (j.catalogos) setCat({ ...VACIO, ...(j.catalogos as Catalogos) });
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "Sin conexión con la base.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void traer();
  }, [traer]);

  const avisar = (m: string) => {
    setAviso(m);
    window.setTimeout(() => setAviso(""), 4000);
  };

  const guardar = useCallback(
    async (fila: Partial<Glosa>, accion: "CREAR" | "EDITAR", entidad = "glosas") => {
      const marca = String(fila.id ?? "nueva");
      setGuardando(marca);
      try {
        const r = await fetch("/api/cartera/registros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entidad, accion, fila }),
        });
        const j = await r.json();
        if (!r.ok || !j.ok) {
          avisar("NO SE GUARDÓ: " + (j?.error || r.statusText));
          return false;
        }
        await traer();
        setGuardado(marca);
        window.setTimeout(() => setGuardado(null), 1800);
        if (typeof j.afectadas === "number") avisar(`${j.afectadas} glosas clasificadas.`);
        return true;
      } catch {
        avisar("NO SE GUARDÓ: sin conexión.");
        return false;
      } finally {
        setGuardando(null);
      }
    },
    [traer],
  );

  const causalPorCodigo = useMemo(() => {
    const m: Record<string, Causal> = {};
    for (const c of cat.causales) m[c.codigo] = c;
    return m;
  }, [cat.causales]);

  /* Los filtros se aplican antes de medir: las cifras son siempre de lo que
     estás mirando, no del total. */
  const visibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return glosas.filter((g) => {
      if (fEstado === "SIN_RESOLVER" && g.estado !== "PENDIENTE") return false;
      if (fEstado !== "TODAS" && fEstado !== "SIN_RESOLVER" && g.estado !== fEstado) return false;
      if (fEmpresa && g.empresa !== fEmpresa) return false;
      if (fAnio && g.anio !== fAnio) return false;
      if (fFacturador && g.facturador !== fFacturador) return false;
      if (soloSinCausal && g.motivoCodigo) return false;
      if (fFamilia) {
        const c = causalPorCodigo[g.motivoCodigo];
        if (!c || c.familia !== fFamilia) return false;
      }
      if (!q) return true;
      return (
        g.factura.toUpperCase().includes(q) ||
        g.empresa.toUpperCase().includes(q) ||
        (g.motivoGlosa || "").toUpperCase().includes(q) ||
        (g.motivoCodigo || "").toUpperCase().includes(q) ||
        (g.notaCredito || "").toUpperCase().includes(q) ||
        (g.observacionInterna || "").toUpperCase().includes(q)
      );
    });
  }, [
    glosas, busqueda, fEstado, fEmpresa, fAnio, fFacturador, fFamilia, soloSinCausal, causalPorCodigo,
  ]);

  const m = useMemo(() => {
    let glosado = 0, aceptado = 0, sinResolver = 0, valorSinResolver = 0, sinCausal = 0;
    const porFamilia: Record<string, number> = {};
    const porEmpresa: Record<string, number> = {};
    const porCausal: Record<string, number> = {};
    for (const g of visibles) {
      glosado += g.valorGlosado || 0;
      if (g.valorAceptado != null) aceptado += g.valorAceptado;
      if (g.estado === "PENDIENTE") { sinResolver++; valorSinResolver += g.valorGlosado || 0; }
      if (!g.motivoCodigo) sinCausal++;
      const fam = causalPorCodigo[g.motivoCodigo]?.familia || "Sin clasificar";
      porFamilia[fam] = (porFamilia[fam] || 0) + (g.valorGlosado || 0);
      if (g.empresa) porEmpresa[g.empresa] = (porEmpresa[g.empresa] || 0) + (g.valorGlosado || 0);
      if (g.motivoCodigo) porCausal[g.motivoCodigo] = (porCausal[g.motivoCodigo] || 0) + (g.valorGlosado || 0);
    }
    const orden = (o: Record<string, number>) =>
      Object.entries(o).sort((a, b) => b[1] - a[1]);
    return {
      glosado, aceptado, sinResolver, valorSinResolver, sinCausal,
      familias: orden(porFamilia), empresas: orden(porEmpresa).slice(0, 6),
      causales: orden(porCausal).slice(0, 6),
    };
  }, [visibles, causalPorCodigo]);

  /* Textos distintos que todavia no tienen causal, del mas repetido al menos.
     Es la lista de trabajo real: 122 decisiones en vez de 217. */
  const porClasificar = useMemo(() => {
    const g: Record<string, { n: number; valor: number }> = {};
    for (const x of glosas) {
      if (x.motivoCodigo) continue;
      const t = (x.motivoGlosa || "(sin motivo escrito)").trim();
      if (!g[t]) g[t] = { n: 0, valor: 0 };
      g[t].n++;
      g[t].valor += x.valorGlosado || 0;
    }
    return Object.entries(g).sort((a, b) => b[1].valor - a[1].valor);
  }, [glosas]);

  const hermanas = useMemo(
    () => (fichaDe ? glosas.filter((g) => g.factura === fichaDe) : []),
    [glosas, fichaDe],
  );

  const limpiarFiltros = () => {
    setFEmpresa(""); setFAnio(""); setFFacturador(""); setFFamilia("");
    setSoloSinCausal(false); setBusqueda("");
  };
  const hayFiltro = !!(fEmpresa || fAnio || fFacturador || fFamilia || soloSinCausal || busqueda);

  const sel =
    "rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 text-[12.5px] text-[#47597A] outline-none focus:border-[#1D58D8]";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-10">
      <datalist id="cat-empresas">{cat.empresas.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="cat-motivos">{cat.motivos.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="cat-responsables">{cat.responsables.map((x) => <option key={x} value={x} />)}</datalist>

      {/* ---------- encabezado ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eb-label text-[11px] text-[#64748B]">WorkCenter · Cartera</p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight text-[#0E245E]">
            Glosas y devoluciones
          </h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Se escribe en la celda y se guarda solo, con tu nombre y la fecha.
            {usuario.esAdmin ? " Entras como administrador." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setClasificarAbierto((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
          >
            <Tags className="h-3.5 w-3.5" />
            Clasificar motivos
            {m.sinCausal > 0 && (
              <span className="ml-0.5 rounded-pill bg-[#FEF3C7] px-1.5 py-0.5 text-[10.5px] font-bold text-[#92400E]">
                {porClasificar.reduce((a, [, v]) => a + v.n, 0)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setCatalogosAbierto((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
          >
            <Users className="h-3.5 w-3.5" /> Facturadores y empresas
          </button>
          <button
            type="button"
            onClick={() => setNuevaAbierta(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1747B0]"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva glosa
          </button>
        </div>
      </div>

      {/* ---------- métricas de lo filtrado ---------- */}
      <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          <Cifra titulo="Glosado" valor={pesos(m.glosado)} pie={`${visibles.length} registros`} />
          <Cifra
            titulo="Sin resolver"
            valor={pesos(m.valorSinResolver)}
            pie={`${m.sinResolver} esperan desenlace`}
            acento="#0E245E"
          />
          <Cifra
            titulo="Aceptado"
            valor={pesos(m.aceptado)}
            pie={m.glosado > 0 ? `${Math.round((m.aceptado / m.glosado) * 100)}% de lo glosado` : "—"}
            acento="#21814B"
          />
          <Cifra
            titulo="Sin causal"
            valor={String(m.sinCausal)}
            pie="no se pueden medir todavía"
            acento={m.sinCausal > 0 ? "#B45309" : undefined}
          />
        </div>

        {m.glosado > 0 && (
          <div className="mt-5">
            <p className="eb-label mb-2 text-[10px] text-[#64748B]">Por familia de causal</p>
            <div className="flex h-3 overflow-hidden rounded-pill bg-[#F1F5F9]">
              {m.familias.map(([fam, v]) => (
                <div
                  key={fam}
                  title={`${fam}: ${pesos(v)}`}
                  style={{
                    width: `${(v / m.glosado) * 100}%`,
                    background: FAMILIA_COLOR[fam] || "#E2EBF8",
                  }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {m.familias.map(([fam, v]) => (
                <button
                  key={fam}
                  type="button"
                  onClick={() => setFFamilia(fFamilia === fam ? "" : fam === "Sin clasificar" ? "" : fam)}
                  className={`flex items-center gap-1.5 text-[11.5px] transition ${
                    fFamilia === fam ? "font-bold text-[#0E245E]" : "text-[#47597A] hover:text-[#0E245E]"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ background: FAMILIA_COLOR[fam] || "#E2EBF8" }}
                  />
                  {fam}
                  <span className="font-cifra font-semibold">{pesosCorto(v)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(m.empresas.length > 0 || m.causales.length > 0) && (
          <div className="mt-5 grid gap-5 border-t border-[#F1F5F9] pt-4 md:grid-cols-2">
            <Ranking
              titulo="Empresas con más glosa"
              filas={m.empresas}
              total={m.glosado}
              onClick={(k) => setFEmpresa(fEmpresa === k ? "" : k)}
              activo={fEmpresa}
            />
            <Ranking
              titulo="Causales más frecuentes"
              filas={m.causales}
              total={m.glosado}
              etiqueta={(k) => `${k} · ${causalPorCodigo[k]?.nombre || ""}`}
            />
          </div>
        )}
      </div>

      {fallo && (
        <div className="flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-semibold text-[#B91C1C]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No se pudieron traer los datos: {fallo}. La cuadrícula está vacía porque falló la
            consulta, no porque no haya registros. Nada de lo que escribas se va a guardar mientras
            esto no se resuelva.
          </span>
        </div>
      )}

      {catalogosAbierto && (
        <PanelCatalogos
          esAdmin={usuario.esAdmin}
          onCerrar={() => setCatalogosAbierto(false)}
          onCambio={(msg) => { avisar(msg); void traer(); }}
        />
      )}

      {clasificarAbierto && (
        <PanelClasificar
          filas={porClasificar}
          causales={cat.causales}
          guardando={guardando}
          onCerrar={() => setClasificarAbierto(false)}
          onAplicar={(texto, codigo) =>
            guardar({ motivoGlosa: texto, motivoCodigo: codigo }, "EDITAR", "glosas-lote")
          }
        />
      )}

      {/* ---------- cuadrícula ---------- */}
      <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Pestana activa={fEstado === "SIN_RESOLVER"} onClick={() => setFEstado("SIN_RESOLVER")}>
            Sin resolver
          </Pestana>
          <Pestana activa={fEstado === "TODAS"} onClick={() => setFEstado("TODAS")}>
            Todas
          </Pestana>
          {ESTADOS.filter((e) => e.id !== "PENDIENTE").map((e) => (
            <Pestana key={e.id} activa={fEstado === e.id} onClick={() => setFEstado(e.id)}>
              {e.etiqueta}
            </Pestana>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 border-y border-[#F1F5F9] py-2.5">
          <label htmlFor="f-emp" className="sr-only">Filtrar por empresa</label>
          <select id="f-emp" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} className={sel}>
            <option value="">Todas las empresas</option>
            {cat.empresas.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>

          <label htmlFor="f-anio" className="sr-only">Filtrar por año</label>
          <select id="f-anio" value={fAnio} onChange={(e) => setFAnio(e.target.value)} className={sel}>
            <option value="">Todos los años</option>
            {cat.anios.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>

          <label htmlFor="f-fact" className="sr-only">Filtrar por facturador</label>
          <select id="f-fact" value={fFacturador} onChange={(e) => setFFacturador(e.target.value)} className={sel}>
            <option value="">Todos los facturadores</option>
            {cat.responsables.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>

          <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#47597A]">
            <input
              type="checkbox"
              checked={soloSinCausal}
              onChange={(e) => setSoloSinCausal(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#1D58D8]"
            />
            Solo sin causal
          </label>

          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <label htmlFor="cartera-buscar" className="sr-only">Buscar</label>
            <input
              id="cartera-buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Factura, motivo, nota, observación…"
              className="w-64 rounded-lg border border-[#DCE8FA] py-1.5 pl-8 pr-2 text-[12.5px] outline-none focus:border-[#1D58D8]"
            />
          </div>

          {hayFiltro && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12px] font-semibold text-[#47597A] hover:border-[#94A3B8]"
            >
              <X className="h-3 w-3" /> Quitar filtros
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                <th className="w-6 py-2" />
                <th className="py-2 pr-3">Factura</th>
                <th className="py-2 pr-3">Empresa</th>
                <th className="py-2 pr-3">Año</th>
                <th className="py-2 pr-3">Clase</th>
                <th className="py-2 pr-3">Causal</th>
                <th className="py-2 pr-3 text-right">Radicado</th>
                <th className="py-2 pr-3 text-right">Glosado</th>
                <th className="py-2 pr-3 text-right">Aceptado</th>
                <th className="py-2 pr-3">Desenlace</th>
                <th className="py-2 pr-3">Nota crédito</th>
                <th className="py-2 pr-3">Facturador</th>
                <th className="w-6 py-2" />
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={13} className="py-8 text-center text-[#94A3B8]">
                  <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Cargando…
                </td></tr>
              )}
              {!cargando && visibles.length === 0 && !fallo && (
                <tr><td colSpan={13} className="py-8 text-center text-[#94A3B8]">
                  {glosas.length === 0 ? "Todavía no hay glosas en la base." : "Nada coincide con el filtro."}
                </td></tr>
              )}
              {visibles.slice(0, 150).map((g) => (
                <FilaGlosa
                  key={g.id}
                  glosa={g}
                  causales={cat.causales}
                  causal={causalPorCodigo[g.motivoCodigo]}
                  guardando={guardando === g.id}
                  guardado={guardado === g.id}
                  onGuardar={guardar}
                  onFicha={() => setFichaDe(g.factura)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#64748B]">
          <span>
            {visibles.length > 150
              ? `Mostrando 150 de ${visibles.length} filas. Usa los filtros para acotar.`
              : `${visibles.length} de ${glosas.length} filas`}
          </span>
          <span>La flecha de la izquierda abre la fila completa. Doble clic abre la factura.</span>
        </div>
      </div>

      {fichaDe && hermanas.length > 0 && (
        <FichaFactura
          factura={fichaDe}
          glosas={hermanas}
          causalPorCodigo={causalPorCodigo}
          onCerrar={() => setFichaDe(null)}
        />
      )}

      {nuevaAbierta && (
        <ModalNueva
          causales={cat.causales}
          guardando={guardando === "nueva"}
          onCerrar={() => setNuevaAbierta(false)}
          onGuardar={async (fila) => {
            const ok = await guardar(fila, "CREAR");
            if (ok) setNuevaAbierta(false);
          }}
        />
      )}

      {aviso && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#0E245E] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_12px_28px_rgba(14,36,94,0.18)]">
          {aviso}
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */

function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
        activa ? "bg-[#0E245E] text-white" : "border border-[#DCE8FA] bg-white text-[#47597A] hover:border-[#94A3B8]"
      }`}
    >
      {children}
    </button>
  );
}

function Cifra({ titulo, valor, pie, acento }: { titulo: string; valor: string; pie: string; acento?: string }) {
  return (
    <div>
      <p className="eb-label text-[10px] text-[#64748B]">{titulo}</p>
      <p
        className="mt-1.5 font-cifra text-[24px] font-semibold leading-none"
        style={{ color: acento || "#0E245E" }}
      >
        {valor}
      </p>
      <p className="mt-1.5 text-[11.5px] text-[#94A3B8]">{pie}</p>
    </div>
  );
}

function Ranking({
  titulo, filas, total, onClick, activo, etiqueta,
}: {
  titulo: string;
  filas: [string, number][];
  total: number;
  onClick?: (k: string) => void;
  activo?: string;
  etiqueta?: (k: string) => string;
}) {
  if (filas.length === 0) return null;
  const max = filas[0][1] || 1;
  return (
    <div>
      <p className="eb-label mb-2 text-[10px] text-[#64748B]">{titulo}</p>
      <div className="space-y-1.5">
        {filas.map(([k, v]) => (
          <button
            key={k}
            type="button"
            disabled={!onClick}
            onClick={() => onClick?.(k)}
            className={`block w-full text-left ${onClick ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`min-w-0 flex-1 truncate text-[12px] ${
                  activo === k ? "font-bold text-[#0E245E]" : "text-[#47597A]"
                }`}
                title={etiqueta ? etiqueta(k) : k}
              >
                {etiqueta ? etiqueta(k) : k}
              </span>
              <span className="font-cifra text-[12px] font-semibold text-[#0E245E]">{pesosCorto(v)}</span>
              <span className="w-9 text-right font-cifra text-[11px] text-[#94A3B8]">
                {total > 0 ? Math.round((v / total) * 100) + "%" : ""}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-pill bg-[#F1F5F9]">
              <div className="h-full rounded-pill bg-[#6791F0]" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   PANEL DE CATALOGOS — facturadores y empresas

   Antes no habia donde verlos ni corregirlos, y asi fue como quedaron
   "ERIKA" y "ERIKA ALZATE" como dos personas. La columna de usos es la que
   manda: dice si se puede eliminar o si toca desactivar o fusionar.
   --------------------------------------------------------------------- */
type ItemCat = { id: string; nombre: string; activo: boolean; usos: number };

function PanelCatalogos({
  esAdmin, onCerrar, onCambio,
}: {
  esAdmin: boolean;
  onCerrar: () => void;
  onCambio: (mensaje: string) => void;
}) {
  const [empresas, setEmpresas] = useState<ItemCat[]>([]);
  const [responsables, setResponsables] = useState<ItemCat[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [cual, setCual] = useState<"cf_responsables" | "cf_empresas">("cf_responsables");

  const traer = useCallback(async () => {
    setCargando(true); setFallo("");
    try {
      const r = await fetch("/api/cartera/catalogos", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setEmpresas(j.empresas || []);
      setResponsables(j.responsables || []);
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo leer el catálogo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void traer(); }, [traer]);

  const accion = async (cuerpo: Record<string, unknown>) => {
    setOcupado(true);
    try {
      const r = await fetch("/api/cartera/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabla: cual, ...cuerpo }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { onCambio("NO SE PUDO: " + (j?.error || r.statusText)); return false; }
      await traer();
      onCambio(j.mensaje || "Listo.");
      return true;
    } catch {
      onCambio("NO SE PUDO: sin conexión.");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const filas = cual === "cf_empresas" ? empresas : responsables;
  const titulo = cual === "cf_empresas" ? "empresas" : "facturadores";

  return (
    <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[#0E245E]">Facturadores y empresas</h3>
          <p className="mt-0.5 max-w-[86ch] text-[12px] text-[#64748B]">
            Corregir un nombre arregla todas sus glosas de una, porque están enlazadas por
            identificador y no por el texto. Eliminar solo procede cuando no tiene registros; si los
            tiene, se desactiva o se fusiona con el correcto.
          </p>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar el panel"
          className="rounded-lg border border-[#DCE8FA] p-1.5 text-[#47597A] hover:bg-[#F8FAFC]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Pestana activa={cual === "cf_responsables"} onClick={() => setCual("cf_responsables")}>
          Facturadores ({responsables.length})
        </Pestana>
        <Pestana activa={cual === "cf_empresas"} onClick={() => setCual("cf_empresas")}>
          Empresas ({empresas.length})
        </Pestana>
        <NuevoCat ocupado={ocupado} titulo={titulo} onCrear={(n) => accion({ accion: "CREAR", nombre: n })} />
      </div>

      {fallo && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-semibold text-[#B91C1C]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {fallo}
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              <th className="py-2 pr-3">Nombre</th>
              <th className="py-2 pr-3 text-right">Registros</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Fusionar con</th>
              <th className="w-24 py-2" />
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Cargando…
              </td></tr>
            )}
            {!cargando && filas.map((f) => (
              <FilaCat
                key={f.id} item={f} filas={filas} esAdmin={esAdmin} ocupado={ocupado} accion={accion}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NuevoCat({
  ocupado, titulo, onCrear,
}: { ocupado: boolean; titulo: string; onCrear: (n: string) => Promise<boolean> }) {
  const [n, setN] = useState("");
  return (
    <div className="ml-auto flex items-center gap-1.5">
      <label htmlFor="nuevo-cat" className="sr-only">Nombre del nuevo</label>
      <input
        id="nuevo-cat" value={n} onChange={(e) => setN(e.target.value.toUpperCase())}
        placeholder={`Agregar a ${titulo}…`}
        className="w-52 rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8]"
      />
      <button
        type="button" disabled={!n.trim() || ocupado}
        onClick={async () => { if (await onCrear(n.trim())) setN(""); }}
        className="inline-flex items-center gap-1 rounded-lg bg-[#1D58D8] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar
      </button>
    </div>
  );
}

function FilaCat({
  item, filas, esAdmin, ocupado, accion,
}: {
  item: ItemCat;
  filas: ItemCat[];
  esAdmin: boolean;
  ocupado: boolean;
  accion: (c: Record<string, unknown>) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState(item.nombre);
  const [hacia, setHacia] = useState("");
  useEffect(() => { setNombre(item.nombre); }, [item.nombre]);
  const cambiado = nombre.trim() !== item.nombre && nombre.trim() !== "";

  return (
    <tr className={`border-b border-[#F1F5F9] align-middle ${item.activo ? "" : "bg-[#FAFBFC]"}`}>
      <td className="py-2 pr-3">
        <label htmlFor={`cat-${item.id}`} className="sr-only">Nombre</label>
        <input
          id={`cat-${item.id}`} value={nombre} onChange={(e) => setNombre(e.target.value.toUpperCase())}
          className={`w-full max-w-[280px] rounded-lg border px-2 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8] ${
            cambiado ? "border-[#1D58D8] bg-[#F6F9FE]" : "border-transparent hover:border-[#DCE8FA]"
          } ${item.activo ? "text-[#0E245E]" : "text-[#94A3B8] line-through"}`}
        />
      </td>
      <td className="py-2 pr-3 text-right font-cifra text-[#47597A]">{item.usos}</td>
      <td className="py-2 pr-3">
        <span className={`rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold ${
          item.activo ? "border-[#BFE0CC] bg-[#DCEEE3] text-[#146138]" : "border-[#D8DEE9] bg-[#F1F3F7] text-[#47597A]"
        }`}>
          {item.activo ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td className="py-2 pr-3">
        {esAdmin && item.usos > 0 && (
          <div className="flex items-center gap-1.5">
            <label htmlFor={`fus-${item.id}`} className="sr-only">Fusionar con</label>
            <select
              id={`fus-${item.id}`} value={hacia} onChange={(e) => setHacia(e.target.value)}
              className="max-w-[190px] rounded-lg border border-[#DCE8FA] px-2 py-1.5 text-[12px] outline-none focus:border-[#1D58D8]"
            >
              <option value="">—</option>
              {filas.filter((x) => x.id !== item.id).map((x) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </select>
            <button
              type="button" disabled={!hacia || ocupado}
              onClick={() => accion({ accion: "FUSIONAR", id: item.id, haciaId: hacia })}
              className="rounded-lg border border-[#DCE8FA] px-2 py-1.5 text-[12px] font-semibold text-[#47597A] transition hover:border-[#94A3B8] disabled:cursor-not-allowed disabled:text-[#C7CDE0]"
            >
              Fusionar
            </button>
          </div>
        )}
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {cambiado && (
            <button
              type="button" disabled={ocupado}
              onClick={() => accion({ accion: "RENOMBRAR", id: item.id, nombre: nombre.trim() })}
              className="rounded-lg bg-[#1D58D8] px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1747B0]"
            >
              Guardar
            </button>
          )}
          {!cambiado && (
            <button
              type="button" disabled={ocupado}
              onClick={() => accion({ accion: item.activo ? "DESACTIVAR" : "ACTIVAR", id: item.id })}
              className="rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
            >
              {item.activo ? "Desactivar" : "Activar"}
            </button>
          )}
          {esAdmin && item.usos === 0 && !cambiado && (
            <button
              type="button" disabled={ocupado}
              onClick={() => accion({ accion: "ELIMINAR", id: item.id })}
              title="Se puede eliminar porque no tiene registros asociados"
              className="rounded-lg border border-[#FCA5A5] px-2.5 py-1.5 text-[12px] font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2]"
            >
              Eliminar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------------
   PANEL PARA CLASIFICAR EN LOTE

   217 glosas sin causal, pero solo 122 redacciones distintas. Clasificar
   una por una seria teclear lo mismo 217 veces. Aqui se clasifica el texto
   y se aplica a todas sus filas de un golpe. Ordenado por plata, para que
   lo que mas pesa se resuelva primero.
   --------------------------------------------------------------------- */
function PanelClasificar({
  filas, causales, guardando, onCerrar, onAplicar,
}: {
  filas: [string, { n: number; valor: number }][];
  causales: Causal[];
  guardando: string | null;
  onCerrar: () => void;
  onAplicar: (texto: string, codigo: string) => Promise<boolean>;
}) {
  const [elegido, setElegido] = useState<Record<string, string>>({});
  const totalFilas = filas.reduce((a, [, v]) => a + v.n, 0);
  const totalValor = filas.reduce((a, [, v]) => a + v.valor, 0);

  return (
    <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[#0E245E]">Clasificar motivos</h3>
          <p className="mt-0.5 max-w-[80ch] text-[12px] text-[#64748B]">
            {totalFilas} glosas sin causal, en {filas.length} redacciones distintas, por{" "}
            <span className="font-cifra font-semibold text-[#0E245E]">{pesos(totalValor)}</span>. Al
            asignar un código se aplica a todas las glosas que tengan ese mismo texto. Están
            ordenadas por plata.
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar el panel"
          className="rounded-lg border border-[#DCE8FA] p-1.5 text-[#47597A] hover:bg-[#F8FAFC]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              <th className="py-2 pr-3">Texto escrito por Facturación</th>
              <th className="py-2 pr-3 text-right">Filas</th>
              <th className="py-2 pr-3 text-right">Valor</th>
              <th className="py-2 pr-3">Causal de la norma</th>
              <th className="w-20 py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map(([texto, v]) => (
              <tr key={texto} className="border-b border-[#F1F5F9] align-top">
                <td className="py-2 pr-3 text-[#2A335A]">{texto}</td>
                <td className="py-2 pr-3 text-right font-cifra text-[#47597A]">{v.n}</td>
                <td className="py-2 pr-3 text-right font-cifra font-semibold text-[#0E245E]">
                  {pesos(v.valor)}
                </td>
                <td className="py-2 pr-3">
                  <label htmlFor={`cl-${texto.slice(0, 20)}`} className="sr-only">Causal para este texto</label>
                  <select
                    id={`cl-${texto.slice(0, 20)}`}
                    value={elegido[texto] || ""}
                    onChange={(e) => setElegido({ ...elegido, [texto]: e.target.value })}
                    className="w-full max-w-[300px] rounded-lg border border-[#DCE8FA] px-2 py-1.5 text-[12px] outline-none focus:border-[#1D58D8]"
                  >
                    <option value="">— elegir —</option>
                    {causales.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.codigo} · {c.familia} · {c.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={!elegido[texto] || guardando !== null}
                    onClick={async () => {
                      const ok = await onAplicar(texto, elegido[texto]);
                      if (ok) setElegido((p) => { const q = { ...p }; delete q[texto]; return q; });
                    }}
                    className="rounded-lg bg-[#1D58D8] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
                  >
                    Aplicar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ====================================================================== */

function FilaGlosa({
  glosa, causales, causal, guardando, guardado, onGuardar, onFicha,
}: {
  glosa: Glosa;
  causales: Causal[];
  causal?: Causal;
  guardando: boolean;
  guardado: boolean;
  onGuardar: (fila: Partial<Glosa>, accion: "CREAR" | "EDITAR") => Promise<boolean>;
  onFicha: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  // Las 109 causales NO se pintan en cada fila: con 150 filas serian 16.000
  // elementos y la pantalla se arrastra. Cada fila pinta solo la causal que
  // tiene, y la lista completa aparece cuando se toca el desplegable.
  const [listaCausales, setListaCausales] = useState(false);
  const [estado, setEstado] = useState(glosa.estado);
  const [aceptado, setAceptado] = useState(
    glosa.valorAceptado == null ? "" : String(Math.round(glosa.valorAceptado)),
  );
  const [nota, setNota] = useState(glosa.notaCredito || "");
  const [obs, setObs] = useState(glosa.observacionInterna || "");
  const [motivo, setMotivo] = useState(glosa.motivoGlosa || "");
  const [codigo, setCodigo] = useState(glosa.motivoCodigo || "");
  const [clase, setClase] = useState(claseDe(glosa));

  const ultimo = useRef({ aceptado: "", nota: "", obs: "", motivo: "" });
  useEffect(() => {
    const a = glosa.valorAceptado == null ? "" : String(Math.round(glosa.valorAceptado));
    setEstado(glosa.estado); setAceptado(a); setNota(glosa.notaCredito || "");
    setObs(glosa.observacionInterna || ""); setMotivo(glosa.motivoGlosa || "");
    setCodigo(glosa.motivoCodigo || ""); setClase(claseDe(glosa));
    ultimo.current = { aceptado: a, nota: glosa.notaCredito || "", obs: glosa.observacionInterna || "", motivo: glosa.motivoGlosa || "" };
  }, [glosa.id, glosa.estado, glosa.valorAceptado, glosa.notaCredito, glosa.observacionInterna,
      glosa.motivoGlosa, glosa.motivoCodigo, glosa.tipoGlosa, glosa.alcance]);

  const enviar = (parcial: Partial<Glosa>) => {
    void onGuardar(
      { ...glosa, estado, notaCredito: nota, observacionInterna: obs, motivoGlosa: motivo, motivoCodigo: codigo, ...parcial },
      "EDITAR",
    );
  };

  const salir = () => {
    const u = ultimo.current;
    if (aceptado === u.aceptado && nota === u.nota && obs === u.obs && motivo === u.motivo) return;
    ultimo.current = { aceptado, nota, obs, motivo };
    enviar({
      valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado),
      notaCredito: nota, observacionInterna: obs, motivoGlosa: motivo,
    });
  };

  const cambiarClase = (id: string) => {
    const c = CLASES.find((x) => x.id === id) || CLASES[0];
    setClase(id);
    enviar({ tipoGlosa: c.tipo, alcance: c.alcance });
  };

  const cambiarEstado = (nuevo: string) => {
    setEstado(nuevo);
    let p = aceptado;
    if (nuevo === "ACEPTADA" && aceptado.trim() === "") p = String(Math.round(glosa.valorGlosado));
    if (nuevo === "NO_ACEPTADA") p = "0";
    if (nuevo === "PENDIENTE") p = "";
    setAceptado(p);
    ultimo.current = { aceptado: p, nota, obs, motivo };
    enviar({ estado: nuevo, valorAceptado: p.trim() === "" ? null : soloNumero(p) });
  };

  const vista: Glosa = { ...glosa, valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado) };
  const pago = clasePago(vista);
  const excede = vista.valorAceptado !== null && glosa.valorGlosado > 0 && vista.valorAceptado > glosa.valorGlosado;

  const celda =
    "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[12.5px] outline-none hover:border-[#DCE8FA] focus:border-[#1D58D8] focus:bg-white";

  return (
    <>
      <tr
        onDoubleClick={onFicha}
        className={`border-b border-[#F1F5F9] align-top transition ${
          guardando ? "bg-[#F6F9FE]" : abierta ? "bg-[#FAFCFF]" : "hover:bg-[#F8FAFC]"
        }`}
      >
        <td className="py-1.5">
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            aria-label={abierta ? "Cerrar la fila" : "Ver la fila completa"}
            className="rounded p-0.5 text-[#94A3B8] hover:bg-[#EEF4FD] hover:text-[#1D58D8]"
          >
            {abierta ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </td>
        <td className="py-1.5 pr-3 font-cifra text-[12.5px] font-semibold text-[#0E245E]">{glosa.factura}</td>
        <td className="py-1.5 pr-3 text-[#47597A]">{glosa.empresa || "—"}</td>
        <td className="py-1.5 pr-3 font-cifra text-[#64748B]">{glosa.anio || "—"}</td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`cla-${glosa.id}`} className="sr-only">Clase de la glosa {glosa.factura}</label>
          <select
            id={`cla-${glosa.id}`} value={clase} onChange={(e) => cambiarClase(e.target.value)}
            className={`rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${
              clase === "" ? "border-[#E2EBF8] bg-white text-[#94A3B8]" : "border-[#DCE8FA] bg-[#F8FAFC] text-[#1A3174]"
            }`}
          >
            {CLASES.map((c) => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
          </select>
        </td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`cau-${glosa.id}`} className="sr-only">Causal de la glosa {glosa.factura}</label>
          <select
            id={`cau-${glosa.id}`}
            value={codigo}
            onFocus={() => setListaCausales(true)}
            onMouseDown={() => setListaCausales(true)}
            onChange={(e) => { setCodigo(e.target.value); enviar({ motivoCodigo: e.target.value }); }}
            title={causal ? `${causal.codigo} · ${causal.familia} · ${causal.nombre}` : "Sin clasificar"}
            className={`max-w-[120px] rounded-[6px] border px-1.5 py-1 font-cifra text-[11.5px] font-semibold outline-none ${
              codigo
                ? "border-[#DCE8FA] bg-[#F8FAFC] text-[#1A3174]"
                : "border-[#F3D9A8] bg-[#FFFBEB] text-[#92400E]"
            }`}
          >
            <option value="">sin causal</option>
            {listaCausales ? (
              causales.map((c) => (
                <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
              ))
            ) : codigo ? (
              <option value={codigo}>{codigo}{causal ? ` · ${causal.nombre}` : ""}</option>
            ) : null}
          </select>
        </td>
        <td className="py-1.5 pr-3 text-right font-cifra text-[#47597A]">{pesos(glosa.valorRadicado)}</td>
        <td className="py-1.5 pr-3 text-right font-cifra font-semibold text-[#0E245E]">{pesos(glosa.valorGlosado)}</td>
        <td className="py-1.5 pr-3 text-right">
          <label htmlFor={`ace-${glosa.id}`} className="sr-only">Valor aceptado de la glosa {glosa.factura}</label>
          <input
            id={`ace-${glosa.id}`} value={aceptado} onChange={(e) => setAceptado(e.target.value)}
            onBlur={salir} inputMode="numeric" placeholder="—"
            className={`${celda} text-right font-cifra`}
          />
          {pago && <span className={`block pr-1.5 text-[10px] font-semibold uppercase ${pago.clase}`}>{pago.texto}</span>}
          {excede && <span className="block pr-1.5 text-[10px] font-semibold text-[#B45309]">⚠ supera lo glosado</span>}
        </td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`est-${glosa.id}`} className="sr-only">Desenlace de la glosa {glosa.factura}</label>
          <select
            id={`est-${glosa.id}`} value={estado} onChange={(e) => cambiarEstado(e.target.value)}
            className={`rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${PASTILLA[estado] || PASTILLA.PENDIENTE}`}
          >
            {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.etiqueta}</option>)}
          </select>
        </td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`nc-${glosa.id}`} className="sr-only">Nota crédito de la glosa {glosa.factura}</label>
          <input id={`nc-${glosa.id}`} value={nota} onChange={(e) => setNota(e.target.value)} onBlur={salir}
            placeholder="—" className={`${celda} font-cifra`} />
        </td>
        <td className="py-1.5 pr-3 text-[#64748B]">{glosa.facturador || "—"}</td>
        <td className="py-1.5 text-right">
          {guardando && <Loader2 className="inline h-3.5 w-3.5 animate-spin text-[#1D58D8]" />}
          {!guardando && guardado && <Check className="inline h-3.5 w-3.5 text-[#21814B]" />}
        </td>
      </tr>

      {/* La fila completa: aqui NO se recorta nada. */}
      {abierta && (
        <tr className="border-b border-[#E2EBF8] bg-[#FAFCFF]">
          <td />
          <td colSpan={12} className="px-1 pb-4 pt-1">
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <label htmlFor={`mot-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                    Observación del motivo · lo que escribió Facturación
                  </label>
                  <textarea
                    id={`mot-${glosa.id}`} value={motivo} rows={3}
                    onChange={(e) => setMotivo(e.target.value)} onBlur={salir}
                    placeholder="Sin motivo escrito"
                    className="w-full resize-y rounded-lg border border-[#DCE8FA] bg-white px-2.5 py-2 text-[12.5px] leading-relaxed text-[#2A335A] outline-none focus:border-[#1D58D8]"
                  />
                </div>
                <div>
                  <label htmlFor={`obg-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                    Observación general · nota interna
                  </label>
                  <textarea
                    id={`obg-${glosa.id}`} value={obs} rows={2}
                    onChange={(e) => setObs(e.target.value)} onBlur={salir}
                    placeholder="Sin observación"
                    className="w-full resize-y rounded-lg border border-[#DCE8FA] bg-white px-2.5 py-2 text-[12.5px] leading-relaxed text-[#2A335A] outline-none focus:border-[#1D58D8]"
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 self-start rounded-lg border border-[#E2EBF8] bg-white p-3">
                <Detalle etiqueta="Causal" valor={causal ? `${causal.codigo} · ${causal.familia}` : "Sin clasificar"} />
                <Detalle etiqueta="Empresa (Excel)" valor={glosa.empresaOriginal || glosa.empresa || "—"} />
                <Detalle etiqueta="Elaboración" valor={fecha(glosa.fechaFactura)} />
                <Detalle etiqueta="Radicación" valor={fecha(glosa.fechaRadicacion)} />
                <Detalle etiqueta="Facturador" valor={glosa.facturador || "—"} />
                <Detalle etiqueta="Responsable" valor={glosa.responsableAceptacion || "—"} />
                {causal && (
                  <div className="col-span-2">
                    <dt className="eb-label text-[10px] text-[#94A3B8]">Qué dice la norma</dt>
                    <dd className="mt-0.5 text-[12px] leading-relaxed text-[#47597A]">{causal.nombre}</dd>
                  </div>
                )}
              </dl>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detalle({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="eb-label text-[10px] text-[#94A3B8]">{etiqueta}</dt>
      <dd className="mt-0.5 truncate text-[12.5px] font-medium text-[#0E245E]" title={valor}>{valor}</dd>
    </div>
  );
}

/* ====================================================================== */

function FichaFactura({
  factura, glosas, causalPorCodigo, onCerrar,
}: {
  factura: string;
  glosas: Glosa[];
  causalPorCodigo: Record<string, Causal>;
  onCerrar: () => void;
}) {
  const base = glosas[0];
  const totalGlosado = glosas.reduce((a, g) => a + (g.valorGlosado || 0), 0);
  const totalAceptado = glosas.reduce((a, g) => a + (g.valorAceptado ?? 0), 0);
  const sinResolver = glosas.filter((g) => g.estado === "PENDIENTE");
  const excede = base.valorRadicado > 0 && totalGlosado > base.valorRadicado;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label={`Factura ${factura}`}>
      <div className="max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#E2EBF8] px-5 py-4">
          <div className="min-w-0">
            <p className="eb-label text-[10.5px] text-[#64748B]">
              {base.empresa}{base.facturador ? ` · ${base.facturador}` : ""}
            </p>
            <p className="mt-1 font-cifra text-[24px] font-bold leading-none text-[#0E245E]">{factura}</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded-lg border border-[#DCE8FA] p-1.5 text-[#47597A] transition hover:bg-[#F8FAFC]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-[#E2EBF8] px-5 py-4 sm:grid-cols-4">
          <Dato etiqueta="Radicado" valor={pesos(base.valorRadicado)} />
          <Dato etiqueta="Glosado" valor={pesos(totalGlosado)} alerta={excede} />
          <Dato etiqueta="Aceptado" valor={pesos(totalAceptado)} />
          <Dato etiqueta="Glosas" valor={`${glosas.length} · ${sinResolver.length} sin resolver`} />
        </div>

        {excede && (
          <div className="flex items-start gap-2 border-b border-[#E2EBF8] bg-[#FFFBEB] px-5 py-2.5 text-[12px] font-semibold text-[#B45309]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lo glosado supera el valor radicado de la factura. Verifícalo antes de cerrar.
          </div>
        )}

        <div className="px-5 py-4">
          <p className="eb-label mb-2 text-[10.5px] text-[#64748B]">Glosas de esta factura</p>
          <div className="divide-y divide-[#F1F5F9]">
            {glosas.map((g) => {
              const c = clasePago(g);
              const ca = causalPorCodigo[g.motivoCodigo];
              return (
                <div key={g.id} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`rounded-[6px] border px-1.5 py-0.5 text-[10.5px] font-semibold ${PASTILLA[g.estado] || PASTILLA.PENDIENTE}`}>
                      {ETIQUETA[g.estado] || g.estado}
                    </span>
                    <span className="font-cifra text-[11px] font-semibold text-[#47597A]">
                      {ca ? `${ca.codigo} · ${ca.familia}` : "sin causal"}
                    </span>
                    <span className="ml-auto font-cifra text-[13px] font-semibold text-[#0E245E]">{pesos(g.valorGlosado)}</span>
                    {c && <span className={`text-[10.5px] font-semibold uppercase ${c.clase}`}>{c.texto}</span>}
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#47597A]">
                    {g.motivoGlosa || "Sin motivo escrito"}
                  </p>
                  {g.observacionInterna && (
                    <p className="mt-1 text-[12px] italic leading-relaxed text-[#64748B]">{g.observacionInterna}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] text-[#64748B]">
            Para cambiar algo, ciérrala y edítalo en la cuadrícula.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="eb-label text-[10px] text-[#94A3B8]">{etiqueta}</p>
      <p className={`mt-0.5 font-cifra text-[14px] font-semibold ${alerta ? "text-[#B91C1C]" : "text-[#0E245E]"}`}>
        {valor}
      </p>
    </div>
  );
}

/* ====================================================================== */

function ModalNueva({
  causales, guardando, onCerrar, onGuardar,
}: {
  causales: Causal[];
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (fila: Partial<Glosa>) => void;
}) {
  const [f, setF] = useState({
    factura: "", empresa: "", clase: "", motivoCodigo: "", motivoGlosa: "",
    valorGlosado: "", observacionInterna: "", notaCredito: "", facturador: "", estado: "PENDIENTE",
  });
  const completo = f.factura.trim() !== "" && (f.motivoGlosa.trim() !== "" || f.motivoCodigo !== "");
  const campo = "w-full rounded-lg border border-[#DCE8FA] px-2.5 py-2 text-[12.5px] outline-none focus:border-[#1D58D8]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label="Registrar glosa">
      <div className="max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E2EBF8] px-5 py-3.5">
          <p className="text-[15px] font-bold text-[#0E245E]">Registrar glosa</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#47597A] transition hover:bg-[#F1F5F9]"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 px-5 py-4 sm:grid-cols-2">
          <Campo id="nf" etiqueta="Número de factura">
            <input id="nf" value={f.factura} onChange={(e) => setF({ ...f, factura: e.target.value.toUpperCase() })}
              placeholder="FCOE00000" className={`${campo} font-cifra`} />
          </Campo>
          <Campo id="emp" etiqueta="Empresa">
            <input id="emp" list="cat-empresas" value={f.empresa}
              onChange={(e) => setF({ ...f, empresa: e.target.value.toUpperCase() })}
              placeholder="Elige una o escribe la nueva" className={campo} />
          </Campo>
          <Campo id="clase" etiqueta="Clase">
            <select id="clase" value={f.clase} onChange={(e) => setF({ ...f, clase: e.target.value })} className={campo}>
              {CLASES.map((c) => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
            </select>
          </Campo>
          <Campo id="val" etiqueta="Valor glosado">
            <input id="val" value={f.valorGlosado} onChange={(e) => setF({ ...f, valorGlosado: e.target.value })}
              inputMode="numeric" placeholder="0" className={`${campo} font-cifra`} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="cau" etiqueta="Causal (Resolución 2284)">
              <select id="cau" value={f.motivoCodigo} onChange={(e) => setF({ ...f, motivoCodigo: e.target.value })} className={campo}>
                <option value="">— sin clasificar —</option>
                {causales.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.familia} · {c.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <Campo id="mot" etiqueta="Observación del motivo">
              <textarea id="mot" rows={2} value={f.motivoGlosa} onChange={(e) => setF({ ...f, motivoGlosa: e.target.value })}
                placeholder="Lo que dice la EPS, tal cual" className={`${campo} resize-y leading-relaxed`} />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <Campo id="obs2" etiqueta="Observación general">
              <textarea id="obs2" rows={2} value={f.observacionInterna}
                onChange={(e) => setF({ ...f, observacionInterna: e.target.value })}
                placeholder="Nota interna" className={`${campo} resize-y leading-relaxed`} />
            </Campo>
          </div>
          <Campo id="fac" etiqueta="Facturador">
            <input id="fac" list="cat-responsables" value={f.facturador}
              onChange={(e) => setF({ ...f, facturador: e.target.value.toUpperCase() })} className={campo} />
          </Campo>
          <Campo id="nc2" etiqueta="Nota crédito">
            <input id="nc2" value={f.notaCredito} onChange={(e) => setF({ ...f, notaCredito: e.target.value })}
              placeholder="N/A" className={`${campo} font-cifra`} />
          </Campo>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#E2EBF8] px-5 py-3.5">
          <button type="button" onClick={onCerrar}
            className="rounded-lg border border-[#DCE8FA] px-3.5 py-2 text-[12.5px] font-semibold text-[#47597A] transition hover:bg-[#F8FAFC]">
            Cancelar
          </button>
          <button
            type="button" disabled={!completo || guardando}
            onClick={() => {
              const c = CLASES.find((x) => x.id === f.clase) || CLASES[0];
              onGuardar({ ...f, tipoGlosa: c.tipo, alcance: c.alcance, valorGlosado: soloNumero(f.valorGlosado), valorAceptado: null });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
          >
            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
      <label htmlFor={id} className="eb-label mb-1 block text-[10px] text-[#94A3B8]">{etiqueta}</label>
      {children}
    </div>
  );
}
