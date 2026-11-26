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
  CATALOGO_ERP_UNIFICADAS,
  CAUSAS_NORMATIVAS_OFICIALES,
  OPCIONES_SEGUIMIENTO_GLOSA,
  RESPONSABLES_OFICIALES_EBENEZER,
  type SeguimientoGlosaCodigo,
  causaNormativa6De,
  claveFacturaNorm,
  esNumeroNotaCreditoReal,
  etiquetaSeguimientoGlosa,
  homologarEmpresaYOrigen,
  homologarPersonaFacturacion,
  clasificarAtencionYSede,
  normalizarEmpresaNitUnificada,
  normalizarEstadoDecision,
  resolverClaseYCausal,
  resolverNotaCreditoCondicional,
  resolverSeguimientoAutomatico,
  resolverValorAceptadoSegunRegla,
} from "@/lib/carteraCruces";
import { ModalImportarCarteraExcel } from "@/components/workcenter/ModalImportarCarteraExcel";

/* ---------------------------------------------------------------------
   MESA DE TRABAJO DE CARTERA — GLOSAS, DEVOLUCIONES Y CONTROL DE FACTURAS
   --------------------------------------------------------------------- */

export type CausaNormativaItem = {
  codigo: "TA" | "AU" | "SO" | "DE" | "CO" | "FA";
  nombre: string;
  descripcion: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
};

export const CAUSAS_NORMATIVAS: CausaNormativaItem[] = CAUSAS_NORMATIVAS_OFICIALES;

export function causaNormativaDe(motivoCodigo?: string | null, tipoGlosa?: string | null): string {
  return causaNormativa6De(motivoCodigo, tipoGlosa);
}

/**
 * Unificación de ERP estrictamente por NIT contable real verificado en SISMA.
 * Si una entidad no tiene NIT verificado en SISMA, devuelve nit: "" (jamás se inventa).
 */
export function normalizarEmpresaYNit(
  raw?: string | null,
  nitRaw?: string | null
): { nit: string; nombre: string } {
  const u = normalizarEmpresaNitUnificada(raw, nitRaw);
  const fallback = String(raw || "").trim().toUpperCase().replace(/\s+/g, " ");
  return { nit: u.nit, nombre: u.nombre || fallback };
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
  fechaPrestacionServicio?: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaNotificacionGlosa: string;
  anio: string;
  valorRadicado: number;
  valorFacturado: number;
  valorGlosado: number;
  valorAceptado: number | null;
  motivoCodigo: string;
  subcodigoCausal?: string;
  motivoGlosa: string;
  observacionInterna: string;
  notaCredito: string;
  facturador: string;
  responsableAceptacion: string;
  responsableRespuesta?: string;
  seguimientoEstado?: SeguimientoGlosaCodigo;
  valorSeguimiento?: number | null;
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
  { id: "PENDIENTE", etiqueta: "— Seleccionar —" },
  { id: "ACEPTADA", etiqueta: "Aceptada" },
  { id: "NO_ACEPTADA", etiqueta: "No Aceptada" },
];
const ETIQUETA: Record<string, string> = {
  PENDIENTE: "— Seleccionar —",
  RESPONDIDA: "— Seleccionar —",
  LEGALIZADA: "— Seleccionar —",
  ACEPTADA: "Aceptada",
  NO_ACEPTADA: "No Aceptada",
};

const PASTILLA: Record<string, string> = {
  PENDIENTE: "border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C] font-bold",
  RESPONDIDA: "border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C] font-bold",
  ACEPTADA: "border-[#86EFAC] bg-[#DCFCE7] text-[#14532D]",
  NO_ACEPTADA: "border-[#BFDBFE] bg-[#DBEAFE] text-[#1E3A8A]",
  LEGALIZADA: "border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C] font-bold",
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
  { id: "GLOSA", etiqueta: "Glosa", tipo: "GLOSA" as const },
  { id: "DEVOLUCION", etiqueta: "Devolución", tipo: "DEVOLUCION" as const },
];
const claseDe = (g: { tipoGlosa: string; motivoCodigo?: string }) =>
  resolverClaseYCausal(g.tipoGlosa, g.motivoCodigo).tipoGlosa;

const pesos = (n: number) => "$" + Math.round(n || 0).toLocaleString("es-CO");
const formatoPesosInput = (s: string) => {
  if (s.trim() === "") return "";
  const limpio = s.replace(/[^0-9]/g, "");
  if (!limpio) return "";
  return "$" + Number(limpio).toLocaleString("es-CO");
};

