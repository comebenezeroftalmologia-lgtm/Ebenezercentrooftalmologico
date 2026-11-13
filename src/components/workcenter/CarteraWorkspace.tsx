"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Tags,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  claveFacturaNorm,
  homologarEmpresaYOrigen,
  clasificarAtencionYSede,
} from "@/lib/carteraCruces";

/* ---------------------------------------------------------------------
   MESA DE TRABAJO DE CARTERA — GLOSAS, DEVOLUCIONES Y CONTROL DE FACTURAS
   --------------------------------------------------------------------- */

export type CausaNormativaItem = {
  codigo: "FA" | "TA" | "SO" | "AU" | "CO";
  nombre: string;
  descripcion: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
};

export const CAUSAS_NORMATIVAS: CausaNormativaItem[] = [
  {
    codigo: "FA",
    nombre: "Facturación",
    descripcion: "Diferencias en cantidades de servicios, errores administrativos o copagos mal calculados.",
    color: "#2563EB",
    badgeBg: "#EFF6FF",
    badgeText: "#1D4ED8",
    badgeBorder: "#BFDBFE",
  },
  {
    codigo: "TA",
    nombre: "Tarifas",
    descripcion: "Diferencias entre los valores cobrados y los precios pactados en el contrato o fijados por ley.",
    color: "#0284C7",
    badgeBg: "#F0F9FF",
    badgeText: "#0369A1",
    badgeBorder: "#BAE6FD",
  },
  {
    codigo: "SO",
    nombre: "Soportes",
    descripcion: "Inconsistencia, enmendadura o ausencia parcial/total de los documentos requeridos (ej. historia clínica).",
    color: "#059669",
    badgeBg: "#ECFDF5",
    badgeText: "#047857",
    badgeBorder: "#A7F3D0",
  },
  {
    codigo: "AU",
    nombre: "Autorizaciones",
    descripcion: "Servicios prestados sin el debido aval o número de autorización acordado con la ERP.",
    color: "#D97706",
    badgeBg: "#FFFBEB",
    badgeText: "#B45309",
    badgeBorder: "#FDE68A",
  },
  {
    codigo: "CO",
    nombre: "Cobertura",
    descripcion: "Tecnologías o servicios prestados que no corresponden al Plan de Beneficios (PBS) a cargo de esa entidad.",
    color: "#7C3AED",
    badgeBg: "#F5F3FF",
    badgeText: "#6D28D9",
    badgeBorder: "#DDD6FE",
  },
];

export function causaNormativaDe(motivoCodigo?: string | null): string {
  const pref = String(motivoCodigo || "").trim().toUpperCase().slice(0, 2);
  return pref === "FA" || pref === "TA" || pref === "SO" || pref === "AU" || pref === "CO" ? pref : "";
}

/**
 * Unificación de empresas estrictamente por NIT contable real verificado en SISMA.
 * Si una entidad no tiene NIT verificado en SISMA, devuelve nit: "" (jamás se inventa).
 */
export function normalizarEmpresaYNit(raw?: string | null): { nit: string; nombre: string } {
  const limpio = String(raw || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!limpio) return { nit: "", nombre: "" };
  const sinTildes = limpio.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (sinTildes.includes("MUTUAL")) return { nit: "806008394", nombre: "MUTUAL SER" };
  if (sinTildes.includes("ECOPETROL")) return { nit: "899999068", nombre: "ECOPETROL" };
  if (sinTildes.includes("MEDPLUS") || sinTildes.includes("MED PLUS")) {
    return { nit: "900178724", nombre: "MEDPLUS" };
  }
  if (sinTildes.includes("COLSANITAS")) return { nit: "860078828", nombre: "COLSANITAS" };
  if (sinTildes.includes("SANITAS")) return { nit: "800251440", nombre: "SANITAS EPS" };
  if (sinTildes.includes("COLMEDICA")) return { nit: "800106339", nombre: "COLMÉDICA" };
  if (sinTildes.includes("SURA") && (sinTildes.includes("POLIZA") || sinTildes.includes("SEGURO"))) {
    return { nit: "890903790", nombre: "SURA PÓLIZA" };
  }
  if (sinTildes.includes("SURA")) return { nit: "800088702", nombre: "EPS SURA" };
  if (sinTildes.includes("COOMEVA")) return { nit: "805009741", nombre: "COOMEVA" };
  if (sinTildes.includes("BOLIVAR")) return { nit: "860002503", nombre: "SEGUROS BOLÍVAR" };
  if (sinTildes.includes("ALLIANZ")) return { nit: "860027404", nombre: "ALLIANZ" };
  if (sinTildes.includes("COLPATRIA") || sinTildes.includes("AXA")) {
    if (sinTildes.includes("SEGURO") || sinTildes.includes("ARL") || sinTildes.includes("SOAT")) {
      return { nit: "860002183", nombre: "AXA COLPATRIA SEGUROS" };
    }
    return { nit: "900640334", nombre: "AXA COLPATRIA PREPAGADA" };
  }
  if (sinTildes.includes("HDI")) return { nit: "860039988", nombre: "HDI SEGUROS" };
  if (sinTildes.includes("COMFENALCO")) return { nit: "890480023", nombre: "COMFENALCO CARTAGENA" };

  return { nit: "", nombre: limpio };
}

export function esNotaCreditoValida(v: unknown): boolean {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return false;
  if (s === "N/A" || s === "NA" || s === "NO APLICA") return true;
  return /\d/.test(s);
}

