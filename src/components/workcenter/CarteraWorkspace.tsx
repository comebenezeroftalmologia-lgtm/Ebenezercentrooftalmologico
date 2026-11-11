"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Tags,
  Upload,
  Users,
  X,
} from "lucide-react";

/* ---------------------------------------------------------------------
   MESA DE TRABAJO DE CARTERA — GLOSAS Y DEVOLUCIONES
   Actualizado con catálogo normativo Res. 2284 (FA, TA, SO, AU, CO),
   unificación de entidades por NIT, validación estricta de Nota Crédito
   e importación/exportación Excel.
   --------------------------------------------------------------------- */

export type Glosa = {
  id: string;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  nit?: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaNotificacionGlosa?: string;
  anio: string;
  valorFacturado?: number;
  valorRadicado: number;
  valorGlosado: number;
  valorAceptado: number | null;
  causaNormativa?: string;
  motivoCodigo: string;
  motivoGlosa: string;
  observacionInterna: string;
  notaCredito: string;
  facturador: string;
  responsableAceptacion: string;
  responsableRespuesta?: string;
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

export const ESTADOS = [
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

/* ---------------------------------------------------------------------
   CAUSAS PRINCIPALES DE GLOSAS SEGÚN LA NORMA (RES. 2284 / DEC. 4747)
   --------------------------------------------------------------------- */
export const CAUSAS_NORMATIVAS = [
  {
    codigo: "FA",
    nombre: "Facturación",
    descripcion: "Diferencias en cantidades de servicios, errores administrativos o copagos mal calculados.",
    color: "#2563EB",
    badgeBg: "#EFF6FF",
    badgeBorder: "#BFDBFE",
    badgeText: "#1D4ED8",
  },
  {
    codigo: "TA",
    nombre: "Tarifas",
    descripcion: "Diferencias entre los valores cobrados y los precios pactados en el contrato o fijados por ley.",
    color: "#1D4ED8",
    badgeBg: "#EEF2FF",
    badgeBorder: "#C7D2FE",
    badgeText: "#1E40AF",
  },
  {
    codigo: "SO",
    nombre: "Soportes",
    descripcion: "Inconsistencia, enmendadura o ausencia parcial/total de los documentos requeridos (ej. historia clínica).",
    color: "#059669",
    badgeBg: "#ECFDF5",
    badgeBorder: "#A7F3D0",
    badgeText: "#065F46",
  },
  {
    codigo: "AU",
    nombre: "Autorizaciones",
    descripcion: "Servicios prestados sin el debido aval o número de autorización acordado con la ERP.",
    color: "#D97706",
    badgeBg: "#FFFBEB",
    badgeBorder: "#FDE68A",
    badgeText: "#92400E",
  },
  {
    codigo: "CO",
    nombre: "Cobertura",
    descripcion: "Tecnologías o servicios prestados que no corresponden al Plan de Beneficios (PBS) a cargo de esa entidad.",
    color: "#7C3AED",
    badgeBg: "#F5F3FF",
    badgeBorder: "#DDD6FE",
    badgeText: "#5B21B6",
  },
];

export function causaNormativaDe(codigo: string) {
  const c = String(codigo || "").trim().toUpperCase().slice(0, 2);
  return CAUSAS_NORMATIVAS.find((x) => x.codigo === c) || null;
}

/* ---------------------------------------------------------------------
   CATÁLOGO CANÓNICO DE NITS PARA UNIFICAR EMPRESAS DUPLICADAS
   --------------------------------------------------------------------- */
export const CATALOGO_NITS_EMPRESAS: Record<string, { nit: string; nombreOficial: string }> = {
  "MUTUAL SER": { nit: "806.008.394", nombreOficial: "MUTUAL SER EPS" },
  "MUTUAL SER EPS": { nit: "806.008.394", nombreOficial: "MUTUAL SER EPS" },
  "MUTUAL SER EPS-S S.A.S.": { nit: "806.008.394", nombreOficial: "MUTUAL SER EPS" },
  "MUTUAL SER EVENTO": { nit: "806.008.394", nombreOficial: "MUTUAL SER EPS" },
  "MUTUAL SER CAPITA": { nit: "806.008.394", nombreOficial: "MUTUAL SER EPS" },
  "EPS SURA": { nit: "800.088.702", nombreOficial: "EPS SURA" },
  "SURA": { nit: "800.088.702", nombreOficial: "EPS SURA" },
  "EPS SURAMERICANA": { nit: "800.088.702", nombreOficial: "EPS SURA" },
  "SEGUROS DE VIDA SURAMERICANA": { nit: "890.903.407", nombreOficial: "SURAMERICANA SEGUROS" },
  "NUEVA EPS": { nit: "900.156.264", nombreOficial: "NUEVA EPS" },
  "NUEVA EPS S.A.": { nit: "900.156.264", nombreOficial: "NUEVA EPS" },
  "COOSALUD": { nit: "900.226.703", nombreOficial: "COOSALUD EPS" },
  "COOSALUD EPS": { nit: "900.226.703", nombreOficial: "COOSALUD EPS" },
  "COLSANITAS": { nit: "800.251.440", nombreOficial: "COLSANITAS" },
  "SANITAS": { nit: "800.251.440", nombreOficial: "EPS SANITAS" },
  "EPS SANITAS": { nit: "800.251.440", nombreOficial: "EPS SANITAS" },
  "MEDPLUS": { nit: "800.157.174", nombreOficial: "MEDPLUS" },
  "ALLIANZ": { nit: "860.026.182", nombreOficial: "ALLIANZ SEGUROS" },
  "ALLIANZ SEGUROS": { nit: "860.026.182", nombreOficial: "ALLIANZ SEGUROS" },
  "ECOPETROL": { nit: "899.999.068", nombreOficial: "ECOPETROL" },
  "AXA COLPATRIA": { nit: "860.002.184", nombreOficial: "AXA COLPATRIA" },
  "SEGUROS BOLIVAR": { nit: "860.002.503", nombreOficial: "SEGUROS BOLIVAR" },
  "ASMET SALUD": { nit: "900.672.637", nombreOficial: "ASMET SALUD EPS" },
  "SALUD TOTAL": { nit: "800.130.907", nombreOficial: "SALUD TOTAL EPS" },
  "FAMISANAR": { nit: "830.003.564", nombreOficial: "EPS FAMISANAR" },
  "COMPENSAR": { nit: "860.066.942", nombreOficial: "COMPENSAR EPS" },
  "ADRES": { nit: "901.037.950", nombreOficial: "ADRES" },
};

export function normalizarEmpresaYNit(empresaNombre: string): { nit: string; nombre: string } {
  const clean = String(empresaNombre || "").trim().toUpperCase();
  if (!clean) return { nit: "S/N", nombre: "SIN EMPRESA" };
  for (const [k, v] of Object.entries(CATALOGO_NITS_EMPRESAS)) {
    if (clean === k || clean.includes(k) || k.includes(clean)) {
      return { nit: v.nit, nombre: v.nombreOficial };
    }
  }
  return { nit: "S/N", nombre: clean };
}

export function esNotaCreditoValida(nc: string): boolean {
  const s = String(nc || "").trim().toUpperCase();
  if (!s) return false;
  if (s === "N/A" || s === "NA" || s === "NO APLICA" || s === "NO") return true;
  return /\d/.test(s);
}

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
const MESES = [
  ["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"], ["04", "Abril"],
  ["05", "Mayo"], ["06", "Junio"], ["07", "Julio"], ["08", "Agosto"],
  ["09", "Septiembre"], ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
];

const mesDe = (g: { fechaFactura: string }) =>
  g.fechaFactura && g.fechaFactura.length >= 7 ? g.fechaFactura.slice(5, 7) : "";

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
  const [fMes, setFMes] = useState("");
  const [fFacturador, setFFacturador] = useState("");
  const [fFamilia, setFFamilia] = useState("");
  const [fCausaNorma, setFCausaNorma] = useState("");
  const [soloSinCausal, setSoloSinCausal] = useState(false);

  const [vista, setVista] = useState<"cuadricula" | "resumen">("cuadricula");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [fichaDe, setFichaDe] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [clasificarAbierto, setClasificarAbierto] = useState(false);
  const [catalogosAbierto, setCatalogosAbierto] = useState(false);
  const [anularAbierto, setAnularAbierto] = useState(false);
  const [importarAbierto, setImportarAbierto] = useState(false);

  const traer = useCallback(async () => {
    setCargando(true);
    setFallo("");
    try {
      const r = await fetch("/api/cartera/registros", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      // Enriquecer registros con unificacion de NIT y causas
      const rawGlosas = (j.glosas || []) as Glosa[];
      const procesadas = rawGlosas.map((g) => {
        const u = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
        const cNorm = causaNormativaDe(g.motivoCodigo);
        return {
          ...g,
          empresa: u.nombre,
          nit: u.nit,
          causaNormativa: cNorm ? cNorm.codigo : "",
        };
      });
      setGlosas(procesadas);
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
    window.setTimeout(() => setAviso(""), 4500);
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

  const empresasUnificadas = useMemo(() => {
    const mapa = new Map<string, { nombre: string; nit: string }>();
    for (const g of glosas) {
      const info = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
      if (!mapa.has(info.nombre)) {
        mapa.set(info.nombre, info);
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [glosas]);

  const facturadoresEnDatos = useMemo(
    () => Array.from(new Set(glosas.map((g) => g.facturador || g.responsableRespuesta).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "es")),
    [glosas],
  );

  const causalPorCodigo = useMemo(() => {
    const m: Record<string, Causal> = {};
    for (const c of cat.causales) m[c.codigo] = c;
    return m;
  }, [cat.causales]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return glosas.filter((g) => {
      if (fEstado === "SIN_RESOLVER" && g.estado !== "PENDIENTE") return false;
      if (fEstado !== "TODAS" && fEstado !== "SIN_RESOLVER" && g.estado !== fEstado) return false;
      if (fEmpresa && g.empresa !== fEmpresa) return false;
      if (fAnio && g.anio !== fAnio) return false;
      if (fMes && mesDe(g) !== fMes) return false;
      if (fFacturador && g.facturador !== fFacturador && g.responsableRespuesta !== fFacturador) return false;
      if (soloSinCausal && g.motivoCodigo) return false;
      if (fCausaNorma) {
        const cN = g.causaNormativa || g.motivoCodigo.slice(0, 2).toUpperCase();
        if (cN !== fCausaNorma) return false;
      }
      if (fFamilia) {
        const c = causalPorCodigo[g.motivoCodigo];
        if (!c || c.familia !== fFamilia) return false;
      }
      if (!q) return true;
      return (
        g.factura.toUpperCase().includes(q) ||
        g.empresa.toUpperCase().includes(q) ||
        (g.nit || "").toUpperCase().includes(q) ||
        (g.motivoGlosa || "").toUpperCase().includes(q) ||
        (g.motivoCodigo || "").toUpperCase().includes(q) ||
        (g.notaCredito || "").toUpperCase().includes(q) ||
        (g.observacionInterna || "").toUpperCase().includes(q) ||
        (g.responsableRespuesta || "").toUpperCase().includes(q)
      );
    });
  }, [
    glosas, busqueda, fEstado, fEmpresa, fAnio, fMes, fFacturador, fFamilia, fCausaNorma, soloSinCausal, causalPorCodigo,
  ]);

  const sinFecha = useMemo(() => glosas.filter((g) => !mesDe(g)).length, [glosas]);

  const m = useMemo(() => {
    let glosado = 0, aceptado = 0, sinResolver = 0, valorSinResolver = 0, sinCausal = 0;
    const porFamilia: Record<string, number> = {};
    const porEmpresa: Record<string, number> = {};
    const porCausaNorma: Record<string, number> = {};
    const porCausal: Record<string, number> = {};
    const porAnio: Record<string, number> = {};
    const porFacturador: Record<string, number> = {};
    const porEstado: Record<string, number> = {};
    const porClase: Record<string, number> = {};

    for (const g of visibles) {
      glosado += g.valorGlosado || 0;
      if (g.valorAceptado != null) aceptado += g.valorAceptado;
      if (g.estado === "PENDIENTE") { sinResolver++; valorSinResolver += g.valorGlosado || 0; }
      if (!g.motivoCodigo) sinCausal++;
      const v = g.valorGlosado || 0;

      const fam = causalPorCodigo[g.motivoCodigo]?.familia || "Sin clasificar";
      porFamilia[fam] = (porFamilia[fam] || 0) + v;

      const cN = g.causaNormativa || (g.motivoCodigo ? g.motivoCodigo.slice(0, 2).toUpperCase() : "OTRA");
      porCausaNorma[cN] = (porCausaNorma[cN] || 0) + v;

      if (g.empresa) porEmpresa[g.empresa] = (porEmpresa[g.empresa] || 0) + v;
      if (g.motivoCodigo) porCausal[g.motivoCodigo] = (porCausal[g.motivoCodigo] || 0) + v;
      porAnio[g.anio || "sin año"] = (porAnio[g.anio || "sin año"] || 0) + v;
      const resp = g.responsableRespuesta || g.facturador || "Sin asignar";
      porFacturador[resp] = (porFacturador[resp] || 0) + v;
      porEstado[g.estado] = (porEstado[g.estado] || 0) + v;
      const cl = CLASES.find((c) => c.id === claseDe(g))?.etiqueta || "— sin definir —";
      porClase[cl] = (porClase[cl] || 0) + v;
    }
    const orden = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
    return {
      glosado, aceptado, sinResolver, valorSinResolver, sinCausal,
      familias: orden(porFamilia),
      causasNorma: orden(porCausaNorma),
      empresas: orden(porEmpresa),
      causales: orden(porCausal),
      anios: Object.entries(porAnio).sort((a, b) => a[0].localeCompare(b[0])),
      facturadores: orden(porFacturador),
      estados: orden(porEstado),
      clases: orden(porClase),
    };
  }, [visibles, causalPorCodigo]);

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
    setFEmpresa(""); setFAnio(""); setFMes(""); setFFacturador(""); setFFamilia(""); setFCausaNorma("");
    setSoloSinCausal(false); setBusqueda("");
  };
  const hayFiltro = !!(fEmpresa || fAnio || fMes || fFacturador || fFamilia || fCausaNorma || soloSinCausal || busqueda);

  /* Exportar a CSV compatible con Excel */
  const exportarAExcel = () => {
    const headers = [
      "Factura",
      "NIT",
      "Empresa Unificada",
      "Empresa Original",
      "Año",
      "Fecha Factura",
      "Fecha Radicacion",
      "Fecha Notificacion Glosa",
      "Valor Facturado",
      "Valor Glosado",
      "Valor Aceptado",
      "Desenlace (Estado)",
      "Causa Normativa",
      "Codigo Causal",
      "Motivo Glosa",
      "Nota Credito",
      "Responsable Respuesta",
      "Facturador",
      "Observacion Interna",
    ];

    const rows = visibles.map((g) => [
      g.factura,
      g.nit || "S/N",
      g.empresa,
      g.empresaOriginal || g.empresa,
      g.anio || "",
      g.fechaFactura || "",
      g.fechaRadicacion || "",
      g.fechaNotificacionGlosa || "",
      g.valorFacturado || g.valorRadicado || 0,
      g.valorGlosado || 0,
      g.valorAceptado ?? "",
      ETIQUETA[g.estado] || g.estado,
      g.causaNormativa || "",
      g.motivoCodigo || "",
      `"${(g.motivoGlosa || "").replace(/"/g, '""')}"`,
      g.notaCredito || "N/A",
      g.responsableRespuesta || g.responsableAceptacion || "",
      g.facturador || "",
      `"${(g.observacionInterna || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ebenezer_workcenter_glosas_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    avisar("Exportación a Excel completada con éxito.");
  };

  const sel =
    "rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 text-[12.5px] text-[#47597A] outline-none focus:border-[#1D58D8]";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-10">
      <datalist id="cat-empresas">
        {empresasUnificadas.map((x) => (
          <option key={x.nombre} value={x.nombre}>
            {x.nombre} (NIT: {x.nit})
          </option>
        ))}
      </datalist>
      <datalist id="cat-motivos">{cat.motivos.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="cat-responsables">{cat.responsables.map((x) => <option key={x} value={x} />)}</datalist>

      {/* ---------- ENCABEZADO CON ACCIONES ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eb-label text-[11px] text-[#64748B]">WorkCenter · Cartera y Facturación</p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight text-[#0E245E]">
            Mesa de Trabajo · Glosas y Facturación
          </h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Gestión oficial bajo la Resolución 2284 (FA, TA, SO, AU, CO) · Unificación de entidades por NIT.
            {usuario.esAdmin ? " Modo Administrador activo." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Anular Factura */}
          <button
            type="button"
            onClick={() => setAnularAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-1.5 text-[12.5px] font-semibold text-[#BE123C] transition hover:bg-[#FFE4E6]"
            title="Anular una factura con motivo y trazabilidad (ej. FCOE0000001)"
          >
            <Ban className="h-3.5 w-3.5" />
            Anular Factura
          </button>

          {/* Botón Importar Excel */}
          <button
            type="button"
            onClick={() => setImportarAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
            title="Importar glosas masivamente desde Excel o CSV"
          >
            <Upload className="h-3.5 w-3.5 text-[#1D58D8]" />
            Importar Excel
          </button>

          {/* Botón Exportar Excel */}
          <button
            type="button"
            onClick={exportarAExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
            title="Exportar la vista actual con todas las columnas a Excel"
          >
            <Download className="h-3.5 w-3.5 text-[#059669]" />
            Exportar Excel
          </button>

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
            <Users className="h-3.5 w-3.5" /> Entidades y Responsables
          </button>
          <button
            type="button"
            onClick={() => setNuevaAbierta(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-xs transition hover:bg-[#1747B0]"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva glosa
          </button>
        </div>
      </div>

      {/* ---------- FILTROS SUPERIORES ---------- */}
      <div className="rounded-[14px] border border-[#E2EBF8] bg-white px-4 py-3 shadow-[0_1px_6px_rgba(14,36,94,0.03)] space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="f-est" className="sr-only">Filtrar por desenlace</label>
          <select id="f-est" value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={sel}>
            <option value="SIN_RESOLVER">Sin resolver</option>
            <option value="TODAS">Todos los desenlaces</option>
            {ESTADOS.filter((e) => e.id !== "PENDIENTE").map((e) => (
              <option key={e.id} value={e.id}>{e.etiqueta}</option>
            ))}
          </select>

          {/* Filtro Empresa con NIT */}
          <label htmlFor="f-emp" className="sr-only">Filtrar por empresa</label>
          <select id="f-emp" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} className={sel}>
            <option value="">Todas las empresas (Unificadas)</option>
            {empresasUnificadas.map((x) => (
              <option key={x.nombre} value={x.nombre}>
                {x.nombre} {x.nit !== "S/N" ? `(NIT: ${x.nit})` : ""}
              </option>
            ))}
          </select>

          {/* Filtro Causa Normativa (FA, TA, SO, AU, CO) */}
          <label htmlFor="f-cn" className="sr-only">Filtrar por causa normativa</label>
          <select id="f-cn" value={fCausaNorma} onChange={(e) => setFCausaNorma(e.target.value)} className={sel}>
            <option value="">Todas las causas normativas</option>
            {CAUSAS_NORMATIVAS.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>

          <label htmlFor="f-anio" className="sr-only">Filtrar por año</label>
          <select id="f-anio" value={fAnio} onChange={(e) => setFAnio(e.target.value)} className={sel}>
            <option value="">Todos los años</option>
            {cat.anios.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>

          <label htmlFor="f-mes" className="sr-only">Filtrar por mes</label>
          <select id="f-mes" value={fMes} onChange={(e) => setFMes(e.target.value)} className={sel}>
            <option value="">Todos los meses</option>
            {MESES.map(([num, nom]) => (
              <option key={num} value={num}>{nom}</option>
            ))}
          </select>

          <label htmlFor="f-fact" className="sr-only">Filtrar por responsable</label>
          <select id="f-fact" value={fFacturador} onChange={(e) => setFFacturador(e.target.value)} className={sel}>
            <option value="">Todos los responsables</option>
            {facturadoresEnDatos.map((x) => <option key={x} value={x}>{x}</option>)}
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
              placeholder="Factura, NIT, motivo, NC, responsable…"
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

        {/* Acceso rápido a las 5 causas normativas */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#F1F5F9] text-[11px]">
          <span className="text-[#64748B] font-semibold mr-1">Causas de la norma:</span>
          {CAUSAS_NORMATIVAS.map((c) => {
            const activa = fCausaNorma === c.codigo;
            return (
              <button
                key={c.codigo}
                type="button"
                onClick={() => setFCausaNorma(activa ? "" : c.codigo)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold transition border ${
                  activa
                    ? "bg-[#0E245E] text-white border-[#0E245E]"
                    : "hover:bg-slate-50 text-[#0F172A]"
                }`}
                style={{
                  backgroundColor: activa ? "#0E245E" : c.badgeBg,
                  borderColor: activa ? "#0E245E" : c.badgeBorder,
                  color: activa ? "#FFFFFF" : c.badgeText,
                }}
                title={c.descripcion}
              >
                <span>{c.codigo}</span>
                <span>·</span>
                <span>{c.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- VISTAS ---------- */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Pestana activa={vista === "cuadricula"} onClick={() => setVista("cuadricula")}>
          Cuadrícula operativa
        </Pestana>
        <Pestana activa={vista === "resumen"} onClick={() => setVista("resumen")}>
          Resumen analítico
        </Pestana>
        <span className="ml-2 font-cifra text-[11.5px] text-[#94A3B8]">
          {visibles.length} de {glosas.length} glosas · {pesos(m.glosado)}
        </span>
        {fMes && sinFecha > 0 && (
          <span className="text-[11.5px] text-[#B45309]">
            {sinFecha} glosas quedan fuera: no tienen fecha de elaboración.
          </span>
        )}
      </div>

      {/* ---------- RESUMEN ---------- */}
      {vista === "resumen" && (
        <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)] space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
            <Cifra titulo="Total Glosado" valor={pesos(m.glosado)} pie={`${visibles.length} registros`} />
            <Cifra
              titulo="Sin resolver (Pendientes)"
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
              titulo="Sin causal normativa"
              valor={String(m.sinCausal)}
              pie="pendientes de clasificar"
              acento={m.sinCausal > 0 ? "#B45309" : undefined}
            />
          </div>

          {/* Desglose por Causas Normativas FA, TA, SO, AU, CO */}
          <div className="border-t border-[#F1F5F9] pt-4">
            <p className="eb-label mb-2 text-[11px] font-bold text-[#0E245E]">
              Distribución por Causas de Glosas de la Norma (Res. 2284)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {CAUSAS_NORMATIVAS.map((c) => {
                const monto = m.causasNorma.find(([k]) => k === c.codigo)?.[1] || 0;
                const pct = m.glosado > 0 ? Math.round((monto / m.glosado) * 100) : 0;
                return (
                  <div
                    key={c.codigo}
                    onClick={() => setFCausaNorma(fCausaNorma === c.codigo ? "" : c.codigo)}
                    className="p-3 rounded-xl border transition cursor-pointer hover:shadow-2xs"
                    style={{
                      backgroundColor: fCausaNorma === c.codigo ? "#EFF6FF" : c.badgeBg,
                      borderColor: fCausaNorma === c.codigo ? "#1D58D8" : c.badgeBorder,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs" style={{ color: c.badgeText }}>
                        {c.codigo} · {c.nombre}
                      </span>
                      <span className="text-[11px] font-mono font-bold" style={{ color: c.badgeText }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1 font-mono font-bold text-sm text-[#0E245E]">
                      {pesosCorto(monto)}
                    </div>
                    <p className="mt-1 text-[10.5px] leading-tight text-[#475569] line-clamp-2" title={c.descripcion}>
                      {c.descripcion}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {(m.empresas.length > 0 || m.causales.length > 0) && (
            <div className="grid gap-5 border-t border-[#F1F5F9] pt-4 md:grid-cols-2">
              <Ranking
                titulo="Empresas con más glosa (Unificadas por NIT)"
                filas={m.empresas.slice(0, 8)}
                total={m.glosado}
                onClick={(k) => setFEmpresa(fEmpresa === k ? "" : k)}
                activo={fEmpresa}
              />
              <Ranking
                titulo="Causales específicas más frecuentes"
                filas={m.causales.slice(0, 8)}
                total={m.glosado}
                etiqueta={(k) => `${k} · ${causalPorCodigo[k]?.nombre || ""}`}
              />
            </div>
          )}

          {m.glosado > 0 && (
            <div className="grid gap-5 border-t border-[#F1F5F9] pt-4 md:grid-cols-2">
              <Ranking
                titulo="Por año"
                filas={m.anios}
                total={m.glosado}
                onClick={(k) => setFAnio(fAnio === k ? "" : k)}
                activo={fAnio}
              />
              <Ranking
                titulo="Por responsable de respuesta"
                filas={m.facturadores.slice(0, 8)}
                total={m.glosado}
                onClick={(k) => setFFacturador(fFacturador === k ? "" : k)}
                activo={fFacturador}
              />
              <Ranking
                titulo="Por desenlace"
                filas={m.estados.map(([k, v]) => [ETIQUETA[k] || k, v] as [string, number])}
                total={m.glosado}
              />
              <Ranking titulo="Por clase" filas={m.clases} total={m.glosado} />
            </div>
          )}
        </div>
      )}

      {fallo && (
        <div className="flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-semibold text-[#B91C1C]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No se pudieron traer los datos: {fallo}. La cuadrícula está vacía porque falló la
            consulta, no porque no haya registros.
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

      {/* ---------- CUADRÍCULA OPERATIVA ---------- */}
      {vista === "cuadricula" && (
        <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                  <th className="w-6 py-2" />
                  <th className="py-2 pr-3">Factura</th>
                  <th className="py-2 pr-3">Empresa (NIT)</th>
                  <th className="py-2 pr-3">Año</th>
                  <th className="py-2 pr-3">Causa Norma</th>
                  <th className="py-2 pr-3">Causal Res. 2284</th>
                  <th className="py-2 pr-3 text-right">Facturado</th>
                  <th className="py-2 pr-3 text-right">Glosado</th>
                  <th className="py-2 pr-3 text-right">Aceptado</th>
                  <th className="py-2 pr-3">Desenlace</th>
                  <th className="py-2 pr-3">Nota Crédito *</th>
                  <th className="py-2 pr-3">Responsable Respuesta</th>
                  <th className="w-6 py-2" />
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr><td colSpan={13} className="py-8 text-center text-[#94A3B8]">
                    <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Cargando registros…
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
            <span>* Nota Crédito es obligatoria (Número o N/A). La flecha abre cronología y detalles completos.</span>
          </div>
        </div>
      )}

      {fichaDe && hermanas.length > 0 && (
        <FichaFactura
          factura={fichaDe}
          glosas={hermanas}
          causalPorCodigo={causalPorCodigo}
          onCerrar={() => setFichaDe(null)}
        />
      )}

      {/* Modal Nueva Glosa con campos normativos completos */}
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

      {/* Modal Anular Factura */}
      {anularAbierto && (
        <ModalAnularFactura
          onCerrar={() => setAnularAbierto(false)}
          onAnular={async (datos) => {
            const ok = await guardar(datos, "EDITAR", "anular");
            if (ok) {
              avisar(`Factura ${datos.factura} anulada correctamente.`);
              setAnularAbierto(false);
            }
          }}
        />
      )}

      {/* Modal Importar Excel */}
      {importarAbierto && (
        <ModalImportarExcel
          onCerrar={() => setImportarAbierto(false)}
          onImportar={async (filas) => {
            const ok = await guardar(filas as unknown as Partial<Glosa>, "CREAR", "importar-lote");
            if (ok) {
              avisar(`Se importaron ${filas.length} registros exitosamente.`);
              setImportarAbierto(false);
            }
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

/* ======================================================================
   FILA DE GLOSA OPERATIVA
   ====================================================================== */

function FilaGlosa({
  glosa, causales, causal, guardando, guardado, onGuardar, onFicha,
}: {
  glosa: Glosa;
  causales: Causal[];
  causal: Causal | undefined;
  guardando: boolean;
  guardado: boolean;
  onGuardar: (fila: Partial<Glosa>, accion: "EDITAR") => void;
  onFicha: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [codigo, setCodigo] = useState(glosa.motivoCodigo || "");
  const [estado, setEstado] = useState(glosa.estado);
  const [clase, setClase] = useState(claseDe(glosa));
  const [aceptado, setAceptado] = useState(
    glosa.valorAceptado === null || glosa.valorAceptado === undefined ? "" : String(Math.round(glosa.valorAceptado)),
  );
  const [nota, setNota] = useState(glosa.notaCredito || "");
  const [obs, setObs] = useState(glosa.observacionInterna || "");
  const [motivo, setMotivo] = useState(glosa.motivoGlosa || "");
  const [listaCausales, setListaCausales] = useState(false);

  useEffect(() => {
    setCodigo(glosa.motivoCodigo || "");
    setEstado(glosa.estado);
    setClase(claseDe(glosa));
    setAceptado(
      glosa.valorAceptado === null || glosa.valorAceptado === undefined ? "" : String(Math.round(glosa.valorAceptado)),
    );
    setNota(glosa.notaCredito || "");
    setObs(glosa.observacionInterna || "");
    setMotivo(glosa.motivoGlosa || "");
  }, [glosa]);

  const ultimo = useRef({ aceptado, nota, obs, motivo });

  const enviar = (parcial: Partial<Glosa>) => {
    onGuardar({ id: glosa.id, factura: glosa.factura, ...parcial }, "EDITAR");
  };

  const salir = () => {
    const u = ultimo.current;
    if (aceptado === u.aceptado && nota === u.nota && obs === u.obs && motivo === u.motivo) return;
    ultimo.current = { aceptado, nota, obs, motivo };
    enviar({
      valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado),
      notaCredito: nota.trim(),
      observacionInterna: obs,
      motivoGlosa: motivo,
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

  const cNorm = causaNormativaDe(codigo);
  const notaValida = esNotaCreditoValida(nota);
  const pago = clasePago({ ...glosa, valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado) });

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
        <td className="py-1.5 pr-3">
          <div className="font-medium text-[#0F172A]">{glosa.empresa || "—"}</div>
          {glosa.nit && glosa.nit !== "S/N" && (
            <div className="text-[10px] text-[#64748B] font-mono">NIT: {glosa.nit}</div>
          )}
        </td>
        <td className="py-1.5 pr-3 font-cifra text-[#64748B]">{glosa.anio || "—"}</td>

        {/* Causa Normativa (FA, TA, SO, AU, CO) */}
        <td className="py-1.5 pr-3">
          {cNorm ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border"
              style={{
                backgroundColor: cNorm.badgeBg,
                borderColor: cNorm.badgeBorder,
                color: cNorm.badgeText,
              }}
              title={cNorm.descripcion}
            >
              {cNorm.codigo} · {cNorm.nombre}
            </span>
          ) : (
            <span className="text-[11px] text-[#94A3B8] italic">— sin definir —</span>
          )}
        </td>

        {/* Causal específica Res. 2284 */}
        <td className="py-1.5 pr-3">
          <select
            id={`cau-${glosa.id}`}
            value={codigo}
            onFocus={() => setListaCausales(true)}
            onMouseDown={() => setListaCausales(true)}
            onChange={(e) => {
              setCodigo(e.target.value);
              setListaCausales(false);
              enviar({ motivoCodigo: e.target.value });
            }}
            title={causal ? `${causal.codigo} · ${causal.familia} · ${causal.nombre}` : "Sin clasificar"}
            className={`w-[110px] rounded-[6px] border px-1.5 py-1 font-cifra text-[11.5px] font-semibold outline-none ${
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
              <option value={codigo}>{codigo}</option>
            ) : null}
          </select>
        </td>

        {/* Valor Facturado */}
        <td className="py-1.5 pr-3 text-right font-cifra text-[#47597A]">
          {pesos(glosa.valorFacturado || glosa.valorRadicado)}
        </td>

        {/* Valor Glosado */}
        <td className="py-1.5 pr-3 text-right font-cifra font-semibold text-[#0E245E]">
          {pesos(glosa.valorGlosado)}
        </td>

        {/* Valor Aceptado */}
        <td className="py-1.5 pr-3 text-right">
          <input
            id={`ace-${glosa.id}`} value={aceptado} onChange={(e) => setAceptado(e.target.value)}
            onBlur={salir} inputMode="numeric" placeholder="—"
            className={`${celda} text-right font-cifra`}
          />
          {pago && <span className={`block pr-1.5 text-[10px] font-semibold uppercase ${pago.clase}`}>{pago.texto}</span>}
        </td>

        {/* Estado Desenlace */}
        <td className="py-1.5 pr-3">
          <select
            id={`est-${glosa.id}`} value={estado} onChange={(e) => cambiarEstado(e.target.value)}
            className={`rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${PASTILLA[estado] || PASTILLA.PENDIENTE}`}
          >
            {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.etiqueta}</option>)}
          </select>
        </td>

        {/* Nota Crédito (Obligatoria: número o N/A) */}
        <td className="py-1.5 pr-3">
          <div className="relative">
            <input
              id={`nc-${glosa.id}`}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={salir}
              placeholder="N/A o N°"
              className={`${celda} font-cifra font-medium ${
                !notaValida ? "border-red-300 bg-red-50/50 text-red-900" : ""
              }`}
              title={!notaValida ? "Obligatorio: Escribe el consecutivo de la NC o N/A" : ""}
            />
            {!notaValida && (
              <span className="block text-[9.5px] font-bold text-red-600">Requerido</span>
            )}
          </div>
        </td>

        {/* Responsable de Responder */}
        <td className="py-1.5 pr-3 text-[#64748B]">
          {glosa.responsableRespuesta || glosa.responsableAceptacion || glosa.facturador || "—"}
        </td>

        <td className="py-1.5 text-right">
          {guardando && <Loader2 className="inline h-3.5 w-3.5 animate-spin text-[#1D58D8]" />}
          {!guardando && guardado && <Check className="inline h-3.5 w-3.5 text-[#21814B]" />}
        </td>
      </tr>

      {/* Fila expandida con cronología de fechas y datos normativos */}
      {abierta && (
        <tr className="border-b border-[#E2EBF8] bg-[#FAFCFF]">
          <td />
          <td colSpan={12} className="px-1 pb-4 pt-1">
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <label htmlFor={`mot-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                    Observación del motivo · lo que notificó la EPS
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
                    Observación general / respuesta interna
                  </label>
                  <textarea
                    id={`obg-${glosa.id}`} value={obs} rows={2}
                    onChange={(e) => setObs(e.target.value)} onBlur={salir}
                    placeholder="Nota interna"
                    className="w-full resize-y rounded-lg border border-[#DCE8FA] bg-white px-2.5 py-2 text-[12.5px] leading-relaxed text-[#2A335A] outline-none focus:border-[#1D58D8]"
                  />
                </div>
              </div>

              {/* Ficha técnica y cronología de fechas */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 self-start rounded-lg border border-[#E2EBF8] bg-white p-3">
                <Detalle etiqueta="NIT Empresa" valor={glosa.nit || "S/N"} />
                <Detalle etiqueta="Empresa Oficial" valor={glosa.empresa} />
                <Detalle etiqueta="Fecha Factura" valor={fecha(glosa.fechaFactura)} />
                <Detalle etiqueta="Fecha Radicación" valor={fecha(glosa.fechaRadicacion)} />
                <Detalle etiqueta="Fecha Notif. Glosa" valor={fecha(glosa.fechaNotificacionGlosa || glosa.fechaRadicacion)} />
                <Detalle etiqueta="Responsable Respuesta" valor={glosa.responsableRespuesta || glosa.responsableAceptacion || "—"} />
                <Detalle etiqueta="Valor Facturado" valor={pesos(glosa.valorFacturado || glosa.valorRadicado)} />
                <Detalle etiqueta="Nota Crédito" valor={glosa.notaCredito || "N/A"} />
                {causal && (
                  <div className="col-span-2 pt-1 border-t border-[#F1F5F9]">
                    <dt className="eb-label text-[10px] text-[#94A3B8]">Norma técnica ({causal.codigo})</dt>
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

/* ======================================================================
   MODAL PARA ANULAR FACTURA (EJ. FCOE0000001)
   ====================================================================== */

function ModalAnularFactura({
  onCerrar, onAnular,
}: {
  onCerrar: () => void;
  onAnular: (datos: { factura: string; fechaAnulacion: string; motivo: string }) => Promise<void>;
}) {
  const [factura, setFactura] = useState("");
  const [fechaAnulacion, setFechaAnulacion] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("");
  const [anulando, setAnulando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factura.trim()) return;
    setAnulando(true);
    try {
      await onAnular({
        factura: factura.trim().toUpperCase(),
        fechaAnulacion,
        motivo: motivo.trim() || "Anulada por solicitud de Facturación",
      });
    } finally {
      setAnulando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4">
      <div className="w-full max-w-[500px] rounded-[14px] border border-[#FECDD3] bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#FECDD3] bg-[#FFF1F2] px-5 py-3.5">
          <div className="flex items-center gap-2 text-[#BE123C]">
            <Ban className="h-5 w-5" />
            <h3 className="font-bold text-[15px]">Anular Factura</h3>
          </div>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1 text-[#BE123C] hover:bg-[#FFE4E6]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-[12.5px] text-[#475569] leading-relaxed">
            Ingresa el número de la factura que deseas anular. La factura quedará registrada como <strong>ANULADA</strong> con fecha y trazabilidad en el historial.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-[#0E245E] mb-1">
              Número de Factura *
            </label>
            <input
              type="text"
              required
              value={factura}
              onChange={(e) => setFactura(e.target.value.toUpperCase())}
              placeholder="Ej. FCOE0000001"
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm font-mono font-bold text-[#0E245E] uppercase outline-none focus:border-[#BE123C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#0E245E] mb-1">
              Fecha de Anulación
            </label>
            <input
              type="date"
              value={fechaAnulacion}
              onChange={(e) => setFechaAnulacion(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm text-[#0E245E] outline-none focus:border-[#BE123C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#0E245E] mb-1">
              Motivo de Anulación *
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Indica la razón de la anulación (ej. error en copago, factura duplicada, etc.)"
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs text-[#0E245E] outline-none focus:border-[#BE123C] resize-y"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={anulando || !factura.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#BE123C] text-xs font-bold text-white hover:bg-[#9F1239] disabled:opacity-50"
            >
              {anulando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirmar Anulación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================================================================
   MODAL PARA IMPORTAR EXCEL (CON VALIDACIÓN DE CAMPOS OBLIGATORIOS)
   ====================================================================== */

function ModalImportarExcel({
  onCerrar, onImportar,
}: {
  onCerrar: () => void;
  onImportar: (filas: Partial<Glosa>[]) => Promise<void>;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [filasLeidas, setFilasLeidas] = useState<Partial<Glosa>[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file);
    setErrorCarga("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
        if (lines.length <= 1) {
          setErrorCarga("El archivo no contiene filas de datos.");
          return;
        }

        const separador = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
        const headerCols = lines[0].split(separador).map((c) => c.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

        const data: Partial<Glosa>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const rawCols = lines[i].split(separador).map((c) => c.trim().replace(/^"|"$/g, ""));
          if (rawCols.length < 2 || !rawCols[0]) continue;

          // Mapeo inteligente por nombre de columna
          const rowObj: Record<string, string> = {};
          headerCols.forEach((col, idx) => {
            rowObj[col] = rawCols[idx] || "";
          });

          const fact = rowObj["factura"] || rawCols[0] || "";
          const emp = rowObj["empresa"] || rawCols[1] || "";
          const valGlos = soloNumero(rowObj["valorglosado"] || rowObj["glosado"] || rawCols[7] || rawCols[6] || "0");
          const valFact = soloNumero(rowObj["valorfacturado"] || rowObj["facturado"] || rawCols[6] || "0");
          const fFact = rowObj["fechafactura"] || rawCols[4] || "";
          const fRad = rowObj["fecharadicacion"] || rawCols[5] || "";
          const fNotif = rowObj["fechanotificacion"] || rowObj["fechanotificacionglosa"] || rawCols[6] || "";
          const nc = (rowObj["notacredito"] || rowObj["nc"] || rawCols[11] || "N/A").trim();
          const resp = rowObj["responsable"] || rowObj["responsablerespuesta"] || rawCols[12] || "";
          const mot = rowObj["motivo"] || rowObj["motivoglosa"] || rawCols[8] || "";

          data.push({
            factura: fact.toUpperCase(),
            empresa: emp.toUpperCase(),
            valorGlosado: valGlos,
            valorFacturado: valFact,
            fechaFactura: fFact,
            fechaRadicacion: fRad,
            fechaNotificacionGlosa: fNotif,
            notaCredito: nc || "N/A",
            responsableRespuesta: resp,
            motivoGlosa: mot,
            estado: "PENDIENTE",
          });
        }
        setFilasLeidas(data);
      } catch {
        setErrorCarga("Error al leer el archivo. Asegúrate de que sea un formato CSV o texto delimitado válido.");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const filasConNcInvalida = filasLeidas.filter((f) => !esNotaCreditoValida(f.notaCredito || ""));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4">
      <div className="w-full max-w-[750px] max-h-[88vh] overflow-y-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-[#0E245E]">
            <Upload className="h-5 w-5 text-[#1D58D8]" />
            <h3 className="font-bold text-base">Importar Glosas desde Archivo Excel (CSV)</h3>
          </div>
          <button type="button" onClick={onCerrar} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-[#475569] leading-relaxed">
          Sube tu archivo con columnas separadas por punto y coma (;) o comas (,). El sistema unificará las entidades automáticamente por su NIT y validará que el campo <strong>Nota Crédito</strong> contenga su consecutivo o <strong>"N/A"</strong>.
        </p>

        <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-5 text-center bg-[#FAFBFD]">
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EFF6FF] file:text-[#1D58D8] hover:file:bg-[#DBEAFE] cursor-pointer"
          />
          {archivo && (
            <p className="mt-2 text-xs font-semibold text-[#0E245E]">
              Archivo seleccionado: {archivo.name} ({filasLeidas.length} filas detectadas)
            </p>
          )}
        </div>

        {errorCarga && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
            {errorCarga}
          </div>
        )}

        {filasLeidas.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0E245E]">
                Vista previa de registros a importar ({filasLeidas.length})
              </span>
              {filasConNcInvalida.length > 0 ? (
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  ⚠ {filasConNcInvalida.length} filas tienen Nota Crédito vacía (se asignará "N/A")
                </span>
              ) : (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Validación superada al 100%
                </span>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-lg text-[11.5px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b font-bold text-[#475569]">
                  <tr>
                    <th className="p-1.5">Factura</th>
                    <th className="p-1.5">Empresa</th>
                    <th className="p-1.5 text-right">Glosado</th>
                    <th className="p-1.5">Nota Crédito</th>
                    <th className="p-1.5">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filasLeidas.slice(0, 10).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-1.5 font-mono font-bold text-[#0E245E]">{r.factura}</td>
                      <td className="p-1.5 truncate max-w-[140px]">{r.empresa}</td>
                      <td className="p-1.5 text-right font-mono">{pesos(r.valorGlosado || 0)}</td>
                      <td className="p-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          esNotaCreditoValida(r.notaCredito || "") ? "bg-slate-100 text-slate-800" : "bg-amber-100 text-amber-900"
                        }`}>
                          {r.notaCredito || "N/A"}
                        </span>
                      </td>
                      <td className="p-1.5 text-[#64748B]">{r.responsableRespuesta || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filasLeidas.length > 10 && (
              <p className="text-[10.5px] text-[#64748B] text-right italic">
                ... y {filasLeidas.length - 10} filas más.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg border text-xs font-semibold text-[#475569] hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={procesando || filasLeidas.length === 0}
            onClick={async () => {
              setProcesando(true);
              try {
                // Asegurar que las que venían vacías lleven "N/A"
                const normalizadas = filasLeidas.map((f) => ({
                  ...f,
                  notaCredito: f.notaCredito?.trim() || "N/A",
                }));
                await onImportar(normalizadas);
              } finally {
                setProcesando(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D58D8] text-xs font-bold text-white hover:bg-[#1747B0] disabled:opacity-50"
          >
            {procesando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar e Importar {filasLeidas.length} Registros
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   MODAL PARA NUEVA GLOSA CON CAMPOS NORMATIVOS OBLIGATORIOS
   ====================================================================== */

function ModalNueva({
  causales, guardando, onCerrar, onGuardar,
}: {
  causales: Causal[];
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (fila: Partial<Glosa>) => void;
}) {
  const [f, setF] = useState({
    factura: "",
    empresa: "",
    fechaFactura: "",
    fechaRadicacion: "",
    fechaNotificacionGlosa: "",
    valorFacturado: "",
    valorGlosado: "",
    clase: "",
    causaNormativa: "FA",
    motivoCodigo: "",
    motivoGlosa: "",
    observacionInterna: "",
    notaCredito: "N/A",
    responsableRespuesta: "",
    estado: "PENDIENTE",
  });

  const [ncError, setNcError] = useState(false);

  const ncValida = esNotaCreditoValida(f.notaCredito);
  const completo = f.factura.trim() !== "" && f.empresa.trim() !== "" && f.valorGlosado.trim() !== "" && ncValida;
  const campo = "w-full rounded-lg border border-[#DCE8FA] px-2.5 py-2 text-[12.5px] outline-none focus:border-[#1D58D8]";

  const causalesFiltradas = useMemo(() => {
    if (!f.causaNormativa) return causales;
    return causales.filter((c) => c.codigo.startsWith(f.causaNormativa));
  }, [causales, f.causaNormativa]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label="Registrar glosa">
      <div className="max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E2EBF8] px-5 py-3.5">
          <div>
            <p className="text-[15px] font-bold text-[#0E245E]">Registrar Glosa / Devolución</p>
            <p className="text-[11px] text-[#64748B]">Todos los campos obligatorios bajo la Resolución 2284</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#47597A] transition hover:bg-[#F1F5F9]"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 px-5 py-4 sm:grid-cols-2">
          <Campo id="nf" etiqueta="Número de Factura *">
            <input id="nf" value={f.factura} onChange={(e) => setF({ ...f, factura: e.target.value.toUpperCase() })}
              placeholder="FCOE0000001" className={`${campo} font-cifra font-bold text-[#0E245E]`} />
          </Campo>

          <Campo id="emp" etiqueta="Empresa (se unifica por NIT) *">
            <input id="emp" list="cat-empresas" value={f.empresa}
              onChange={(e) => setF({ ...f, empresa: e.target.value.toUpperCase() })}
              placeholder="Ej. MUTUAL SER, EPS SURA..." className={campo} />
          </Campo>

          <Campo id="ffact" etiqueta="Fecha de Factura">
            <input id="ffact" type="date" value={f.fechaFactura}
              onChange={(e) => setF({ ...f, fechaFactura: e.target.value })} className={campo} />
          </Campo>

          <Campo id="frad" etiqueta="Fecha de Radicación">
            <input id="frad" type="date" value={f.fechaRadicacion}
              onChange={(e) => setF({ ...f, fechaRadicacion: e.target.value })} className={campo} />
          </Campo>

          <Campo id="fnot" etiqueta="Fecha Notificación Glosa">
            <input id="fnot" type="date" value={f.fechaNotificacionGlosa}
              onChange={(e) => setF({ ...f, fechaNotificacionGlosa: e.target.value })} className={campo} />
          </Campo>

          <Campo id="vfact" etiqueta="Valor Facturado">
            <input id="vfact" value={f.valorFacturado} onChange={(e) => setF({ ...f, valorFacturado: e.target.value })}
              inputMode="numeric" placeholder="$0" className={`${campo} font-cifra`} />
          </Campo>

          <Campo id="val" etiqueta="Valor Glosado *">
            <input id="val" value={f.valorGlosado} onChange={(e) => setF({ ...f, valorGlosado: e.target.value })}
              inputMode="numeric" placeholder="$0" className={`${campo} font-cifra font-bold text-[#0E245E]`} />
          </Campo>

          <Campo id="clase" etiqueta="Clase de Glosa">
            <select id="clase" value={f.clase} onChange={(e) => setF({ ...f, clase: e.target.value })} className={campo}>
              {CLASES.map((c) => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
            </select>
          </Campo>

          {/* Selector de Causa Normativa (FA, TA, SO, AU, CO) */}
          <div className="sm:col-span-2">
            <label className="eb-label mb-1.5 block text-[10.5px] font-bold text-[#0E245E]">
              Causa Principal según la Norma *
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {CAUSAS_NORMATIVAS.map((c) => (
                <button
                  key={c.codigo}
                  type="button"
                  onClick={() => setF({ ...f, causaNormativa: c.codigo, motivoCodigo: "" })}
                  className={`p-2 rounded-lg border text-center transition ${
                    f.causaNormativa === c.codigo
                      ? "border-[#1D58D8] bg-[#EFF6FF] text-[#1D58D8] font-bold shadow-2xs"
                      : "border-[#E2ECF8] bg-white text-[#475569] hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-mono">{c.codigo}</div>
                  <div className="text-[10px] truncate">{c.nombre}</div>
                </button>
              ))}
            </div>
            {f.causaNormativa && (
              <p className="mt-1 text-[11px] text-[#64748B] italic">
                {CAUSAS_NORMATIVAS.find((x) => x.codigo === f.causaNormativa)?.descripcion}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Campo id="cau" etiqueta={`Causal específica de ${f.causaNormativa} (Res. 2284)`}>
              <select id="cau" value={f.motivoCodigo} onChange={(e) => setF({ ...f, motivoCodigo: e.target.value })} className={campo}>
                <option value="">— sin clasificar específica —</option>
                {causalesFiltradas.map((c) => (
                  <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="sm:col-span-2">
            <Campo id="mot" etiqueta="Observación del motivo de la glosa">
              <textarea id="mot" rows={2} value={f.motivoGlosa} onChange={(e) => setF({ ...f, motivoGlosa: e.target.value })}
                placeholder="Razón textual de la glosa notificada por la EPS" className={`${campo} resize-y leading-relaxed`} />
            </Campo>
          </div>

          {/* Nota Crédito Obligatoria */}
          <div>
            <Campo id="nc2" etiqueta="Opción Nota Crédito * (Número o N/A)">
              <input
                id="nc2"
                value={f.notaCredito}
                onChange={(e) => {
                  setF({ ...f, notaCredito: e.target.value });
                  setNcError(!esNotaCreditoValida(e.target.value));
                }}
                onBlur={() => setNcError(!esNotaCreditoValida(f.notaCredito))}
                placeholder="Escribe el N° de NC o N/A"
                className={`${campo} font-cifra font-medium ${ncError ? "border-red-400 bg-red-50 text-red-900" : ""}`}
              />
              {ncError && (
                <p className="mt-0.5 text-[10px] font-bold text-red-600">
                  Campo obligatorio: debe contener el número de NC o 'N/A'
                </p>
              )}
            </Campo>
          </div>

          <div>
            <Campo id="resp" etiqueta="Responsable de Responder la Glosa">
              <input id="resp" list="cat-responsables" value={f.responsableRespuesta}
                onChange={(e) => setF({ ...f, responsableRespuesta: e.target.value.toUpperCase() })}
                placeholder="Persona encargada de responder" className={campo} />
            </Campo>
          </div>

          <div className="sm:col-span-2">
            <Campo id="obs2" etiqueta="Observación general interna">
              <textarea id="obs2" rows={2} value={f.observacionInterna}
                onChange={(e) => setF({ ...f, observacionInterna: e.target.value })}
                placeholder="Nota o seguimiento interno" className={`${campo} resize-y leading-relaxed`} />
            </Campo>
          </div>
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
              onGuardar({
                ...f,
                tipoGlosa: c.tipo,
                alcance: c.alcance,
                valorGlosado: soloNumero(f.valorGlosado),
                valorFacturado: soloNumero(f.valorFacturado),
                valorAceptado: null,
                notaCredito: f.notaCredito.trim() || "N/A",
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
          >
            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar Glosa
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   SUBCOMPONENTES COMUNES
   ====================================================================== */

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
            onClick={() => onClick && onClick(k)}
            className={`w-full text-left transition ${
              onClick ? "cursor-pointer hover:bg-[#F8FAFC]" : "cursor-default"
            } rounded-lg p-1.5 ${activo === k ? "bg-[#EEF4FD]" : ""}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className={`truncate text-[12px] ${activo === k ? "font-bold text-[#0E245E]" : "text-[#47597A]"}`}>
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

  const lista = cual === "cf_responsables" ? responsables : empresas;

  return (
    <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[#0E245E]">Facturadores y empresas</h3>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Administra nombres, fusiones y estados activos en los catálogos oficiales.
          </p>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar"
          className="rounded-lg border border-[#DCE8FA] p-1.5 text-[#47597A] hover:bg-[#F8FAFC]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 border-b border-[#F1F5F9] pb-3">
        <button
          type="button"
          onClick={() => setCual("cf_responsables")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            cual === "cf_responsables" ? "bg-[#0E245E] text-white" : "border bg-white text-[#47597A]"
          }`}
        >
          Responsables ({responsables.length})
        </button>
        <button
          type="button"
          onClick={() => setCual("cf_empresas")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            cual === "cf_empresas" ? "bg-[#0E245E] text-white" : "border bg-white text-[#47597A]"
          }`}
        >
          Empresas ({empresas.length})
        </button>
      </div>

      <div className="mt-3 max-h-60 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b text-[#64748B]">
              <th className="py-1">Nombre</th>
              <th className="py-1 text-center">Usos</th>
              <th className="py-1 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lista.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="py-1.5 font-medium text-[#0E245E]">{it.nombre}</td>
                <td className="py-1.5 text-center font-mono">{it.usos}</td>
                <td className="py-1.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    it.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {it.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
            {totalFilas} glosas sin causal en {filas.length} redacciones distintas ({pesos(totalValor)}). Al asignar un código se aplica a todas las que coincidan.
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

      <div className="max-h-72 overflow-y-auto space-y-2">
        {filas.map(([t, info]) => (
          <div key={t} className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-slate-50/50 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#0E245E] truncate">{t}</p>
              <p className="text-[11px] text-[#64748B]">{info.n} glosas · {pesos(info.valor)}</p>
            </div>
            <select
              value={elegido[t] || ""}
              onChange={(e) => setElegido({ ...elegido, [t]: e.target.value })}
              className="rounded border p-1 text-xs outline-none bg-white max-w-[200px]"
            >
              <option value="">Seleccionar causal...</option>
              {causales.map((c) => (
                <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!elegido[t] || guardando !== null}
              onClick={() => onAplicar(t, elegido[t])}
              className="px-2.5 py-1 rounded bg-[#1D58D8] text-white font-bold text-xs disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog">
      <div className="max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-2xl p-5">
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <p className="text-xs text-[#64748B]">{base.empresa} {base.nit ? `· NIT: ${base.nit}` : ""}</p>
            <h3 className="text-2xl font-mono font-bold text-[#0E245E]">{factura}</h3>
          </div>
          <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg border hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b">
          <Dato etiqueta="Facturado" valor={pesos(base.valorFacturado || base.valorRadicado)} />
          <Dato etiqueta="Glosado" valor={pesos(totalGlosado)} />
          <Dato etiqueta="Aceptado" valor={pesos(totalAceptado)} />
          <Dato etiqueta="Glosas" valor={`${glosas.length} (${sinResolver.length} pendientes)`} />
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold text-[#0E245E]">Detalle de Glosas</p>
          <div className="divide-y border rounded-lg">
            {glosas.map((g) => (
              <div key={g.id} className="p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PASTILLA[g.estado] || PASTILLA.PENDIENTE}`}>
                    {ETIQUETA[g.estado] || g.estado}
                  </span>
                  <span className="font-mono font-bold text-[#0E245E]">{pesos(g.valorGlosado)}</span>
                </div>
                <p className="text-[#334155]">{g.motivoGlosa || "Sin motivo escrito"}</p>
                <div className="flex gap-4 text-[10.5px] text-[#64748B] pt-1">
                  <span>NC: <strong>{g.notaCredito || "N/A"}</strong></span>
                  <span>Responsable: <strong>{g.responsableRespuesta || g.facturador || "—"}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#94A3B8] font-bold uppercase">{etiqueta}</p>
      <p className="text-sm font-mono font-bold text-[#0E245E]">{valor}</p>
    </div>
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

function Campo({ id, etiqueta, children }: { id: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eb-label mb-1 block text-[10px] text-[#94A3B8] font-bold">{etiqueta}</label>
      {children}
    </div>
  );
}