function listarPendientesFila(
  g: Glosa,
  cruce: { nit: string; empresaHomologada: string; fechaFacturaSisma: string; saldoSisma?: number }
): string[] {
  const faltan: string[] = [];
  const vf = g.valorFacturado || g.valorRadicado || cruce.saldoSisma || 0;
  const vg = g.valorGlosado || 0;
  const est = normalizarEstadoDecision(g.estado, g.valorAceptado, g.notaCredito);
  const cc = resolverClaseYCausal(g.tipoGlosa, g.motivoCodigo);
  const vAcep = resolverValorAceptadoSegunRegla({
    estado: est,
    tipoGlosa: cc.tipoGlosa,
    valorFacturado: vf,
    valorGlosado: vg,
    valorAceptadoPrevio: g.valorAceptado,
  });
  const nc = resolverNotaCreditoCondicional(g.notaCredito, vAcep, est);
  const seg = resolverSeguimientoAutomatico(g.seguimientoEstado, est);

  if (!g.fechaPrestacionServicio) faltan.push("Fecha prestación");
  if (!(g.fechaFactura || cruce.fechaFacturaSisma)) faltan.push("Fecha factura");
  const empInfo = normalizarEmpresaYNit(g.empresa || g.empresaOriginal, cruce.nit);
  if (!(empInfo.nombre || cruce.empresaHomologada || g.empresa)) faltan.push("ERP");
  if (!(empInfo.nit || cruce.nit)) faltan.push("NIT");
  if (!homologarPersonaFacturacion(g.facturador)) faltan.push("Facturador");
  if (!homologarPersonaFacturacion(g.responsableRespuesta || g.responsableAceptacion)) {
    faltan.push("Responsable glosa");
  }
  if (!cc.motivoCodigo) faltan.push("Causal");
  if (!(g.motivoGlosa || "").trim()) faltan.push("Motivo");
  if (vf <= 0) faltan.push("Valor facturado");
  if (vg <= 0) faltan.push("Valor glosado");
  if (vAcep === null) faltan.push("Valor aceptado");
  if (seg === "") faltan.push("Seguimiento");
  if (seg === "RATIFICACION_GLOSA" && !(g.observacionInterna || "").trim()) {
    faltan.push("Motivo/Obs. rectificación");
  }
  if ((seg === "PAGO_PARCIAL" || seg === "LEVANTAMIENTO_PARCIAL") && g.valorSeguimiento == null) {
    faltan.push("Valor seguimiento");
  }
  if (est === "PENDIENTE") faltan.push("Estado");
  if (est === "ACEPTADA" ? !esNumeroNotaCreditoReal(nc) : !esNotaCreditoValida(nc)) {
    faltan.push("Nota Crédito");
  }
  return faltan;
}
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
  const [saldoCarteraSisma, setSaldoCarteraSisma] = useState<{ con: number; solo: number; sin: number } | null>(null);
  const [cat, setCat] = useState<Catalogos>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [aviso, setAviso] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [fEstado, setFEstado] = useState("TODAS");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fMutual, setFMutual] = useState<"CON" | "SOLO" | "SIN">("CON");
  const [fCausaNorma, setFCausaNorma] = useState("");
  const [fAnio, setFAnio] = useState("");
  const [fMes, setFMes] = useState("");
  const [fFacturador, setFFacturador] = useState("");
  const [fRespGlosa, setFRespGlosa] = useState("");
  const [fSeguimiento, setFSeguimiento] = useState("");
  const [fFamilia, setFFamilia] = useState("");
  const [soloSinCausal, setSoloSinCausal] = useState(false);
  const [soloSinValores, setSoloSinValores] = useState(false);
  const [soloPendientesLlenar, setSoloPendientesLlenar] = useState(false);

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
      const listaGlosas = ((j.glosas || []) as Partial<Glosa>[]).map((g) => {
        const vFact = Number(g.valorFacturado ?? g.valorRadicado ?? 0);
        const vGlos = Number(g.valorGlosado || 0);
        const vAcepPrev =
          g.valorAceptado === null || g.valorAceptado === undefined ? null : Number(g.valorAceptado);
        const estNorm = normalizarEstadoDecision(g.estado, vAcepPrev, g.notaCredito);
        const cc = resolverClaseYCausal(g.tipoGlosa, g.motivoCodigo);
        const vAcepFinal = resolverValorAceptadoSegunRegla({
          estado: estNorm,
          tipoGlosa: cc.tipoGlosa,
          valorFacturado: vFact,
          valorGlosado: vGlos,
          valorAceptadoPrevio: vAcepPrev,
        });
        const respSep = homologarPersonaFacturacion(
          String(g.responsableRespuesta ?? g.responsableAceptacion ?? "")
        );
        return {
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
          fechaPrestacionServicio: String(g.fechaPrestacionServicio || ""),
          fechaFactura: String(g.fechaFactura || ""),
          fechaRadicacion: String(g.fechaRadicacion || ""),
          fechaNotificacionGlosa: String(g.fechaNotificacionGlosa || ""),
          anio: String(g.anio || ""),
          valorRadicado: Number(g.valorRadicado || 0),
          valorFacturado: vFact,
          valorGlosado: vGlos,
          valorAceptado: vAcepFinal,
          motivoCodigo: cc.motivoCodigo,
          subcodigoCausal: "",
          motivoGlosa: String(g.motivoGlosa || ""),
          observacionInterna: String(g.observacionInterna || ""),
          notaCredito: resolverNotaCreditoCondicional(g.notaCredito, vAcepFinal, estNorm),
          facturador: homologarPersonaFacturacion(String(g.facturador || "")),
          responsableAceptacion: respSep,
          responsableRespuesta: respSep,
          seguimientoEstado: resolverSeguimientoAutomatico(String(g.seguimientoEstado || ""), estNorm),
          valorSeguimiento:
            g.valorSeguimiento === null || g.valorSeguimiento === undefined
              ? null
              : Number(g.valorSeguimiento),
          tipoGlosa: cc.tipoGlosa,
          alcance: "",
          estado: estNorm,
        };
      });
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
        const du = j.desgloseUniverso;
        if (du?.conMutual) {
          setSaldoCarteraSisma({
            con: Number(du.conMutual.carteraTotal || 0),
            solo: Number(du.soloMutual?.carteraTotal || 0),
            sin: Number(du.sinMutual?.carteraTotal || 0),
          });
        } else if (j.edades?.saldoTotal) {
          const st = Number(j.edades.saldoTotal || 0);
          setSaldoCarteraSisma({ con: st, solo: st, sin: st });
        }
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

  /* Empresas unificadas por NIT real de SISMA para filtros y selectores cerrados */
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

  const catalogoErpCerrado = useMemo(() => {
    const mapa = new Map<string, { nombre: string; nit: string }>();
    for (const base of CATALOGO_ERP_UNIFICADAS) {
      mapa.set(base.nombre, { nombre: base.nombre, nit: base.nit });
    }
    for (const e of cat.empresas) {
      const info = normalizarEmpresaYNit(e);
      if (info.nombre && info.nombre !== "SIN ENTIDAD" && !mapa.has(info.nombre)) {
        mapa.set(info.nombre, info);
      }
    }
    for (const x of empresasUnificadasEnDatos) {
      if (x.nombre && x.nombre !== "SIN ENTIDAD" && !mapa.has(x.nombre)) {
        mapa.set(x.nombre, x);
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [cat.empresas, empresasUnificadasEnDatos]);

  const responsablesEnDatos = useMemo(() => {
    const setR = new Set<string>(RESPONSABLES_OFICIALES_EBENEZER);
    for (const r of cat.responsables) {
      const h = homologarPersonaFacturacion(r);
      if (h) setR.add(h);
    }
    for (const g of glosas) {
      const rf = homologarPersonaFacturacion(g.responsableAceptacion);
      const ff = homologarPersonaFacturacion(g.facturador);
      if (rf) setR.add(rf);
      if (ff) setR.add(ff);
    }
    return Array.from(setR).sort((a, b) => a.localeCompare(b, "es"));
  }, [glosas, cat.responsables]);

  const facturasExistentesLista = useMemo(
    () => Array.from(new Set(glosas.map((g) => g.factura).filter(Boolean))),
    [glosas]
  );

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

  const visiblesBaseSinCausal = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return glosas.filter((g) => {
      const cr = cruzarFila({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` });
      if (fMutual === "SOLO" && !cr.esMutual) return false;
      if (fMutual === "SIN" && cr.esMutual) return false;
      const estDec = normalizarEstadoDecision(g.estado, g.valorAceptado, g.notaCredito);
      if (fEstado === "SIN_RESOLVER" && estDec !== "PENDIENTE") return false;
      if (fEstado !== "TODAS" && fEstado !== "SIN_RESOLVER" && estDec !== fEstado) return false;
      if (soloSinValores) {
        const vfEf = g.valorFacturado || g.valorRadicado || cr.saldoSisma || 0;
        if (vfEf > 0 && (g.valorGlosado || 0) > 0) return false;
      }
      if (soloPendientesLlenar && listarPendientesFila(g, cr).length === 0) {
        return false;
      }
      if (fEmpresa) {
        const info = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
        if (info.nombre !== fEmpresa && g.empresa !== fEmpresa) return false;
      }
      if (fSeguimiento) {
        const seg = resolverSeguimientoAutomatico(g.seguimientoEstado, estDec);
        if (fSeguimiento === "SIN_SEGUIMIENTO" && seg !== "") return false;
        if (fSeguimiento !== "SIN_SEGUIMIENTO" && seg !== fSeguimiento) return false;
      }
      if (fAnio && g.anio !== fAnio) return false;
      if (fMes && mesDe(g) !== fMes) return false;
      if (fFacturador && homologarPersonaFacturacion(g.facturador) !== fFacturador) {
        return false;
      }
      if (
        fRespGlosa &&
        homologarPersonaFacturacion(g.responsableRespuesta || g.responsableAceptacion) !== fRespGlosa
      ) {
        return false;
      }
      if (soloSinCausal && causaNormativaDe(g.motivoCodigo, g.tipoGlosa)) return false;
      if (!q) return true;
      const infoNit = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
      return (
        g.factura.toUpperCase().includes(q) ||
        g.empresa.toUpperCase().includes(q) ||
        cr.empresaHomologada.toUpperCase().includes(q) ||
        cr.deDondeEs.toUpperCase().includes(q) ||
        cr.pacienteNombre.toUpperCase().includes(q) ||
        cr.medicoNombre.toUpperCase().includes(q) ||
        infoNit.nombre.includes(q) ||
        infoNit.nit.includes(q) ||
        (g.motivoGlosa || "").toUpperCase().includes(q) ||
        (g.motivoCodigo || "").toUpperCase().includes(q) ||
        (g.notaCredito || "").toUpperCase().includes(q) ||
        (g.facturador || "").toUpperCase().includes(q) ||
        (g.responsableRespuesta || g.responsableAceptacion || "").toUpperCase().includes(q) ||
        (g.observacionInterna || "").toUpperCase().includes(q)
      );
    });
  }, [
    glosas, busqueda, fEstado, fEmpresa, fMutual, fSeguimiento, fAnio, fMes,
    fFacturador, fRespGlosa, soloSinCausal, soloSinValores, soloPendientesLlenar, cruzarFila,
  ]);

  const visibles = useMemo(() => {
    return visiblesBaseSinCausal.filter((g) => {
      const cn = causaNormativaDe(g.motivoCodigo, g.tipoGlosa);
      if (fCausaNorma && cn !== fCausaNorma) return false;
      if (fFamilia) {
        const c = causalPorCodigo[cn || g.motivoCodigo];
        if (!c || c.familia !== fFamilia) return false;
      }
      return true;
    });
  }, [visiblesBaseSinCausal, fCausaNorma, fFamilia, causalPorCodigo]);

  const anuladasVisibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return anuladas.filter((a) => {
      const cr = cruzarFila({ ...a, motivoTexto: a.motivo });
      if (fMutual === "SOLO" && !cr.esMutual) return false;
      if (fMutual === "SIN" && cr.esMutual) return false;
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
  }, [anuladas, fEmpresa, fMutual, fAnio, busqueda, cruzarFila]);

  const pendientesVisibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return pendientes.filter((p) => {
      const esMut = Boolean(p.esMutual || /MUTUAL/i.test(`${p.empresa} ${p.empresaOriginal}`));
      if (fMutual === "SOLO" && !esMut) return false;
      if (fMutual === "SIN" && esMut) return false;
      if (fEmpresa) {
        const info = normalizarEmpresaYNit(p.empresa || p.empresaOriginal);
        if (info.nombre !== fEmpresa && p.empresa !== fEmpresa) return false;
      }
      if (fAnio && p.anio && p.anio !== fAnio) return false;
      if (fFacturador && homologarPersonaFacturacion(p.responsable) !== fFacturador) return false;
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
  }, [pendientes, fMutual, fEmpresa, fAnio, fFacturador, busqueda]);

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
    let glosado = 0, facturado = 0, aceptado = 0, sinResolver = 0, valorSinResolver = 0, sinCausal = 0, sinNC = 0, sinValores = 0, conPendientes = 0;
    for (const gAll of glosas) {
      const crAll = cruzarFila({ ...gAll, motivoTexto: `${gAll.motivoGlosa} ${gAll.observacionInterna}` });
      const vfAll = gAll.valorFacturado || gAll.valorRadicado || crAll.saldoSisma || 0;
      if (vfAll <= 0 || (gAll.valorGlosado || 0) <= 0) sinValores++;
      if (listarPendientesFila(gAll, crAll).length > 0) conPendientes++;
    }
    let glosadoBaseCausas = 0;
    const porFamilia: Record<string, number> = {};
    const porNorma: Record<string, { monto: number; cantidad: number }> = {
      TA: { monto: 0, cantidad: 0 },
      AU: { monto: 0, cantidad: 0 },
      SO: { monto: 0, cantidad: 0 },
      DE: { monto: 0, cantidad: 0 },
      CO: { monto: 0, cantidad: 0 },
      FA: { monto: 0, cantidad: 0 },
    };
    for (const gBase of visiblesBaseSinCausal) {
      const vBase = gBase.valorGlosado || 0;
      glosadoBaseCausas += vBase;
      const cnBase = causaNormativaDe(gBase.motivoCodigo, gBase.tipoGlosa);
      if (cnBase && porNorma[cnBase]) {
        porNorma[cnBase].monto += vBase;
        porNorma[cnBase].cantidad += 1;
      }
    }

    const porEmpresa: Record<string, number> = {};
    const porCausal: Record<string, number> = {};
    const porAnio: Record<string, number> = {};
    const porFacturador: Record<string, number> = {};
    const porRespGlosa: Record<string, number> = {};
    const porSeguimiento: Record<string, number> = {};
    const porEstado: Record<string, number> = {};
    const porClase: Record<string, number> = {};
    const factUnicas = new Map<string, number>();

    for (const g of visibles) {
      const cr = cruzarFila({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` });
      const vf = g.valorFacturado || g.valorRadicado || cr.saldoSisma || 0;
      const fk = g.factura || g.id;
      factUnicas.set(fk, Math.max(factUnicas.get(fk) || 0, vf));

      glosado += g.valorGlosado || 0;
      if (g.valorAceptado != null) aceptado += g.valorAceptado;
      if (g.estado === "PENDIENTE") { sinResolver++; valorSinResolver += g.valorGlosado || 0; }
      const cn = causaNormativaDe(g.motivoCodigo, g.tipoGlosa);
      if (!cn) sinCausal++;
      const ncCond = resolverNotaCreditoCondicional(g.notaCredito, g.valorAceptado, g.estado);
      if (!esNotaCreditoValida(ncCond)) sinNC++;
      const v = g.valorGlosado || 0;
      const fam = causalPorCodigo[cn || g.motivoCodigo]?.familia || "Sin clasificar";
      porFamilia[fam] = (porFamilia[fam] || 0) + v;
      const empInfo = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
      const empKey = empInfo.nombre ? (empInfo.nit ? `${empInfo.nombre} · NIT ${empInfo.nit}` : empInfo.nombre) : "";
      if (empKey) porEmpresa[empKey] = (porEmpresa[empKey] || 0) + v;
      if (cn) porCausal[cn] = (porCausal[cn] || 0) + v;
      porAnio[g.anio || "sin año"] = (porAnio[g.anio || "sin año"] || 0) + v;
      const fNom = homologarPersonaFacturacion(g.facturador) || "SIN FACTURADOR";
      porFacturador[fNom] = (porFacturador[fNom] || 0) + v;
      const rNom = homologarPersonaFacturacion(g.responsableRespuesta || g.responsableAceptacion) || "SIN RESPONSABLE GLOSA";
      porRespGlosa[rNom] = (porRespGlosa[rNom] || 0) + v;
      const segLabel = etiquetaSeguimientoGlosa(g.seguimientoEstado, g.estado);
      porSeguimiento[segLabel] = (porSeguimiento[segLabel] || 0) + v;
      porEstado[g.estado] = (porEstado[g.estado] || 0) + v;
      const cl = CLASES.find((c) => c.id === claseDe(g))?.etiqueta || "Glosa";
      porClase[cl] = (porClase[cl] || 0) + v;
    }
    factUnicas.forEach((v) => {
      facturado += v;
    });
    const orden = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
    return {
      glosado, glosadoBaseCausas, facturado, aceptado, sinResolver, valorSinResolver, sinCausal, sinNC, sinValores, conPendientes, porNorma,
      familias: orden(porFamilia),
      empresas: orden(porEmpresa),
      causales: orden(porCausal),
      anios: Object.entries(porAnio).sort((a, b) => a[0].localeCompare(b[0])),
      facturadores: orden(porFacturador),
      responsablesGlosa: orden(porRespGlosa),
      seguimientos: orden(porSeguimiento),
      estados: orden(porEstado),
      clases: orden(porClase),
    };
  }, [glosas, visiblesBaseSinCausal, visibles, causalPorCodigo, cruzarFila]);

  const exportarExcelCsv = () => {
    const encabezados = [
      "Factura", "Fecha Prestación Servicio", "Fecha Factura", "Fecha Radicación", "Fecha Notificación Glosa", "Año",
      "ERP Unificada", "NIT ERP", "De dónde es (Convenio / Régimen)",
      "Facturador (Quien factura)", "Responsable Glosa (Quien responde)",
      "Valor Facturado", "Valor Glosado", "Valor Aceptado", "Valor Defendido",
      "Clase", "Causal (TA/AU/SO/DE/CO/FA)", "Motivo de Glosa",
      "Seguimiento", "Valor Seguimiento",
      "Nota Crédito", "Estado", "Observación / Motivo Rectificación",
    ];
    const filasCsv = visibles.map((g) => {
      const cr = cruzarFila({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` });
      const cn = causaNormativaDe(g.motivoCodigo, g.tipoGlosa);
      const empNit = normalizarEmpresaYNit(g.empresa || g.empresaOriginal, cr.nit);
      const cl = CLASES.find((c) => c.id === claseDe(g))?.etiqueta || "Glosa";
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
      const factCsv = homologarPersonaFacturacion(g.facturador);
      const respCsv = homologarPersonaFacturacion(g.responsableRespuesta || g.responsableAceptacion);
      const ncCsv = resolverNotaCreditoCondicional(g.notaCredito, vAcep, g.estado);
      return [
        g.factura,
        g.fechaPrestacionServicio || "",
        g.fechaFactura || cr.fechaFacturaSisma,
        g.fechaRadicacion || cr.fechaRadicacionSisma,
        g.fechaNotificacionGlosa,
        g.anio,
        empNit.nombre || cr.empresaHomologada,
        empNit.nit || cr.nit,
        cr.deDondeEs,
        factCsv,
        respCsv,
        g.valorFacturado || g.valorRadicado || cr.saldoSisma || 0,
        vGlosa,
        vAcep ?? "",
        vDef,
        cl,
        cn,
        g.motivoGlosa,
        etiquetaSeguimientoGlosa(g.seguimientoEstado, g.estado),
        g.valorSeguimiento ?? "",
        ncCsv,
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
    setFEstado("TODAS"); setFEmpresa(""); setFMutual("CON");
    setFCausaNorma(""); setFSeguimiento(""); setFAnio(""); setFMes(""); setFFacturador(""); setFRespGlosa(""); setFFamilia("");
    setSoloSinCausal(false); setSoloSinValores(false); setSoloPendientesLlenar(false); setBusqueda("");
  };
  const hayFiltro = !!(
    fEstado !== "TODAS" || fEmpresa || fMutual !== "CON" || fCausaNorma || fSeguimiento || fAnio || fMes ||
    fFacturador || fRespGlosa || fFamilia || soloSinCausal || soloSinValores || soloPendientesLlenar || busqueda
  );

  const sel =
    "rounded-lg border border-[#DCE8FA] bg-white px-2 py-1.5 text-[12.5px] text-[#47597A] outline-none focus:border-[#1D58D8]";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-10">
      <datalist id="cat-empresas">{cat.empresas.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="cat-motivos">{cat.motivos.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="cat-responsables">{responsablesEnDatos.map((x) => <option key={x} value={x} />)}</datalist>

      {/* ---------- encabezado ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eb-label text-[11px] text-[#64748B]">WorkCenter · Cartera y Facturación</p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight text-[#0E245E]">
            Glosas, devoluciones y control de facturas
          </h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            ERP unificadas con NIT, fecha de prestación, Facturador y Responsable Glosa independientes, Clase (Glosa / Devolución ↔ DE), seguimiento automático Tramitada / Proceso de pago / Rectificación y alertas en rojo de pendientes.
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
            <Upload className="h-3.5 w-3.5" /> Subir Excel (.xlsx / .csv)
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
          <label htmlFor="f-est" className="sr-only">Filtrar por estado</label>
          <select id="f-est" value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={sel}>
            <option value="TODAS">Todos los estados</option>
            <option value="SIN_RESOLVER">— Seleccionar — (Sin definir)</option>
            <option value="ACEPTADA">Aceptada</option>
            <option value="NO_ACEPTADA">No Aceptada</option>
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

          <label htmlFor="f-emp" className="sr-only">Filtrar por ERP (NIT)</label>
          <select id="f-emp" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} className={sel}>
            <option value="">Todas las ERP (por NIT)</option>
            {empresasUnificadasEnDatos.map((x) => (
              <option key={x.nombre} value={x.nombre}>
                {x.nombre}{x.nit ? ` · NIT ${x.nit}` : ""}
              </option>
            ))}
          </select>

          <label htmlFor="f-norma" className="sr-only">Filtrar por causal normativa</label>
          <select
            id="f-norma"
            value={fCausaNorma}
            onChange={(e) => setFCausaNorma(e.target.value)}
            className={sel}
          >
            <option value="">Causales (TA, AU, SO, DE, CO, FA)</option>
            {CAUSAS_NORMATIVAS.map((c) => (
              <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
            ))}
          </select>

          <label htmlFor="f-seg" className="sr-only">Filtrar por seguimiento</label>
          <select id="f-seg" value={fSeguimiento} onChange={(e) => setFSeguimiento(e.target.value)} className={sel}>
            <option value="">Todos los seguimientos</option>
            <option value="SIN_SEGUIMIENTO">En trámite / Sin seguimiento</option>
            {OPCIONES_SEGUIMIENTO_GLOSA.filter((o) => o.id !== "").map((o) => (
              <option key={o.id} value={o.id}>{o.etiqueta}</option>
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

          <label htmlFor="f-fact" className="sr-only">Filtrar por facturador</label>
          <select id="f-fact" value={fFacturador} onChange={(e) => setFFacturador(e.target.value)} className={sel}>
            <option value="">Facturador (quien factura)</option>
            {responsablesEnDatos.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>

          <label htmlFor="f-resp-glosa" className="sr-only">Filtrar por responsable de glosa</label>
          <select id="f-resp-glosa" value={fRespGlosa} onChange={(e) => setFRespGlosa(e.target.value)} className={sel}>
            <option value="">Responsable glosa (quien responde)</option>
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
        <span className="ml-2 font-cifra text-[11.5px] text-[#47597A]">
          {(() => {
            const totCart = saldoCarteraSisma
              ? fMutual === "SOLO"
                ? saldoCarteraSisma.solo
                : fMutual === "SIN"
                ? saldoCarteraSisma.sin
                : saldoCarteraSisma.con
              : 0;
            const pctC = totCart > 0 ? ((m.glosado / totCart) * 100).toFixed(2) : null;
            return totCart > 0
              ? `Cartera SISMA (cierre día anterior): ${pesos(totCart)} · De lo que hay, es Glosa: ${pesos(m.glosado)} (${pctC}%)`
              : `Facturado: ${pesos(m.facturado)} · Glosado: ${pesos(m.glosado)}`;
          })()}
        </span>
        {m.conPendientes > 0 && (
          <button
            type="button"
            onClick={() => {
              setVista("cuadricula");
              setSoloPendientesLlenar((v) => !v);
            }}
            title="Clic para mostrar todas las filas que tienen algún ítem pendiente por llenar en rojo"
            className={`ml-2 inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[11px] font-extrabold transition cursor-pointer ${
              soloPendientesLlenar
                ? "border-[#991B1B] bg-[#DC2626] text-white"
                : "border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2]"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            {m.conPendientes} con ítems pendientes (en rojo)
          </button>
        )}
        {m.sinValores > 0 && (
          <button
            type="button"
            onClick={() => {
              setVista("cuadricula");
              setSoloSinValores((v) => !v);
            }}
            title="Clic para filtrar las facturas o glosas que están en $0 o sin valores"
            className={`ml-1.5 inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[11px] font-bold transition cursor-pointer ${
              soloSinValores
                ? "border-[#991B1B] bg-[#DC2626] text-white"
                : "border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2]"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            {m.sinValores} sin valores ($0)
          </button>
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

          {/* 6 Causales oficiales de glosa y devolución (TA, AU, SO, DE, CO, FA) */}
          <div className="mt-5 border-t border-[#F1F5F9] pt-4">
            <p className="eb-label mb-2.5 text-[10px] text-[#64748B]">
              Causales oficiales de glosa y devolución según norma (TA, AU, SO, DE, CO, FA)
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              {CAUSAS_NORMATIVAS.map((c) => {
                const d = m.porNorma[c.codigo] || { monto: 0, cantidad: 0 };
                const pct = m.glosadoBaseCausas > 0 ? Math.round((d.monto / m.glosadoBaseCausas) * 100) : 0;
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
              <Ranking
                titulo="Facturador (Quien realiza la factura)"
                filas={m.facturadores.slice(0, 8)}
                total={m.glosado}
                onClick={(k) => setFFacturador(fFacturador === k ? "" : k)}
                activo={fFacturador}
              />
              <Ranking
                titulo="Responsable Glosa (Quien responde)"
                filas={m.responsablesGlosa.slice(0, 8)}
                total={m.glosado}
                onClick={(k) => setFRespGlosa(fRespGlosa === k ? "" : k)}
                activo={fRespGlosa}
              />
              <Ranking
                titulo="Seguimiento (Tramitada, Proceso de pago, Pagos, Levantamientos, Rectificación)"
                filas={m.seguimientos}
                total={m.glosado}
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
          guardando={guardando}
          onCerrar={() => setClasificarAbierto(false)}
          onAplicar={(texto, codigo) =>
            guardar(
              { motivoGlosa: texto, motivoCodigo: codigo },
              "EDITAR",
              "glosas-lote"
            )
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
                {anuladasVisibles.map((a) => {
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
                {pendientesVisibles.map((p) => {
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
        <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)] space-y-3">
          {/* Franja rápida interactiva de las 6 Causales Normativas (TA, AU, SO, DE, CO, FA) */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EDF2FA] bg-[#F8FAFC] px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mr-1">
                Causales:
              </span>
              {CAUSAS_NORMATIVAS.map((c) => {
                const d = m.porNorma[c.codigo] || { monto: 0, cantidad: 0 };
                const act = fCausaNorma === c.codigo;
                return (
                  <button
                    key={c.codigo}
                    type="button"
                    onClick={() => setFCausaNorma(act ? "" : c.codigo)}
                    title={`${c.codigo} · ${c.nombre}: ${pesos(d.monto)} (${d.cantidad} reg.)`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
                      act ? "ring-2 ring-[#1D58D8]" : "hover:opacity-90"
                    }`}
                    style={{
                      backgroundColor: c.badgeBg,
                      color: c.badgeText,
                      borderColor: c.badgeBorder,
                    }}
                  >
                    <span>{c.codigo} · {c.nombre}</span>
                    <span className="font-cifra opacity-90">
                      ({d.cantidad}{d.monto > 0 ? ` · ${pesosCorto(d.monto)}` : ""})
                    </span>
                  </button>
                );
              })}
            </div>
            {fCausaNorma && (
              <button
                type="button"
                onClick={() => setFCausaNorma("")}
                className="text-[11px] font-semibold text-[#1D58D8] hover:underline"
              >
                Ver todas las causales ×
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                  <th className="w-6 py-2" />
                  <th className="py-2 pr-3">Factura · Prestación / Fechas</th>
                  <th className="py-2 pr-3">ERP Unificada · NIT</th>
                  <th className="py-2 pr-3">Facturador</th>
                  <th className="py-2 pr-3">Responsable Glosa</th>
                  <th className="py-2 pr-3">Clase</th>
                  <th className="py-2 pr-3">Causal (TA–FA)</th>
                  <th className="py-2 pr-3">Motivo de glosa</th>
                  <th className="py-2 pr-3 text-right">Facturado</th>
                  <th className="py-2 pr-3 text-right">Glosado</th>
                  <th className="py-2 pr-3 text-right">Aceptado</th>
                  <th className="py-2 pr-3">Seguimiento</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Nota crédito</th>
                  <th className="w-6 py-2" />
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-[#94A3B8]">
                      <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Cargando…
                    </td>
                  </tr>
                )}
                {!cargando && visibles.length === 0 && !fallo && (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-[#94A3B8]">
                      {glosas.length === 0 ? "Todavía no hay glosas en la base." : "Nada coincide con el filtro."}
                    </td>
                  </tr>
                )}
                {visibles.map((g) => {
                  const cn = causaNormativaDe(g.motivoCodigo, g.tipoGlosa);
                  return (
                    <FilaGlosa
                      key={g.id}
                      glosa={g}
                      cruce={cruzarFila({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` })}
                      causal={causalPorCodigo[cn || g.motivoCodigo]}
                      responsablesOpciones={responsablesEnDatos}
                      guardando={guardando === g.id}
                      guardado={guardado === g.id}
                      avisar={avisar}
                      onGuardar={guardar}
                      onFicha={() => setFichaDe(g.factura)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#64748B]">
            <span>
              Mostrando todas las {visibles.length} filas ({glosas.length} totales en base)
            </span>
            <span>
              Todo ítem faltante aparece resaltado en rojo. La flecha izquierda despliega fechas y detalle; doble clic abre la ficha.
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
          empresasOpciones={catalogoErpCerrado}
          responsablesOpciones={responsablesEnDatos}
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
          empresasOpciones={catalogoErpCerrado}
          responsablesOpciones={responsablesEnDatos}
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
        <ModalImportarCarteraExcel
          facturasExistentes={facturasExistentesLista}
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
  filas, guardando, onCerrar, onAplicar,
}: {
  filas: [string, { n: number; valor: number }][];
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
          <h3 className="text-[15px] font-bold text-[#0E245E]">Clasificar motivos según las 6 causales oficiales</h3>
          <p className="mt-0.5 max-w-[84ch] text-[12px] text-[#64748B]">
            {totalFilas} glosas sin causal, en {filas.length} redacciones distintas, por{" "}
            <span className="font-cifra font-semibold text-[#0E245E]">{pesos(totalValor)}</span>. Elige la{" "}
            <strong>Causal oficial (TA, AU, SO, DE, CO, FA)</strong> para aplicarla en bloque.
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
              <th className="py-2 pr-3">Motivo notificado</th>
              <th className="py-2 pr-3 text-right">Filas</th>
              <th className="py-2 pr-3 text-right">Valor</th>
              <th className="py-2 pr-3">Causal (TA, AU, SO, DE, CO, FA)</th>
              <th className="w-20 py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map(([texto, v]) => {
              const cSel = elegido[texto] || "";
              return (
                <tr key={texto} className="border-b border-[#F1F5F9] align-top">
                  <td className="py-2 pr-3 text-[#2A335A]">{texto}</td>
                  <td className="py-2 pr-3 text-right font-cifra text-[#47597A]">{v.n}</td>
                  <td className="py-2 pr-3 text-right font-cifra font-semibold text-[#0E245E]">
                    {pesos(v.valor)}
                  </td>
                  <td className="py-2 pr-3">
                    <label htmlFor={`cl-${texto.slice(0, 20)}`} className="sr-only">Causal</label>
                    <select
                      id={`cl-${texto.slice(0, 20)}`}
                      value={cSel}
                      onChange={(e) => setElegido({ ...elegido, [texto]: e.target.value })}
                      className="w-full max-w-[230px] rounded-lg border border-[#DCE8FA] px-2 py-1.5 text-[12px] outline-none focus:border-[#1D58D8]"
                    >
                      <option value="">— elegir causal —</option>
                      {CAUSAS_NORMATIVAS.map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.codigo} · {c.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      disabled={!cSel || guardando !== null}
                      onClick={async () => {
                        const ok = await onAplicar(texto, cSel);
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ====================================================================== */

function FilaGlosa({
  glosa, cruce, causal, responsablesOpciones, guardando, guardado, avisar, onGuardar, onFicha,
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
  causal?: Causal;
  responsablesOpciones: string[];
  guardando: boolean;
  guardado: boolean;
  avisar: (msg: string) => void;
  onGuardar: (fila: Record<string, unknown>, accion: "CREAR" | "EDITAR") => Promise<boolean>;
  onFicha: () => void;
}) {
  const facturadorInicial = homologarPersonaFacturacion(glosa.facturador);
  const respGlosaInicial = homologarPersonaFacturacion(glosa.responsableRespuesta || glosa.responsableAceptacion);
  const facturadoEfectivo = glosa.valorFacturado || glosa.valorRadicado || cruce.saldoSisma || 0;
  const estadoInicial = normalizarEstadoDecision(glosa.estado, glosa.valorAceptado, glosa.notaCredito);
  const claseCausalInicial = resolverClaseYCausal(glosa.tipoGlosa, glosa.motivoCodigo);
  const valorAceptadoInicialNum = resolverValorAceptadoSegunRegla({
    estado: estadoInicial,
    tipoGlosa: claseCausalInicial.tipoGlosa,
    valorFacturado: facturadoEfectivo,
    valorGlosado: glosa.valorGlosado || 0,
    valorAceptadoPrevio: glosa.valorAceptado,
  });
  const aceptadoInicial = valorAceptadoInicialNum == null ? "" : String(Math.round(valorAceptadoInicialNum));
  const notaInicial = resolverNotaCreditoCondicional(glosa.notaCredito, valorAceptadoInicialNum, estadoInicial);
  const segInicial = resolverSeguimientoAutomatico(glosa.seguimientoEstado, estadoInicial);
  const valSegInicial = glosa.valorSeguimiento == null ? "" : String(Math.round(glosa.valorSeguimiento));
  const valFactInicial = String(Math.round(facturadoEfectivo));
  const valGlosInicial = String(Math.round(glosa.valorGlosado || 0));
  const fechaPrestInicial = (glosa.fechaPrestacionServicio || "").slice(0, 10);
  const fechaFactInicial = (glosa.fechaFactura || "").slice(0, 10);
  const fechaRadInicial = (glosa.fechaRadicacion || "").slice(0, 10);
  const fechaNotifInicial = (glosa.fechaNotificacionGlosa || "").slice(0, 10);
  const obsInicial = glosa.observacionInterna || "";
  const motivoInicial = glosa.motivoGlosa || "";

  const [abierta, setAbierta] = useState(false);
  const [estado, setEstado] = useState<"PENDIENTE" | "ACEPTADA" | "NO_ACEPTADA">(estadoInicial);
  const [aceptado, setAceptado] = useState(aceptadoInicial);
  const [nota, setNota] = useState(notaInicial);
  const [facturador, setFacturador] = useState(facturadorInicial);
  const [respGlosa, setRespGlosa] = useState(respGlosaInicial);
  const [fechaPrest, setFechaPrest] = useState(fechaPrestInicial);
  const [fechaFact, setFechaFact] = useState(fechaFactInicial);
  const [fechaRad, setFechaRad] = useState(fechaRadInicial);
  const [fechaNotif, setFechaNotif] = useState(fechaNotifInicial);
  const [seguimiento, setSeguimiento] = useState<SeguimientoGlosaCodigo>(segInicial);
  const [valSeg, setValSeg] = useState(valSegInicial);
  const [valFact, setValFact] = useState(valFactInicial);
  const [valGlos, setValGlos] = useState(valGlosInicial);
  const [obs, setObs] = useState(obsInicial);
  const [motivo, setMotivo] = useState(motivoInicial);
  const [codigo, setCodigo] = useState(claseCausalInicial.motivoCodigo);
  const [clase, setClase] = useState<"GLOSA" | "DEVOLUCION">(claseCausalInicial.tipoGlosa);

  const ultimo = useRef({
    estado: estadoInicial,
    aceptado: aceptadoInicial,
    nota: notaInicial,
    facturador: facturadorInicial,
    respGlosa: respGlosaInicial,
    fechaPrest: fechaPrestInicial,
    fechaFact: fechaFactInicial,
    fechaRad: fechaRadInicial,
    fechaNotif: fechaNotifInicial,
    seguimiento: segInicial,
    valSeg: valSegInicial,
    valFact: valFactInicial,
    valGlos: valGlosInicial,
    obs: obsInicial,
    motivo: motivoInicial,
  });

  useEffect(() => {
    const estNorm = normalizarEstadoDecision(glosa.estado, glosa.valorAceptado, glosa.notaCredito);
    const vfEf = glosa.valorFacturado || glosa.valorRadicado || cruce.saldoSisma || 0;
    const vgEf = glosa.valorGlosado || 0;
    const cc = resolverClaseYCausal(glosa.tipoGlosa, glosa.motivoCodigo);
    const vAcepNum = resolverValorAceptadoSegunRegla({
      estado: estNorm,
      tipoGlosa: cc.tipoGlosa,
      valorFacturado: vfEf,
      valorGlosado: vgEf,
      valorAceptadoPrevio: glosa.valorAceptado,
    });
    const a = vAcepNum == null ? "" : String(Math.round(vAcepNum));
    const vs = glosa.valorSeguimiento == null ? "" : String(Math.round(glosa.valorSeguimiento));
    const vf = String(Math.round(vfEf));
    const vg = String(Math.round(vgEf));
    const fp = (glosa.fechaPrestacionServicio || "").slice(0, 10);
    const ff = (glosa.fechaFactura || "").slice(0, 10);
    const fr = (glosa.fechaRadicacion || "").slice(0, 10);
    const fn = (glosa.fechaNotificacionGlosa || "").slice(0, 10);
    const fUnif = homologarPersonaFacturacion(glosa.facturador);
    const rUnif = homologarPersonaFacturacion(glosa.responsableRespuesta || glosa.responsableAceptacion);
    const ncInit = resolverNotaCreditoCondicional(glosa.notaCredito, vAcepNum, estNorm);
    const segAuto = resolverSeguimientoAutomatico(glosa.seguimientoEstado, estNorm);
    const obsClean = glosa.observacionInterna || "";
    const motClean = glosa.motivoGlosa || "";

    setEstado(estNorm);
    setAceptado(a);
    setNota(ncInit);
    setFacturador(fUnif);
    setRespGlosa(rUnif);
    setFechaPrest(fp);
    setFechaFact(ff);
    setFechaRad(fr);
    setFechaNotif(fn);
    setSeguimiento(segAuto);
    setValSeg(vs);
    setValFact(vf);
    setValGlos(vg);
    setObs(obsClean);
    setMotivo(motClean);
    setCodigo(cc.motivoCodigo);
    setClase(cc.tipoGlosa);
    ultimo.current = {
      estado: estNorm,
      aceptado: a,
      nota: ncInit,
      facturador: fUnif,
      respGlosa: rUnif,
      fechaPrest: fp,
      fechaFact: ff,
      fechaRad: fr,
      fechaNotif: fn,
      seguimiento: segAuto,
      valSeg: vs,
      valFact: vf,
      valGlos: vg,
      obs: obsClean,
      motivo: motClean,
    };
  }, [
    glosa.id, glosa.estado, glosa.valorAceptado, glosa.notaCredito, glosa.responsableAceptacion,
    glosa.responsableRespuesta, glosa.facturador, glosa.fechaPrestacionServicio, glosa.fechaFactura,
    glosa.fechaRadicacion, glosa.fechaNotificacionGlosa, glosa.seguimientoEstado, glosa.valorSeguimiento,
    glosa.valorFacturado, glosa.valorRadicado, glosa.valorGlosado, glosa.observacionInterna,
    glosa.motivoGlosa, glosa.motivoCodigo, glosa.tipoGlosa, cruce.saldoSisma,
  ]);

  const enviar = (parcial: Record<string, unknown>) => {
    const fUnif = homologarPersonaFacturacion(facturador);
    const rUnif = homologarPersonaFacturacion(respGlosa);
    void onGuardar(
      {
        ...glosa,
        estado,
        notaCredito: nota,
        facturador: fUnif,
        responsableAceptacion: rUnif,
        responsableRespuesta: rUnif,
        fechaPrestacionServicio: fechaPrest,
        fechaFactura: fechaFact,
        fechaRadicacion: fechaRad,
        fechaNotificacionGlosa: fechaNotif,
        seguimientoEstado: seguimiento,
        valorSeguimiento: valSeg.trim() === "" ? null : soloNumero(valSeg),
        valorFacturado: soloNumero(valFact),
        valorRadicado: soloNumero(valFact),
        valorGlosado: soloNumero(valGlos),
        observacionInterna: obs,
        motivoGlosa: motivo,
        motivoCodigo: codigo,
        tipoGlosa: clase,
        alcance: "",
        subcodigoCausal: "",
        ...parcial,
      },
      "EDITAR",
    );
  };

  const puedePersistirFila = (
    estCheck = estado,
    ncCheck = nota,
    segCheck = seguimiento,
    obsCheck = obs
  ): boolean => {
    if (estCheck === "ACEPTADA" && !esNumeroNotaCreditoReal(ncCheck)) {
      avisar("Glosa Aceptada: debes ingresar el número de la Nota Crédito antes de guardar.");
      return false;
    }
    if (segCheck === "RATIFICACION_GLOSA" && !obsCheck.trim()) {
      avisar("Rectificación de glosa: es obligatorio escribir el motivo en el campo de observación.");
      return false;
    }
    return true;
  };

  const salir = () => {
    const u = ultimo.current;
    if (
      estado === u.estado &&
      aceptado === u.aceptado &&
      nota === u.nota &&
      facturador === u.facturador &&
      respGlosa === u.respGlosa &&
      fechaPrest === u.fechaPrest &&
      fechaFact === u.fechaFact &&
      fechaRad === u.fechaRad &&
      fechaNotif === u.fechaNotif &&
      seguimiento === u.seguimiento &&
      valSeg === u.valSeg &&
      valFact === u.valFact &&
      valGlos === u.valGlos &&
      obs === u.obs &&
      motivo === u.motivo
    ) {
      return;
    }

    if (!puedePersistirFila()) return;

    const vfNum = soloNumero(valFact);
    const vgNum = soloNumero(valGlos);
    const vAcepPrev = aceptado.trim() === "" ? null : soloNumero(aceptado);
    const vAcepNum = resolverValorAceptadoSegunRegla({
      estado,
      tipoGlosa: clase,
      valorFacturado: vfNum || facturadoEfectivo,
      valorGlosado: vgNum,
      valorAceptadoPrevio: vAcepPrev,
    });
    const aStr = vAcepNum == null ? "" : String(vAcepNum);
    if (aStr !== aceptado) setAceptado(aStr);

    const notaFinal = resolverNotaCreditoCondicional(nota, vAcepNum, estado);
    if (notaFinal !== nota) setNota(notaFinal);

    if (notaFinal !== u.nota && notaFinal !== "" && !esNotaCreditoValida(notaFinal)) {
      avisar("Nota Crédito: ingresa el número consecutivo (ej. NC2375).");
      setNota(u.nota);
      return;
    }

    const fNorm = homologarPersonaFacturacion(facturador);
    const rNorm = homologarPersonaFacturacion(respGlosa);
    if (fNorm !== facturador) setFacturador(fNorm);
    if (rNorm !== respGlosa) setRespGlosa(rNorm);

    const segFinal = resolverSeguimientoAutomatico(seguimiento, estado);
    if (segFinal !== seguimiento) setSeguimiento(segFinal);

    ultimo.current = {
      estado,
      aceptado: aStr,
      nota: notaFinal,
      facturador: fNorm,
      respGlosa: rNorm,
      fechaPrest,
      fechaFact,
      fechaRad,
      fechaNotif,
      seguimiento: segFinal,
      valSeg,
      valFact: String(vfNum),
      valGlos: String(vgNum),
      obs,
      motivo,
    };
    enviar({
      estado,
      valorAceptado: vAcepNum,
      notaCredito: notaFinal,
      facturador: fNorm,
      responsableAceptacion: rNorm,
      responsableRespuesta: rNorm,
      fechaPrestacionServicio: fechaPrest,
      fechaFactura: fechaFact,
      fechaRadicacion: fechaRad,
      fechaNotificacionGlosa: fechaNotif,
      seguimientoEstado: segFinal,
      valorSeguimiento: valSeg.trim() === "" ? null : soloNumero(valSeg),
      valorFacturado: vfNum,
      valorRadicado: vfNum,
      valorGlosado: vgNum,
      observacionInterna: obs,
      motivoGlosa: motivo,
      tipoGlosa: clase,
      motivoCodigo: codigo,
    });
  };

  const cambiarFacturador = (nuevoRaw: string) => {
    const nv = homologarPersonaFacturacion(nuevoRaw);
    setFacturador(nv);
    if (!puedePersistirFila()) return;
    ultimo.current = { ...ultimo.current, facturador: nv };
    enviar({ facturador: nv });
  };

  const cambiarRespGlosa = (nuevoRaw: string) => {
    const nv = homologarPersonaFacturacion(nuevoRaw);
    setRespGlosa(nv);
    if (!puedePersistirFila()) return;
    ultimo.current = { ...ultimo.current, respGlosa: nv };
    enviar({ responsableAceptacion: nv, responsableRespuesta: nv });
  };

  const cambiarSeguimiento = (nuevoSeg: SeguimientoGlosaCodigo) => {
    setSeguimiento(nuevoSeg);
    let nuevoValSeg = valSeg;
    if (nuevoSeg === "PAGO_COMPLETO") {
      nuevoValSeg = String(Math.round(soloNumero(valFact) || facturadoEfectivo || soloNumero(valGlos) || 0));
    } else if (nuevoSeg === "LEVANTAMIENTO_COMPLETO") {
      nuevoValSeg = String(Math.round(soloNumero(valGlos) || 0));
    } else if (nuevoSeg === "" || nuevoSeg === "TRAMITADA" || nuevoSeg === "PROCESO_PAGO" || nuevoSeg === "RATIFICACION_GLOSA") {
      nuevoValSeg = "";
    }
    setValSeg(nuevoValSeg);

    if (nuevoSeg === "RATIFICACION_GLOSA" && !obs.trim()) {
      avisar("Rectificación de glosa: ingresa el motivo obligatorio en el campo que se abrió debajo.");
      window.setTimeout(() => {
        document.getElementById(`obs-rect-${glosa.id}`)?.focus();
      }, 35);
      return;
    }
    if (estado === "ACEPTADA" && !esNumeroNotaCreditoReal(nota)) return;
    ultimo.current = { ...ultimo.current, seguimiento: nuevoSeg, valSeg: nuevoValSeg };
    enviar({
      seguimientoEstado: nuevoSeg,
      valorSeguimiento: nuevoValSeg.trim() === "" ? null : soloNumero(nuevoValSeg),
    });
  };

  const cambiarClase = (nuevaClaseRaw: string) => {
    const nuevaClase: "GLOSA" | "DEVOLUCION" = nuevaClaseRaw === "DEVOLUCION" ? "DEVOLUCION" : "GLOSA";
    const nuevoCod = nuevaClase === "DEVOLUCION" ? "DE" : codigo === "DE" ? "" : codigo;
    setClase(nuevaClase);
    setCodigo(nuevoCod);

    const vfActual = soloNumero(valFact) || facturadoEfectivo;
    const vgActual = soloNumero(valGlos);
    let nuevoAcep = aceptado;
    if (estado === "ACEPTADA") {
      const calc = resolverValorAceptadoSegunRegla({
        estado: "ACEPTADA",
        tipoGlosa: nuevaClase,
        valorFacturado: vfActual,
        valorGlosado: vgActual,
        valorAceptadoPrevio: aceptado.trim() === "" ? null : soloNumero(aceptado),
      });
      nuevoAcep = calc == null ? "" : String(calc);
      setAceptado(nuevoAcep);
    }

    if (!puedePersistirFila()) return;
    if (estado === "ACEPTADA") {
      ultimo.current = { ...ultimo.current, aceptado: nuevoAcep };
    }
    enviar({
      tipoGlosa: nuevaClase,
      alcance: "",
      motivoCodigo: nuevoCod,
      ...(estado === "ACEPTADA"
        ? { valorAceptado: nuevoAcep.trim() === "" ? null : soloNumero(nuevoAcep) }
        : {}),
    });
  };

  const cambiarCausal = (nuevoCodRaw: string) => {
    const nuevoCod = nuevoCodRaw.trim().toUpperCase();
    const nuevaClase: "GLOSA" | "DEVOLUCION" =
      nuevoCod === "DE" ? "DEVOLUCION" : nuevoCod ? "GLOSA" : clase;
    setCodigo(nuevoCod);
    setClase(nuevaClase);

    const vfActual = soloNumero(valFact) || facturadoEfectivo;
    const vgActual = soloNumero(valGlos);
    let nuevoAcep = aceptado;
    if (estado === "ACEPTADA") {
      const calc = resolverValorAceptadoSegunRegla({
        estado: "ACEPTADA",
        tipoGlosa: nuevaClase,
        valorFacturado: vfActual,
        valorGlosado: vgActual,
        valorAceptadoPrevio: aceptado.trim() === "" ? null : soloNumero(aceptado),
      });
      nuevoAcep = calc == null ? "" : String(calc);
      setAceptado(nuevoAcep);
    }

    if (!puedePersistirFila()) return;
    if (estado === "ACEPTADA") {
      ultimo.current = { ...ultimo.current, aceptado: nuevoAcep };
    }
    enviar({
      motivoCodigo: nuevoCod,
      tipoGlosa: nuevaClase,
      alcance: "",
      subcodigoCausal: "",
      ...(estado === "ACEPTADA"
        ? { valorAceptado: nuevoAcep.trim() === "" ? null : soloNumero(nuevoAcep) }
        : {}),
    });
  };

  const cambiarEstado = (nuevoRaw: string) => {
    const nuevo = normalizarEstadoDecision(nuevoRaw);
    setEstado(nuevo);
    if (nuevo === "NO_ACEPTADA") {
      setAceptado("0");
      setNota("N/A");
      const segNoAcep = seguimiento === "TRAMITADA" ? "" : seguimiento;
      if (segNoAcep !== seguimiento) setSeguimiento(segNoAcep);
      if (segNoAcep === "RATIFICACION_GLOSA" && !obs.trim()) {
        avisar("Completa primero el motivo obligatorio de Rectificación de glosa.");
        return;
      }
      ultimo.current = {
        ...ultimo.current,
        estado: "NO_ACEPTADA",
        aceptado: "0",
        nota: "N/A",
        seguimiento: segNoAcep,
      };
      enviar({
        estado: "NO_ACEPTADA",
        valorAceptado: 0,
        notaCredito: "N/A",
        seguimientoEstado: segNoAcep,
      });
      return;
    }
    if (nuevo === "PENDIENTE") {
      setAceptado("");
      const ncPend = nota.trim().toUpperCase() === "N/A" ? "" : nota.trim().toUpperCase();
      const segPend = seguimiento === "TRAMITADA" ? "" : seguimiento;
      setNota(ncPend);
      setSeguimiento(segPend);
      if (segPend === "RATIFICACION_GLOSA" && !obs.trim()) return;
      ultimo.current = {
        ...ultimo.current,
        estado: "PENDIENTE",
        aceptado: "",
        nota: ncPend,
        seguimiento: segPend,
      };
      enviar({
        estado: "PENDIENTE",
        valorAceptado: null,
        notaCredito: ncPend || null,
        seguimientoEstado: segPend,
      });
      return;
    }

    // nuevo === "ACEPTADA" -> Seguimiento pasa automáticamente a "TRAMITADA" y Aceptado toma Facturado (si Devolución) o Glosado (si Glosa)
    const vfActual = soloNumero(valFact) || facturadoEfectivo;
    const vgActual = soloNumero(valGlos);
    const vCalc = resolverValorAceptadoSegunRegla({
      estado: "ACEPTADA",
      tipoGlosa: clase,
      valorFacturado: vfActual,
      valorGlosado: vgActual,
      valorAceptadoPrevio:
        aceptado.trim() === "" || soloNumero(aceptado) === 0 ? null : soloNumero(aceptado),
    });
    const p = vCalc == null ? "" : String(vCalc);
    const segAceptada: SeguimientoGlosaCodigo = seguimiento === "" ? "TRAMITADA" : seguimiento;
    setAceptado(p);
    setSeguimiento(segAceptada);

    if (!esNumeroNotaCreditoReal(nota)) {
      setNota("");
      avisar("Glosa Aceptada: seguimiento en Tramitada. Ingresa el número de la Nota Crédito para guardar.");
      window.setTimeout(() => {
        document.getElementById(`nc-${glosa.id}`)?.focus();
      }, 35);
      return;
    }
    if (segAceptada === "RATIFICACION_GLOSA" && !obs.trim()) {
      avisar("Rectificación de glosa: escribe el motivo obligatorio para guardar.");
      return;
    }
    const ncReal = nota.trim().toUpperCase();
    const vAcepNum = p.trim() === "" ? null : soloNumero(p);
    ultimo.current = {
      ...ultimo.current,
      estado: "ACEPTADA",
      aceptado: p,
      nota: ncReal,
      seguimiento: segAceptada,
    };
    enviar({
      estado: "ACEPTADA",
      valorAceptado: vAcepNum,
      notaCredito: ncReal,
      seguimientoEstado: segAceptada,
    });
  };

  const valorFactVista = soloNumero(valFact) || facturadoEfectivo;
  const valorGlosVista = soloNumero(valGlos);
  const esDevolucionAceptada = estado === "ACEPTADA" && clase === "DEVOLUCION";
  const valorAceptadoEfectivo =
    estado === "NO_ACEPTADA"
      ? 0
      : esDevolucionAceptada
      ? valorFactVista || valorGlosVista
      : aceptado.trim() === ""
      ? null
      : soloNumero(aceptado);

  const vistaFila: Glosa = {
    ...glosa,
    valorFacturado: valorFactVista,
    valorGlosado: valorGlosVista,
    valorAceptado: valorAceptadoEfectivo,
    estado,
    notaCredito: nota,
    facturador,
    responsableAceptacion: respGlosa,
    responsableRespuesta: respGlosa,
    fechaPrestacionServicio: fechaPrest,
    fechaFactura: fechaFact,
    motivoCodigo: codigo,
    tipoGlosa: clase,
    motivoGlosa: motivo,
    seguimientoEstado: seguimiento,
    valorSeguimiento: valSeg.trim() === "" ? null : soloNumero(valSeg),
    observacionInterna: obs,
  };

  const pago = clasePago(vistaFila);
  const excede =
    !esDevolucionAceptada &&
    vistaFila.valorAceptado !== null &&
    valorGlosVista > 0 &&
    vistaFila.valorAceptado > valorGlosVista;
  const empInfo = normalizarEmpresaYNit(glosa.empresa || glosa.empresaOriginal, cruce.nit);

  const itemsPendientes = listarPendientesFila(vistaFila, cruce);
  const tienePendientes = itemsPendientes.length > 0;

  const sinValorFact = valorFactVista <= 0;
  const sinValorGlosa = valorGlosVista <= 0;
  const faltaPrest = !fechaPrest;
  const faltaFechaFact = !fechaFact && !cruce.fechaFacturaSisma;
  const faltaEmpresa = !(empInfo.nombre || cruce.empresaHomologada || glosa.empresa);
  const faltaNit = !(empInfo.nit || cruce.nit);
  const faltaFacturador = !facturador;
  const faltaRespGlosa = !respGlosa;
  const faltaCausal = !codigo;
  const faltaMotivo = !motivo.trim();
  const faltaAceptado = valorAceptadoEfectivo === null;
  const faltaSegBase = seguimiento === "";
  const faltaObsRectificacion = seguimiento === "RATIFICACION_GLOSA" && !obs.trim();
  const faltaValSegParcial =
    (seguimiento === "PAGO_PARCIAL" || seguimiento === "LEVANTAMIENTO_PARCIAL") && !valSeg.trim();
  const faltaNcAceptada = estado === "ACEPTADA" && !esNumeroNotaCreditoReal(nota);
  const faltaNotaCualquiera =
    estado === "ACEPTADA" ? !esNumeroNotaCreditoReal(nota) : !esNotaCreditoValida(nota);

  const pendienteGuardarAceptada =
    estado === "ACEPTADA" &&
    esNumeroNotaCreditoReal(nota) &&
    (estado !== ultimo.current.estado || nota.trim().toUpperCase() !== ultimo.current.nota);

  const pendienteGuardarRectificacion =
    seguimiento === "RATIFICACION_GLOSA" &&
    obs.trim() !== "" &&
    (seguimiento !== ultimo.current.seguimiento || obs !== ultimo.current.obs);

  const listaFactFinal = useMemo(() => {
    if (facturador && !responsablesOpciones.includes(facturador)) {
      return [facturador, ...responsablesOpciones];
    }
    return responsablesOpciones;
  }, [facturador, responsablesOpciones]);

  const listaRespFinal = useMemo(() => {
    if (respGlosa && !responsablesOpciones.includes(respGlosa)) {
      return [respGlosa, ...responsablesOpciones];
    }
    return responsablesOpciones;
  }, [respGlosa, responsablesOpciones]);

  const opcionesSegFila = useMemo(
    () =>
      estado === "ACEPTADA"
        ? OPCIONES_SEGUIMIENTO_GLOSA.filter((o) => o.id !== "")
        : OPCIONES_SEGUIMIENTO_GLOSA,
    [estado]
  );

  const celda =
    "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[12.5px] outline-none hover:border-[#DCE8FA] focus:border-[#1D58D8] focus:bg-white";
  const estiloRojo =
    "border-[#DC2626] bg-[#FEF2F2] font-bold text-[#991B1B] placeholder:text-[#DC2626]/80 focus:ring-2 focus:ring-[#DC2626]/25";

  return (
    <>
      <tr
        onDoubleClick={onFicha}
        className={`border-b align-top transition ${
          tienePendientes
            ? "border-[#FECACA] border-l-4 border-l-[#DC2626] bg-[#FEF2F2]/60 hover:bg-[#FEE2E2]/60"
            : guardando
            ? "border-[#F1F5F9] bg-[#F6F9FE]"
            : abierta
            ? "border-[#F1F5F9] bg-[#FAFCFF]"
            : "border-[#F1F5F9] hover:bg-[#F8FAFC]"
        }`}
      >
        <td className="py-1.5 pl-1">
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
          <span className={`block text-[12.5px] font-semibold ${tienePendientes ? "text-[#991B1B]" : "text-[#0E245E]"}`}>
            {glosa.factura}
          </span>
          {tienePendientes && (
            <span
              className="mt-0.5 inline-flex items-center gap-1 rounded border border-[#FCA5A5] bg-[#FEE2E2] px-1.5 py-0.5 font-sans text-[9.5px] font-extrabold text-[#B91C1C]"
              title={`Pendiente por llenar (${itemsPendientes.length}): ${itemsPendientes.join(", ")}`}
            >
              <AlertTriangle className="h-2.5 w-2.5" /> {itemsPendientes.length} pend.
            </span>
          )}
          {!faltaPrest ? (
            <span className="block text-[10.5px] font-semibold text-[#047857]" title="Fecha de prestación del servicio">
              Prest: {fecha(fechaPrest)}
            </span>
          ) : (
            <span
              className="mt-0.5 block rounded bg-[#FEE2E2] px-1 py-0.5 text-[10px] font-bold text-[#B91C1C]"
              title="Falta fecha de prestación (abre '>' para diligenciar)"
            >
              Prest: Falta fecha
            </span>
          )}
          {!faltaFechaFact ? (
            <span className="block text-[10px] text-[#64748B]" title="Fecha de factura">
              Fact: {fechaFact ? fecha(fechaFact) : fecha(cruce.fechaFacturaSisma)}
            </span>
          ) : (
            <span
              className="mt-0.5 block rounded bg-[#FEE2E2] px-1 py-0.5 text-[10px] font-bold text-[#B91C1C]"
              title="Falta fecha de factura"
            >
              Fact: Falta fecha
            </span>
          )}
          {fechaNotif && (
            <span className="block text-[10px] text-[#1D58D8]" title="Fecha de notificación de glosa">
              Notif: {fecha(fechaNotif)}
            </span>
          )}
        </td>
        <td className="py-1.5 pr-3 text-[#47597A]">
          <span className={`block text-[12px] font-bold ${faltaEmpresa ? "rounded bg-[#FEE2E2] px-1 text-[#B91C1C]" : "text-[#0E245E]"}`}>
            {empInfo.nombre || cruce.empresaHomologada || glosa.empresa || "Falta ERP"}
          </span>
          {!faltaNit ? (
            <span className="mt-0.5 inline-block rounded bg-[#F1F5F9] px-1.5 py-0.5 font-cifra text-[10px] font-semibold text-[#334155]">
              NIT {empInfo.nit || cruce.nit}
            </span>
          ) : (
            <span className="mt-0.5 inline-block rounded border border-[#FCA5A5] bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-bold text-[#B91C1C]">
              Sin NIT
            </span>
          )}
          <span className="mt-0.5 block text-[10px] font-medium text-[#1D58D8]">{cruce.deDondeEs}</span>
        </td>

        {/* COLUMNA 1: FACTURADOR (QUIEN REALIZA LA FACTURA) */}
        <td className="py-1.5 pr-2">
          <label htmlFor={`fac-${glosa.id}`} className="sr-only">Facturador (quien realiza la factura)</label>
          <select
            id={`fac-${glosa.id}`}
            value={facturador}
            onChange={(e) => cambiarFacturador(e.target.value)}
            title="Quien realiza la factura (Facturador)"
            className={`w-[138px] rounded-[6px] border px-1.5 py-1 text-[11px] font-semibold outline-none focus:border-[#1D58D8] ${
              faltaFacturador ? estiloRojo : "border-[#DCE8FA] bg-white text-[#0E245E]"
            }`}
          >
            <option value="">— Falta facturador —</option>
            {listaFactFinal.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </td>

        {/* COLUMNA 2: RESPONSABLE GLOSA (QUIEN RESPONDE) */}
        <td className="py-1.5 pr-2">
          <label htmlFor={`rg-${glosa.id}`} className="sr-only">Responsable de responder la glosa</label>
          <select
            id={`rg-${glosa.id}`}
            value={respGlosa}
            onChange={(e) => cambiarRespGlosa(e.target.value)}
            title="Quien responde la glosa (Responsable Glosa)"
            className={`w-[138px] rounded-[6px] border px-1.5 py-1 text-[11px] font-semibold outline-none focus:border-[#1D58D8] ${
              faltaRespGlosa ? estiloRojo : "border-[#DCE8FA] bg-white text-[#0E245E]"
            }`}
          >
            <option value="">— Falta responsable —</option>
            {listaRespFinal.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </td>

        {/* CLASE: SOLO GLOSA / DEVOLUCIÓN ASOCIADA CON DE */}
        <td className="py-1.5 pr-2">
          <label htmlFor={`cla-${glosa.id}`} className="sr-only">Clase (Glosa o Devolución)</label>
          <select
            id={`cla-${glosa.id}`}
            value={clase}
            onChange={(e) => cambiarClase(e.target.value)}
            title="Devolución va asociada con DE; las demás causales con Glosa"
            className={`w-[104px] rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${
              clase === "DEVOLUCION"
                ? "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C]"
                : "border-[#DCE8FA] bg-[#F8FAFC] text-[#1A3174]"
            }`}
          >
            {CLASES.map((c) => (
              <option key={c.id} value={c.id}>{c.etiqueta}</option>
            ))}
          </select>
        </td>

        {/* CAUSAL (TA, AU, SO, DE, CO, FA) */}
        <td className="py-1.5 pr-2">
          <label htmlFor={`cau-${glosa.id}`} className="sr-only">Causal (TA, AU, SO, DE, CO, FA)</label>
          <select
            id={`cau-${glosa.id}`}
            value={codigo}
            onChange={(e) => cambiarCausal(e.target.value)}
            title={causal ? `${causal.codigo} · ${causal.familia} · ${causal.nombre}` : "Falta seleccionar causal"}
            className={`w-[122px] rounded-[6px] border px-1.5 py-1 font-cifra text-[11px] font-semibold outline-none ${
              faltaCausal ? estiloRojo : "border-[#DCE8FA] bg-[#F8FAFC] text-[#1A3174]"
            }`}
          >
            <option value="">— Falta causal —</option>
            {CAUSAS_NORMATIVAS.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
        </td>

        {/* MOTIVO DE GLOSA */}
        <td className="py-1.5 pr-2 min-w-[165px] max-w-[235px]">
          <label htmlFor={`motline-${glosa.id}`} className="sr-only">Motivo de glosa {glosa.factura}</label>
          <input
            id={`motline-${glosa.id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={salir}
            placeholder="⚠ Falta motivo"
            title={motivo || "Falta escribir el motivo de glosa"}
            className={`w-full rounded border px-1.5 py-1 truncate text-[11.5px] outline-none ${
              faltaMotivo
                ? estiloRojo
                : "border-transparent bg-transparent text-[#334155] hover:border-[#DCE8FA] focus:border-[#1D58D8] focus:bg-white"
            }`}
          />
        </td>

        {/* FACTURADO */}
        <td className="py-1.5 pr-2 text-right font-cifra">
          {sinValorFact ? (
            <span
              className="inline-flex items-center gap-0.5 rounded border border-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 text-[11px] font-extrabold text-[#B91C1C]"
              title="Sin valor facturado (abre la fila con '>' para ingresarlo)"
            >
              ⚠ $0
            </span>
          ) : (
            <span className="text-[#47597A]">{pesos(valorFactVista)}</span>
          )}
        </td>

        {/* GLOSADO */}
        <td className="py-1.5 pr-2 text-right font-cifra">
          {sinValorGlosa ? (
            <span
              className="inline-flex items-center gap-0.5 rounded border border-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 text-[11px] font-extrabold text-[#B91C1C]"
              title="Alerta: valor glosado en cero ($0). Abre '>' para ingresarlo."
            >
              ⚠ $0
            </span>
          ) : (
            <span className="font-semibold text-[#0E245E]">{pesos(valorGlosVista)}</span>
          )}
        </td>

        {/* ACEPTADO (EN PESOS $ — IGUAL AL FACTURADO SI ES DEVOLUCIÓN ACEPTADA) */}
        <td className="py-1.5 pr-2 text-right">
          <label htmlFor={`ace-${glosa.id}`} className="sr-only">Valor aceptado en pesos {glosa.factura}</label>
          <input
            id={`ace-${glosa.id}`}
            value={
              estado === "NO_ACEPTADA"
                ? "$0"
                : esDevolucionAceptada
                ? pesos(valorFactVista || valorGlosVista)
                : formatoPesosInput(aceptado)
            }
            readOnly={estado === "NO_ACEPTADA" || esDevolucionAceptada}
            onChange={(e) => {
              const dig = e.target.value.replace(/[^0-9]/g, "");
              setAceptado(dig);
              if (estado !== "ACEPTADA" && dig !== "" && Number(dig) === 0) {
                setNota("N/A");
              }
            }}
            onBlur={salir}
            inputMode="numeric"
            placeholder="⚠ Falta $"
            title={
              esDevolucionAceptada
                ? "Devolución aceptada: siempre toma el mismo valor de la factura"
                : estado === "NO_ACEPTADA"
                ? "No Aceptada: $0"
                : "Valor aceptado en pesos ($)"
            }
            className={`w-[104px] rounded border px-1.5 py-1 text-right font-cifra text-[12px] outline-none ${
              faltaAceptado
                ? estiloRojo
                : estado === "NO_ACEPTADA" || esDevolucionAceptada
                ? "border-[#DCE8FA] bg-[#F8FAFC] font-semibold text-[#0E245E] cursor-default"
                : "border-transparent bg-transparent font-semibold text-[#0E245E] hover:border-[#DCE8FA] focus:border-[#1D58D8] focus:bg-white"
            }`}
          />
          {pago && <span className={`block pr-1.5 text-[10px] font-semibold uppercase ${pago.clase}`}>{pago.texto}</span>}
          {excede && <span className="block pr-1.5 text-[10px] font-semibold text-[#B45309]">supera lo glosado</span>}
        </td>

        {/* SEGUIMIENTO (TRAMITADA AUTOMÁTICA EN ACEPTADA, PROCESO DE PAGO Y RECTIFICACIÓN CON OBS OBLIGATORIA) */}
        <td className="py-1.5 pr-2">
          {(() => {
            const opSeg =
              OPCIONES_SEGUIMIENTO_GLOSA.find((o) => o.id === seguimiento) || OPCIONES_SEGUIMIENTO_GLOSA[0];
            return (
              <div className="space-y-1">
                <label htmlFor={`seg-${glosa.id}`} className="sr-only">Seguimiento de la glosa</label>
                <select
                  id={`seg-${glosa.id}`}
                  value={seguimiento}
                  onChange={(e) => cambiarSeguimiento(e.target.value as SeguimientoGlosaCodigo)}
                  className={`w-[158px] rounded-[6px] border px-1.5 py-1 text-[11px] font-semibold outline-none ${
                    faltaSegBase ? estiloRojo : ""
                  }`}
                  style={
                    faltaSegBase
                      ? undefined
                      : {
                          backgroundColor: opSeg.badgeBg,
                          color: opSeg.badgeText,
                          borderColor: opSeg.badgeBorder,
                        }
                  }
                >
                  {opcionesSegFila.map((o) => (
                    <option key={o.id || "NONE"} value={o.id}>{o.corto}</option>
                  ))}
                </select>

                {(seguimiento === "PAGO_PARCIAL" || seguimiento === "LEVANTAMIENTO_PARCIAL") && (
                  <input
                    value={formatoPesosInput(valSeg)}
                    onChange={(e) => setValSeg(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={salir}
                    inputMode="numeric"
                    placeholder="⚠ $ valor seg. *"
                    title="Valor pagado o levantado en pesos"
                    className={`w-[158px] rounded border px-1.5 py-0.5 text-right font-cifra text-[11px] outline-none ${
                      faltaValSegParcial
                        ? estiloRojo
                        : "border-[#DCE8FA] bg-white text-[#0E245E] focus:border-[#1D58D8]"
                    }`}
                  />
                )}

                {seguimiento === "RATIFICACION_GLOSA" && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <input
                        id={`obs-rect-${glosa.id}`}
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            salir();
                          }
                        }}
                        onBlur={salir}
                        placeholder="Motivo / obs. obligatorio *"
                        title="Campo obligatorio: escribe el motivo como observación para Rectificación de glosa"
                        className={`w-[158px] rounded border px-1.5 py-1 text-[11px] outline-none ${
                          faltaObsRectificacion
                            ? estiloRojo
                            : "border-[#DCE8FA] bg-white text-[#0E245E] focus:border-[#1D58D8]"
                        }`}
                      />
                      {pendienteGuardarRectificacion && (
                        <button
                          type="button"
                          onClick={salir}
                          className="rounded bg-[#16A34A] px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-[#15803D]"
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                    {faltaObsRectificacion && (
                      <span className="block text-[9.5px] font-bold text-[#DC2626]">
                        Obligatorio escribir motivo
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </td>

        {/* ESTADO (— SELECCIONAR — EN ROJO / ACEPTADA / NO ACEPTADA) */}
        <td className="py-1.5 pr-2">
          <label htmlFor={`est-${glosa.id}`} className="sr-only">Estado de la glosa {glosa.factura}</label>
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

        {/* NOTA CRÉDITO (EN ROJO SI ESTÁ VACÍA O FALTA EN ACEPTADA) */}
        <td className="py-1.5 pr-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <label htmlFor={`nc-${glosa.id}`} className="sr-only">Nota crédito</label>
              <input
                id={`nc-${glosa.id}`}
                value={estado === "NO_ACEPTADA" ? "N/A" : nota}
                readOnly={estado === "NO_ACEPTADA"}
                onChange={(e) => setNota(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    salir();
                  }
                }}
                onBlur={salir}
                placeholder={estado === "ACEPTADA" ? "N° Nota *" : "⚠ Falta NC"}
                title={
                  estado === "NO_ACEPTADA"
                    ? "No Aceptada: automáticamente N/A"
                    : estado === "ACEPTADA"
                    ? "Aceptada: obligatorio escribir el número de la Nota Crédito para guardar"
                    : "Pendiente: ingresa el número de Nota Crédito o elige Estado"
                }
                className={`w-[96px] rounded border px-1.5 py-1 font-cifra text-[12px] outline-none ${
                  estado === "NO_ACEPTADA"
                    ? "border-[#DCE8FA] bg-[#F8FAFC] font-semibold text-[#475569] cursor-default"
                    : faltaNotaCualquiera
                    ? estiloRojo
                    : "border-transparent bg-transparent text-[#0E245E] hover:border-[#DCE8FA] focus:border-[#1D58D8] focus:bg-white"
                }`}
              />
              {pendienteGuardarAceptada && (
                <button
                  type="button"
                  onClick={salir}
                  className="rounded bg-[#16A34A] px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-[#15803D]"
                  title="Guardar glosa Aceptada con su Nota Crédito"
                >
                  Guardar
                </button>
              )}
            </div>
            {faltaNcAceptada && (
              <span className="block text-[9.5px] font-bold text-[#DC2626]">
                Falta N° Nota p/ guardar
              </span>
            )}
          </div>
        </td>
        <td className="py-1.5 text-right">
          {guardando && <Loader2 className="inline h-3.5 w-3.5 animate-spin text-[#1D58D8]" />}
          {!guardando && guardado && <Check className="inline h-3.5 w-3.5 text-[#21814B]" />}
        </td>
      </tr>

      {abierta && (
        <tr className="border-b border-[#E2EBF8] bg-[#FAFCFF]">
          <td />
          <td colSpan={14} className="px-1 pb-4 pt-2">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1.35fr)]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div>
                    <label htmlFor={`fp-${glosa.id}`} className="eb-label mb-1 block text-[10px] font-bold text-[#047857]">
                      Fecha prestación servicio
                    </label>
                    <input
                      id={`fp-${glosa.id}`}
                      type="date"
                      value={fechaPrest}
                      onChange={(e) => setFechaPrest(e.target.value)}
                      onBlur={salir}
                      className={`w-full rounded-lg border px-2 py-1.5 font-cifra text-[12px] outline-none ${
                        faltaPrest
                          ? estiloRojo
                          : "border-[#A7F3D0] bg-white text-[#0E245E] focus:border-[#059669]"
                      }`}
                    />
                  </div>
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
                      className={`w-full rounded-lg border px-2 py-1.5 font-cifra text-[12px] outline-none ${
                        faltaFechaFact
                          ? estiloRojo
                          : "border-[#DCE8FA] bg-white text-[#0E245E] focus:border-[#1D58D8]"
                      }`}
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
                      Valor facturado ($)
                    </label>
                    <input
                      id={`vf-${glosa.id}`}
                      inputMode="numeric"
                      value={formatoPesosInput(valFact)}
                      onChange={(e) => setValFact(e.target.value.replace(/[^0-9]/g, ""))}
                      onBlur={salir}
                      placeholder="$0"
                      className={`w-full rounded-lg border px-2 py-1.5 font-cifra text-[12px] outline-none ${
                        sinValorFact
                          ? estiloRojo
                          : "border-[#DCE8FA] bg-white text-[#0E245E] focus:border-[#1D58D8]"
                      }`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`vg-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Valor glosado ($)
                    </label>
                    <input
                      id={`vg-${glosa.id}`}
                      inputMode="numeric"
                      value={formatoPesosInput(valGlos)}
                      onChange={(e) => setValGlos(e.target.value.replace(/[^0-9]/g, ""))}
                      onBlur={salir}
                      placeholder="$0"
                      className={`w-full rounded-lg border px-2 py-1.5 font-cifra text-[12px] outline-none ${
                        sinValorGlosa
                          ? estiloRojo
                          : "border-[#DCE8FA] bg-white text-[#0E245E] focus:border-[#1D58D8]"
                      }`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`faca-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Facturador (quien factura)
                    </label>
                    <select
                      id={`faca-${glosa.id}`}
                      value={facturador}
                      onChange={(e) => cambiarFacturador(e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1.5 text-[12px] font-semibold outline-none ${
                        faltaFacturador
                          ? estiloRojo
                          : "border-[#DCE8FA] bg-white text-[#0E245E] focus:border-[#1D58D8]"
                      }`}
                    >
                      <option value="">— Falta facturador —</option>
                      {listaFactFinal.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`rga-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                      Responsable glosa (quien responde)
                    </label>
                    <select
                      id={`rga-${glosa.id}`}
                      value={respGlosa}
                      onChange={(e) => cambiarRespGlosa(e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1.5 text-[12px] font-semibold outline-none ${
                        faltaRespGlosa
                          ? estiloRojo
                          : "border-[#DCE8FA] bg-white text-[#0E245E] focus:border-[#1D58D8]"
                      }`}
                    >
                      <option value="">— Falta responsable —</option>
                      {listaRespFinal.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`mot-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                    Motivo de glosa · lo que notificó la ERP
                  </label>
                  <textarea
                    id={`mot-${glosa.id}`}
                    value={motivo}
                    rows={2}
                    onChange={(e) => setMotivo(e.target.value)}
                    onBlur={salir}
                    placeholder="⚠ Falta escribir el motivo de glosa"
                    className={`w-full resize-y rounded-lg border px-2.5 py-2 text-[12.5px] leading-relaxed outline-none ${
                      faltaMotivo
                        ? estiloRojo
                        : "border-[#DCE8FA] bg-white text-[#2A335A] focus:border-[#1D58D8]"
                    }`}
                  />
                </div>
                <div>
                  <label htmlFor={`obg-${glosa.id}`} className="eb-label mb-1 block text-[10px] text-[#64748B]">
                    {seguimiento === "RATIFICACION_GLOSA"
                      ? "Motivo / Observación de Rectificación de glosa (obligatorio) *"
                      : "Observación general · respuesta / nota interna"}
                  </label>
                  <textarea
                    id={`obg-${glosa.id}`}
                    value={obs}
                    rows={2}
                    onChange={(e) => setObs(e.target.value)}
                    onBlur={salir}
                    placeholder={
                      seguimiento === "RATIFICACION_GLOSA"
                        ? "Obligatorio escribir el motivo de la rectificación de glosa *"
                        : "Sin observación"
                    }
                    className={`w-full resize-y rounded-lg border px-2.5 py-2 text-[12.5px] leading-relaxed outline-none ${
                      faltaObsRectificacion
                        ? estiloRojo
                        : "border-[#DCE8FA] bg-white text-[#2A335A] focus:border-[#1D58D8]"
                    }`}
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 self-start rounded-lg border border-[#E2EBF8] bg-white p-3">
                <Detalle etiqueta="Clase · Causal" valor={`${clase === "DEVOLUCION" ? "Devolución" : "Glosa"} · ${causal ? `${causal.codigo} (${causal.familia})` : "Sin causal"}`} />
                <Detalle
                  etiqueta="ERP unificada / NIT"
                  valor={empInfo.nit ? `${empInfo.nombre} · NIT ${empInfo.nit}` : empInfo.nombre || glosa.empresa || "—"}
                />
                <Detalle etiqueta="Facturador (factura)" valor={facturador || "Falta facturador"} />
                <Detalle etiqueta="Responsable glosa" valor={respGlosa || "Falta responsable"} />
                <Detalle etiqueta="Nota crédito" valor={nota || "Falta N° NC o N/A"} />
                <Detalle etiqueta="Fecha prestación" valor={fecha(fechaPrest)} />
                <Detalle etiqueta="Seguimiento" valor={`${etiquetaSeguimientoGlosa(seguimiento, estado)}${valSeg ? ` · ${pesos(soloNumero(valSeg))}` : ""}`} />
                <Detalle etiqueta="Fecha factura" valor={fecha(fechaFact)} />
                <Detalle etiqueta="Fecha radicación" valor={fecha(fechaRad)} />
                <Detalle etiqueta="Notificación glosa" valor={fecha(fechaNotif)} />
                {tienePendientes && (
                  <div className="col-span-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-2.5 py-1.5 text-[11.5px] font-bold text-[#B91C1C]">
                    Pendiente por llenar: {itemsPendientes.join(" · ")}
                  </div>
                )}
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
              {base.facturador ? ` · Facturador: ${base.facturador}` : ""}
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
          <Dato etiqueta="Fecha prestación" valor={fecha(base.fechaPrestacionServicio || "")} />
          <Dato etiqueta="Fecha factura" valor={fecha(base.fechaFactura)} />
          <Dato etiqueta="Facturador (factura)" valor={homologarPersonaFacturacion(base.facturador) || "—"} />
          <Dato
            etiqueta="Responsable glosa"
            valor={homologarPersonaFacturacion(base.responsableRespuesta || base.responsableAceptacion) || "—"}
          />
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
              const cn = causaNormativaDe(g.motivoCodigo, g.tipoGlosa);
              const ca = causalPorCodigo[cn || g.motivoCodigo];
              return (
                <div key={g.id} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`rounded-[6px] border px-1.5 py-0.5 text-[10.5px] font-semibold ${PASTILLA[g.estado] || PASTILLA.PENDIENTE}`}>
                      {ETIQUETA[g.estado] || g.estado}
                    </span>
                    <span className="font-cifra text-[11px] font-semibold text-[#47597A]">
                      {ca ? `${ca.codigo} · ${ca.familia}` : "sin causal"}
                    </span>
                    <span className="rounded-pill border border-[#BAE6FD] bg-[#F0F9FF] px-2 py-0.5 text-[10.5px] font-semibold text-[#0369A1]">
                      {etiquetaSeguimientoGlosa(g.seguimientoEstado, g.estado)}
                      {g.valorSeguimiento != null ? ` (${pesos(g.valorSeguimiento)})` : ""}
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
  empresasOpciones,
  responsablesOpciones,
  guardando,
  onCerrar,
  onGuardar,
}: {
  empresasOpciones: { nombre: string; nit: string }[];
  responsablesOpciones: string[];
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (fila: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({
    factura: "",
    empresa: "",
    fechaPrestacionServicio: "",
    fechaFactura: "",
    fechaRadicacion: "",
    fechaNotificacionGlosa: "",
    valorFacturado: "",
    valorGlosado: "",
    valorAceptado: "",
    clase: "GLOSA" as "GLOSA" | "DEVOLUCION",
    motivoCodigo: "",
    subcodigoCausal: "",
    motivoGlosa: "",
    observacionInterna: "",
    facturador: "",
    responsableAceptacion: "",
    notaCredito: "",
    estado: "PENDIENTE" as "PENDIENTE" | "ACEPTADA" | "NO_ACEPTADA",
  });

  const esAcepto = f.estado === "ACEPTADA";
  const esNoAcepto = f.estado === "NO_ACEPTADA";
  const esDevAcepto = esAcepto && f.clase === "DEVOLUCION";
  const ncRequeridaOk = esAcepto
    ? esNumeroNotaCreditoReal(f.notaCredito)
    : esNoAcepto
    ? true
    : f.notaCredito.trim() === "" || esNotaCreditoValida(f.notaCredito);
  const sinValoresModal =
    (f.valorFacturado.trim() !== "" || f.valorGlosado.trim() !== "") &&
    (soloNumero(f.valorFacturado) <= 0 || soloNumero(f.valorGlosado) <= 0);
  const completo =
    f.factura.trim() !== "" &&
    f.empresa.trim() !== "" &&
    (f.motivoGlosa.trim() !== "" || f.motivoCodigo !== "") &&
    ncRequeridaOk;
  const infoNit = normalizarEmpresaYNit(f.empresa);
  const campo = "w-full rounded-lg border border-[#DCE8FA] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#1D58D8]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4" role="dialog" aria-label="Registrar glosa">
      <div className="max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E2EBF8] px-5 py-3.5">
          <div>
            <p className="text-[15px] font-bold text-[#0E245E]">Registrar glosa o devolución</p>
            <p className="text-[11.5px] text-[#64748B]">
              ERP unificada, Facturador y Responsable separados, Clase (Glosa / Devolución ↔ DE) y Acepto / No Acepto.
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
            etiqueta={infoNit.nit ? `ERP Unificada · NIT ${infoNit.nit} *` : "ERP Unificada *"}
          >
            <select
              id="emp"
              value={f.empresa}
              onChange={(e) => setF({ ...f, empresa: e.target.value })}
              className={campo}
            >
              <option value="">— Seleccionar ERP —</option>
              {empresasOpciones.map((x) => (
                <option key={x.nombre} value={x.nombre}>
                  {x.nombre}{x.nit ? ` · NIT ${x.nit}` : ""}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="fprest" etiqueta="Fecha de prestación de servicios">
            <input
              id="fprest"
              type="date"
              value={f.fechaPrestacionServicio}
              onChange={(e) => setF({ ...f, fechaPrestacionServicio: e.target.value })}
              className={`${campo} font-cifra`}
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

          <Campo id="clase" etiqueta="Clase (Glosa / Devolución ↔ DE)">
            <select
              id="clase"
              value={f.clase}
              onChange={(e) => {
                const cl = e.target.value === "DEVOLUCION" ? "DEVOLUCION" : "GLOSA";
                const cod = cl === "DEVOLUCION" ? "DE" : f.motivoCodigo === "DE" ? "" : f.motivoCodigo;
                setF({
                  ...f,
                  clase: cl,
                  motivoCodigo: cod,
                  valorAceptado:
                    f.estado === "ACEPTADA" && cl === "DEVOLUCION"
                      ? f.valorFacturado || f.valorGlosado
                      : f.valorAceptado,
                });
              }}
              className={campo}
            >
              {CLASES.map((c) => (
                <option key={c.id} value={c.id}>{c.etiqueta}</option>
              ))}
            </select>
          </Campo>

          <Campo id="vfac" etiqueta="Valor facturado ($)">
            <input
              id="vfac"
              value={formatoPesosInput(f.valorFacturado)}
              onChange={(e) => {
                const vf = e.target.value.replace(/[^0-9]/g, "");
                setF({
                  ...f,
                  valorFacturado: vf,
                  valorAceptado:
                    f.estado === "ACEPTADA" && f.clase === "DEVOLUCION" ? vf : f.valorAceptado,
                });
              }}
              inputMode="numeric"
              placeholder="$0"
              className={`w-full rounded-lg border px-2.5 py-2 font-cifra text-[12.5px] outline-none ${
                f.valorFacturado.trim() !== "" && soloNumero(f.valorFacturado) <= 0
                  ? "border-[#DC2626] bg-[#FEF2F2] font-bold text-[#991B1B]"
                  : "border-[#DCE8FA] bg-white focus:border-[#1D58D8]"
              }`}
            />
          </Campo>

          <Campo id="val" etiqueta="Valor glosado ($)">
            <input
              id="val"
              value={formatoPesosInput(f.valorGlosado)}
              onChange={(e) => {
                const vg = e.target.value.replace(/[^0-9]/g, "");
                setF({
                  ...f,
                  valorGlosado: vg,
                  valorAceptado:
                    f.estado === "ACEPTADA" && f.clase === "GLOSA" && !f.valorAceptado
                      ? vg
                      : f.valorAceptado,
                });
              }}
              inputMode="numeric"
              placeholder="$0"
              className={`w-full rounded-lg border px-2.5 py-2 font-cifra text-[12.5px] outline-none ${
                f.valorGlosado.trim() !== "" && soloNumero(f.valorGlosado) <= 0
                  ? "border-[#DC2626] bg-[#FEF2F2] font-bold text-[#991B1B]"
                  : "border-[#DCE8FA] bg-white focus:border-[#1D58D8]"
              }`}
            />
          </Campo>

          {sinValoresModal && (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[11.5px] font-bold text-[#B91C1C]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Alerta: el valor facturado o el valor glosado está en $0 (quedará resaltado en rojo en la tabla).</span>
            </div>
          )}

          <div className="sm:col-span-2 space-y-2.5">
            <div>
              <p className="eb-label mb-1.5 text-[10px] text-[#94A3B8]">
                Causales oficiales de glosa y devolución (DE ↔ Devolución · TA, AU, SO, CO, FA ↔ Glosa)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CAUSAS_NORMATIVAS.map((c) => {
                  const activo = f.motivoCodigo === c.codigo;
                  return (
                    <button
                      key={c.codigo}
                      type="button"
                      onClick={() => {
                        const nuevoCod = activo ? "" : c.codigo;
                        const nuevaClase = nuevoCod === "DE" ? "DEVOLUCION" : nuevoCod ? "GLOSA" : f.clase;
                        setF({
                          ...f,
                          motivoCodigo: nuevoCod,
                          clase: nuevaClase,
                          subcodigoCausal: "",
                          valorAceptado:
                            f.estado === "ACEPTADA" && nuevaClase === "DEVOLUCION"
                              ? f.valorFacturado || f.valorGlosado
                              : f.valorAceptado,
                        });
                      }}
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
            </div>

            <Campo id="cau" etiqueta="Causal oficial (TA, AU, SO, DE, CO, FA)">
              <select
                id="cau"
                value={f.motivoCodigo}
                onChange={(e) => {
                  const nuevoCod = e.target.value;
                  const nuevaClase = nuevoCod === "DE" ? "DEVOLUCION" : nuevoCod ? "GLOSA" : f.clase;
                  setF({
                    ...f,
                    motivoCodigo: nuevoCod,
                    clase: nuevaClase,
                    subcodigoCausal: "",
                    valorAceptado:
                      f.estado === "ACEPTADA" && nuevaClase === "DEVOLUCION"
                        ? f.valorFacturado || f.valorGlosado
                        : f.valorAceptado,
                  });
                }}
                className={campo}
              >
                <option value="">— elegir causal —</option>
                {CAUSAS_NORMATIVAS.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} · {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="sm:col-span-2">
            <Campo id="mot" etiqueta="Motivo de glosa *">
              <textarea
                id="mot"
                rows={2}
                value={f.motivoGlosa}
                onChange={(e) => setF({ ...f, motivoGlosa: e.target.value })}
                placeholder="Detalle notificado por la ERP / aseguradora"
                className={`${campo} resize-y leading-relaxed`}
              />
            </Campo>
          </div>

          <Campo id="fact-nueva" etiqueta="Facturador (quien realiza la factura)">
            <select
              id="fact-nueva"
              value={f.facturador}
              onChange={(e) => setF({ ...f, facturador: homologarPersonaFacturacion(e.target.value) })}
              className={campo}
            >
              <option value="">— Seleccionar facturador —</option>
              {responsablesOpciones.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Campo>

          <Campo id="rglosa" etiqueta="Responsable Glosa (quien responde)">
            <select
              id="rglosa"
              value={f.responsableAceptacion}
              onChange={(e) =>
                setF({ ...f, responsableAceptacion: homologarPersonaFacturacion(e.target.value) })
              }
              className={campo}
            >
              <option value="">— Seleccionar responsable glosa —</option>
              {responsablesOpciones.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Campo>

          <Campo id="acep-nueva" etiqueta="Acepto / No Acepto">
            <select
              id="acep-nueva"
              value={f.estado}
              onChange={(e) => {
                const nv = e.target.value as "PENDIENTE" | "ACEPTADA" | "NO_ACEPTADA";
                if (nv === "NO_ACEPTADA") {
                  setF({ ...f, estado: "NO_ACEPTADA", valorAceptado: "0", notaCredito: "N/A" });
                } else if (nv === "ACEPTADA") {
                  setF({
                    ...f,
                    estado: "ACEPTADA",
                    valorAceptado:
                      f.clase === "DEVOLUCION"
                        ? f.valorFacturado || f.valorGlosado
                        : f.valorAceptado && soloNumero(f.valorAceptado) > 0
                        ? f.valorAceptado
                        : f.valorGlosado,
                    notaCredito: esNumeroNotaCreditoReal(f.notaCredito) ? f.notaCredito : "",
                  });
                } else {
                  setF({
                    ...f,
                    estado: "PENDIENTE",
                    valorAceptado: "",
                    notaCredito: f.notaCredito === "N/A" ? "" : f.notaCredito,
                  });
                }
              }}
              className={`${campo} font-semibold`}
            >
              <option value="PENDIENTE">— Seleccionar —</option>
              <option value="ACEPTADA">Acepto</option>
              <option value="NO_ACEPTADA">No Acepto</option>
            </select>
          </Campo>

          <Campo id="vacep-nueva" etiqueta="Valor aceptado ($)">
            <input
              id="vacep-nueva"
              inputMode="numeric"
              readOnly={esNoAcepto || esDevAcepto}
              value={
                esNoAcepto
                  ? "$0"
                  : esDevAcepto
                  ? formatoPesosInput(f.valorFacturado || f.valorGlosado) || "$0"
                  : formatoPesosInput(f.valorAceptado)
              }
              onChange={(e) => setF({ ...f, valorAceptado: e.target.value.replace(/[^0-9]/g, "") })}
              placeholder={esAcepto ? "$ Monto aceptado" : "—"}
              className={`${campo} font-cifra ${esNoAcepto || esDevAcepto ? "bg-[#F8FAFC] text-[#475569] font-semibold" : ""}`}
            />
          </Campo>

          <div>
            <label htmlFor="nc2" className="eb-label mb-1 block text-[10px] font-bold text-[#0E245E]">
              {esAcepto ? "Número de Nota Crédito (obligatorio) *" : "Nota crédito (si aplica)"}
            </label>
            <input
              id="nc2"
              value={esNoAcepto ? "N/A" : f.notaCredito}
              readOnly={esNoAcepto}
              onChange={(e) => setF({ ...f, notaCredito: e.target.value.toUpperCase() })}
              placeholder={esAcepto ? "Ej: NC2375 (obligatorio)" : esNoAcepto ? "N/A" : "NC... o vacío"}
              className={`w-full rounded-lg border px-2.5 py-2 font-cifra text-[12.5px] outline-none ${
                esNoAcepto
                  ? "border-[#DCE8FA] bg-[#F8FAFC] font-bold text-[#475569] cursor-default"
                  : esAcepto && !esNumeroNotaCreditoReal(f.notaCredito)
                  ? "border-[#DC2626] bg-[#FEF2F2] font-bold text-[#991B1B] placeholder:text-[#DC2626]/75"
                  : "border-[#DCE8FA] bg-white focus:border-[#1D58D8]"
              }`}
            />
            {esAcepto && !esNumeroNotaCreditoReal(f.notaCredito) && (
              <span className="mt-1 block text-[10.5px] font-bold text-[#DC2626]">
                Obligatorio ingresar el número de la Nota Crédito cuando marcas Acepto.
              </span>
            )}
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
          <span className={`text-[11.5px] ${esAcepto && !ncRequeridaOk ? "font-bold text-[#DC2626]" : "text-[#64748B]"}`}>
            {esAcepto && !ncRequeridaOk
              ? "No se puede guardar hasta colocar el número de la Nota Crédito."
              : f.empresa.trim() === ""
              ? "Selecciona la ERP en la lista desplegable."
              : esAcepto
              ? "Al guardar con Acepto, el seguimiento quedará automáticamente en Tramitada."
              : "Listo para guardar."}
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
                const vfNum = soloNumero(f.valorFacturado);
                const vgNum = soloNumero(f.valorGlosado);
                const cc = resolverClaseYCausal(f.clase, f.motivoCodigo);
                const vAcepFinal = resolverValorAceptadoSegunRegla({
                  estado: f.estado,
                  tipoGlosa: cc.tipoGlosa,
                  valorFacturado: vfNum,
                  valorGlosado: vgNum,
                  valorAceptadoPrevio:
                    f.valorAceptado.trim() === "" ? null : soloNumero(f.valorAceptado),
                });
                const ncGuardar = resolverNotaCreditoCondicional(
                  f.notaCredito,
                  vAcepFinal,
                  f.estado
                );
                const respGuardar = homologarPersonaFacturacion(f.responsableAceptacion);
                onGuardar({
                  ...f,
                  empresa: infoNit.nombre || f.empresa.trim(),
                  empresaOriginal: infoNit.nombre || f.empresa.trim(),
                  tipoGlosa: cc.tipoGlosa,
                  motivoCodigo: cc.motivoCodigo,
                  alcance: "",
                  valorFacturado: vfNum,
                  valorRadicado: vfNum,
                  valorGlosado: vgNum,
                  valorAceptado: vAcepFinal,
                  notaCredito: ncGuardar,
                  estado: f.estado,
                  facturador: homologarPersonaFacturacion(f.facturador),
                  responsableAceptacion: respGuardar,
                  responsableRespuesta: respGuardar,
                  seguimientoEstado: resolverSeguimientoAutomatico("", f.estado),
                  valorSeguimiento: null,
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
  facturaInicial,
  glosas,
  empresasOpciones,
  responsablesOpciones,
  guardando,
  onCerrar,
  onConfirmar,
}: {
  facturaInicial: string;
  glosas: Glosa[];
  empresasOpciones: { nombre: string; nit: string }[];
  responsablesOpciones: string[];
  guardando: boolean;
  onCerrar: () => void;
  onConfirmar: (fila: Record<string, unknown>) => void;
}) {
  const coincidencia = useMemo(() => {
    const num = facturaInicial.trim().toUpperCase();
    return num ? glosas.find((g) => g.factura.toUpperCase() === num) : undefined;
  }, [facturaInicial, glosas]);

  const [factura, setFactura] = useState(facturaInicial);
  const [empresa, setEmpresa] = useState(
    coincidencia?.empresa ? normalizarEmpresaYNit(coincidencia.empresa).nombre : ""
  );
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
      if (!empresa) setEmpresa(normalizarEmpresaYNit(enc.empresa).nombre);
      if (!fechaFactura && enc.fechaFactura) setFechaFactura(enc.fechaFactura.slice(0, 10));
      if (!fechaRadicacion && enc.fechaRadicacion) setFechaRadicacion(enc.fechaRadicacion.slice(0, 10));
      if (!valorFacturado && enc.valorFacturado) setValorFacturado(String(Math.round(enc.valorFacturado)));
    }
  };

  const listo = factura.trim() !== "" && motivo.trim() !== "";
  const campo = "w-full rounded-lg border border-[#DCE8FA] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#1D58D8]";

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
            </div>
            <input
              id="an-fac"
              value={factura}
              onChange={(e) => buscarFacturaExistente(e.target.value)}
              placeholder="Ej: FCOE00000"
              className={`${campo} font-cifra font-semibold`}
            />
          </div>

          <Campo id="an-emp" etiqueta="ERP (opcional)">
            <select
              id="an-emp"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className={campo}
            >
              <option value="">— Seleccionar ERP —</option>
              {empresasOpciones.map((x) => (
                <option key={x.nombre} value={x.nombre}>
                  {x.nombre}{x.nit ? ` · NIT ${x.nit}` : ""}
                </option>
              ))}
            </select>
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
              <select
                id="an-resp"
                value={responsable}
                onChange={(e) => setResponsable(homologarPersonaFacturacion(e.target.value))}
                className={campo}
              >
                <option value="">— Seleccionar responsable —</option>
                {responsablesOpciones.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