type Glosa = {
  id: string;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  empresaHomologada?: string;
  nit?: string;
  esMutual?: boolean;
  deDondeEs?: string;
  sede?: string;
  sedeGrupo?: string;
  tipoAtencion?: string;
  tipoGrupo?: string;
  pacienteNombre?: string;
  pacienteDoc?: string;
  medicoNombre?: string;
  cups?: string;
  servicioDescripcion?: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaNotificacionGlosa: string;
  anio: string;
  valorRadicado: number;
  valorFacturado: number;
  valorGlosado: number;
  valorAceptado: number | null;
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

type Anulada = {
  id: string;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  empresaHomologada?: string;
  nit?: string;
  esMutual?: boolean;
  deDondeEs?: string;
  sede?: string;
  sedeGrupo?: string;
  tipoAtencion?: string;
  tipoGrupo?: string;
  pacienteNombre?: string;
  pacienteDoc?: string;
  medicoNombre?: string;
  cups?: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaAnulacion: string;
  anio: string;
  valorRadicado: number;
  motivo: string;
  facturaReemplaza: string;
  responsable: string;
  estadoGestion: string;
};

type PendienteWc = {
  id: string;
  empresa: string;
  empresaOriginal: string;
  empresaHomologada?: string;
  nit?: string;
  esMutual?: boolean;
  deDondeEs?: string;
  sede?: string;
  sedeGrupo?: string;
  tipoAtencion?: string;
  tipoGrupo?: string;
  contrato: string;
  unidadFuncional: string;
  cups: string;
  descripcion: string;
  fechaServicio: string;
  anio: string;
  pacienteDoc?: string;
  pacienteNombre?: string;
  medico: string;
  medicoNombre?: string;
  facturaAsociada?: string;
  valorServicio: number;
  responsable: string;
  observaciones: string;
  estado: string;
};

type SismaFacturaCruce = {
  factura: string;
  fechaFactura: string;
  fechaRadicacion: string;
  nit: string;
  empresaHomologada: string;
  deDondeEs: string;
  sede: string;
  sedeGrupo: string;
  tipoAtencion: string;
  tipoGrupo: string;
  descripcionCuenta: string;
  pacienteNombre: string;
  pacienteDoc: string;
  saldo: number;
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
  const [anuladas, setAnuladas] = useState<Anulada[]>([]);
  const [pendientes, setPendientes] = useState<PendienteWc[]>([]);
  const [mapaSismaFacturas, setMapaSismaFacturas] = useState<Record<string, SismaFacturaCruce>>({});
  const [cat, setCat] = useState<Catalogos>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [aviso, setAviso] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [fEstado, setFEstado] = useState("SIN_RESOLVER");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fSede, setFSede] = useState("");
  const [fAtencion, setFAtencion] = useState("");
  const [fMutual, setFMutual] = useState<"CON" | "SOLO" | "SIN">("CON");
  const [fCausaNorma, setFCausaNorma] = useState("");
  const [fAnio, setFAnio] = useState("");
  const [fMes, setFMes] = useState("");
  const [fFacturador, setFFacturador] = useState("");
  const [fFamilia, setFFamilia] = useState("");
  const [soloSinCausal, setSoloSinCausal] = useState(false);

  const [vista, setVista] = useState<"cuadricula" | "anuladas" | "pendientes" | "resumen">("cuadricula");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [fichaDe, setFichaDe] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [anularDe, setAnularDe] = useState<string | null>(null);
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [clasificarAbierto, setClasificarAbierto] = useState(false);
  const [catalogosAbierto, setCatalogosAbierto] = useState(false);

  const traer = useCallback(async () => {
    setCargando(true);
    setFallo("");
    try {
      const r = await fetch("/api/cartera/registros", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const listaGlosas = ((j.glosas || []) as Partial<Glosa>[]).map((g) => ({
        id: String(g.id || ""),
        factura: String(g.factura || ""),
        empresa: String(g.empresa || ""),
        empresaOriginal: String(g.empresaOriginal || ""),
        empresaHomologada: String(g.empresaHomologada || ""),
        nit: String(g.nit || ""),
        esMutual: Boolean(g.esMutual),
        deDondeEs: String(g.deDondeEs || ""),
        sede: String(g.sede || ""),
        sedeGrupo: String(g.sedeGrupo || ""),
        tipoAtencion: String(g.tipoAtencion || ""),
        tipoGrupo: String(g.tipoGrupo || ""),
        pacienteNombre: String(g.pacienteNombre || ""),
        pacienteDoc: String(g.pacienteDoc || ""),
        medicoNombre: String(g.medicoNombre || ""),
        cups: String(g.cups || ""),
        servicioDescripcion: String(g.servicioDescripcion || ""),
        fechaFactura: String(g.fechaFactura || ""),
        fechaRadicacion: String(g.fechaRadicacion || ""),
        fechaNotificacionGlosa: String(g.fechaNotificacionGlosa || ""),
        anio: String(g.anio || ""),
        valorRadicado: Number(g.valorRadicado || 0),
        valorFacturado: Number(g.valorFacturado ?? g.valorRadicado ?? 0),
        valorGlosado: Number(g.valorGlosado || 0),
        valorAceptado: g.valorAceptado === null || g.valorAceptado === undefined ? null : Number(g.valorAceptado),
        motivoCodigo: String(g.motivoCodigo || ""),
        motivoGlosa: String(g.motivoGlosa || ""),
        observacionInterna: String(g.observacionInterna || ""),
        notaCredito: String(g.notaCredito || ""),
        facturador: String(g.facturador || ""),
        responsableAceptacion: String(g.responsableAceptacion || g.responsableRespuesta || ""),
        responsableRespuesta: String(g.responsableRespuesta || g.responsableAceptacion || ""),
        tipoGlosa: String(g.tipoGlosa || "GLOSA"),
        alcance: String(g.alcance || ""),
        estado: String(g.estado || "PENDIENTE"),
      }));
      setGlosas(listaGlosas);
      setAnuladas((j.anuladas || []) as Anulada[]);
      setPendientes((j.pendientes || []) as PendienteWc[]);
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

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/cartera/sisma", { cache: "no-store" });
        const j = await r.json();
        if (!vivo || !r.ok || !j?.ok || !Array.isArray(j.facturasAbiertas)) return;
        const mSisma: Record<string, SismaFacturaCruce> = {};
        for (const f of j.facturasAbiertas as SismaFacturaCruce[]) {
          const k = claveFacturaNorm(f.factura);
          if (k && !mSisma[k]) mSisma[k] = f;
        }
        setMapaSismaFacturas(mSisma);
      } catch {
        // Si SISMA en vivo tarda o no está disponible, se mantiene el cruce local de BD.
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const avisar = useCallback((msg: string) => {
    setAviso(msg);
    window.setTimeout(() => setAviso(""), 4200);
  }, []);

  const guardar = useCallback(
    async (fila: Record<string, unknown>, accion: "CREAR" | "EDITAR", entidad = "glosas") => {
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
    [traer, avisar],
  );

  /* Empresas unificadas por NIT real de SISMA para el filtro */
  const empresasUnificadasEnDatos = useMemo(() => {
    const mapa = new Map<string, { nombre: string; nit: string }>();
    for (const g of glosas) {
      const info = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
      if (info.nombre && !mapa.has(info.nombre)) mapa.set(info.nombre, info);
    }
    for (const a of anuladas) {
      const info = normalizarEmpresaYNit(a.empresa || a.empresaOriginal);
      if (info.nombre && !mapa.has(info.nombre)) mapa.set(info.nombre, info);
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [glosas, anuladas]);

  const responsablesEnDatos = useMemo(() => {
    const setR = new Set<string>();
    for (const g of glosas) {
      if (g.responsableAceptacion) setR.add(g.responsableAceptacion);
      if (g.facturador) setR.add(g.facturador);
    }
    return Array.from(setR).sort((a, b) => a.localeCompare(b, "es"));
  }, [glosas]);

  const causalPorCodigo = useMemo(() => {
    const mapC: Record<string, Causal> = {};
    for (const c of CAUSAS_NORMATIVAS) {
      mapC[c.codigo] = { codigo: c.codigo, familia: c.nombre, nombre: c.descripcion };
    }
    for (const c of cat.causales) mapC[c.codigo] = c;
    return mapC;
  }, [cat.causales]);

  const cruzarFila = useCallback(
    (base: {
      factura?: string;
      empresa?: string;
      empresaOriginal?: string;
      empresaHomologada?: string;
      nit?: string;
      deDondeEs?: string;
      sede?: string;
      sedeGrupo?: string;
      tipoAtencion?: string;
      tipoGrupo?: string;
      pacienteNombre?: string;
      pacienteDoc?: string;
      medicoNombre?: string;
      cups?: string;
      motivoTexto?: string;
    }) => {
      const sisma = base.factura ? mapaSismaFacturas[claveFacturaNorm(base.factura)] : undefined;
      const empInfo = homologarEmpresaYOrigen({
        empresa: base.empresa,
        empresaOriginal: base.empresaOriginal,
        nit: base.nit || sisma?.nit,
        descripcionCuenta: sisma?.descripcionCuenta,
      });
      const atInfo = clasificarAtencionYSede({
        esMutual: empInfo.esMutual,
        cups: base.cups,
        descripcionCuenta: sisma?.descripcionCuenta,
        motivoTexto: base.motivoTexto,
      });
      return {
        nit: base.nit || sisma?.nit || empInfo.nit,
        empresaHomologada: base.empresaHomologada || sisma?.empresaHomologada || empInfo.empresaHomologada,
        esMutual: empInfo.esMutual,
        deDondeEs: base.deDondeEs || sisma?.deDondeEs || empInfo.deDondeEs,
        sede: base.sede || (atInfo.tipoGrupo !== "SIN_DETALLE" ? atInfo.sede : sisma?.sede || atInfo.sede),
        sedeGrupo: base.sedeGrupo || atInfo.sedeGrupo,
        tipoAtencion:
          base.tipoAtencion && base.tipoGrupo !== "SIN_DETALLE"
            ? base.tipoAtencion
            : atInfo.tipoGrupo !== "SIN_DETALLE"
            ? atInfo.tipoAtencion
            : sisma?.tipoAtencion || atInfo.tipoAtencion,
        tipoGrupo:
          base.tipoGrupo && base.tipoGrupo !== "SIN_DETALLE"
            ? base.tipoGrupo
            : atInfo.tipoGrupo !== "SIN_DETALLE"
            ? atInfo.tipoGrupo
            : sisma?.tipoGrupo || atInfo.tipoGrupo,
        pacienteNombre: base.pacienteNombre || sisma?.pacienteNombre || "",
        pacienteDoc: base.pacienteDoc || sisma?.pacienteDoc || "",
        medicoNombre: base.medicoNombre || "",
        fechaFacturaSisma: sisma?.fechaFactura || "",
        fechaRadicacionSisma: sisma?.fechaRadicacion || "",
        saldoSisma: sisma?.saldo,
      };
    },
    [mapaSismaFacturas],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return glosas.filter((g) => {
      const cr = cruzarFila({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` });
      if (fMutual === "SOLO" && !cr.esMutual) return false;
      if (fMutual === "SIN" && cr.esMutual) return false;
      if (fSede && cr.sedeGrupo !== fSede) return false;
      if (fAtencion && cr.tipoGrupo !== fAtencion) return false;
      if (fEstado === "SIN_RESOLVER" && g.estado !== "PENDIENTE") return false;
      if (fEstado !== "TODAS" && fEstado !== "SIN_RESOLVER" && g.estado !== fEstado) return false;
      if (fEmpresa) {
        const info = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
        if (info.nombre !== fEmpresa && g.empresa !== fEmpresa) return false;
      }
      if (fCausaNorma && causaNormativaDe(g.motivoCodigo) !== fCausaNorma) return false;
      if (fAnio && g.anio !== fAnio) return false;
      if (fMes && mesDe(g) !== fMes) return false;
      if (fFacturador && g.responsableAceptacion !== fFacturador && g.facturador !== fFacturador) {
        return false;
      }
      if (soloSinCausal && g.motivoCodigo) return false;
      if (fFamilia) {
        const c = causalPorCodigo[g.motivoCodigo];
        if (!c || c.familia !== fFamilia) return false;
      }
      if (!q) return true;
      const infoNit = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
      return (
        g.factura.toUpperCase().includes(q) ||
        g.empresa.toUpperCase().includes(q) ||
        cr.empresaHomologada.toUpperCase().includes(q) ||
        cr.deDondeEs.toUpperCase().includes(q) ||
        cr.sede.toUpperCase().includes(q) ||
        cr.tipoAtencion.toUpperCase().includes(q) ||
        cr.pacienteNombre.toUpperCase().includes(q) ||
        cr.medicoNombre.toUpperCase().includes(q) ||
        infoNit.nombre.includes(q) ||
        infoNit.nit.includes(q) ||
        (g.motivoGlosa || "").toUpperCase().includes(q) ||
        (g.motivoCodigo || "").toUpperCase().includes(q) ||
        (g.notaCredito || "").toUpperCase().includes(q) ||
        (g.responsableAceptacion || "").toUpperCase().includes(q) ||
        (g.observacionInterna || "").toUpperCase().includes(q)
      );
    });
  }, [
    glosas, busqueda, fEstado, fEmpresa, fSede, fAtencion, fMutual, fCausaNorma, fAnio, fMes,
    fFacturador, fFamilia, soloSinCausal, causalPorCodigo, cruzarFila,
  ]);

  const anuladasVisibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return anuladas.filter((a) => {
      const cr = cruzarFila({ ...a, motivoTexto: a.motivo });
      if (fMutual === "SOLO" && !cr.esMutual) return false;
      if (fMutual === "SIN" && cr.esMutual) return false;
      if (fSede && cr.sedeGrupo !== fSede) return false;
      if (fAtencion && cr.tipoGrupo !== fAtencion) return false;
      if (fEmpresa) {
        const info = normalizarEmpresaYNit(a.empresa || a.empresaOriginal);
        if (info.nombre !== fEmpresa && a.empresa !== fEmpresa) return false;
      }
      if (fAnio && a.anio && a.anio !== fAnio) return false;
      if (!q) return true;
      return (
        a.factura.toUpperCase().includes(q) ||
        a.empresa.toUpperCase().includes(q) ||
        cr.empresaHomologada.toUpperCase().includes(q) ||
        cr.deDondeEs.toUpperCase().includes(q) ||
        cr.pacienteNombre.toUpperCase().includes(q) ||
        (a.motivo || "").toUpperCase().includes(q) ||
        (a.responsable || "").toUpperCase().includes(q)
      );
    });
  }, [anuladas, fEmpresa, fSede, fAtencion, fMutual, fAnio, busqueda, cruzarFila]);

  const pendientesVisibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return pendientes.filter((p) => {
      const esMut = Boolean(p.esMutual || /MUTUAL/i.test(`${p.empresa} ${p.empresaOriginal}`));
      if (fMutual === "SOLO" && !esMut) return false;
      if (fMutual === "SIN" && esMut) return false;
      if (fSede && p.sedeGrupo && p.sedeGrupo !== fSede) return false;
      if (fAtencion && p.tipoGrupo && p.tipoGrupo !== fAtencion) return false;
      if (fEmpresa) {
        const info = normalizarEmpresaYNit(p.empresa || p.empresaOriginal);
        if (info.nombre !== fEmpresa && p.empresa !== fEmpresa) return false;
      }
      if (fAnio && p.anio && p.anio !== fAnio) return false;
      if (fFacturador && p.responsable !== fFacturador) return false;
      if (!q) return true;
      return (
        (p.facturaAsociada || "").toUpperCase().includes(q) ||
        (p.pacienteNombre || "").toUpperCase().includes(q) ||
        (p.pacienteDoc || "").toUpperCase().includes(q) ||
        (p.medico || "").toUpperCase().includes(q) ||
        (p.cups || "").toUpperCase().includes(q) ||
        (p.descripcion || "").toUpperCase().includes(q) ||
        (p.empresaHomologada || p.empresa || "").toUpperCase().includes(q) ||
        (p.deDondeEs || "").toUpperCase().includes(q) ||
        (p.observaciones || "").toUpperCase().includes(q)
      );
    });
  }, [pendientes, fMutual, fSede, fAtencion, fEmpresa, fAnio, fFacturador, busqueda]);

  const mesesEnDatos = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of glosas) {
      const m2 = mesDe(g);
      if (m2) c[m2] = (c[m2] || 0) + 1;
    }
    return c;
  }, [glosas]);
  const sinFecha = useMemo(() => glosas.filter((g) => !mesDe(g)).length, [glosas]);

  const m = useMemo(() => {
    let glosado = 0, facturado = 0, aceptado = 0, sinResolver = 0, valorSinResolver = 0, sinCausal = 0, sinNC = 0;
    const porFamilia: Record<string, number> = {};
    const porNorma: Record<string, { monto: number; cantidad: number }> = {
      FA: { monto: 0, cantidad: 0 },
      TA: { monto: 0, cantidad: 0 },
      SO: { monto: 0, cantidad: 0 },
      AU: { monto: 0, cantidad: 0 },
      CO: { monto: 0, cantidad: 0 },
    };
    const porEmpresa: Record<string, number> = {};
    const porCausal: Record<string, number> = {};
    const porAnio: Record<string, number> = {};
    const porResponsable: Record<string, number> = {};
    const porFacturador: Record<string, number> = {};
    const porEstado: Record<string, number> = {};
    const porClase: Record<string, number> = {};
    for (const g of visibles) {
      glosado += g.valorGlosado || 0;
      facturado += g.valorFacturado || g.valorRadicado || 0;
      if (g.valorAceptado != null) aceptado += g.valorAceptado;
      if (g.estado === "PENDIENTE") { sinResolver++; valorSinResolver += g.valorGlosado || 0; }
      if (!g.motivoCodigo) sinCausal++;
      if (!esNotaCreditoValida(g.notaCredito)) sinNC++;
      const v = g.valorGlosado || 0;
      const cn = causaNormativaDe(g.motivoCodigo);
      if (cn && porNorma[cn]) {
        porNorma[cn].monto += v;
        porNorma[cn].cantidad += 1;
      }
      const fam = causalPorCodigo[g.motivoCodigo]?.familia || "Sin clasificar";
      porFamilia[fam] = (porFamilia[fam] || 0) + v;
      const empInfo = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
      const empKey = empInfo.nombre ? (empInfo.nit ? `${empInfo.nombre} · NIT ${empInfo.nit}` : empInfo.nombre) : "";
      if (empKey) porEmpresa[empKey] = (porEmpresa[empKey] || 0) + v;
      if (g.motivoCodigo) porCausal[g.motivoCodigo] = (porCausal[g.motivoCodigo] || 0) + v;
      porAnio[g.anio || "sin año"] = (porAnio[g.anio || "sin año"] || 0) + v;
      const rKey = g.responsableAceptacion || "sin responsable asignado";
      porResponsable[rKey] = (porResponsable[rKey] || 0) + v;
      porFacturador[g.facturador || "sin facturador"] = (porFacturador[g.facturador || "sin facturador"] || 0) + v;
      porEstado[g.estado] = (porEstado[g.estado] || 0) + v;
      const cl = CLASES.find((c) => c.id === claseDe(g))?.etiqueta || "— sin definir —";
      porClase[cl] = (porClase[cl] || 0) + v;
    }
    const orden = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
    return {
      glosado, facturado, aceptado, sinResolver, valorSinResolver, sinCausal, sinNC, porNorma,
      familias: orden(porFamilia),
      empresas: orden(porEmpresa),
      causales: orden(porCausal),
      anios: Object.entries(porAnio).sort((a, b) => a[0].localeCompare(b[0])),
      responsables: orden(porResponsable),
      facturadores: orden(porFacturador),
      estados: orden(porEstado),
      clases: orden(porClase),
    };
  }, [visibles, causalPorCodigo]);

  const exportarExcelCsv = () => {
    const encabezados = [
      "Factura", "Fecha Factura", "Fecha Radicación", "Fecha Notificación Glosa", "Año",
      "Sede", "Consulta o Cirugía", "Empresa Homologada", "NIT", "De dónde es (Convenio / Régimen)",
      "Paciente (Cruce)", "Documento Paciente", "Médico / Especialista (Cruce)", "CUPS",
      "Facturador", "Responsable Respuesta Glosa",
      "Valor Facturado", "Valor Glosado", "Valor Aceptado", "Valor Defendido",
      "Causa Normativa (FA-CO)", "Código Causal", "Clase", "Motivo Glosa",
      "Nota Crédito", "Estado", "Observación Interna",
    ];
    const filasCsv = visibles.map((g) => {
      const cr = cruzarFila({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` });
      const cn = causaNormativaDe(g.motivoCodigo);
      const cl = CLASES.find((c) => c.id === claseDe(g))?.etiqueta || "";
      const vGlosa = Number(g.valorGlosado || 0);
      const vAcep = g.valorAceptado ?? null;
      const vDef =
        g.estado === "PENDIENTE"
          ? 0
          : vAcep !== null
          ? Math.max(0, vGlosa - vAcep)
          : g.estado === "NO_ACEPTADA"
          ? vGlosa
          : 0;
      return [
        g.factura,
        g.fechaFactura || cr.fechaFacturaSisma,
        g.fechaRadicacion || cr.fechaRadicacionSisma,
        g.fechaNotificacionGlosa,
        g.anio,
        cr.sede,
        cr.tipoAtencion,
        cr.empresaHomologada,
        cr.nit,
        cr.deDondeEs,
        cr.pacienteNombre || "Sin detalle clínico en factura",
        cr.pacienteDoc,
        cr.medicoNombre,
        g.cups || "",
        g.facturador,
        g.responsableAceptacion,
        g.valorFacturado || g.valorRadicado,
        vGlosa,
        vAcep ?? "",
        vDef,
        cn,
        g.motivoCodigo,
        cl,
        g.motivoGlosa,
        g.notaCredito,
        ETIQUETA[g.estado] || g.estado,
        g.observacionInterna,
      ];
    });
    const contenido =
      "\uFEFF" +
      [encabezados, ...filasCsv]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workcenter_glosas_ebenezer_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    avisar(`Excel exportado (${visibles.length} registros con codificación UTF-8).`);
  };

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
    setFEmpresa(""); setFSede(""); setFAtencion(""); setFMutual("CON");
    setFCausaNorma(""); setFAnio(""); setFMes(""); setFFacturador(""); setFFamilia("");
    setSoloSinCausal(false); setBusqueda("");
  };
  const hayFiltro = !!(
    fEmpresa || fSede || fAtencion || fMutual !== "CON" || fCausaNorma || fAnio || fMes ||
    fFacturador || fFamilia || soloSinCausal || busqueda
  );

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
          <p className="eb-label text-[11px] text-[#64748B]">WorkCenter · Cartera y Facturación</p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight text-[#0E245E]">
            Glosas, devoluciones y control de facturas
          </h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Empresas unificadas por NIT contable, causales según norma (FA, TA, SO, AU, CO) y Nota Crédito obligatoria (número o N/A).
            {usuario.esAdmin ? " Entras como administrador." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAnularDe("")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-1.5 text-[12.5px] font-semibold text-[#BE123C] transition hover:bg-[#FFE4E6]"
          >
            <Ban className="h-3.5 w-3.5" /> Anular factura
          </button>
          <button
            type="button"
            onClick={() => setImportarAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
          >
            <Upload className="h-3.5 w-3.5" /> Importar Excel
          </button>
          <button
            type="button"
            onClick={exportarExcelCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
          >
            <Download className="h-3.5 w-3.5" /> Exportar Excel
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
            <Users className="h-3.5 w-3.5" /> Empresas (NIT) y responsables
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

      {/* ---------- filtros ---------- */}
      <div className="rounded-[14px] border border-[#E2EBF8] bg-white px-4 py-3 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="f-est" className="sr-only">Filtrar por desenlace</label>
          <select id="f-est" value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={sel}>
            <option value="SIN_RESOLVER">Sin resolver</option>
            <option value="TODAS">Todos los desenlaces</option>
            {ESTADOS.filter((e) => e.id !== "PENDIENTE").map((e) => (
              <option key={e.id} value={e.id}>{e.etiqueta}</option>
            ))}
          </select>

          <label htmlFor="f-sede" className="sr-only">Filtrar por Sede</label>
          <select id="f-sede" value={fSede} onChange={(e) => setFSede(e.target.value)} className={sel}>
            <option value="">Todas las sedes</option>
            <option value="SEDE_1">Sede 1 · Principal</option>
            <option value="SEDE_2">Sede 2 · Consultorios (Mutual)</option>
          </select>

          <label htmlFor="f-aten" className="sr-only">Filtrar por Consulta o Cirugía</label>
          <select id="f-aten" value={fAtencion} onChange={(e) => setFAtencion(e.target.value)} className={sel}>
            <option value="">Consulta y Cirugía (Todas)</option>
            <option value="CONSULTA">Consulta</option>
            <option value="CIRUGIA">Cirugía</option>
            <option value="AYUDA_DX">Ayuda Dx / Proc.</option>
          </select>

          <label htmlFor="f-mut" className="sr-only">Filtro Mutual Ser</label>
          <select
            id="f-mut"
            value={fMutual}
            onChange={(e) => setFMutual(e.target.value as "CON" | "SOLO" | "SIN")}
            className={sel}
          >
            <option value="CON">Con Mutual Ser</option>
            <option value="SOLO">Solo Mutual Ser</option>
            <option value="SIN">Excluir Mutual Ser</option>
          </select>

          <label htmlFor="f-emp" className="sr-only">Filtrar por empresa (NIT)</label>
          <select id="f-emp" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} className={sel}>
            <option value="">Todas las empresas (por NIT)</option>
            {empresasUnificadasEnDatos.map((x) => (
              <option key={x.nombre} value={x.nombre}>
                {x.nombre}{x.nit ? ` · NIT ${x.nit}` : ""}
              </option>
            ))}
          </select>

          <label htmlFor="f-norma" className="sr-only">Filtrar por causa normativa</label>
          <select id="f-norma" value={fCausaNorma} onChange={(e) => setFCausaNorma(e.target.value)} className={sel}>
            <option value="">Todas las causas (norma)</option>
            {CAUSAS_NORMATIVAS.map((c) => (
              <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
            ))}
          </select>

          <label htmlFor="f-anio" className="sr-only">Filtrar por año</label>
          <select id="f-anio" value={fAnio} onChange={(e) => setFAnio(e.target.value)} className={sel}>
            <option value="">Todos los años</option>
            {cat.anios.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>

          <label htmlFor="f-mes" className="sr-only">Filtrar por mes de elaboración</label>
          <select id="f-mes" value={fMes} onChange={(e) => setFMes(e.target.value)} className={sel}>
            <option value="">Todos los meses</option>
            {MESES.filter(([n]) => mesesEnDatos[n]).map(([n, nombre]) => (
              <option key={n} value={n}>{nombre} ({mesesEnDatos[n]})</option>
            ))}
          </select>

          <label htmlFor="f-fact" className="sr-only">Filtrar por responsable o facturador</label>
          <select id="f-fact" value={fFacturador} onChange={(e) => setFFacturador(e.target.value)} className={sel}>
            <option value="">Todos los responsables</option>
            {responsablesEnDatos.map((x) => <option key={x} value={x}>{x}</option>)}
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
      </div>

      {/* ---------- pestañas de vista ---------- */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Pestana activa={vista === "cuadricula"} onClick={() => setVista("cuadricula")}>
          Cuadrícula cruzada de glosas ({visibles.length})
        </Pestana>
        <Pestana activa={vista === "pendientes"} onClick={() => setVista("pendientes")}>
          Servicios clínicos / Pendientes ({pendientesVisibles.length})
        </Pestana>
        <Pestana activa={vista === "anuladas"} onClick={() => setVista("anuladas")}>
          Facturas anuladas ({anuladasVisibles.length})
        </Pestana>
        <Pestana activa={vista === "resumen"} onClick={() => setVista("resumen")}>
          Resumen normativo y defensa
        </Pestana>
        <span className="ml-2 font-cifra text-[11.5px] text-[#94A3B8]">
          Facturado: {pesos(m.facturado)} · Glosado: {pesos(m.glosado)}
        </span>
        {m.sinNC > 0 && (
          <span className="ml-2 rounded-pill bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
            {m.sinNC} sin N° Nota Crédito o N/A
          </span>
        )}
        {fMes && sinFecha > 0 && (
          <span className="text-[11.5px] text-[#B45309]">
            {sinFecha} glosas quedan fuera: no tienen fecha de factura.
          </span>
        )}
      </div>

      {/* ---------- RESUMEN ---------- */}
      {vista === "resumen" && (
        <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-5">
            <Cifra titulo="Valor facturado" valor={pesos(m.facturado)} pie={`${visibles.length} registros`} />
            <Cifra titulo="Glosado" valor={pesos(m.glosado)} pie="total objetado" />
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
              titulo="Sin causal / Sin NC"
              valor={`${m.sinCausal} / ${m.sinNC}`}
              pie="pendientes por completar"
              acento={m.sinCausal > 0 || m.sinNC > 0 ? "#B45309" : undefined}
            />
          </div>

          {/* 5 Causas principales según la norma (FA, TA, SO, AU, CO) */}
          <div className="mt-5 border-t border-[#F1F5F9] pt-4">
            <p className="eb-label mb-2.5 text-[10px] text-[#64748B]">
              Causas principales de glosas según la norma (FA, TA, SO, AU, CO)
            </p>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
              {CAUSAS_NORMATIVAS.map((c) => {
                const d = m.porNorma[c.codigo] || { monto: 0, cantidad: 0 };
                const pct = m.glosado > 0 ? Math.round((d.monto / m.glosado) * 100) : 0;
                const activo = fCausaNorma === c.codigo;
                return (
                  <button
                    key={c.codigo}
                    type="button"
                    onClick={() => setFCausaNorma(activo ? "" : c.codigo)}
                    className={`rounded-xl border p-3 text-left transition ${activo ? "ring-2 ring-[#1D58D8]" : "hover:bg-[#FAFCFF]"}`}
                    style={{ borderColor: c.badgeBorder }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-pill px-2 py-0.5 text-[10.5px] font-bold"
                        style={{ backgroundColor: c.badgeBg, color: c.badgeText }}
                      >
                        {c.codigo} · {c.nombre}
                      </span>
                      <span className="font-cifra text-[11px] font-bold" style={{ color: c.badgeText }}>{pct}%</span>
                    </div>
                    <p className="mt-1.5 font-cifra text-[15px] font-bold text-[#0E245E]">{pesos(d.monto)}</p>
                    <p className="mt-0.5 text-[10.5px] text-[#64748B]">{d.cantidad} glosas</p>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-[#64748B]" title={c.descripcion}>
                      {c.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>
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
              <Ranking titulo="Empresas unificadas por NIT" filas={m.empresas.slice(0, 8)} total={m.glosado} />
              <Ranking
                titulo="Causales más frecuentes"
                filas={m.causales.slice(0, 8)}
                total={m.glosado}
                etiqueta={(k) => `${k} · ${causalPorCodigo[k]?.nombre || ""}`}
              />
            </div>
          )}

          {m.glosado > 0 && (
            <div className="mt-5 grid gap-5 border-t border-[#F1F5F9] pt-4 md:grid-cols-2">
              <Ranking titulo="Por responsable de responder la glosa" filas={m.responsables.slice(0, 8)} total={m.glosado} />
              <Ranking
                titulo="Por facturador"
                filas={m.facturadores.slice(0, 8)}
                total={m.glosado}
                onClick={(k) => setFFacturador(fFacturador === k ? "" : k)}
                activo={fFacturador}
              />
              <Ranking
                titulo="Por año"
                filas={m.anios}
                total={m.glosado}
                onClick={(k) => setFAnio(fAnio === k ? "" : k)}
                activo={fAnio}
              />
              <Ranking
                titulo="Por desenlace"
                filas={m.estados.map(([k, v]) => [ETIQUETA[k] || k, v] as [string, number])}
                total={m.glosado}
              />
            </div>
          )}
        </div>
      )}


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
          onCambio={(msg) => {
            avisar(msg);
            void traer();
          }}
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

      {/* ---------- FACTURAS ANULADAS ---------- */}
      {vista === "anuladas" && (
        <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14.5px] font-bold text-[#0E245E]">
                Registro de facturas anuladas y reemplazadas ({anuladasVisibles.length})
              </h3>
              <p className="text-[11.5px] text-[#64748B]">
                Control de anulación con trazabilidad de fecha de factura, radicación, fecha de anulación, responsable y motivo.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!anuladas.some((a) => a.factura.toUpperCase() === "FCOE0000001" && a.estadoGestion === "ANULADA") && (
                <button
                  type="button"
                  onClick={() => setAnularDe("FCOE0000001")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-1.5 text-[12px] font-semibold text-[#BE123C] transition hover:bg-[#FFE4E6]"
                >
                  <Ban className="h-3.5 w-3.5" /> Anular FCOE0000001
                </button>
              )}
              <button
                type="button"
                onClick={() => setAnularDe("")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E245E] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1A3174]"
              >
                <Ban className="h-3.5 w-3.5" /> Anular factura
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                  <th className="py-2 pr-3">Factura · Fechas</th>
                  <th className="py-2 pr-3">Sede</th>
                  <th className="py-2 pr-3">Consulta / Cirugía</th>
                  <th className="py-2 pr-3">Empresa Homologada (NIT)</th>
                  <th className="py-2 pr-3">De dónde es</th>
                  <th className="py-2 pr-3">Nombres / Responsable</th>
                  <th className="py-2 pr-3 text-right">Valor facturado</th>
                  <th className="py-2 pr-3">Motivo / Reemplazo</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#94A3B8]">
                      <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Cargando…
                    </td>
                  </tr>
                )}
                {!cargando && anuladasVisibles.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#94A3B8]">
                      No hay facturas anuladas que coincidan con el filtro actual.
                    </td>
                  </tr>
                )}
                {anuladasVisibles.slice(0, 200).map((a) => {
                  const cr = cruzarFila({ ...a, motivoTexto: a.motivo });
                  return (
                    <tr key={a.id} className="border-b border-[#F1F5F9] align-top hover:bg-[#F8FAFC]">
                      <td className="py-2 pr-3 font-cifra">
                        <span className="block font-semibold text-[#0E245E]">{a.factura}</span>
                        <span className="block text-[10.5px] text-[#64748B]">
                          F: {fecha(a.fechaFactura)} · Rad: {fecha(a.fechaRadicacion)}
                        </span>
                        {a.fechaAnulacion && (
                          <span className="block text-[10px] text-[#BE123C]">Anul: {fecha(a.fechaAnulacion)}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold ${
                            cr.sedeGrupo === "SEDE_2"
                              ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"
                              : "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                          }`}
                        >
                          {cr.sede}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold ${
                            cr.tipoGrupo === "CIRUGIA"
                              ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]"
                              : cr.tipoGrupo === "CONSULTA"
                              ? "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]"
                              : cr.tipoGrupo === "AYUDA_DX"
                              ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                              : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                          }`}
                        >
                          {cr.tipoAtencion}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[#47597A]">
                        <span className="block font-semibold text-[#0E245E]">{cr.empresaHomologada || a.empresa || "—"}</span>
                        {cr.nit && <span className="block font-cifra text-[10.5px] text-[#64748B]">NIT {cr.nit}</span>}
                      </td>
                      <td className="py-2 pr-3 text-[11.5px] text-[#334155]">{cr.deDondeEs}</td>
                      <td className="py-2 pr-3 text-[11.5px]">
                        {cr.pacienteNombre && (
                          <span className="block font-semibold text-[#0E245E]">Pac: {cr.pacienteNombre}</span>
                        )}
                        {cr.medicoNombre && (
                          <span className="block text-[10.5px] text-[#47597A]">Dr(a): {cr.medicoNombre}</span>
                        )}
                        <span className="block text-[10.5px] text-[#64748B]">Resp: {a.responsable || "—"}</span>
                      </td>
                      <td className="py-2 pr-3 text-right font-cifra font-semibold text-[#0E245E]">
                        {pesos(a.valorRadicado)}
                      </td>
                      <td className="max-w-[260px] py-2 pr-3 text-[#47597A]">
                        <span className="block">{a.motivo || "—"}</span>
                        {a.facturaReemplaza && (
                          <span className="block font-cifra text-[10.5px] font-semibold text-[#1D58D8]">
                            Reemplazo: {a.facturaReemplaza}
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className="rounded-pill border border-[#FECDD3] bg-[#FFF1F2] px-2 py-0.5 text-[10.5px] font-semibold text-[#BE123C]">
                          {a.estadoGestion || "ANULADA"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- SERVICIOS CLÍNICOS / PENDIENTES POR FACTURAR ---------- */}
      {vista === "pendientes" && (
        <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
          <div className="mb-3">
            <h3 className="text-[14.5px] font-bold text-[#0E245E]">
              Servicios clínicos y pendientes por facturar ({pendientesVisibles.length})
            </h3>
            <p className="text-[11.5px] text-[#64748B]">
              Cruce directo por CUPS, unidad funcional, sede, convenio, paciente, médico tratante y factura FCOE asociada.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                  <th className="py-2 pr-3">Fecha · Factura</th>
                  <th className="py-2 pr-3">Sede</th>
                  <th className="py-2 pr-3">Consulta / Cirugía</th>
                  <th className="py-2 pr-3">Empresa Homologada (NIT)</th>
                  <th className="py-2 pr-3">De dónde es</th>
                  <th className="py-2 pr-3">Nombres (Paciente · Médico · Resp.)</th>
                  <th className="py-2 pr-3">Servicio / CUPS</th>
                  <th className="py-2 pr-3 text-right">Valor</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendientesVisibles.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#94A3B8]">
                      No hay servicios clínicos pendientes que coincidan con el filtro.
                    </td>
                  </tr>
                )}
                {pendientesVisibles.slice(0, 200).map((p) => {
                  const empInfo = homologarEmpresaYOrigen({
                    empresa: p.empresa,
                    empresaOriginal: p.empresaOriginal,
                    contrato: p.contrato,
                  });
                  const atInfo = clasificarAtencionYSede({
                    esMutual: empInfo.esMutual,
                    cups: p.cups,
                    unidadFuncional: p.unidadFuncional,
                    descripcion: p.descripcion,
                    contrato: p.contrato,
                  });
                  const sedeTxt = p.sede || atInfo.sede;
                  const sedeGrp = p.sedeGrupo || atInfo.sedeGrupo;
                  const tipoTxt = p.tipoAtencion || atInfo.tipoAtencion;
                  const tipoGrp = p.tipoGrupo || atInfo.tipoGrupo;
                  return (
                    <tr key={p.id} className="border-b border-[#F1F5F9] align-top hover:bg-[#F8FAFC]">
                      <td className="py-2 pr-3 font-cifra">
                        <span className="block font-semibold text-[#0E245E]">{fecha(p.fechaServicio)}</span>
                        {p.facturaAsociada && (
                          <span className="block text-[10.5px] font-bold text-[#1D58D8]">{p.facturaAsociada}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold ${
                            sedeGrp === "SEDE_2"
                              ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"
                              : "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                          }`}
                        >
                          {sedeTxt}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold ${
                            tipoGrp === "CIRUGIA"
                              ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]"
                              : tipoGrp === "CONSULTA"
                              ? "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]"
                              : "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                          }`}
                        >
                          {tipoTxt}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="block font-semibold text-[#0E245E]">
                          {p.empresaHomologada || empInfo.empresaHomologada}
                        </span>
                        {(p.nit || empInfo.nit) && (
                          <span className="block font-cifra text-[10.5px] text-[#64748B]">
                            NIT {p.nit || empInfo.nit}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-[11.5px] text-[#334155]">
                        <span className="block font-medium">{p.deDondeEs || empInfo.deDondeEs}</span>
                        {p.contrato && <span className="block truncate max-w-[180px] text-[10px] text-[#64748B]" title={p.contrato}>{p.contrato}</span>}
                      </td>
                      <td className="py-2 pr-3 text-[11.5px]">
                        {p.pacienteNombre ? (
                          <span className="block font-semibold text-[#0E245E]">
                            Pac: {p.pacienteNombre}{p.pacienteDoc ? ` (${p.pacienteDoc})` : ""}
                          </span>
                        ) : (
                          <span className="block text-[10.5px] text-[#94A3B8]">Sin paciente en fila</span>
                        )}
                        {p.medico && <span className="block text-[11px] text-[#334155]">Dr(a): {p.medico}</span>}
                        {p.responsable && <span className="block text-[10.5px] text-[#64748B]">Resp: {p.responsable}</span>}
                      </td>
                      <td className="max-w-[260px] py-2 pr-3 text-[11.5px] text-[#47597A]">
                        {p.cups && <span className="mr-1.5 font-cifra font-bold text-[#0E245E]">[{p.cups}]</span>}
                        <span>{p.descripcion}</span>
                      </td>
                      <td className="py-2 pr-3 text-right font-cifra font-semibold text-[#0E245E]">
                        {pesos(p.valorServicio)}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold ${
                            p.estado === "FACTURADO"
                              ? "border-[#BFE0CC] bg-[#DCEEE3] text-[#146138]"
                              : "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- CUADRÍCULA ---------- */}
      {vista === "cuadricula" && (
        <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                  <th className="w-6 py-2" />
                  <th className="py-2 pr-3">Factura · Fechas</th>
                  <th className="py-2 pr-3">Sede · Atención</th>
                  <th className="py-2 pr-3">Empresa (NIT) · De dónde es</th>
                  <th className="py-2 pr-3">Nombres / Resp. Glosa</th>
                  <th className="py-2 pr-3">Clase</th>
                  <th className="py-2 pr-3">Causal</th>
                  <th className="py-2 pr-3 text-right">Facturado</th>
                  <th className="py-2 pr-3 text-right">Glosado</th>
                  <th className="py-2 pr-3 text-right">Aceptado</th>
                  <th className="py-2 pr-3">Desenlace</th>
                  <th className="py-2 pr-3">Nota crédito *</th>
                  <th className="w-6 py-2" />
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-[#94A3B8]">
                      <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Cargando…
                    </td>
                  </tr>
                )}
                {!cargando && visibles.length === 0 && !fallo && (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-[#94A3B8]">
                      {glosas.length === 0 ? "Todavía no hay glosas en la base." : "Nada coincide con el filtro."}
                    </td>
                  </tr>
                )}
                {visibles.slice(0, 150).map((g) => (
                  <FilaGlosa
                    key={g.id}
                    glosa={g}
                    cruce={cruzarFila({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` })}
                    causales={cat.causales}
                    causal={causalPorCodigo[g.motivoCodigo]}
                    guardando={guardando === g.id}
                    guardado={guardado === g.id}
                    avisar={avisar}
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
            <span>
              La flecha izquierda despliega fechas completas, facturador y responsable. Doble clic abre la ficha (o permite anular la factura).
            </span>
          </div>
        </div>
      )}

      {fichaDe && hermanas.length > 0 && (
        <FichaFactura
          factura={fichaDe}
          glosas={hermanas}
          causalPorCodigo={causalPorCodigo}
          onAnular={(num) => {
            setFichaDe(null);
            setAnularDe(num);
          }}
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

      {anularDe !== null && (
        <ModalAnularFactura
          facturaInicial={anularDe}
          glosas={glosas}
          guardando={guardando === "anular"}
          onCerrar={() => setAnularDe(null)}
          onConfirmar={async (fila) => {
            const ok = await guardar({ id: "anular", ...fila }, "EDITAR", "anular");
            if (ok) {
              avisar(`Factura ${String(fila.factura || "")} marcada como ANULADA.`);
              setAnularDe(null);
            }
          }}
        />
      )}

      {importarAbierto && (
        <ModalImportarExcel
          onCerrar={() => setImportarAbierto(false)}
          onImportado={(msg) => {
            avisar(msg);
            setImportarAbierto(false);
            void traer();
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
   PANEL DE CATÁLOGOS — responsables, facturadores y empresas (unificación por NIT)
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
  const [cual, setCual] = useState<"cf_empresas" | "cf_responsables">("cf_empresas");
  const [soloDuplicadosNit, setSoloDuplicadosNit] = useState(false);

  const traer = useCallback(async () => {
    setCargando(true);
    setFallo("");
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

  useEffect(() => {
    void traer();
  }, [traer]);

  const accion = async (cuerpo: Record<string, unknown>) => {
    setOcupado(true);
    try {
      const r = await fetch("/api/cartera/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabla: cual, ...cuerpo }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        onCambio("NO SE PUDO: " + (j?.error || r.statusText));
        return false;
      }
      await traer();
      onCambio(j.mensaje || "Catálogo actualizado.");
      return true;
    } catch {
      onCambio("NO SE PUDO: sin conexión.");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const conteoPorNit = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const emp of empresas) {
      const { nit } = normalizarEmpresaYNit(emp.nombre);
      if (nit) mapa[nit] = (mapa[nit] || 0) + 1;
    }
    return mapa;
  }, [empresas]);

  const duplicadosNitTotal = useMemo(
    () => empresas.filter((e) => {
      const { nit } = normalizarEmpresaYNit(e.nombre);
      return nit && (conteoPorNit[nit] || 0) > 1;
    }).length,
    [empresas, conteoPorNit],
  );

  const filasBase = cual === "cf_empresas" ? empresas : responsables;
  const filas = useMemo(() => {
    if (cual !== "cf_empresas" || !soloDuplicadosNit) return filasBase;
    return filasBase.filter((e) => {
      const { nit } = normalizarEmpresaYNit(e.nombre);
      return nit && (conteoPorNit[nit] || 0) > 1;
    });
  }, [cual, soloDuplicadosNit, filasBase, conteoPorNit]);

  const titulo = cual === "cf_empresas" ? "empresas" : "responsables";

  return (
    <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-[#0E245E]">
            <Building2 className="h-4 w-4 text-[#1D58D8]" />
            Empresas (unificación por NIT) y responsables de glosas
          </h3>
          <p className="mt-0.5 max-w-[88ch] text-[12px] text-[#64748B]">
            Las empresas que comparten el mismo NIT contable de SISMA se identifican automáticamente para
            unificarlas con <strong>Fusionar</strong> sin perder historial. También puedes crear, renombrar o
            desactivar responsables de facturación y de respuesta de glosas.
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

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Pestana activa={cual === "cf_empresas"} onClick={() => setCual("cf_empresas")}>
          Empresas ({empresas.length})
        </Pestana>
        <Pestana activa={cual === "cf_responsables"} onClick={() => setCual("cf_responsables")}>
          Responsables y facturadores ({responsables.length})
        </Pestana>
        {cual === "cf_empresas" && duplicadosNitTotal > 0 && (
          <label className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[11.5px] font-semibold text-[#B45309]">
            <input
              type="checkbox"
              checked={soloDuplicadosNit}
              onChange={(e) => setSoloDuplicadosNit(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#D97706]"
            />
            Solo NIT duplicado ({duplicadosNitTotal})
          </label>
        )}
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
              {cual === "cf_empresas" && <th className="py-2 pr-3">NIT SISMA / Unificación</th>}
              <th className="py-2 pr-3 text-right">Registros</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Fusionar con</th>
              <th className="w-24 py-2" />
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={cual === "cf_empresas" ? 6 : 5} className="py-6 text-center text-[#94A3B8]">
                  <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Cargando…
                </td>
              </tr>
            )}
            {!cargando &&
              filas.map((f) => (
                <FilaCat
                  key={f.id}
                  item={f}
                  esEmpresa={cual === "cf_empresas"}
                  conteoPorNit={conteoPorNit}
                  filas={filasBase}
                  esAdmin={esAdmin}
                  ocupado={ocupado}
                  accion={accion}
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
}: {
  ocupado: boolean;
  titulo: string;
  onCrear: (n: string) => Promise<boolean>;
}) {
  const [n, setN] = useState("");
  return (
    <div className="ml-auto flex items-center gap-1.5">
      <label htmlFor="nuevo-cat" className="sr-only">Nombre del nuevo</label>
      <input
        id="nuevo-cat"
        value={n}
        onChange={(e) => setN(e.target.value.toUpperCase())}
        placeholder={`Agregar a ${titulo}…`}
        className="w-52 rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8]"
      />
      <button
        type="button"
        disabled={!n.trim() || ocupado}
        onClick={async () => {
          if (await onCrear(n.trim())) setN("");
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-[#1D58D8] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar
      </button>
    </div>
  );
}

function FilaCat({
  item, esEmpresa, conteoPorNit, filas, esAdmin, ocupado, accion,
}: {
  item: ItemCat;
  esEmpresa: boolean;
  conteoPorNit: Record<string, number>;
  filas: ItemCat[];
  esAdmin: boolean;
  ocupado: boolean;
  accion: (c: Record<string, unknown>) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState(item.nombre);
  const [hacia, setHacia] = useState("");
  useEffect(() => {
    setNombre(item.nombre);
  }, [item.nombre]);
  const cambiado = nombre.trim() !== item.nombre && nombre.trim() !== "";
  const infoNit = esEmpresa ? normalizarEmpresaYNit(item.nombre) : { nit: "", nombre: "" };
  const nitRepetido = !!(infoNit.nit && (conteoPorNit[infoNit.nit] || 0) > 1);

  return (
    <tr className={`border-b border-[#F1F5F9] align-middle ${item.activo ? "" : "bg-[#FAFBFC]"}`}>
      <td className="py-2 pr-3">
        <label htmlFor={`cat-${item.id}`} className="sr-only">Nombre</label>
        <input
          id={`cat-${item.id}`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value.toUpperCase())}
          className={`w-full max-w-[260px] rounded-lg border px-2 py-1.5 text-[12.5px] outline-none focus:border-[#1D58D8] ${
            cambiado ? "border-[#1D58D8] bg-[#F6F9FE]" : "border-transparent hover:border-[#DCE8FA]"
          } ${item.activo ? "text-[#0E245E]" : "text-[#94A3B8] line-through"}`}
        />
      </td>
      {esEmpresa && (
        <td className="py-2 pr-3">
          {infoNit.nit ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-cifra text-[11.5px] font-semibold text-[#0E245E]">NIT {infoNit.nit}</span>
              <span className="text-[11px] text-[#64748B]">→ {infoNit.nombre}</span>
              {nitRepetido && (
                <span className="rounded-pill border border-[#FDE68A] bg-[#FFFBEB] px-1.5 py-0.5 text-[10px] font-bold text-[#B45309]">
                  NIT compartido · unificar
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-[#94A3B8]">Sin NIT en corte SISMA</span>
          )}
        </td>
      )}
      <td className="py-2 pr-3 text-right font-cifra text-[#47597A]">{item.usos}</td>
      <td className="py-2 pr-3">
        <span
          className={`rounded-pill border px-2 py-0.5 text-[10.5px] font-semibold ${
            item.activo ? "border-[#BFE0CC] bg-[#DCEEE3] text-[#146138]" : "border-[#D8DEE9] bg-[#F1F3F7] text-[#47597A]"
          }`}
        >
          {item.activo ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td className="py-2 pr-3">
        {esAdmin && item.usos > 0 && (
          <div className="flex items-center gap-1.5">
            <label htmlFor={`fus-${item.id}`} className="sr-only">Fusionar con</label>
            <select
              id={`fus-${item.id}`}
              value={hacia}
              onChange={(e) => setHacia(e.target.value)}
              className="max-w-[190px] rounded-lg border border-[#DCE8FA] px-2 py-1.5 text-[12px] outline-none focus:border-[#1D58D8]"
            >
              <option value="">—</option>
              {filas
                .filter((x) => x.id !== item.id)
                .map((x) => {
                  const nX = esEmpresa ? normalizarEmpresaYNit(x.nombre).nit : "";
                  return (
                    <option key={x.id} value={x.id}>
                      {x.nombre}{nX ? ` (NIT ${nX})` : ""}
                    </option>
                  );
                })}
            </select>
            <button
              type="button"
              disabled={!hacia || ocupado}
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
              type="button"
              disabled={ocupado}
              onClick={() => accion({ accion: "RENOMBRAR", id: item.id, nombre: nombre.trim() })}
              className="rounded-lg bg-[#1D58D8] px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1747B0]"
            >
              Guardar
            </button>
          )}
          {!cambiado && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => accion({ accion: item.activo ? "DESACTIVAR" : "ACTIVAR", id: item.id })}
              className="rounded-lg border border-[#DCE8FA] px-2.5 py-1.5 text-[12px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
            >
              {item.activo ? "Desactivar" : "Activar"}
            </button>
          )}
          {esAdmin && item.usos === 0 && !cambiado && (
            <button
              type="button"
              disabled={ocupado}
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
   PANEL PARA CLASIFICAR EN LOTE (FA, TA, SO, AU, CO + subcódigos Res. 2284)
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
  const codigosNorma = new Set<string>(CAUSAS_NORMATIVAS.map((c) => c.codigo));

  return (
    <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[#0E245E]">Clasificar motivos según la norma</h3>
          <p className="mt-0.5 max-w-[82ch] text-[12px] text-[#64748B]">
            {totalFilas} glosas sin causal, en {filas.length} redacciones distintas, por{" "}
            <span className="font-cifra font-semibold text-[#0E245E]">{pesos(totalValor)}</span>. Puedes
            asignar directamente las 5 causas principales (<strong>FA, TA, SO, AU, CO</strong>) o un subcódigo
            específico de la Resolución 2284.
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
              <th className="py-2 pr-3">Causal según la norma</th>
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
                    className="w-full max-w-[320px] rounded-lg border border-[#DCE8FA] px-2 py-1.5 text-[12px] outline-none focus:border-[#1D58D8]"
                  >
                    <option value="">— elegir —</option>
                    <optgroup label="Causas principales según la norma">
                      {CAUSAS_NORMATIVAS.map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.codigo} · {c.nombre} — {c.descripcion}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Subcódigos Resolución 2284">
                      {causales
                        .filter((c) => !codigosNorma.has(c.codigo))
                        .map((c) => (
                          <option key={c.codigo} value={c.codigo}>
                            {c.codigo} · {c.familia} · {c.nombre}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={!elegido[texto] || guardando !== null}
                    onClick={async () => {
                      const ok = await onAplicar(texto, elegido[texto]);
                      if (ok) {
                        setElegido((p) => {
                          const q = { ...p };
                          delete q[texto];
                          return q;
                        });
                      }
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
  glosa, cruce, causales, causal, guardando, guardado, avisar, onGuardar, onFicha,
}: {
  glosa: Glosa;
  cruce: {
    nit: string;
    empresaHomologada: string;
    esMutual: boolean;
    deDondeEs: string;
    sede: string;
    sedeGrupo: string;
    tipoAtencion: string;
    tipoGrupo: string;
    pacienteNombre: string;
    pacienteDoc: string;
    medicoNombre: string;
    fechaFacturaSisma: string;
    fechaRadicacionSisma: string;
    saldoSisma?: number;
  };
  causales: Causal[];
  causal?: Causal;
  guardando: boolean;
  guardado: boolean;
  avisar: (msg: string) => void;
  onGuardar: (fila: Record<string, unknown>, accion: "CREAR" | "EDITAR") => Promise<boolean>;
  onFicha: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [listaCausales, setListaCausales] = useState(false);
  const [estado, setEstado] = useState(glosa.estado);
  const [aceptado, setAceptado] = useState(
    glosa.valorAceptado == null ? "" : String(Math.round(glosa.valorAceptado)),
  );
  const [nota, setNota] = useState(glosa.notaCredito || "");
  const [respGlosa, setRespGlosa] = useState(glosa.responsableAceptacion || "");
  const [facturador, setFacturador] = useState(glosa.facturador || "");
  const [fechaFact, setFechaFact] = useState((glosa.fechaFactura || "").slice(0, 10));
  const [fechaRad, setFechaRad] = useState((glosa.fechaRadicacion || "").slice(0, 10));
  const [fechaNotif, setFechaNotif] = useState((glosa.fechaNotificacionGlosa || "").slice(0, 10));
  const [valFact, setValFact] = useState(
    String(Math.round(glosa.valorFacturado || glosa.valorRadicado || 0)),
  );
  const [obs, setObs] = useState(glosa.observacionInterna || "");
  const [motivo, setMotivo] = useState(glosa.motivoGlosa || "");
  const [codigo, setCodigo] = useState(glosa.motivoCodigo || "");
  const [clase, setClase] = useState(claseDe(glosa));

  const ultimo = useRef({
    aceptado: "",
    nota: "",
    respGlosa: "",
    facturador: "",
    fechaFact: "",
    fechaRad: "",
    fechaNotif: "",
    valFact: "",
    obs: "",
    motivo: "",
  });

  useEffect(() => {
    const a = glosa.valorAceptado == null ? "" : String(Math.round(glosa.valorAceptado));
    const vf = String(Math.round(glosa.valorFacturado || glosa.valorRadicado || 0));
    const ff = (glosa.fechaFactura || "").slice(0, 10);
    const fr = (glosa.fechaRadicacion || "").slice(0, 10);
    const fn = (glosa.fechaNotificacionGlosa || "").slice(0, 10);
    setEstado(glosa.estado);
    setAceptado(a);
    setNota(glosa.notaCredito || "");
    setRespGlosa(glosa.responsableAceptacion || "");
    setFacturador(glosa.facturador || "");
    setFechaFact(ff);
    setFechaRad(fr);
    setFechaNotif(fn);
    setValFact(vf);
    setObs(glosa.observacionInterna || "");
    setMotivo(glosa.motivoGlosa || "");
    setCodigo(glosa.motivoCodigo || "");
    setClase(claseDe(glosa));
    ultimo.current = {
      aceptado: a,
      nota: glosa.notaCredito || "",
      respGlosa: glosa.responsableAceptacion || "",
      facturador: glosa.facturador || "",
      fechaFact: ff,
      fechaRad: fr,
      fechaNotif: fn,
      valFact: vf,
      obs: glosa.observacionInterna || "",
      motivo: glosa.motivoGlosa || "",
    };
  }, [
    glosa.id, glosa.estado, glosa.valorAceptado, glosa.notaCredito, glosa.responsableAceptacion,
    glosa.facturador, glosa.fechaFactura, glosa.fechaRadicacion, glosa.fechaNotificacionGlosa,
    glosa.valorFacturado, glosa.valorRadicado, glosa.observacionInterna, glosa.motivoGlosa,
    glosa.motivoCodigo, glosa.tipoGlosa, glosa.alcance,
  ]);

  const enviar = (parcial: Record<string, unknown>) => {
    void onGuardar(
      {
        ...glosa,
        estado,
        notaCredito: nota,
        responsableAceptacion: respGlosa,
        responsableRespuesta: respGlosa,
        facturador,
        fechaFactura: fechaFact,
        fechaRadicacion: fechaRad,
        fechaNotificacionGlosa: fechaNotif,
        valorFacturado: soloNumero(valFact),
        valorRadicado: soloNumero(valFact),
        observacionInterna: obs,
        motivoGlosa: motivo,
        motivoCodigo: codigo,
        ...parcial,
      },
      "EDITAR",
    );
  };

  const salir = () => {
    const u = ultimo.current;
    if (
      aceptado === u.aceptado &&
      nota === u.nota &&
      respGlosa === u.respGlosa &&
      facturador === u.facturador &&
      fechaFact === u.fechaFact &&
      fechaRad === u.fechaRad &&
      fechaNotif === u.fechaNotif &&
      valFact === u.valFact &&
      obs === u.obs &&
      motivo === u.motivo
    ) {
      return;
    }

    let notaFinal = nota.trim();
    if (notaFinal.toUpperCase() === "NA" || notaFinal.toUpperCase() === "NO APLICA") {
      notaFinal = "N/A";
      setNota("N/A");
    }
    if (notaFinal !== u.nota && !esNotaCreditoValida(notaFinal)) {
      avisar("Nota Crédito obligatoria: ingresa el número consecutivo o N/A.");
      setNota(u.nota);
      return;
    }

    ultimo.current = {
      aceptado,
      nota: notaFinal,
      respGlosa,
      facturador,
      fechaFact,
      fechaRad,
      fechaNotif,
      valFact,
      obs,
      motivo,
    };
    enviar({
      valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado),
      notaCredito: notaFinal,
      responsableAceptacion: respGlosa.trim(),
      responsableRespuesta: respGlosa.trim(),
      facturador: facturador.trim(),
      fechaFactura: fechaFact,
      fechaRadicacion: fechaRad,
      fechaNotificacionGlosa: fechaNotif,
      valorFacturado: soloNumero(valFact),
      valorRadicado: soloNumero(valFact),
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
    ultimo.current = { ...ultimo.current, aceptado: p };
    enviar({ estado: nuevo, valorAceptado: p.trim() === "" ? null : soloNumero(p) });
  };

  const vistaFila: Glosa = { ...glosa, valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado) };
  const pago = clasePago(vistaFila);
  const excede =
    vistaFila.valorAceptado !== null && glosa.valorGlosado > 0 && vistaFila.valorAceptado > glosa.valorGlosado;
  const empInfo = normalizarEmpresaYNit(glosa.empresa || glosa.empresaOriginal);
  const ncValida = esNotaCreditoValida(nota);
  const codigosNorma = new Set<string>(CAUSAS_NORMATIVAS.map((c) => c.codigo));

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
        <td className="py-1.5 pr-3 font-cifra">
          <span className="block text-[12.5px] font-semibold text-[#0E245E]">{glosa.factura}</span>
          <span className="block text-[10.5px] text-[#64748B]" title="Fecha de factura">
            F: {fechaFact ? fecha(fechaFact) : cruce.fechaFacturaSisma ? fecha(cruce.fechaFacturaSisma) : glosa.anio || "—"}
          </span>
          {fechaNotif && (
            <span className="block text-[10px] text-[#1D58D8]" title="Fecha de notificación de glosa">
              Notif: {fecha(fechaNotif)}
            </span>
          )}
        </td>
        <td className="py-1.5 pr-3">
          <span
            className={`inline-block rounded-pill border px-1.5 py-0.5 text-[10px] font-semibold ${
              cruce.sedeGrupo === "SEDE_2"
                ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"
                : "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
            }`}
          >
            {cruce.sede}
          </span>
          <span
            className={`mt-1 block w-fit rounded-pill border px-1.5 py-0.5 text-[10px] font-semibold ${
              cruce.tipoGrupo === "CIRUGIA"
                ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]"
                : cruce.tipoGrupo === "CONSULTA"
                ? "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]"
                : cruce.tipoGrupo === "AYUDA_DX"
                ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
            }`}
          >
            {cruce.tipoAtencion}
          </span>
        </td>
        <td className="py-1.5 pr-3 text-[#47597A]">
          <span className="block text-[12px] font-semibold text-[#0E245E]">
            {cruce.empresaHomologada || empInfo.nombre || glosa.empresa || "—"}
          </span>
          {(cruce.nit || empInfo.nit) && (
            <span className="block font-cifra text-[10px] text-[#64748B]">NIT {cruce.nit || empInfo.nit}</span>
          )}
          <span className="block text-[10.5px] font-medium text-[#1D58D8]">{cruce.deDondeEs}</span>
        </td>
        <td className="py-1.5 pr-3">
          {cruce.pacienteNombre && (
            <span className="block text-[11px] font-semibold text-[#0E245E]" title={cruce.pacienteDoc}>
              Pac: {cruce.pacienteNombre}
            </span>
          )}
          {cruce.medicoNombre && (
            <span className="block text-[10.5px] text-[#47597A]">Dr(a): {cruce.medicoNombre}</span>
          )}
          <label htmlFor={`rg-${glosa.id}`} className="sr-only">Responsable de responder la glosa</label>
          <input
            id={`rg-${glosa.id}`}
            list="cat-responsables"
            value={respGlosa}
            onChange={(e) => setRespGlosa(e.target.value.toUpperCase())}
            onBlur={salir}
            placeholder="Resp. glosa"
            title="Responsable de responder la glosa"
            className={`${celda} min-w-[112px] text-[11.5px] font-medium text-[#47597A]`}
          />
          {facturador && (
            <span className="block px-1.5 text-[10px] text-[#94A3B8]">Fact: {facturador}</span>
          )}
        </td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`cla-${glosa.id}`} className="sr-only">Clase de la glosa {glosa.factura}</label>
          <select
            id={`cla-${glosa.id}`}
            value={clase}
            onChange={(e) => cambiarClase(e.target.value)}
            className={`rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${
              clase === "" ? "border-[#E2EBF8] bg-white text-[#94A3B8]" : "border-[#DCE8FA] bg-[#F8FAFC] text-[#1A3174]"
            }`}
          >
            {CLASES.map((c) => (
              <option key={c.id} value={c.id}>{c.etiqueta}</option>
            ))}
          </select>
        </td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`cau-${glosa.id}`} className="sr-only">Causal de la glosa {glosa.factura}</label>
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
            className={`w-[106px] rounded-[6px] border px-1.5 py-1 font-cifra text-[11.5px] font-semibold outline-none ${
              codigo
                ? "border-[#DCE8FA] bg-[#F8FAFC] text-[#1A3174]"
                : "border-[#F3D9A8] bg-[#FFFBEB] text-[#92400E]"
            }`}
          >
            <option value="">sin causal</option>
            {listaCausales ? (
              <>
                <optgroup label="Causas según la norma">
                  {CAUSAS_NORMATIVAS.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.codigo} · {c.nombre}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Subcódigos Res. 2284">
                  {causales
                    .filter((c) => !codigosNorma.has(c.codigo))
                    .map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.codigo} · {c.nombre}
                      </option>
                    ))}
                </optgroup>
              </>
            ) : codigo ? (
              <option value={codigo}>{codigo}</option>
            ) : null}
          </select>
        </td>
        <td className="py-1.5 pr-3 text-right font-cifra text-[#47597A]">
          {pesos(glosa.valorFacturado || glosa.valorRadicado)}
        </td>
        <td className="py-1.5 pr-3 text-right font-cifra font-semibold text-[#0E245E]">
          {pesos(glosa.valorGlosado)}
        </td>
        <td className="py-1.5 pr-3 text-right">
          <label htmlFor={`ace-${glosa.id}`} className="sr-only">Valor aceptado de la glosa {glosa.factura}</label>
          <input
            id={`ace-${glosa.id}`}
            value={aceptado}
            onChange={(e) => setAceptado(e.target.value)}
            onBlur={salir}
            inputMode="numeric"
            placeholder="—"
            className={`${celda} text-right font-cifra`}
          />
          {pago && <span className={`block pr-1.5 text-[10px] font-semibold uppercase ${pago.clase}`}>{pago.texto}</span>}
          {excede && <span className="block pr-1.5 text-[10px] font-semibold text-[#B45309]">supera lo glosado</span>}
        </td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`est-${glosa.id}`} className="sr-only">Desenlace de la glosa {glosa.factura}</label>
          <select
            id={`est-${glosa.id}`}
            value={estado}
            onChange={(e) => cambiarEstado(e.target.value)}
            className={`rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${PASTILLA[estado] || PASTILLA.PENDIENTE}`}
          >
            {ESTADOS.map((e) => (
              <option key={e.id} value={e.id}>{e.etiqueta}</option>
            ))}
          </select>
        </td>
        <td className="py-1.5 pr-3">
          <label htmlFor={`nc-${glosa.id}`} className="sr-only">Nota crédito obligatoria (número o N/A)</label>
          <input
            id={`nc-${glosa.id}`}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onBlur={salir}
            placeholder="N° o N/A"
            title="Obligatorio: número de Nota Crédito o N/A"
            className={`w-[96px] rounded border px-1.5 py-1 font-cifra text-[12px] outline-none focus:border-[#1D58D8] focus:bg-white ${
              ncValida
                ? "border-transparent bg-transparent text-[#0E245E] hover:border-[#DCE8FA]"
                : "border-[#F3D9A8] bg-[#FFFBEB] text-[#92400E]"
            }`}
          />
        </td>
        <td className="py-1.5 text-right">
          {guardando && <Loader2 className="inline h-3.5 w-3.5 animate-spin text-[#1D58D8]" />}
          {!guardando && guardado && <Check className="inline h-3.5 w-3.5 text-[#21814B]" />}
        </td>
      </tr>

      {abierta && (
        <tr className="border-b border-[#E2EBF8] bg-[#FAFCFF]">
          <td />
          <td colSpan={12} className="px-1 pb-4 pt-2">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label htmlFor={`ff-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Fecha de factura
                    </label>
                    <input
                      id={`ff-${glosa.id}`}
                      type="date"
                      value={fechaFact}
                      onChange={(e) => setFechaFact(e.target.value)}
                      onBlur={salir}
                      className="w-full rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 font-cifra text-[12px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`fr-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Fecha de radicación
                    </label>
                    <input
                      id={`fr-${glosa.id}`}
                      type="date"
                      value={fechaRad}
                      onChange={(e) => setFechaRad(e.target.value)}
                      onBlur={salir}
                      className="w-full rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 font-cifra text-[12px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`fn-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Notificación de glosa
                    </label>
                    <input
                      id={`fn-${glosa.id}`}
                      type="date"
                      value={fechaNotif}
                      onChange={(e) => setFechaNotif(e.target.value)}
                      onBlur={salir}
                      className="w-full rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 font-cifra text-[12px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`vf-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Valor facturado
                    </label>
                    <input
                      id={`vf-${glosa.id}`}
                      inputMode="numeric"
                      value={valFact}
                      onChange={(e) => setValFact(e.target.value)}
                      onBlur={salir}
                      className="w-full rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 font-cifra text-[12px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`fa-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Facturador
                    </label>
                    <input
                      id={`fa-${glosa.id}`}
                      list="cat-responsables"
                      value={facturador}
                      onChange={(e) => setFacturador(e.target.value.toUpperCase())}
                      onBlur={salir}
                      placeholder="Quien elaboró factura"
                      className="w-full rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 text-[12px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`rga-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Responsable de glosa
                    </label>
                    <input
                      id={`rga-${glosa.id}`}
                      list="cat-responsables"
                      value={respGlosa}
                      onChange={(e) => setRespGlosa(e.target.value.toUpperCase())}
                      onBlur={salir}
                      placeholder="Quien responde la glosa"
                      className="w-full rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 text-[12px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`mot-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                    Observación del motivo · lo que notificó la entidad
                  </label>
                  <textarea
                    id={`mot-${glosa.id}`}
                    value={motivo}
                    rows={2}
                    onChange={(e) => setMotivo(e.target.value)}
                    onBlur={salir}
                    placeholder="Sin motivo escrito"
                    className="w-full resize-y rounded-lg border border-[#DCE8FA] bg-white px-2.5 py-2 text-[12.5px] leading-relaxed text-[#2A335A] outline-none focus:border-[#1D58D8]"
                  />
                </div>
                <div>
                  <label htmlFor={`obg-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                    Observación general · respuesta / nota interna
                  </label>
                  <textarea
                    id={`obg-${glosa.id}`}
                    value={obs}
                    rows={2}
                    onChange={(e) => setObs(e.target.value)}
                    onBlur={salir}
                    placeholder="Sin observación"
                    className="w-full resize-y rounded-lg border border-[#DCE8FA] bg-white px-2.5 py-2 text-[12.5px] leading-relaxed text-[#2A335A] outline-none focus:border-[#1D58D8]"
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 self-start rounded-lg border border-[#E2EBF8] bg-white p-3">
                <Detalle etiqueta="Causal" valor={causal ? `${causal.codigo} · ${causal.familia}` : "Sin clasificar"} />
                <Detalle
                  etiqueta="Empresa unificada / NIT"
                  valor={empInfo.nit ? `${empInfo.nombre} · NIT ${empInfo.nit}` : empInfo.nombre || glosa.empresa || "—"}
                />
                <Detalle etiqueta="Sede y atención" valor={`${cruce.sede} · ${cruce.tipoAtencion}`} />
                <Detalle etiqueta="De dónde es" valor={cruce.deDondeEs || "—"} />
                <Detalle etiqueta="Paciente / Médico (cruce)" valor={cruce.pacienteNombre ? `${cruce.pacienteNombre}${cruce.medicoNombre ? ` · Dr(a). ${cruce.medicoNombre}` : ""}` : "Factura contable sin detalle clínico"} />
                <Detalle etiqueta="Empresa original (fuente)" valor={glosa.empresaOriginal || glosa.empresa || "—"} />
                <Detalle etiqueta="Nota crédito" valor={nota || "Pendiente (obligatorio N° o N/A)"} />
                <Detalle etiqueta="Fecha factura" valor={fecha(fechaFact)} />
                <Detalle etiqueta="Fecha radicación" valor={fecha(fechaRad)} />
                <Detalle etiqueta="Notificación glosa" valor={fecha(fechaNotif)} />
                <Detalle etiqueta="Responsable respuesta" valor={respGlosa || "—"} />
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
  factura, glosas, causalPorCodigo, onAnular, onCerrar,
}: {
  factura: string;
  glosas: Glosa[];
  causalPorCodigo: Record<string, Causal>;
  onAnular: (factura: string) => void;
  onCerrar: () => void;
}) {
  const base = glosas[0];
  const empInfo = normalizarEmpresaYNit(base.empresa || base.empresaOriginal);
  const valorFact = base.valorFacturado || base.valorRadicado || 0;
  const totalGlosado = glosas.reduce((a, g) => a + (g.valorGlosado || 0), 0);
  const totalAceptado = glosas.reduce((a, g) => a + (g.valorAceptado ?? 0), 0);
  const sinResolver = glosas.filter((g) => g.estado === "PENDIENTE");
  const excede = valorFact > 0 && totalGlosado > valorFact;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label={`Factura ${factura}`}>
      <div className="max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#E2EBF8] px-5 py-4">
          <div className="min-w-0">
            <p className="eb-label text-[10.5px] text-[#64748B]">
              {empInfo.nombre || base.empresa}
              {empInfo.nit ? ` · NIT ${empInfo.nit}` : ""}
              {base.responsableAceptacion ? ` · Resp. Glosa: ${base.responsableAceptacion}` : ""}
            </p>
            <p className="mt-1 font-cifra text-[24px] font-bold leading-none text-[#0E245E]">{factura}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAnular(factura)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-1.5 text-[12px] font-semibold text-[#BE123C] transition hover:bg-[#FFE4E6]"
            >
              <Ban className="h-3.5 w-3.5" /> Anular factura
            </button>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="rounded-lg border border-[#DCE8FA] p-1.5 text-[#47597A] transition hover:bg-[#F8FAFC]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-[#E2EBF8] px-5 py-4 sm:grid-cols-4">
          <Dato etiqueta="Valor facturado" valor={pesos(valorFact)} />
          <Dato etiqueta="Glosado" valor={pesos(totalGlosado)} alerta={excede} />
          <Dato etiqueta="Aceptado" valor={pesos(totalAceptado)} />
          <Dato etiqueta="Glosas" valor={`${glosas.length} · ${sinResolver.length} sin resolver`} />
          <Dato etiqueta="Fecha factura" valor={fecha(base.fechaFactura)} />
          <Dato etiqueta="Fecha radicación" valor={fecha(base.fechaRadicacion)} />
          <Dato etiqueta="Notificación glosa" valor={fecha(base.fechaNotificacionGlosa)} />
          <Dato etiqueta="Facturador" valor={base.facturador || "—"} />
        </div>

        {excede && (
          <div className="flex items-start gap-2 border-b border-[#E2EBF8] bg-[#FFFBEB] px-5 py-2.5 text-[12px] font-semibold text-[#B45309]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lo glosado supera el valor facturado registrado. Verifícalo antes de cerrar.
          </div>
        )}

        <div className="px-5 py-4">
          <p className="eb-label mb-2 text-[10.5px] text-[#64748B]">Glosas registradas en esta factura</p>
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
                    {g.notaCredito && (
                      <span className="font-cifra text-[11px] text-[#64748B]">NC: {g.notaCredito}</span>
                    )}
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
            Para editar campos individuales, cierra esta ventana y edita en la cuadrícula.
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
  onGuardar: (fila: Record<string, unknown>) => void;
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
    motivoCodigo: "",
    motivoGlosa: "",
    observacionInterna: "",
    facturador: "",
    responsableAceptacion: "",
    notaCredito: "",
    estado: "PENDIENTE",
  });

  const ncOk = esNotaCreditoValida(f.notaCredito);
  const completo =
    f.factura.trim() !== "" &&
    (f.motivoGlosa.trim() !== "" || f.motivoCodigo !== "") &&
    ncOk;
  const infoNit = normalizarEmpresaYNit(f.empresa);
  const codigosNorma = new Set<string>(CAUSAS_NORMATIVAS.map((c) => c.codigo));
  const campo = "w-full rounded-lg border border-[#DCE8FA] px-2.5 py-2 text-[12.5px] outline-none focus:border-[#1D58D8]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label="Registrar glosa">
      <div className="max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E2EBF8] px-5 py-3.5">
          <div>
            <p className="text-[15px] font-bold text-[#0E245E]">Registrar glosa o devolución</p>
            <p className="text-[11.5px] text-[#64748B]">
              Todos los campos normativos de facturación, notificación y Nota Crédito obligatoria.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#47597A] transition hover:bg-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 px-5 py-4 sm:grid-cols-2">
          <Campo id="nf" etiqueta="Número de factura *">
            <input
              id="nf"
              value={f.factura}
              onChange={(e) => setF({ ...f, factura: e.target.value.toUpperCase() })}
              placeholder="FCOE00000"
              className={`${campo} font-cifra`}
            />
          </Campo>
          <Campo
            id="emp"
            etiqueta={infoNit.nit ? `Empresa · unificada NIT ${infoNit.nit}` : "Empresa"}
          >
            <input
              id="emp"
              list="cat-empresas"
              value={f.empresa}
              onChange={(e) => setF({ ...f, empresa: e.target.value.toUpperCase() })}
              placeholder="Elige o escribe la entidad"
              className={campo}
            />
          </Campo>

          <Campo id="ffac" etiqueta="Fecha de factura">
            <input
              id="ffac"
              type="date"
              value={f.fechaFactura}
              onChange={(e) => setF({ ...f, fechaFactura: e.target.value })}
              className={`${campo} font-cifra`}
            />
          </Campo>
          <Campo id="frad" etiqueta="Fecha de radicación">
            <input
              id="frad"
              type="date"
              value={f.fechaRadicacion}
              onChange={(e) => setF({ ...f, fechaRadicacion: e.target.value })}
              className={`${campo} font-cifra`}
            />
          </Campo>

          <Campo id="fnot" etiqueta="Fecha de notificación de la glosa">
            <input
              id="fnot"
              type="date"
              value={f.fechaNotificacionGlosa}
              onChange={(e) => setF({ ...f, fechaNotificacionGlosa: e.target.value })}
              className={`${campo} font-cifra`}
            />
          </Campo>
          <Campo id="clase" etiqueta="Clase">
            <select
              id="clase"
              value={f.clase}
              onChange={(e) => setF({ ...f, clase: e.target.value })}
              className={campo}
            >
              {CLASES.map((c) => (
                <option key={c.id} value={c.id}>{c.etiqueta}</option>
              ))}
            </select>
          </Campo>

          <Campo id="vfac" etiqueta="Valor facturado">
            <input
              id="vfac"
              value={f.valorFacturado}
              onChange={(e) => setF({ ...f, valorFacturado: e.target.value })}
              inputMode="numeric"
              placeholder="0"
              className={`${campo} font-cifra`}
            />
          </Campo>
          <Campo id="val" etiqueta="Valor glosado">
            <input
              id="val"
              value={f.valorGlosado}
              onChange={(e) => setF({ ...f, valorGlosado: e.target.value })}
              inputMode="numeric"
              placeholder="0"
              className={`${campo} font-cifra`}
            />
          </Campo>

          <div className="sm:col-span-2">
            <p className="eb-label mb-1.5 text-[10px] text-[#94A3B8]">
              Causas principales según la norma (selección rápida)
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CAUSAS_NORMATIVAS.map((c) => {
                const activo = f.motivoCodigo === c.codigo;
                return (
                  <button
                    key={c.codigo}
                    type="button"
                    onClick={() => setF({ ...f, motivoCodigo: activo ? "" : c.codigo })}
                    title={c.descripcion}
                    className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                      activo ? "ring-2 ring-[#1D58D8]" : "hover:opacity-90"
                    }`}
                    style={{
                      backgroundColor: c.badgeBg,
                      color: c.badgeText,
                      borderColor: c.badgeBorder,
                    }}
                  >
                    {c.codigo} · {c.nombre}
                  </button>
                );
              })}
            </div>
            <Campo id="cau" etiqueta="Causal o subcódigo (Resolución 2284)">
              <select
                id="cau"
                value={f.motivoCodigo}
                onChange={(e) => setF({ ...f, motivoCodigo: e.target.value })}
                className={campo}
              >
                <option value="">— sin clasificar —</option>
                <optgroup label="Causas principales según la norma">
                  {CAUSAS_NORMATIVAS.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.codigo} · {c.nombre} — {c.descripcion}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Subcódigos Resolución 2284">
                  {causales
                    .filter((c) => !codigosNorma.has(c.codigo))
                    .map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.codigo} · {c.familia} · {c.nombre}
                      </option>
                    ))}
                </optgroup>
              </select>
            </Campo>
          </div>

          <div className="sm:col-span-2">
            <Campo id="mot" etiqueta="Observación del motivo *">
              <textarea
                id="mot"
                rows={2}
                value={f.motivoGlosa}
                onChange={(e) => setF({ ...f, motivoGlosa: e.target.value })}
                placeholder="Detalle notificado por la EPS / aseguradora"
                className={`${campo} resize-y leading-relaxed`}
              />
            </Campo>
          </div>

          <Campo id="fac" etiqueta="Facturador">
            <input
              id="fac"
              list="cat-responsables"
              value={f.facturador}
              onChange={(e) => setF({ ...f, facturador: e.target.value.toUpperCase() })}
              placeholder="Quien elaboró la factura"
              className={campo}
            />
          </Campo>
          <Campo id="rglosa" etiqueta="Responsable de responder la glosa">
            <input
              id="rglosa"
              list="cat-responsables"
              value={f.responsableAceptacion}
              onChange={(e) => setF({ ...f, responsableAceptacion: e.target.value.toUpperCase() })}
              placeholder="Asignado para responder"
              className={campo}
            />
          </Campo>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="nc2" className="eb-label text-[10px] font-bold text-[#0E245E]">
                Nota crédito * (obligatorio N° o N/A)
              </label>
              <button
                type="button"
                onClick={() => setF({ ...f, notaCredito: "N/A" })}
                className="text-[11px] font-semibold text-[#1D58D8] hover:underline"
              >
                Usar N/A
              </button>
            </div>
            <input
              id="nc2"
              value={f.notaCredito}
              onChange={(e) => setF({ ...f, notaCredito: e.target.value })}
              placeholder="Ej: NC-1045 o N/A"
              className={`w-full rounded-lg border px-2.5 py-2 font-cifra text-[12.5px] outline-none ${
                f.notaCredito.trim() === "" || ncOk
                  ? "border-[#DCE8FA] focus:border-[#1D58D8]"
                  : "border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]"
              }`}
            />
          </div>

          <Campo id="obs2" etiqueta="Observación general">
            <input
              id="obs2"
              value={f.observacionInterna}
              onChange={(e) => setF({ ...f, observacionInterna: e.target.value })}
              placeholder="Nota interna opcional"
              className={campo}
            />
          </Campo>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#E2EBF8] px-5 py-3.5">
          <span className="text-[11.5px] text-[#64748B]">
            {!ncOk ? "Debes indicar el número de Nota Crédito o seleccionar N/A." : "Listo para guardar."}
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-[#DCE8FA] px-3.5 py-2 text-[12.5px] font-semibold text-[#47597A] transition hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!completo || guardando}
              onClick={() => {
                const c = CLASES.find((x) => x.id === f.clase) || CLASES[0];
                onGuardar({
                  ...f,
                  empresa: infoNit.nombre || f.empresa.trim(),
                  empresaOriginal: f.empresa.trim(),
                  tipoGlosa: c.tipo,
                  alcance: c.alcance,
                  valorFacturado: soloNumero(f.valorFacturado),
                  valorRadicado: soloNumero(f.valorFacturado),
                  valorGlosado: soloNumero(f.valorGlosado),
                  responsableRespuesta: f.responsableAceptacion.trim(),
                  valorAceptado: null,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
            >
              {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Guardar glosa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */

function ModalAnularFactura({
  facturaInicial, glosas, guardando, onCerrar, onConfirmar,
}: {
  facturaInicial: string;
  glosas: Glosa[];
  guardando: boolean;
  onCerrar: () => void;
  onConfirmar: (fila: Record<string, unknown>) => void;
}) {
  const coincidencia = useMemo(() => {
    const num = facturaInicial.trim().toUpperCase();
    return num ? glosas.find((g) => g.factura.toUpperCase() === num) : undefined;
  }, [facturaInicial, glosas]);

  const [factura, setFactura] = useState(facturaInicial);
  const [empresa, setEmpresa] = useState(coincidencia?.empresa || "");
  const [fechaFactura, setFechaFactura] = useState((coincidencia?.fechaFactura || "").slice(0, 10));
  const [fechaRadicacion, setFechaRadicacion] = useState((coincidencia?.fechaRadicacion || "").slice(0, 10));
  const [valorFacturado, setValorFacturado] = useState(
    coincidencia?.valorFacturado ? String(Math.round(coincidencia.valorFacturado)) : "",
  );
  const [fechaAnulacion, setFechaAnulacion] = useState(new Date().toISOString().slice(0, 10));
  const [responsable, setResponsable] = useState("");
  const [motivo, setMotivo] = useState("");

  const buscarFacturaExistente = (numRaw: string) => {
    const num = numRaw.trim().toUpperCase();
    setFactura(num);
    const enc = glosas.find((g) => g.factura.toUpperCase() === num);
    if (enc) {
      if (!empresa) setEmpresa(enc.empresa);
      if (!fechaFactura && enc.fechaFactura) setFechaFactura(enc.fechaFactura.slice(0, 10));
      if (!fechaRadicacion && enc.fechaRadicacion) setFechaRadicacion(enc.fechaRadicacion.slice(0, 10));
      if (!valorFacturado && enc.valorFacturado) setValorFacturado(String(Math.round(enc.valorFacturado)));
    }
  };

  const listo = factura.trim() !== "" && motivo.trim() !== "";
  const campo = "w-full rounded-lg border border-[#DCE8FA] px-2.5 py-2 text-[12.5px] outline-none focus:border-[#1D58D8]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label="Anular factura">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E2EBF8] px-5 py-3.5">
          <div>
            <p className="flex items-center gap-1.5 text-[15px] font-bold text-[#BE123C]">
              <Ban className="h-4 w-4" /> Anular factura
            </p>
            <p className="text-[11.5px] text-[#64748B]">
              Registra el estado ANULADA en la base de datos y deja trazabilidad en el historial.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#47597A] transition hover:bg-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 px-5 py-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="an-fac" className="eb-label text-[10px] text-[#94A3B8]">
                Número de factura *
              </label>
              {factura !== "FCOE0000001" && (
                <button
                  type="button"
                  onClick={() => buscarFacturaExistente("FCOE0000001")}
                  className="font-cifra text-[11px] font-semibold text-[#BE123C] hover:underline"
                >
                  Cargar FCOE0000001
                </button>
              )}
            </div>
            <input
              id="an-fac"
              value={factura}
              onChange={(e) => buscarFacturaExistente(e.target.value)}
              placeholder="Ej: FCOE0000001"
              className={`${campo} font-cifra font-semibold`}
            />
          </div>

          <Campo id="an-emp" etiqueta="Empresa (opcional)">
            <input
              id="an-emp"
              list="cat-empresas"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value.toUpperCase())}
              placeholder="Entidad asociada"
              className={campo}
            />
          </Campo>

          <Campo id="an-ff" etiqueta="Fecha de factura">
            <input
              id="an-ff"
              type="date"
              value={fechaFactura}
              onChange={(e) => setFechaFactura(e.target.value)}
              className={`${campo} font-cifra`}
            />
          </Campo>

          <Campo id="an-fr" etiqueta="Fecha de radicación">
            <input
              id="an-fr"
              type="date"
              value={fechaRadicacion}
              onChange={(e) => setFechaRadicacion(e.target.value)}
              className={`${campo} font-cifra`}
            />
          </Campo>

          <Campo id="an-vf" etiqueta="Valor facturado">
            <input
              id="an-vf"
              inputMode="numeric"
              value={valorFacturado}
              onChange={(e) => setValorFacturado(e.target.value)}
              placeholder="0"
              className={`${campo} font-cifra`}
            />
          </Campo>

          <Campo id="an-fa" etiqueta="Fecha de anulación">
            <input
              id="an-fa"
              type="date"
              value={fechaAnulacion}
              onChange={(e) => setFechaAnulacion(e.target.value)}
              className={`${campo} font-cifra`}
            />
          </Campo>

          <div className="sm:col-span-2">
            <Campo id="an-resp" etiqueta="Responsable de la anulación">
              <input
                id="an-resp"
                list="cat-responsables"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value.toUpperCase())}
                placeholder="Nombre del responsable"
                className={campo}
              />
            </Campo>
          </div>

          <div className="sm:col-span-2">
            <Campo id="an-mot" etiqueta="Motivo de anulación *">
              <textarea
                id="an-mot"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo contable o administrativo de la anulación"
                className={`${campo} resize-y leading-relaxed`}
              />
            </Campo>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#E2EBF8] px-5 py-3.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-[#DCE8FA] px-3.5 py-2 text-[12.5px] font-semibold text-[#47597A] transition hover:bg-[#F8FAFC]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!listo || guardando}
            onClick={() => {
              const infoNit = normalizarEmpresaYNit(empresa);
              onConfirmar({
                factura: factura.trim().toUpperCase(),
                empresa: infoNit.nombre || empresa.trim(),
                empresaOriginal: empresa.trim(),
                fechaFactura,
                fechaRadicacion,
                valorFacturado: valorFacturado.trim() === "" ? "" : soloNumero(valorFacturado),
                fechaAnulacion,
                responsable: responsable.trim(),
                motivo: motivo.trim(),
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#BE123C] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#9F1239] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
          >
            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar anulación
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */

type FilaImportada = {
  factura: string;
  empresa: string;
  empresaOriginal: string;
  nit: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaNotificacionGlosa: string;
  valorFacturado: number;
  valorGlosado: number;
  motivoCodigo: string;
  motivoGlosa: string;
  notaCredito: string;
  facturador: string;
  responsableRespuesta: string;
  estado: string;
  observacionInterna: string;
};

function dividirLineaCsv(linea: string, sep: string): string[] {
  const res: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (ch === sep && !enComillas) {
      res.push(actual.trim());
      actual = "";
    } else {
      actual += ch;
    }
  }
  res.push(actual.trim());
  return res;
}

function ModalImportarExcel({
  onCerrar, onImportado,
}: {
  onCerrar: () => void;
  onImportado: (mensaje: string) => void;
}) {
  const [textoPegado, setTextoPegado] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const filasParseadas = useMemo<FilaImportada[]>(() => {
    const limpio = textoPegado.replace(/^\uFEFF/, "").trim();
    if (!limpio) return [];
    const lineas = limpio.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lineas.length < 2) return [];

    const primera = lineas[0];
    const sep = primera.includes("\t") ? "\t" : primera.includes(";") ? ";" : ",";
    const cols = dividirLineaCsv(primera, sep).map((c) =>
      c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(),
    );

    const idx = (pred: (h: string) => boolean) => cols.findIndex(pred);
    const iFac = idx((h) => h.includes("factura") && !h.includes("fecha") && !h.includes("valor") && !h.includes("facturador"));
    const iEmp = idx((h) => h.includes("empresa") && !h.includes("original"));
    const iFFac = idx((h) => h.includes("fecha factura") || h.includes("elaboracion"));
    const iFRad = idx((h) => h.includes("radicacion"));
    const iFNot = idx((h) => h.includes("notificacion") || h.includes("fecha glosa"));
    const iVFac = idx((h) => h.includes("valor facturado") || h.includes("valor radicado") || h === "facturado");
    const iVGlo = idx((h) => h.includes("glosado") || h === "valor glosa");
    const iCod = idx((h) => h.includes("causal") || h.includes("codigo"));
    const iMot = idx((h) => h.includes("motivo") && !h.includes("codigo"));
    const iNC = idx((h) => h.includes("nota credito") || h === "nc");
    const iFacturador = idx((h) => h.includes("facturador"));
    const iResp = idx((h) => h.includes("responsable"));
    const iEst = idx((h) => h.includes("estado") || h.includes("desenlace"));
    const iObs = idx((h) => h.includes("observacion"));

    if (iFac < 0) return [];

    const resultado: FilaImportada[] = [];
    for (let r = 1; r < lineas.length; r++) {
      const c = dividirLineaCsv(lineas[r], sep);
      const factura = (c[iFac] || "").toUpperCase().replace(/\s+/g, "");
      if (!factura) continue;
      const empRaw = iEmp >= 0 ? c[iEmp] || "" : "";
      const empInfo = normalizarEmpresaYNit(empRaw);
      const ncRaw = iNC >= 0 ? (c[iNC] || "").trim() : "";
      const ncNorm = ncRaw.toUpperCase() === "NA" || ncRaw.toUpperCase() === "NO APLICA" ? "N/A" : ncRaw;

      resultado.push({
        factura,
        empresa: empInfo.nombre || empRaw.toUpperCase(),
        empresaOriginal: empRaw,
        nit: empInfo.nit,
        fechaFactura: iFFac >= 0 ? c[iFFac] || "" : "",
        fechaRadicacion: iFRad >= 0 ? c[iFRad] || "" : "",
        fechaNotificacionGlosa: iFNot >= 0 ? c[iFNot] || "" : "",
        valorFacturado: iVFac >= 0 ? soloNumero(c[iVFac] || "") : 0,
        valorGlosado: iVGlo >= 0 ? soloNumero(c[iVGlo] || "") : 0,
        motivoCodigo: iCod >= 0 ? (c[iCod] || "").toUpperCase().trim() : "",
        motivoGlosa: iMot >= 0 ? c[iMot] || "" : "",
        notaCredito: ncNorm,
        facturador: iFacturador >= 0 ? (c[iFacturador] || "").toUpperCase() : "",
        responsableRespuesta: iResp >= 0 ? (c[iResp] || "").toUpperCase() : "",
        estado: iEst >= 0 ? (c[iEst] || "PENDIENTE").toUpperCase() : "PENDIENTE",
        observacionInterna: iObs >= 0 ? c[iObs] || "" : "",
      });
    }
    return resultado;
  }, [textoPegado]);

  const filasSinNC = filasParseadas.filter((r) => !esNotaCreditoValida(r.notaCredito));

  const leerArchivo = async (file: File) => {
    setErrorMsg("");
    try {
      const buf = await file.arrayBuffer();
      let texto = "";
      try {
        texto = new TextDecoder("utf-8", { fatal: true }).decode(buf);
      } catch {
        texto = new TextDecoder("windows-1252").decode(buf);
      }
      setTextoPegado(texto);
    } catch {
      setErrorMsg("No se pudo leer el archivo seleccionado.");
    }
  };

  const descargarPlantilla = () => {
    const cab = [
      "Factura", "Empresa", "Fecha Factura", "Fecha Radicación", "Fecha Notificación Glosa",
      "Valor Facturado", "Valor Glosado", "Causal Código", "Motivo Glosa", "Nota Crédito",
      "Facturador", "Responsable Respuesta Glosa", "Estado", "Observación Interna",
    ].join(";");
    const blob = new Blob(["\uFEFF" + cab + "\r\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_glosas_ebenezer.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmarImportacion = async () => {
    if (filasParseadas.length === 0 || filasSinNC.length > 0) return;
    setSubiendo(true);
    setErrorMsg("");
    try {
      const r = await fetch("/api/cartera/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidad: "importar-lote", accion: "CREAR", filas: filasParseadas }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErrorMsg(j?.error || "No se pudo completar la importación.");
        return;
      }
      onImportado(`${j.importadas ?? filasParseadas.length} registros importados correctamente.`);
    } catch {
      setErrorMsg("Error de red al importar el archivo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label="Importar Excel">
      <div className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E2EBF8] px-5 py-3.5">
          <div>
            <p className="flex items-center gap-1.5 text-[15px] font-bold text-[#0E245E]">
              <FileSpreadsheet className="h-4 w-4 text-[#1D58D8]" /> Importar desde Excel (CSV o pegado directo)
            </p>
            <p className="text-[11.5px] text-[#64748B]">
              Decodificación automática UTF-8 / Windows Excel para conservar intactas las Ñ y tildes, unificando empresas por NIT.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#47597A] transition hover:bg-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-semibold text-[#0E245E] transition hover:border-[#1D58D8]">
              <Upload className="h-3.5 w-3.5 text-[#1D58D8]" /> Seleccionar archivo .csv
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void leerArchivo(f);
                }}
              />
            </label>
            <button
              type="button"
              onClick={descargarPlantilla}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE8FA] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#47597A] transition hover:border-[#94A3B8]"
            >
              <Download className="h-3.5 w-3.5" /> Descargar plantilla CSV
            </button>
          </div>

          <div>
            <label htmlFor="imp-txt" className="eb-label mb-1 block text-[10px] text-[#64748B]">
              O pega aquí las celdas copiadas directamente desde Excel (incluyendo la fila de encabezados)
            </label>
            <textarea
              id="imp-txt"
              rows={5}
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
              placeholder="Factura;Empresa;Fecha Factura;Fecha Radicación;Fecha Notificación Glosa;Valor Facturado;Valor Glosado;Causal Código;Motivo Glosa;Nota Crédito;Facturador;Responsable Respuesta Glosa"
              className="w-full resize-y rounded-lg border border-[#DCE8FA] px-2.5 py-2 font-mono text-[11.5px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12px] font-semibold text-[#B91C1C]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {errorMsg}
            </div>
          )}

          {filasSinNC.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] font-semibold text-[#B45309]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Hay {filasSinNC.length} fila(s) sin Nota Crédito válida. Por regla obligatoria, completa el número consecutivo o escribe N/A en tu archivo antes de importar.
            </div>
          )}

          {filasParseadas.length > 0 && (
            <div className="max-h-[220px] overflow-auto rounded-lg border border-[#E2EBF8]">
              <table className="w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="border-b border-[#E2EBF8] bg-[#F8FAFC] text-left text-[10px] font-bold uppercase text-[#64748B]">
                    <th className="px-2.5 py-1.5">Factura</th>
                    <th className="px-2.5 py-1.5">Empresa / NIT</th>
                    <th className="px-2.5 py-1.5">Causal</th>
                    <th className="px-2.5 py-1.5 text-right">Facturado</th>
                    <th className="px-2.5 py-1.5 text-right">Glosado</th>
                    <th className="px-2.5 py-1.5">Nota Crédito *</th>
                    <th className="px-2.5 py-1.5">Resp. Glosa</th>
                  </tr>
                </thead>
                <tbody>
                  {filasParseadas.slice(0, 30).map((r, i) => (
                    <tr key={`${r.factura}-${i}`} className="border-b border-[#F1F5F9]">
                      <td className="px-2.5 py-1.5 font-cifra font-semibold text-[#0E245E]">{r.factura}</td>
                      <td className="px-2.5 py-1.5 text-[#47597A]">
                        {r.empresa}{r.nit ? ` (NIT ${r.nit})` : ""}
                      </td>
                      <td className="px-2.5 py-1.5 font-cifra text-[#0E245E]">{r.motivoCodigo || "—"}</td>
                      <td className="px-2.5 py-1.5 text-right font-cifra">{pesos(r.valorFacturado)}</td>
                      <td className="px-2.5 py-1.5 text-right font-cifra font-semibold">{pesos(r.valorGlosado)}</td>
                      <td
                        className={`px-2.5 py-1.5 font-cifra font-semibold ${
                          esNotaCreditoValida(r.notaCredito) ? "text-[#146138]" : "text-[#B91C1C]"
                        }`}
                      >
                        {r.notaCredito || "FALTA"}
                      </td>
                      <td className="px-2.5 py-1.5 text-[#47597A]">{r.responsableRespuesta || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 border-t border-[#E2EBF8] px-5 py-3.5">
          <span className="text-[11.5px] text-[#64748B]">
            {filasParseadas.length > 0
              ? `${filasParseadas.length} filas detectadas listas para validación.`
              : "Esperando archivo .csv o pegado desde Excel."}
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-[#DCE8FA] px-3.5 py-2 text-[12.5px] font-semibold text-[#47597A] transition hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={filasParseadas.length === 0 || filasSinNC.length > 0 || subiendo}
              onClick={confirmarImportacion}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
            >
              {subiendo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Importar {filasParseadas.length > 0 ? `(${filasParseadas.length})` : ""}
            </button>
          </div>
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
