"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import carteraInitialData from "@/lib/cartera-data.json";
import { FechaDelDato } from "@/components/FechaDelDato";
import { normalizarEmpresaYNit, CAUSAS_NORMATIVAS, causaNormativaDe } from "@/components/workcenter/CarteraWorkspace";
import {
  claveFacturaNorm,
  extraerFacturasFcoe,
  homologarEmpresaYOrigen,
  clasificarAtencionYSede,
  limpiarNombrePersona,
} from "@/lib/carteraCruces";

type CorteSismaBack = {
  fechaCorte: string;
  modalidad: string;
  carteraCorriente: number;
  carteraVencida: number;
  carteraTotal: number;
  facturasPendientesRadicar: number;
  glosasPendientesGestionar: number;
  anticiposPorCruzar: number;
  totalCarteraReal: number;
};

type AnuladaRow = {
  id: string;
  numero: number;
  empresa: string;
  empresaOriginal: string;
  fechaFactura: string;
  periodo: string;
  anio: string;
  factura: string;
  fechaRadicacion: string;
  valorRadicado: number;
  copagos: number;
  valorGlosaDevolucion?: number;
  tipo: string;
  motivo: string;
  facturaReemplaza: string;
  fechaAnulacion: string;
  fechaRadicacionReemplazo: string;
  rips: string;
  revisionFinanciera: string;
  preagrupado: string;
  responsable: string;
  estadoGestion: string;
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
};

type GlosaRow = {
  id: string;
  subtabla: string;
  empresa: string;
  empresaOriginal: string;
  fechaFactura: string;
  periodo: string;
  anio: string;
  factura: string;
  fechaRadicacion: string;
  fechaNotificacionGlosa?: string;
  valorRadicado: number;
  valorFactura: number;
  valorFacturado?: number;
  valorGlosado: number;
  valorAceptado?: number | null;
  motivoCodigo?: string;
  motivoGlosa: string;
  facturador: string;
  responsableAceptacion: string;
  responsableRespuesta?: string;
  responsable?: string;
  observacionInterna: string;
  notaCredito: string;
  tipoGlosa?: string;
  alcance?: string;
  estado?: string;
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
};

type PendienteRow = {
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
  pacienteTipoId?: string;
  pacienteNumId?: string;
  pacienteDoc?: string;
  pacienteNombre?: string;
  medico: string;
  medicoNombre?: string;
  autorizacion?: string;
  cantidad?: number;
  facturaAsociada?: string;
  valorServicio: number;
  responsable: string;
  observaciones: string;
  estado: string;
};

type FacturaSismaVivaRow = {
  factura: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaVencimiento: string;
  dias: number;
  nit: string;
  empresaCorta: string;
  empresaHomologada: string;
  razonSocialOriginal: string;
  esMutual: boolean;
  deDondeEs: string;
  sede: string;
  sedeGrupo: string;
  tipoAtencion: string;
  tipoGrupo: string;
  cuenta: string;
  descripcionCuenta: string;
  tipoFactura: string;
  pacienteNombre: string;
  pacienteDoc: string;
  responsable: string;
  esPendienteRadicar: boolean;
  corriente: number;
  vencida: number;
  saldo: number;
};

type ColDef = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  expand?: boolean;
};

const formatCOP = (val: number | undefined) => {
  if (!val || isNaN(val)) return "$-";
  return "$" + Math.round(val).toLocaleString("es-CO");
};

const formatMillones = (val: number | undefined) => {
  const n = Number(val || 0);
  if (!n || isNaN(n)) return "$0M";
  const m = n / 1_000_000;
  if (Math.abs(m) >= 10) {
    return "$" + Math.round(m).toLocaleString("es-CO") + "M";
  }
  return "$" + m.toFixed(1).replace(".", ",") + "M";
};

const formatEscalaEjeY = (val: number): string => {
  const n = Number(val || 0);
  if (!n || isNaN(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = n / 1_000_000;
    if (Math.abs(m) >= 10 || Number.isInteger(m)) {
      return "$" + Math.round(m).toLocaleString("es-CO") + "M";
    }
    return "$" + m.toFixed(1).replace(".", ",") + "M";
  }
  if (abs >= 1_000) {
    return "$" + Math.round(n / 1_000).toLocaleString("es-CO") + " mil";
  }
  return "$" + Math.round(n).toLocaleString("es-CO");
};

const generarTicksEjeY = (maxBruto: number, pasos = 4) => {
  const limpio = Math.max(maxBruto || 0, 1);
  const crudoPaso = limpio / pasos;
  const magnitud = Math.pow(10, Math.floor(Math.log10(crudoPaso)));
  const residual = crudoPaso / magnitud;
  const mult =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  const pasoRedondo = mult * magnitud;
  const techo = pasoRedondo * pasos;
  const ticks = Array.from({ length: pasos + 1 }, (_, idx) => {
    const valor = Math.round(techo - idx * pasoRedondo);
    return { valor, label: formatEscalaEjeY(valor) };
  });
  return { techo: Math.max(techo, 1), ticks };
};

const esEmpresaMutual = (empRaw: string | undefined, nitRaw?: string | undefined): boolean => {
  const r = String(empRaw || "").toUpperCase();
  const nit = String(nitRaw || "").replace(/\D/g, "");
  return r.includes("MUTUAL") || nit.startsWith("806008394");
};

const normalizarEtiquetaTipo = (tipoRaw: string | undefined): string => {
  const t = String(tipoRaw || "").toUpperCase().trim();
  if (t.includes("DEVOL")) return "DEVOL.";
  return "GLOSA";
};

const normalizarEmpresaCorta = (razonSocialRaw: string | undefined): string => {
  const r = String(razonSocialRaw || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (esEmpresaMutual(r)) return "MUTUAL SER";
  if (r.includes("ECOPETROL")) return "ECOPETROL";
  if (r.includes("SEGUROS DE VIDA SURAMERICANA") || r.includes("SURA POLIZA")) return "SURA POLIZA";
  if (r.includes("SUSALUD")) return "SUSALUD PREPAGADA";
  if (r.includes("SURAMERICANA") || r.includes("EPS SURA")) return "EPS SURA";
  if (r.includes("MEDPLUS")) return "MEDPLUS";
  if (r.includes("MEDISANITAS")) return "MEDISANITAS";
  if (r.includes("COLSANITAS")) return "COLSANITAS";
  if (r.includes("SANITAS")) return "SANITAS EPS";
  if (r.includes("COLMEDICA")) return "COLMEDICA";
  if (r.includes("COOMEVA")) return "COOMEVA";
  if (r.includes("BOLIVAR")) return "SEGUROS BOLIVAR";
  if (r.includes("ALLIANZ")) return "ALLIANZ";
  if ((r.includes("COLPATRIA") || r.includes("AXA")) && r.includes("PREPAGADA")) return "AXA COLPATRIA PREPAGADA";
  if (r.includes("COLPATRIA") || r.includes("AXA")) return "AXA COLPATRIA SEGUROS";
  if (r.includes("HDI")) return "HDI SEGUROS";
  if (r.includes("COMFENALCO")) return "COMFENALCO CARTAGENA";
  if (r.includes("SALUD TOTAL")) return "SALUD TOTAL";
  if (r.includes("PAN AMERICAN")) return "PAN AMERICAN LIFE";
  if (r.includes("MEXICHEM")) return "MEXICHEM";
  if (r.includes("CENTRO DE ATENCION")) return "CENTRO ATENCION VISUAL";
  if (r.includes("INVERSIONES MAR")) return "INVERSIONES MAR";
  if (r.includes("AGENCIA DE ADUANAS")) return "AGENCIA ADUANAS";
  if (r.includes("BMI COLOMBIA")) return "BMI COLOMBIA";
  if (r.includes("SERVICIO NACIONAL") || r.includes("SENA")) return "SENA";
  if (r.includes("MUNDIAL DE SEGUROS")) return "MUNDIAL SEGUROS";
  if (r.includes("ISLAS")) return "HOTEL LAS ISLAS";
  if (r.includes("PROGEMA")) return "PROGEMA";
  if (r.includes("MILENA ROMERO")) return "CONVENIO DRA MILENA ROMERO";
  if (r.includes("PARTICULAR")) return "PARTICULAR";
  return r || "SIN ENTIDAD";
};

const formatearNombreEmpresaLista = (empCorta: string): string => {
  const mapa: Record<string, string> = {
    "MUTUAL SER": "Mutual Ser EPS",
    "EPS SURA": "Eps Suramericana",
    "SUSALUD PREPAGADA": "Susalud Prepagada",
    "ECOPETROL": "Ecopetrol S.A.",
    "MEDPLUS": "Medplus",
    "COLSANITAS": "Colsanitas S.A.",
    "COLMEDICA": "Colmédica",
    "SURA POLIZA": "Sura Póliza",
    "COOMEVA": "Coomeva",
    "SEGUROS BOLIVAR": "Seguros Bolívar",
    "ALLIANZ": "Allianz",
    "AXA COLPATRIA PREPAGADA": "Axa Colpatria Prepagada",
    "AXA COLPATRIA SEGUROS": "Axa Colpatria Seguros",
    "COLPATRIA": "Axa Colpatria",
    "HDI SEGUROS": "HDI Seguros",
    "SANITAS EPS": "Sanitas EPS",
    "CENTRO ATENCION VISUAL": "Centro Atención Vis.",
    "INVERSIONES MAR": "Inversiones Mar & Cia",
    "AGENCIA ADUANAS": "Agencia Aduanas",
    "BMI COLOMBIA": "Bmi Colombia",
    "SENA": "SENA",
    "MUNDIAL SEGUROS": "Mundial Seguros",
    "COMFENALCO CARTAGENA": "Comfenalco",
    "SALUD TOTAL": "Salud Total",
    "MEDISANITAS": "Medisanitas",
    "PAN AMERICAN LIFE": "Pan American Life",
    "MEXICHEM": "Mexichem",
    "HOTEL LAS ISLAS": "Hotel Las Islas",
    "PROGEMA": "Progema",
    "CONVENIO DRA MILENA ROMERO": "Dra. Milena Romero",
    "PARTICULAR": "Particular",
  };
  if (mapa[empCorta]) return mapa[empCorta];
  return empCorta
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .slice(0, 22);
};

const formatearNombreCortoAnillo = (empCorta: string): string => {
  const mapa: Record<string, string> = {
    "MUTUAL SER": "Mutual",
    "EPS SURA": "Sura",
    "SUSALUD PREPAGADA": "Susalud",
    "ECOPETROL": "Ecopetrol",
    "MEDPLUS": "Medplus",
    "COLSANITAS": "Colsanitas",
    "COLMEDICA": "Colmédica",
    "SURA POLIZA": "Sura Pól.",
    "COOMEVA": "Coomeva",
    "SEGUROS BOLIVAR": "Bolívar",
    "ALLIANZ": "Allianz",
    "AXA COLPATRIA PREPAGADA": "Colpatria Prep.",
    "AXA COLPATRIA SEGUROS": "Colpatria Seg.",
    "COLPATRIA": "Colpatria",
    "HDI SEGUROS": "HDI",
    "SANITAS EPS": "Sanitas",
    "CENTRO ATENCION VISUAL": "C. Atención Vis.",
    "INVERSIONES MAR": "Inversiones Mar",
    "AGENCIA ADUANAS": "Agencia Aduanas",
    "BMI COLOMBIA": "Bmi Colombia",
    "SENA": "SENA",
    "MUNDIAL SEGUROS": "Mundial Seg.",
    "COMFENALCO CARTAGENA": "Comfenalco",
    "SALUD TOTAL": "Salud Total",
    "MEDISANITAS": "Medisanitas",
    "MEXICHEM": "Mexichem",
    "PARTICULAR": "Particular",
  };
  return mapa[empCorta] || empCorta.slice(0, 14);
};

const normalizarResponsableReal = (respRaw: string | undefined, empresaRaw: string | undefined): string => {
  const r = String(respRaw || "").toUpperCase().trim();
  if (r && r !== "SIN ASIGNAR" && r !== "POR ASIGNAR" && r !== "-") {
    return r;
  }
  const emp = String(empresaRaw || "").toUpperCase();
  if (emp.includes("SURA")) return "MARIA ALEJANDRA";
  if (emp.includes("MUTUAL")) return "ERIKA ALZATE";
  if (emp.includes("COLSANITAS") || emp.includes("SANITAS")) return "MARIA PAOLA";
  if (emp.includes("MEDPLUS") || emp.includes("ALLIANZ")) return "MARIA JOSE";
  return "YULEIBIS";
};

const STORAGE_KEY = "ebenezer_sisma_back_mesa_v5";

/** Hoy en Colombia, AAAA-MM-DD, sin depender de la zona del navegador. */
function hoyEnColombia(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Último día cerrado (día anterior en hora Colombia) para congelar el corte activo. */
function ayerEnColombia(): string {
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatearISOaLatam(iso: string): string {
  const partes = String(iso || "").slice(0, 10).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : iso;
}

export default function TableroCarteraAnalytics() {
  const [cortesTodas, setCortesTodas] = useState<CorteSismaBack[]>(
    carteraInitialData.sismaBack.cortes.TODAS
  );
  const [cortesPyp, setCortesPyp] = useState<CorteSismaBack[]>(
    carteraInitialData.sismaBack.cortes.PYP
  );
  const [anuladas, setAnuladas] = useState<AnuladaRow[]>(() =>
    (carteraInitialData.anuladas as AnuladaRow[]).map((r) => ({
      ...r,
      responsable: normalizarResponsableReal(r.responsable, r.empresa),
    }))
  );
  const [legalizadas, setLegalizadas] = useState<AnuladaRow[]>(() =>
    (carteraInitialData.legalizadas as AnuladaRow[]).map((r) => ({
      ...r,
      responsable: normalizarResponsableReal(r.responsable, r.empresa),
    }))
  );
  const [glosas, setGlosas] = useState<GlosaRow[]>(() =>
    (carteraInitialData.glosas as GlosaRow[]).map((r) => ({
      ...r,
      facturador: normalizarResponsableReal(r.facturador, r.empresa),
    }))
  );
  const [pendientes, setPendientes] = useState<PendienteRow[]>(() =>
    (carteraInitialData.pendientes as PendienteRow[]).map((r) => ({
      ...r,
      responsable: normalizarResponsableReal(r.responsable, r.empresa),
    }))
  );

  const [modalidadSisma, setModalidadSisma] = useState<"TODAS" | "PYP">("TODAS");
  const [indiceCorteActivo, setIndiceCorteActivo] = useState<number>(carteraInitialData.sismaBack.cortes.TODAS.length - 1);
  const [modoTendenciaCartera, setModoTendenciaCartera] = useState<"MES" | "CORTES">("MES");

  /* Cierres mensuales de cartera: como cerro cada mes, traido de la tabla
     cartera_cierres_mensuales. Se guardan porque pedirselos a SISMA tarda
     entre 10 y 15 segundos por mes: once meses serian dos minutos de
     espera en cada visita. */
  type CierreMes = {
    anio: number; mes: number; etiqueta: string; fechaCorte: string;
    carteraCorriente: number; carteraVencida: number; carteraTotal: number;
    girosPorCruzar: number; carteraReal: number;
    filasFacturas: number; esMesEnCurso: boolean; calculadoAt: string;
  };
  const [cierresTodos, setCierresTodos] = useState<CierreMes[]>([]);
  const [aniosCierres, setAniosCierres] = useState<number[]>([]);
  const [anioTendencia, setAnioTendencia] = useState<number>(
    new Date(Date.now() - 5 * 3600 * 1000).getUTCFullYear(),
  );
  const [estadoCierres, setEstadoCierres] = useState<
    "cargando" | "listo" | "sin-tabla" | "error"
  >("cargando");

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/cartera/cierres", { cache: "no-store" });
        const j = await r.json();
        if (!vivo) return;
        if (!r.ok || !j.ok) {
          setEstadoCierres(j?.sinTabla ? "sin-tabla" : "error");
          return;
        }
        setCierresTodos(j.cierres ?? []);
        setAniosCierres(j.anios ?? []);
        setEstadoCierres("listo");
      } catch {
        if (vivo) setEstadoCierres("error");
      }
    })();
    return () => { vivo = false; };
  }, []);

  const cierresMensuales = useMemo(
    () => cierresTodos.filter((c) => c.anio === anioTendencia).sort((a, b) => a.mes - b.mes),
    [cierresTodos, anioTendencia],
  );

  // Persiana states for the main cards/boxes
  const [persianaResumenAbierta, setPersianaResumenAbierta] = useState<boolean>(true);
  const [persianaCortesAbierta, setPersianaCortesAbierta] = useState<boolean>(false);
  const [persianaEdadesVivaAbierta, setPersianaEdadesVivaAbierta] = useState<boolean>(false);
  const [cortinaTablaAbierta, setCortinaTablaAbierta] = useState<boolean>(true);
  const [persianaMesaAbierta, setPersianaMesaAbierta] = useState<boolean>(true);

  // Multi-date calendar popover state (inicializado en la fecha del día anterior cerrado)
  const ayerInicial = ayerEnColombia();
  const [calendarioAbierto, setCalendarioAbierto] = useState<boolean>(false);
  const [mesCalendario, setMesCalendario] = useState<number>(
    Math.max(0, Number(ayerInicial.slice(5, 7)) - 1)
  );
  const [anioCalendario, setAnioCalendario] = useState<number>(
    Number(ayerInicial.slice(0, 4)) || 2026
  );

  // Estados interactivos de seguimiento con cursor (Crosshair + Tabla inferior) y drill-down de glosas
  const [hoverTendenciaIdx, setHoverTendenciaIdx] = useState<number | null>(null);
  const [hoverVentaMesIdx, setHoverVentaMesIdx] = useState<number | null>(null);
  const [hoverGlosaMesIdx, setHoverGlosaMesIdx] = useState<number | null>(null);
  const [causaFiltroDash, setCausaFiltroDash] = useState<string | null>(null);
  const [facturasBaseDb, setFacturasBaseDb] = useState<AnuladaRow[]>([]);

  // Live SISMA API state (congelado por defecto al día anterior cerrado)
  const [fechaCorteVivo, setFechaCorteVivo] = useState<string>(() => ayerEnColombia());
  const [cargandoSismaVivo, setCargandoSismaVivo] = useState<boolean>(false);
  const [datosSismaVivo, setDatosSismaVivo] = useState<{
    corteISO: string;
    ayerISO?: string;
    corteCongeladoAyer?: boolean;
    fechaCorte: string;
    filasFacturas: number;
    girosIncompletos?: boolean;
    girosMotivo?: string | null;
    desgloseUniverso?: {
      conMutual: {
        carteraCorriente: number;
        carteraVencida: number;
        carteraTotal: number;
        facturasPendientesRadicar: number;
        anticiposPorCruzar: number;
        totalCarteraReal: number;
        facturasCount: number;
      };
      sinMutual: {
        carteraCorriente: number;
        carteraVencida: number;
        carteraTotal: number;
        facturasPendientesRadicar: number;
        anticiposPorCruzar: number;
        totalCarteraReal: number;
        facturasCount: number;
      };
      soloMutual: {
        carteraCorriente: number;
        carteraVencida: number;
        carteraTotal: number;
        facturasPendientesRadicar: number;
        anticiposPorCruzar: number;
        totalCarteraReal: number;
        facturasCount: number;
      };
    };
    facturacionSisma?: {
      ventaContableDisponible: boolean;
      ventaContableTotal: number | null;
      ventaContableNota: string | null;
      cuentasIngresos: { codigo: string; nombre: string; total: number }[];
      porMes: {
        mes: string;
        etiqueta: string;
        ventaContable: number | null;
        saldoAbiertoEmitidoMes: number;
        corrienteEmitidoMes: number;
        vencidaEmitidoMes: number;
        facturasAbiertasMes: number;
      }[];
    };
    edades: {
      porVencer: number;
      d30: number;
      d60: number;
      d90: number;
      d120: number;
      d180: number;
      d360: number;
      mas360: number;
      saldoTotal: number;
    };
    cuentasGirosDetalle: {
      codigo: string;
      nombre: string;
      saldo: number;
      saldoAbsoluto: number;
      documentos: number;
    }[];
    topEmpresas: {
      nit: string;
      razonSocial: string;
      razonSocialOriginal?: string;
      empresaCorta?: string;
      nombreHomologado?: string;
      deDondeEs?: string;
      sede?: string;
      sedeGrupo?: string;
      responsable?: string;
      esMutual?: boolean;
      facturasCount: number;
      corriente: number;
      vencida: number;
      pendienteRadicar: number;
      total: number;
    }[];
    catalogoEmpresasPeriodo?: {
      nit: string;
      razonSocial: string;
      razonSocialOriginal?: string;
      empresaCorta?: string;
      nombreHomologado?: string;
      deDondeEs?: string;
      sede?: string;
      sedeGrupo?: string;
      responsable?: string;
      esMutual?: boolean;
      facturasCount: number;
      corriente: number;
      vencida: number;
      pendienteRadicar: number;
      total: number;
    }[];
    totalFacturasAbiertas?: number;
    facturasAbiertas?: FacturaSismaVivaRow[];
    resumenSedes?: Record<
      string,
      { etiqueta: string; facturas: number; corriente: number; vencida: number; total: number }
    >;
    resumenAtencion?: Record<string, { etiqueta: string; facturas: number; total: number }>;
    serieMensual?: {
      mes: string;
      etiqueta: string;
      carteraTotal: number;
      totalCarteraReal: number;
      carteraVencida: number;
    }[];
  } | null>(carteraInitialData.sismaBack.datosSismaVivo);

  /* Cuando SISMA no entrega los giros, la Cartera Real NO se muestra.
     Una franja de advertencia encima del numero no basta: alguien le
     toma pantallazo a la cifra, la pega en un informe, y el aviso se
     queda atras. Un numero que no se puede calcular no se pinta. */
  const sinGiros = Boolean(datosSismaVivo?.girosIncompletos);
  const realCOP = (v: number) => (sinGiros ? "No disponible" : formatCOP(v));
  const realMillones = (v: number) => (sinGiros ? "—" : formatMillones(v));


  // 6 Top Bar Filters + Sede & Atención (Consulta / Cirugía)
  const [tabActiva, setTabActiva] = useState<"glosas" | "cartera_viva" | "pendientes" | "anuladas" | "legalizadas">("glosas");
  const [filtroSedeTop, setFiltroSedeTop] = useState<"TODAS" | "SEDE_1" | "SEDE_2">("TODAS");
  const [filtroAtencionTop, setFiltroAtencionTop] = useState<"TODAS" | "CONSULTA" | "CIRUGIA" | "AYUDA_DX">("TODAS");
  const [filtroAnio, setFiltroAnio] = useState<string>("TODOS");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("TODAS");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroResponsable, setFiltroResponsable] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");

  const ANIOS_SISMA_DISPONIBLES = ["2021", "2022", "2023", "2024", "2025", "2026"];

  // Barra de filtros superior estilo Tablero de Frecuencias (.period-bar)
  const [ddFrecAbierto, setDdFrecAbierto] = useState<
    "year" | "month" | "dias" | "grp" | "resp" | null
  >(null);
  const [aniosFrecSel, setAniosFrecSel] = useState<string[]>([]);
  const [mesesFrecSel, setMesesFrecSel] = useState<string[]>([]);
  const [empresasFrecSel, setEmpresasFrecSel] = useState<string[]>([]);
  const [responsablesFrecSel, setResponsablesFrecSel] = useState<string[]>([]);
  const [incluirMutual, setIncluirMutual] = useState<boolean>(true);
  const [diasDesde, setDiasDesde] = useState<string>("");
  const [diasHasta, setDiasHasta] = useState<string>("");
  const [diasSemanaSel, setDiasSemanaSel] = useState<number[]>([]);
  const [diasFiltroActivo, setDiasFiltroActivo] = useState<boolean>(false);
  const [diasEtiqueta, setDiasEtiqueta] = useState<string>("📅 Todos los días");

  // Sincronizar automáticamente el año de la tendencia con el filtro de año superior si se selecciona uno específico
  useEffect(() => {
    const anioSel =
      aniosFrecSel.length === 1
        ? aniosFrecSel[0]
        : filtroAnio !== "TODOS"
        ? filtroAnio
        : null;
    if (anioSel) {
      const num = Number(anioSel);
      if (!isNaN(num)) {
        setAnioTendencia(num);
      }
    }
  }, [aniosFrecSel, filtroAnio]);

  // Excel-style floating column filter popover state
  const [colMenuAbierto, setColMenuAbierto] = useState<string | null>(null);
  const [busquedaMenuCol, setBusquedaMenuCol] = useState<string>("");
  const [valoresExcluidosPorCol, setValoresExcluidosPorCol] = useState<Record<string, string[]>>({});
  const [busquedaTextoPorCol, setBusquedaTextoPorCol] = useState<Record<string, string>>({});

  // Column sorting
  const [ordenColumna, setOrdenColumna] = useState<{
    campo: string;
    dir: "asc" | "desc";
  } | null>(null);

  const [paginaActual, setPaginaActual] = useState<number>(1);
  const filasPorPagina = 20;

  // Modals & Upload state
  const [mostrarPanelCarga, setMostrarPanelCarga] = useState<boolean>(false);
  const [tipoArchivoCarga, setTipoArchivoCarga] = useState<"VENCIMIENTO" | "GIROS" | "GLOSAS">("VENCIMIENTO");
  const [mostrarModalCorte, setMostrarModalCorte] = useState<boolean>(false);
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState<boolean>(false);
  const [filaEditando, setFilaEditando] = useState<Record<string, string | number> | null>(null);
  const [notificacion, setNotificacion] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nuevoCorteForm, setNuevoCorteForm] = useState({
    modalidad: "TODAS" as "TODAS" | "PYP",
    fechaCorte: "16/10/2026",
    carteraCorriente: "",
    carteraVencida: "",
    facturasPendientesRadicar: "0",
    glosasPendientesGestionar: "0",
    anticiposPorCruzar: "",
  });

  const [nuevoRegistroForm, setNuevoRegistroForm] = useState({
    empresa: "MUTUAL SER",
    anio: "2026",
    periodo: "",
    factura: "FCOE",
    // Valor por defecto del formulario de registro nuevo: HOY, no una fecha
    // fija. Estaba clavado en "2026-10-19", asi que todo lo que alguien
    // registrara en diciembre entraria fechado en octubre sin darse cuenta.
    fechaFactura: hoyEnColombia(),
    fechaRadicacion: hoyEnColombia(),
    valorRadicado: "",
    valorGlosado: "",
    tipo: "GLOSA",
    motivo: "",
    facturaReemplaza: "",
    rips: "",
    revisionFinanciera: "",
    responsable: "MARIA ALEJANDRA",
    notaCredito: "",
    contrato: "",
    cups: "",
    medico: "",
  });

  // Carga los registros desde la base de datos.
  //
  // Antes esto leia localStorage: cada facturadora veia solo lo que ella misma
  // habia escrito, y todo se perdia al limpiar la cache o cambiar de equipo.
  // Ahora la fuente de verdad es la base, compartida por todas.
  //
  // Si la base no responde o aun no tiene registros, el tablero CONSERVA lo que
  // ya muestra y avisa, en vez de quedarse en blanco.
  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await fetch("/api/cartera/registros", { cache: "no-store" });
        const json = await res.json();
        if (!vigente) return;
        if (!res.ok || !json.ok) {
          mostrarMensaje(
            "No se pudo leer la base de datos: " + (json?.error || res.statusText) +
            ". Lo que ves es la ultima foto del archivo y NO se esta guardando."
          );
          return;
        }
        if (Array.isArray(json.facturasBase) && json.facturasBase.length > 0) {
          setFacturasBaseDb(
            json.facturasBase.map((r: AnuladaRow) => ({
              ...r,
              responsable: normalizarResponsableReal(r.responsable, r.empresa),
            }))
          );
        }
        if (Array.isArray(json.anuladas) && json.anuladas.length > 0) {
          setAnuladas(
            json.anuladas.map((r: AnuladaRow) => ({
              ...r,
              responsable: normalizarResponsableReal(r.responsable, r.empresa),
            }))
          );
        }
        if (Array.isArray(json.legalizadas) && json.legalizadas.length > 0) {
          setLegalizadas(
            json.legalizadas.map((r: AnuladaRow) => ({
              ...r,
              responsable: normalizarResponsableReal(r.responsable, r.empresa),
            }))
          );
        }
        if (Array.isArray(json.glosas) && json.glosas.length > 0) {
          setGlosas(
            json.glosas.map((r: GlosaRow) => ({
              ...r,
              facturador: normalizarResponsableReal(r.facturador, r.empresa),
            }))
          );
        }
        if (Array.isArray(json.pendientes) && json.pendientes.length > 0) {
          setPendientes(
            json.pendientes.map((r: PendienteRow) => ({
              ...r,
              responsable: normalizarResponsableReal(r.responsable, r.empresa),
            }))
          );
        }
        const vacio =
          (json.anuladas?.length ?? 0) === 0 &&
          (json.legalizadas?.length ?? 0) === 0 &&
          (json.glosas?.length ?? 0) === 0 &&
          (json.pendientes?.length ?? 0) === 0;
        if (vacio) {
          mostrarMensaje(
            "La base aun no tiene registros cargados. Lo que ves es la foto del archivo; lo que registres si se guarda."
          );
        }
      } catch {
        if (vigente) {
          mostrarMensaje(
            "Sin conexion con la base de datos. Lo que ves es la ultima foto del archivo y NO se esta guardando."
          );
        }
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const persistAll = (
    nextAnuladas = anuladas,
    nextLegalizadas = legalizadas,
    nextGlosas = glosas,
    nextPendientes = pendientes,
    nextTodas = cortesTodas,
    nextPyp = cortesPyp
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          anuladas: nextAnuladas,
          legalizadas: nextLegalizadas,
          glosas: nextGlosas,
          pendientes: nextPendientes,
          cortesTodas: nextTodas,
          cortesPyp: nextPyp,
        })
      );
    } catch {
      // Ignore storage error
    }
  };

  // Guarda UNA sola fila en la base, no el tablero entero: asi dos personas
  // pueden trabajar a la vez sin pisarse. Cada llamada queda en el historial.
  const guardarEnBase = async (entidad: string, accion: "CREAR" | "EDITAR", fila: unknown) => {
    try {
      const res = await fetch("/api/cartera/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidad, accion, fila }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        mostrarMensaje("NO SE GUARDO: " + (json?.error || res.statusText));
        return false;
      }
      return true;
    } catch {
      mostrarMensaje("NO SE GUARDO: sin conexion con la base de datos.");
      return false;
    }
  };

  const mostrarMensaje = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(""), 4000);
  };

  const datosSismaCompletaRef = useRef(carteraInitialData.sismaBack.datosSismaVivo);
  const requestIdSismaRef = useRef<number>(0);

  const sincronizarConSismaVivo = async (
    fechaISO?: string,
    silencioso?: boolean,
    filtrosCustom?: {
      anios?: string[];
      meses?: string[];
      desde?: string;
      hasta?: string;
      diasSem?: number[];
      diasActivo?: boolean;
      empresas?: string[];
      responsables?: string[];
      mutual?: boolean;
    }
  ) => {
    const corteConsulta = fechaISO || fechaCorteVivo || ayerEnColombia();
    const aniosBase = filtrosCustom?.anios ?? aniosFrecSel;
    const aniosAct =
      aniosBase.length > 0 && aniosBase.length < ANIOS_SISMA_DISPONIBLES.length
        ? aniosBase
        : filtroAnio !== "TODOS"
        ? [filtroAnio]
        : [];
    const mesesAct = filtrosCustom?.meses ?? mesesFrecSel;
    const diasAct = filtrosCustom?.diasActivo ?? diasFiltroActivo;
    const desdeAct = filtrosCustom?.desde ?? diasDesde;
    const hastaAct = filtrosCustom?.hasta ?? diasHasta;
    const semAct = filtrosCustom?.diasSem ?? diasSemanaSel;
    const empBase = filtrosCustom?.empresas ?? empresasFrecSel;
    const empAct =
      empBase.length > 0 && empBase.length < todasLasEmpresasDisponibles.length
        ? empBase
        : filtroEmpresa !== "TODAS"
        ? [filtroEmpresa]
        : [];
    const respBase = filtrosCustom?.responsables ?? responsablesFrecSel;
    const respAct =
      respBase.length > 0 &&
      respBase.length < carteraInitialData.responsablesDisponibles.length
        ? respBase
        : filtroResponsable !== "TODAS"
        ? [filtroResponsable]
        : [];
    const pideMutualExplicita = empAct.some((e) => esEmpresaMutual(e));
    const mutAct = pideMutualExplicita ? true : (filtrosCustom?.mutual ?? incluirMutual);

    const params = new URLSearchParams();
    params.set("corte", corteConsulta);
    if (aniosAct.length > 0 && aniosAct.length < ANIOS_SISMA_DISPONIBLES.length) {
      params.set("anios", aniosAct.join(","));
    }
    if (mesesAct.length > 0 && mesesAct.length < 12) {
      params.set("meses", mesesAct.join(","));
    }
    if (diasAct) {
      if (desdeAct) params.set("desde", desdeAct);
      if (hastaAct) params.set("hasta", hastaAct);
      if (semAct.length > 0) params.set("diasSem", semAct.join(","));
    }
    if (empAct.length > 0) {
      params.set("empresas", empAct.join(","));
    }
    if (respAct.length > 0) {
      params.set("responsables", respAct.join(","));
    }
    if (!mutAct) {
      params.set("mutual", "0");
    }
    if (filtroSedeTop !== "TODAS") {
      params.set("sede", filtroSedeTop);
    }
    if (filtroAtencionTop !== "TODAS") {
      params.set("tipoAtencion", filtroAtencionTop);
    }

    const esSinFiltro =
      mutAct &&
      filtroSedeTop === "TODAS" &&
      filtroAtencionTop === "TODAS" &&
      aniosAct.length === 0 &&
      mesesAct.length === 0 &&
      !diasAct &&
      empAct.length === 0 &&
      respAct.length === 0;

    const currentReqId = ++requestIdSismaRef.current;
    setCargandoSismaVivo(true);
    try {
      const res = await fetch(`/api/cartera/sisma?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (currentReqId !== requestIdSismaRef.current) return;
      if (!res.ok || !json.ok) {
        if (!silencioso) {
          mostrarMensaje(`No se pudo sincronizar con SISMA: ${json.error || res.statusText}`);
        }
        return;
      }
      if (esSinFiltro) {
        datosSismaCompletaRef.current = json;
      }
      setDatosSismaVivo(json);
      if (json.resumenCorte && esSinFiltro) {
        const CORTES_EXCEL_FIJOS = new Set([
          "09/09/2026",
          "23/09/2026",
          "30/09/2026",
          "20/10/2026",
        ]);
        const fechaRes = String(json.fechaCorte || "").slice(0, 10);
        if (!CORTES_EXCEL_FIJOS.has(fechaRes)) {
          const aClaveOrden = (f: string) => {
            const p = f.slice(0, 10).split("/");
            return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : f;
          };
          const sinDuplicado = cortesTodas.filter(
            (c) =>
              !c.fechaCorte.includes("SISMA Vivo") &&
              c.fechaCorte.slice(0, 10) !== fechaRes
          );
          const nuevaLista = [...sinDuplicado, json.resumenCorte].sort((a, b) =>
            aClaveOrden(a.fechaCorte).localeCompare(aClaveOrden(b.fechaCorte))
          );
          const nuevoIdx = nuevaLista.findIndex(
            (c) => c.fechaCorte.slice(0, 10) === fechaRes
          );
          setCortesTodas(nuevaLista);
          setIndiceCorteActivo(nuevoIdx !== -1 ? nuevoIdx : nuevaLista.length - 1);
        }
        setModalidadSisma("TODAS");
      }
      if (!silencioso) {
        mostrarMensaje(
          `✓ Sincronizado en vivo con SISMA (Corte ${json.fechaCorte} · ${json.filasFacturas.toLocaleString("es-CO")} facturas)`
        );
      }
    } catch {
      if (!silencioso && currentReqId === requestIdSismaRef.current) {
        mostrarMensaje("Error de red al conectar con el API de SISMA Contabilidad.");
      }
    } finally {
      if (currentReqId === requestIdSismaRef.current) {
        setCargandoSismaVivo(false);
      }
    }
  };

  useEffect(() => {
    const ayerCol = ayerEnColombia();
    setFechaCorteVivo(ayerCol);
    sincronizarConSismaVivo(ayerCol, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sincronizar automáticamente cuando el usuario cambia cualquier filtro superior o inferior
  const primeraCargaRef = useRef<boolean>(true);
  useEffect(() => {
    if (primeraCargaRef.current) {
      primeraCargaRef.current = false;
      return;
    }
    const ayerCol = ayerEnColombia();
    const timer = setTimeout(() => {
      sincronizarConSismaVivo(fechaCorteVivo || ayerCol, true);
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aniosFrecSel,
    mesesFrecSel,
    empresasFrecSel,
    responsablesFrecSel,
    incluirMutual,
    filtroSedeTop,
    filtroAtencionTop,
    filtroAnio,
    filtroEmpresa,
    filtroResponsable,
    diasFiltroActivo,
    diasDesde,
    diasHasta,
    diasSemanaSel,
  ]);

  const MESES_NOMBRES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const cambiarMesCalendario = (delta: number) => {
    let nuevoMes = mesCalendario + delta;
    let nuevoAnio = anioCalendario;
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAnio -= 1;
    } else if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAnio += 1;
    }
    setMesCalendario(nuevoMes);
    setAnioCalendario(nuevoAnio);
  };

  const toggleFechaEnCalendario = (dia: number) => {
    const dd = String(dia).padStart(2, "0");
    const mm = String(mesCalendario + 1).padStart(2, "0");
    const yyyy = String(anioCalendario);
    const labelFecha = `${dd}/${mm}/${yyyy}`;
    const isoFecha = `${yyyy}-${mm}-${dd}`;

    const idxExistente = listaCortesActiva.findIndex(
      (c) => c.fechaCorte.slice(0, 10) === labelFecha
    );

    if (idxExistente !== -1) {
      if (indiceCorteActivo !== idxExistente) {
        setIndiceCorteActivo(idxExistente);
        setFechaCorteVivo(isoFecha);
        if (modalidadSisma === "TODAS") {
          sincronizarConSismaVivo(isoFecha, true);
        }
      } else if (listaCortesActiva.length > 1) {
        if (modalidadSisma === "TODAS") {
          const filtrada = cortesTodas.filter(
            (c) => c.fechaCorte.slice(0, 10) !== labelFecha
          );
          setCortesTodas(filtrada);
          setIndiceCorteActivo(Math.max(0, filtrada.length - 1));
        } else {
          const filtrada = cortesPyp.filter(
            (c) => c.fechaCorte.slice(0, 10) !== labelFecha
          );
          setCortesPyp(filtrada);
          setIndiceCorteActivo(Math.max(0, filtrada.length - 1));
        }
      }
    } else {
      setFechaCorteVivo(isoFecha);
      if (modalidadSisma === "TODAS") {
        sincronizarConSismaVivo(isoFecha, false);
      } else {
        const base = cortesPyp[cortesPyp.length - 1] || carteraInitialData.sismaBack.cortes.PYP[0];
        const nueva = [...cortesPyp, { ...base, fechaCorte: labelFecha }];
        setCortesPyp(nueva);
        setIndiceCorteActivo(nueva.length - 1);
      }
    }
  };

  const MESES_FREC = [
    { id: "01", label: "Enero" },
    { id: "02", label: "Febrero" },
    { id: "03", label: "Marzo" },
    { id: "04", label: "Abril" },
    { id: "05", label: "Mayo" },
    { id: "06", label: "Junio" },
    { id: "07", label: "Julio" },
    { id: "08", label: "Agosto" },
    { id: "09", label: "Septiembre" },
    { id: "10", label: "Octubre" },
    { id: "11", label: "Noviembre" },
    { id: "12", label: "Diciembre" },
  ];

  const DIAS_SEMANA_FREC = [
    { id: 1, label: "Lun" },
    { id: 2, label: "Mar" },
    { id: 3, label: "Mié" },
    { id: 4, label: "Jue" },
    { id: 5, label: "Vie" },
    { id: 6, label: "Sáb" },
    { id: 0, label: "Dom" },
  ];

  const toggleItemEnLista = <T,>(lista: T[], item: T, setter: (val: T[]) => void) => {
    if (lista.includes(item)) {
      setter(lista.filter((x) => x !== item));
    } else {
      setter([...lista, item]);
    }
    setPaginaActual(1);
  };

  const aplicarPreseleccionDias = (modo: 0 | 1 | 7 | 30 | "sem") => {
    const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (modo === 0) {
      const f = fmt(hoy);
      setDiasDesde(f);
      setDiasHasta(f);
    } else if (modo === 1) {
      const ayer = new Date(hoy.getTime() - 86400000);
      const f = fmt(ayer);
      setDiasDesde(f);
      setDiasHasta(f);
    } else if (modo === 7) {
      const d1 = new Date(hoy.getTime() - 6 * 86400000);
      setDiasDesde(fmt(d1));
      setDiasHasta(fmt(hoy));
    } else if (modo === 30) {
      const d1 = new Date(hoy.getTime() - 29 * 86400000);
      setDiasDesde(fmt(d1));
      setDiasHasta(fmt(hoy));
    } else if (modo === "sem") {
      const day = hoy.getDay();
      const diffLunes = (day + 6) % 7;
      const lunes = new Date(hoy.getTime() - diffLunes * 86400000);
      setDiasDesde(fmt(lunes));
      setDiasHasta(fmt(hoy));
    }
  };

  const aplicarPanelDias = () => {
    const tieneRango = Boolean(diasDesde || diasHasta);
    const tieneSem = diasSemanaSel.length > 0;
    if (!tieneRango && !tieneSem) {
      setDiasFiltroActivo(false);
      setDiasEtiqueta("📅 Todos los días");
      sincronizarConSismaVivo(fechaCorteVivo, false, {
        diasActivo: false,
        desde: "",
        hasta: "",
        diasSem: [],
      });
    } else {
      setDiasFiltroActivo(true);
      const partes: string[] = [];
      if (diasDesde && diasHasta) {
        partes.push(diasDesde === diasHasta ? diasDesde : `${diasDesde} → ${diasHasta}`);
      } else if (diasDesde) {
        partes.push(`Desde ${diasDesde}`);
      } else if (diasHasta) {
        partes.push(`Hasta ${diasHasta}`);
      }
      if (tieneSem) {
        const nombres = DIAS_SEMANA_FREC.filter((d) => diasSemanaSel.includes(d.id)).map(
          (d) => d.label
        );
        partes.push(nombres.join(", "));
      }
      setDiasEtiqueta(`📅 ${partes.join(" · ")}`);
      const corteTarget =
        diasHasta && /^\d{4}-\d{2}-\d{2}$/.test(diasHasta)
          ? diasHasta
          : fechaCorteVivo;
      if (diasHasta && /^\d{4}-\d{2}-\d{2}$/.test(diasHasta)) {
        setFechaCorteVivo(diasHasta);
      }
      sincronizarConSismaVivo(corteTarget, false, {
        diasActivo: true,
        desde: diasDesde,
        hasta: diasHasta,
        diasSem: diasSemanaSel,
      });
    }
    setDdFrecAbierto(null);
    setPaginaActual(1);
  };

  const quitarPanelDias = () => {
    setDiasDesde("");
    setDiasHasta("");
    setDiasSemanaSel([]);
    setDiasFiltroActivo(false);
    setDiasEtiqueta("📅 Todos los días");
    setDdFrecAbierto(null);
    setPaginaActual(1);
    sincronizarConSismaVivo(fechaCorteVivo, true, {
      diasActivo: false,
      desde: "",
      hasta: "",
      diasSem: [],
    });
  };

  const coincideEmpresaSeleccionada = (
    empCortaReg: string,
    empRawReg: string,
    listaSeleccionadas: string[]
  ): boolean => {
    if (
      listaSeleccionadas.length === 0 ||
      listaSeleccionadas.length >= todasLasEmpresasDisponibles.length
    ) {
      return true;
    }
    const c = normalizarEmpresaCorta(empRawReg || empCortaReg);
    const rUp = String(empRawReg || empCortaReg || "").toUpperCase();
    const regEsMutual = esEmpresaMutual( `${empRawReg || ""} ${empCortaReg || ""}` );
    return listaSeleccionadas.some((sel) => {
      if (esEmpresaMutual(sel) && regEsMutual) return true;
      if (sel === c || sel === empCortaReg) return true;
      if (
        (sel === "AXA COLPATRIA PREPAGADA" || sel === "AXA COLPATRIA SEGUROS") &&
        (empCortaReg === "COLPATRIA" || rUp === "COLPATRIA")
      ) {
        return true;
      }
      if (
        sel === "COLPATRIA" &&
        (c === "AXA COLPATRIA PREPAGADA" || c === "AXA COLPATRIA SEGUROS")
      ) {
        return true;
      }
      return false;
    });
  };

  const cumpleFiltrosFrecuencias = (
    anioReg: string,
    empresaReg: string,
    responsableReg: string,
    fechaISO?: string,
    empresaOrig?: string
  ): boolean => {
    const textoEmp = `${empresaReg || ""} ${empresaOrig || ""}`.toUpperCase();
    const pideMutualExplicita =
      (empresasFrecSel.length > 0 &&
        empresasFrecSel.length < todasLasEmpresasDisponibles.length &&
        empresasFrecSel.some((e) => esEmpresaMutual(e))) ||
      (filtroEmpresa !== "TODAS" && esEmpresaMutual(filtroEmpresa));

    if (!incluirMutual && !pideMutualExplicita && esEmpresaMutual(textoEmp)) {
      return false;
    }
    if (
      aniosFrecSel.length > 0 &&
      aniosFrecSel.length < ANIOS_SISMA_DISPONIBLES.length &&
      !aniosFrecSel.includes(String(anioReg || ""))
    ) {
      return false;
    }
    if (
      !coincideEmpresaSeleccionada(
        String(empresaReg || ""),
        String(empresaOrig || empresaReg || ""),
        empresasFrecSel
      )
    ) {
      return false;
    }
    if (
      responsablesFrecSel.length > 0 &&
      responsablesFrecSel.length < carteraInitialData.responsablesDisponibles.length &&
      !responsablesFrecSel.includes(String(responsableReg || ""))
    ) {
      return false;
    }
    const fRaw = String(fechaISO || "").trim();
    const fStr = fRaw.slice(0, 10);
    const fMes = fRaw.slice(0, 7);
    if (mesesFrecSel.length > 0 && mesesFrecSel.length < 12) {
      if (!/^\d{4}-\d{2}/.test(fMes)) return false;
      const mm = fMes.slice(5, 7);
      if (!mesesFrecSel.includes(mm)) return false;
    }
    if (diasFiltroActivo) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fStr)) return false;
      if (diasDesde && fStr < diasDesde) return false;
      if (diasHasta && fStr > diasHasta) return false;
      if (diasSemanaSel.length > 0) {
        const dt = new Date(`${fStr}T12:00:00`);
        if (!diasSemanaSel.includes(dt.getDay())) return false;
      }
    }
    return true;
  };

  const limpiarTodosLosFiltros = () => {
    setFiltroSedeTop("TODAS");
    setFiltroAtencionTop("TODAS");
    setFiltroAnio("TODOS");
    setFiltroEmpresa("TODAS");
    setFiltroTipo("TODOS");
    setFiltroEstado("TODOS");
    setFiltroResponsable("TODAS");
    setBusqueda("");
    setAniosFrecSel([]);
    setMesesFrecSel([]);
    setEmpresasFrecSel([]);
    setResponsablesFrecSel([]);
    setIncluirMutual(true);
    setCausaFiltroDash(null);
    setDiasDesde("");
    setDiasHasta("");
    setDiasSemanaSel([]);
    setDiasFiltroActivo(false);
    setDiasEtiqueta("📅 Todos los días");
    setDdFrecAbierto(null);
    setValoresExcluidosPorCol({});
    setBusquedaTextoPorCol({});
    setOrdenColumna(null);
    setColMenuAbierto(null);
    setPaginaActual(1);
    sincronizarConSismaVivo(fechaCorteVivo || ayerEnColombia(), true, {
      anios: [],
      meses: [],
      diasActivo: false,
      desde: "",
      hasta: "",
      diasSem: [],
      empresas: [],
      responsables: [],
      mutual: true,
    });
  };

  const seleccionarCorteYSincronizar = (idxCorte: number, fechaRaw?: string) => {
    setIndiceCorteActivo(idxCorte);
    const fStr = String(
      fechaRaw || listaCortesActiva[idxCorte]?.fechaCorte || ""
    ).slice(0, 10);
    const partes = fStr.split("/");
    if (partes.length === 3) {
      const iso = `${partes[2]}-${partes[1]}-${partes[0]}`;
      setFechaCorteVivo(iso);
      if (modalidadSisma === "TODAS") {
        sincronizarConSismaVivo(iso, true);
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(fStr)) {
      setFechaCorteVivo(fStr);
      if (modalidadSisma === "TODAS") {
        sincronizarConSismaVivo(fStr, true);
      }
    }
  };

  const todasLasEmpresasDisponibles = useMemo(() => {
    const setEmp = new Set<string>(carteraInitialData.empresasDisponibles);
    setEmp.add("MUTUAL SER");
    const listasSisma = [
      datosSismaCompletaRef.current?.topEmpresas || [],
      datosSismaVivo?.catalogoEmpresasPeriodo || [],
      datosSismaVivo?.topEmpresas || [],
      carteraInitialData.sismaBack.datosSismaVivo.topEmpresas || [],
    ];
    for (const lista of listasSisma) {
      for (const e of lista) {
        const c = normalizarEmpresaCorta(e.razonSocial);
        if (c && c !== "OTRAS" && c !== "OTRAS ENTIDADES" && c !== "SIN ENTIDAD") {
          setEmp.add(c);
        }
      }
    }
    return Array.from(setEmp).sort((a, b) => a.localeCompare(b));
  }, [datosSismaVivo]);

  const tieneFiltroFechaBarra =
    (aniosFrecSel.length > 0 &&
      aniosFrecSel.length < ANIOS_SISMA_DISPONIBLES.length) ||
    (mesesFrecSel.length > 0 && mesesFrecSel.length < 12) ||
    diasFiltroActivo ||
    filtroAnio !== "TODOS";

  const hayFiltrosActivos =
    filtroSedeTop !== "TODAS" ||
    filtroAtencionTop !== "TODAS" ||
    tieneFiltroFechaBarra ||
    filtroEmpresa !== "TODAS" ||
    filtroTipo !== "TODOS" ||
    filtroEstado !== "TODOS" ||
    filtroResponsable !== "TODAS" ||
    busqueda.trim() !== "" ||
    !incluirMutual ||
    causaFiltroDash !== null ||
    (empresasFrecSel.length > 0 &&
      empresasFrecSel.length < todasLasEmpresasDisponibles.length) ||
    (responsablesFrecSel.length > 0 &&
      responsablesFrecSel.length <
        carteraInitialData.responsablesDisponibles.length) ||
    Object.values(valoresExcluidosPorCol).some((arr) => arr && arr.length > 0) ||
    Object.values(busquedaTextoPorCol).some((txt) => txt && txt.trim() !== "") ||
    ordenColumna !== null;

  const listaCortesActiva = modalidadSisma === "TODAS" ? cortesTodas : cortesPyp;
  const corteBaseSeleccionado =
    listaCortesActiva[Math.min(indiceCorteActivo, listaCortesActiva.length - 1)] ||
    listaCortesActiva[listaCortesActiva.length - 1];

  // Filtrado reactivo sobre el catálogo completo del período activo en SISMA (para que seleccionar 1, 2, 3 o más empresas nunca pierda ninguna entidad)
  const empresasSismaFiltradas = useMemo(() => {
    const origen =
      datosSismaVivo?.catalogoEmpresasPeriodo ||
      (tieneFiltroFechaBarra
        ? datosSismaVivo?.topEmpresas
        : datosSismaCompletaRef.current?.topEmpresas) ||
      datosSismaCompletaRef.current?.topEmpresas ||
      carteraInitialData.sismaBack.datosSismaVivo.topEmpresas ||
      [];
    const pideMutualExplicita =
      (empresasFrecSel.length > 0 &&
        empresasFrecSel.length < todasLasEmpresasDisponibles.length &&
        empresasFrecSel.some((e) => esEmpresaMutual(e))) ||
      (filtroEmpresa !== "TODAS" && esEmpresaMutual(filtroEmpresa));

    return origen.filter((emp) => {
      const empCorta = normalizarEmpresaCorta(emp.razonSocial);
      const resp = normalizarResponsableReal("", empCorta);
      const empEsMut =
        Boolean((emp as { esMutual?: boolean }).esMutual) ||
        esEmpresaMutual(emp.razonSocial, emp.nit);

      if (!incluirMutual && !pideMutualExplicita && empEsMut) {
        return false;
      }
      if (filtroSedeTop === "SEDE_2" && !empEsMut) return false;
      if (filtroSedeTop === "SEDE_1" && empEsMut) return false;
      if (
        empresasFrecSel.length > 0 &&
        empresasFrecSel.length < todasLasEmpresasDisponibles.length
      ) {
        if (!coincideEmpresaSeleccionada(empCorta, emp.razonSocial, empresasFrecSel)) {
          return false;
        }
      } else if (filtroEmpresa !== "TODAS") {
        if (!coincideEmpresaSeleccionada(empCorta, emp.razonSocial, [filtroEmpresa])) {
          return false;
        }
      }
      if (
        responsablesFrecSel.length > 0 &&
        responsablesFrecSel.length <
          carteraInitialData.responsablesDisponibles.length
      ) {
        if (!responsablesFrecSel.includes(resp)) {
          return false;
        }
      } else if (filtroResponsable !== "TODAS" && resp !== filtroResponsable) {
        return false;
      }
      return true;
    });
  }, [
    datosSismaVivo,
    tieneFiltroFechaBarra,
    incluirMutual,
    empresasFrecSel,
    todasLasEmpresasDisponibles.length,
    filtroEmpresa,
    responsablesFrecSel,
    filtroResponsable,
  ]);

  const tieneFiltroEntidadDirecto =
    tieneFiltroFechaBarra ||
    !incluirMutual ||
    (empresasFrecSel.length > 0 &&
      empresasFrecSel.length < todasLasEmpresasDisponibles.length) ||
    filtroEmpresa !== "TODAS" ||
    (responsablesFrecSel.length > 0 &&
      responsablesFrecSel.length <
        carteraInitialData.responsablesDisponibles.length) ||
    filtroResponsable !== "TODAS";

  const corteSeleccionado = useMemo<CorteSismaBack>(() => {
    if (modalidadSisma === "PYP") {
      return corteBaseSeleccionado;
    }

    const sinSubfiltroEmpresa =
      (empresasFrecSel.length === 0 ||
        empresasFrecSel.length >= todasLasEmpresasDisponibles.length) &&
      filtroEmpresa === "TODAS";
    const sinSubfiltroResp =
      (responsablesFrecSel.length === 0 ||
        responsablesFrecSel.length >=
          carteraInitialData.responsablesDisponibles.length) &&
      filtroResponsable === "TODAS";
    const esSoloMutual =
      sinSubfiltroResp &&
      ((empresasFrecSel.length === 1 && esEmpresaMutual(empresasFrecSel[0])) ||
        (empresasFrecSel.length === 0 &&
          filtroEmpresa !== "TODAS" &&
          esEmpresaMutual(filtroEmpresa)));

    if (!tieneFiltroEntidadDirecto) {
      if (
        indiceCorteActivo === listaCortesActiva.length - 1 &&
        datosSismaVivo?.desgloseUniverso?.conMutual
      ) {
        const u = datosSismaVivo.desgloseUniverso.conMutual;
        return {
          ...corteBaseSeleccionado,
          fechaCorte: datosSismaVivo.fechaCorte || corteBaseSeleccionado.fechaCorte,
          carteraCorriente: u.carteraCorriente,
          carteraVencida: u.carteraVencida,
          carteraTotal: u.carteraTotal,
          facturasPendientesRadicar: u.facturasPendientesRadicar,
          anticiposPorCruzar: u.anticiposPorCruzar,
          totalCarteraReal: u.totalCarteraReal,
        };
      }
      return corteBaseSeleccionado;
    }

    // Desglose exacto del servidor para Sin Mutual y Solo Mutual (con giros contables exactos por NIT)
    if (
      !incluirMutual &&
      sinSubfiltroEmpresa &&
      sinSubfiltroResp &&
      datosSismaVivo?.desgloseUniverso?.sinMutual
    ) {
      const u = datosSismaVivo.desgloseUniverso.sinMutual;
      return {
        ...corteBaseSeleccionado,
        carteraCorriente: u.carteraCorriente,
        carteraVencida: u.carteraVencida,
        carteraTotal: u.carteraTotal,
        facturasPendientesRadicar: u.facturasPendientesRadicar,
        anticiposPorCruzar: u.anticiposPorCruzar,
        totalCarteraReal: u.totalCarteraReal,
      };
    }

    if (esSoloMutual && datosSismaVivo?.desgloseUniverso?.soloMutual) {
      const u = datosSismaVivo.desgloseUniverso.soloMutual;
      return {
        ...corteBaseSeleccionado,
        carteraCorriente: u.carteraCorriente,
        carteraVencida: u.carteraVencida,
        carteraTotal: u.carteraTotal,
        facturasPendientesRadicar: u.facturasPendientesRadicar,
        anticiposPorCruzar: u.anticiposPorCruzar,
        totalCarteraReal: u.totalCarteraReal,
      };
    }

    const corr = empresasSismaFiltradas.reduce((acc, e) => acc + (e.corriente || 0), 0);
    const venc = empresasSismaFiltradas.reduce((acc, e) => acc + (e.vencida || 0), 0);
    const tot = empresasSismaFiltradas.reduce((acc, e) => acc + (e.total || 0), 0);
    const pend = empresasSismaFiltradas.reduce(
      (acc, e) => acc + (e.pendienteRadicar || 0),
      0
    );
    const totalBaseSinFiltro =
      datosSismaVivo?.desgloseUniverso?.conMutual?.carteraTotal ||
      (datosSismaVivo?.catalogoEmpresasPeriodo || []).reduce(
        (acc, e) => acc + (e.total || 0),
        0
      ) ||
      datosSismaCompletaRef.current?.edades?.saldoTotal ||
      corteBaseSeleccionado.carteraTotal ||
      1;
    const proporcion = Math.min(1, Math.max(0, tot / totalBaseSinFiltro));
    const girosVivo = datosSismaVivo?.cuentasGirosDetalle
      ? datosSismaVivo.cuentasGirosDetalle.reduce(
          (acc, c) => acc + (c.saldoAbsoluto || 0),
          0
        )
      : null;
    const baseGirosUniverso =
      datosSismaVivo?.desgloseUniverso?.conMutual?.anticiposPorCruzar ??
      corteBaseSeleccionado.anticiposPorCruzar;
    const giros =
      !cargandoSismaVivo && girosVivo !== null
        ? girosVivo
        : Math.round(baseGirosUniverso * proporcion);
    return {
      ...corteBaseSeleccionado,
      carteraCorriente: Math.round(corr),
      carteraVencida: Math.round(venc),
      carteraTotal: Math.round(tot),
      facturasPendientesRadicar: Math.round(pend),
      anticiposPorCruzar: giros,
      totalCarteraReal: Math.round(tot - giros),
    };
  }, [
    tieneFiltroEntidadDirecto,
    modalidadSisma,
    corteBaseSeleccionado,
    empresasSismaFiltradas,
    datosSismaVivo,
    cargandoSismaVivo,
    incluirMutual,
    empresasFrecSel,
    todasLasEmpresasDisponibles.length,
    filtroEmpresa,
    responsablesFrecSel,
    filtroResponsable,
    indiceCorteActivo,
    listaCortesActiva.length,
  ]);

  const formatearPctDonut = (pct: number): string => {
    if (pct <= 0) return "0.0%";
    if (pct < 1) return `${pct.toFixed(2)}%`;
    return `${pct.toFixed(1)}%`;
  };

  // Agrupación real por empresa para las 2 Tortas Ejecutivas: divide SIEMPRE entre la totalidad de la cartera del período (totalUniverso)
  const construirItemsDonut = (campo: "total" | "vencida", paleta: string[]) => {
    const origenCatalogo =
      datosSismaVivo?.catalogoEmpresasPeriodo ||
      (tieneFiltroFechaBarra
        ? datosSismaVivo?.topEmpresas
        : datosSismaCompletaRef.current?.topEmpresas) ||
      datosSismaCompletaRef.current?.topEmpresas ||
      carteraInitialData.sismaBack.datosSismaVivo.topEmpresas ||
      [];
    const pideMutualExplicita =
      (empresasFrecSel.length > 0 &&
        empresasFrecSel.length < todasLasEmpresasDisponibles.length &&
        empresasFrecSel.some((e) => esEmpresaMutual(e))) ||
      (filtroEmpresa !== "TODAS" && esEmpresaMutual(filtroEmpresa));

    let totalUniverso = 0;
    for (const emp of origenCatalogo) {
      const clave = normalizarEmpresaCorta(emp.razonSocial);
      if (clave === "OTRAS" || clave === "OTRAS ENTIDADES") continue;
      const empEsMut =
        Boolean((emp as { esMutual?: boolean }).esMutual) ||
        esEmpresaMutual(emp.razonSocial, emp.nit);
      if (!incluirMutual && !pideMutualExplicita && empEsMut) {
        continue;
      }
      totalUniverso += Math.max(0, Number(emp[campo] || 0));
    }

    const hayFiltroSubconjunto =
      (empresasFrecSel.length > 0 &&
        empresasFrecSel.length < todasLasEmpresasDisponibles.length) ||
      filtroEmpresa !== "TODAS" ||
      (responsablesFrecSel.length > 0 &&
        responsablesFrecSel.length <
          carteraInitialData.responsablesDisponibles.length) ||
      filtroResponsable !== "TODAS";

    const agrupado = new Map<string, { val: number; totalRef: number }>();
    for (const emp of empresasSismaFiltradas) {
      const clave = normalizarEmpresaCorta(emp.razonSocial);
      if (clave === "OTRAS" || clave === "OTRAS ENTIDADES") continue;
      const val = Math.max(0, Number(emp[campo] || 0));
      const tot = Math.max(0, Number(emp.total || 0));
      if (val <= 0 && (!hayFiltroSubconjunto || tot <= 0)) continue;
      const prev = agrupado.get(clave) || { val: 0, totalRef: 0 };
      agrupado.set(clave, {
        val: prev.val + val,
        totalRef: prev.totalRef + tot,
      });
    }

    const ordenadas = Array.from(agrupado.entries())
      .map(([empCorta, d]) => ({
        empCorta,
        valor: d.val,
        totalRef: d.totalRef,
      }))
      .sort((a, b) => b.valor - a.valor || b.totalRef - a.totalRef);

    const sumaTotal = ordenadas.reduce((acc, x) => acc + x.valor, 0);
    const denominadorTotal = Math.max(totalUniverso, sumaTotal);

    if (ordenadas.length === 0 || denominadorTotal <= 0) {
      return {
        sumaTotal: 0,
        totalUniverso: Math.max(0, totalUniverso),
        hayFiltroSubconjunto,
        items: [],
      };
    }

    return {
      sumaTotal,
      totalUniverso: denominadorTotal,
      hayFiltroSubconjunto,
      items: ordenadas.map((it, idx) => ({
        empCorta: it.empCorta,
        nombreLista: formatearNombreEmpresaLista(it.empCorta),
        nombreAnillo: formatearNombreCortoAnillo(it.empCorta),
        valor: it.valor,
        pct: denominadorTotal > 0 ? (it.valor / denominadorTotal) * 100 : 0,
        color: it.valor > 0 ? paleta[idx % paleta.length] : "#CBD5E1",
      })),
    };
  };

  const PALETA_DONUT_TOTAL = [
    "#1D58D8", // Azul rey
    "#C81E3A", // Rojo carmesí
    "#0D8A47", // Verde esmeralda
    "#6B3FA0", // Morado ciruela
    "#EA6A15", // Naranja ámbar
    "#0284C7", // Azul cielo
    "#D97706", // Ámbar dorado
    "#0F766E", // Verde azulado
    "#9333EA", // Púrpura
    "#E11D48", // Rosa fuerte
    "#2563EB", // Azul cobalto
    "#15803D", // Verde bosque
    "#B45309", // Bronce
    "#4F46E5", // Índigo
    "#0369A1", // Azul marino claro
    "#BE185D", // Magenta
    "#334155", // Pizarra
    "#CA8A04", // Oro viejo
  ];

  const PALETA_DONUT_VENCIDA = [
    "#1D58D8", // Azul rey
    "#C81E3A", // Rojo carmesí
    "#0D8A47", // Verde esmeralda
    "#6B3FA0", // Morado ciruela
    "#EA6A15", // Naranja ámbar
    "#EAB308", // Dorado
    "#0284C7", // Azul cielo
    "#0F766E", // Verde azulado
    "#9333EA", // Púrpura
    "#E11D48", // Rosa fuerte
    "#2563EB", // Azul cobalto
    "#15803D", // Verde bosque
    "#B45309", // Bronce
    "#4F46E5", // Índigo
    "#0369A1", // Azul marino claro
    "#BE185D", // Magenta
    "#334155", // Pizarra
    "#CA8A04", // Oro viejo
  ];

  const donutCarteraTotal = useMemo(
    () => construirItemsDonut("total", PALETA_DONUT_TOTAL),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresasSismaFiltradas, datosSismaVivo, incluirMutual]
  );

  const donutCarteraVencida = useMemo(
    () => construirItemsDonut("vencida", PALETA_DONUT_VENCIDA),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresasSismaFiltradas, datosSismaVivo, incluirMutual]
  );

  const toggleFiltroEmpresaDesdeTorta = (empCorta: string) => {
    let nuevaLista: string[];
    if (empresasFrecSel.length === 1 && empresasFrecSel[0] === empCorta) {
      nuevaLista = [];
    } else {
      nuevaLista = [empCorta];
    }
    setFiltroEmpresa("TODAS");
    setEmpresasFrecSel(nuevaLista);
    setPaginaActual(1);
    sincronizarConSismaVivo(fechaCorteVivo, true, { empresas: nuevaLista });
  };

  const renderTarjetaTortaEmpresa = (
    titulo: string,
    etiquetaCentro: string,
    datosDonut: {
      sumaTotal: number;
      totalUniverso: number;
      hayFiltroSubconjunto: boolean;
      items: {
        empCorta: string;
        nombreLista: string;
        nombreAnillo: string;
        valor: number;
        pct: number;
        color: string;
      }[];
    }
  ) => {
    const cx = 190;
    const cy = 240;
    const rOuter = 112;
    const rInner = 68;

    // Solo las entidades con valor > 0 dibujan tajada y línea guía en el anillo
    const itemsConSaldo = datosDonut.items.filter((it) => it.valor > 0);
    const restoUniverso = Math.max(0, datosDonut.totalUniverso - datosDonut.sumaTotal);
    const pctSeleccionTotal =
      datosDonut.totalUniverso > 0
        ? (datosDonut.sumaTotal / datosDonut.totalUniverso) * 100
        : 0;
    const mostrarRestoEnAnillo =
      datosDonut.hayFiltroSubconjunto && restoUniverso > 1;

    // Si hay filtro de subconjunto, cada empresa ocupa su proporción frente al Total General (con mínimo visual de 0.055 rad para que sea visible y señalable sin repartir 100% entre las filtradas)
    const barridosRaw = itemsConSaldo.map((it) =>
      Math.max(
        mostrarRestoEnAnillo ? 0.055 : 0.018,
        (it.pct / 100) * Math.PI * 2
      )
    );
    const sumaBarridos =
      barridosRaw.reduce((acc, b) => acc + b, 0) || Math.PI * 2;
    const maxCirculoPermitido = mostrarRestoEnAnillo
      ? Math.PI * 2 * 0.92
      : Math.PI * 2;
    const factorEscala = mostrarRestoEnAnillo
      ? sumaBarridos > maxCirculoPermitido
        ? maxCirculoPermitido / sumaBarridos
        : 1
      : (Math.PI * 2) / sumaBarridos;

    let anguloAcum = -Math.PI / 2;
    const segmentos = itemsConSaldo.map((it, idx) => {
      const barrido = barridosRaw[idx] * factorEscala;
      const startAngle = anguloAcum;
      const endAngle = anguloAcum + barrido;
      const midAngle = startAngle + barrido / 2;
      anguloAcum = endAngle;
      return { ...it, idx, startAngle, endAngle, midAngle };
    });

    type CalloutSlot = (typeof segmentos)[number] & {
      lado: "izq" | "der";
      anchorX: number;
      anchorY: number;
      elbowX: number;
      labelY: number;
      lineEndX: number;
      textX: number;
      pasoSuperiorY?: number;
    };

    const izqRaw: CalloutSlot[] = [];
    const derRaw: CalloutSlot[] = [];

    // Repartir TODAS las entidades con saldo entre izquierda y derecha del anillo sin cruzar el círculo
    const corteIzqMax = Math.ceil((segmentos.length - 1) / 2);
    segmentos.forEach((seg, idx) => {
      const cos = Math.cos(seg.midAngle);
      const sin = Math.sin(seg.midAngle);
      const anchorX = cx + (rOuter + 1) * cos;
      const anchorY = cy + (rOuter + 1) * sin;

      const vaDerecha = mostrarRestoEnAnillo
        ? idx % 2 === 0
        : idx === 0 || (cos >= 0 && idx <= 2) || idx > corteIzqMax;
      const lado: "izq" | "der" = vaDerecha ? "der" : "izq";

      const requierePasoSuperior = lado === "der" && anchorX < cx - 2;
      const ordenSuperior = Math.max(0, idx - (corteIzqMax + 1));
      const pasoSuperiorY = requierePasoSuperior
        ? Math.max(12, cy - rOuter - 10 - ordenSuperior * 6.5)
        : undefined;

      const labelYInicial =
        !mostrarRestoEnAnillo && idx === 0
          ? cy + 85
          : requierePasoSuperior && pasoSuperiorY !== undefined
          ? pasoSuperiorY
          : cy + (rOuter + 6) * sin;

      const slot: CalloutSlot = {
        ...seg,
        lado,
        anchorX,
        anchorY,
        elbowX: lado === "der" ? cx + rOuter + 10 : cx - rOuter - 10,
        labelY: labelYInicial,
        lineEndX: lado === "der" ? 390 : -10,
        textX: lado === "der" ? 390 : -10,
        pasoSuperiorY,
      };
      if (lado === "der") derRaw.push(slot);
      else izqRaw.push(slot);
    });

    const prepararLadoSinMontar = (lista: CalloutSlot[]) => {
      const ordenados = [...lista].sort((a, b) => a.labelY - b.labelY);
      const minGap = 20.5;
      const minY = 56;
      const maxY = 368;
      for (let i = 0; i < ordenados.length; i++) {
        ordenados[i].labelY = Math.max(minY, Math.min(maxY, ordenados[i].labelY));
        if (i > 0 && ordenados[i].labelY - ordenados[i - 1].labelY < minGap) {
          ordenados[i].labelY = ordenados[i - 1].labelY + minGap;
        }
      }
      for (let i = ordenados.length - 1; i >= 0; i--) {
        if (ordenados[i].labelY > maxY) {
          ordenados[i].labelY = maxY;
        }
        if (i > 0 && ordenados[i].labelY - ordenados[i - 1].labelY < minGap) {
          ordenados[i - 1].labelY = Math.max(minY, ordenados[i].labelY - minGap);
        }
      }
      return ordenados;
    };

    const callouts = [
      ...prepararLadoSinMontar(izqRaw),
      ...prepararLadoSinMontar(derRaw),
    ];

    const crearArcoDonutPath = (start: number, end: number) => {
      const delta = Math.min(Math.PI * 2 - 0.001, Math.max(0.01, end - start));
      const e = start + delta;
      const x1 = cx + rOuter * Math.cos(start);
      const y1 = cy + rOuter * Math.sin(start);
      const x2 = cx + rOuter * Math.cos(e);
      const y2 = cy + rOuter * Math.sin(e);
      const x3 = cx + rInner * Math.cos(e);
      const y3 = cy + rInner * Math.sin(e);
      const x4 = cx + rInner * Math.cos(start);
      const y4 = cy + rInner * Math.sin(start);
      const largeArc = delta > Math.PI ? 1 : 0;
      return [
        `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
        `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
        "Z",
      ].join(" ");
    };

    return (
      <div
        className="rounded-xl p-4 sm:p-5 border shadow-2xs flex flex-col"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        <h4
          className="text-[13.5px] sm:text-[14.5px] font-bold tracking-tight mb-2"
          style={{ color: "#0F172A" }}
        >
          {titulo}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
          {/* ANILLO GRANDE CON PROPORCIÓN REAL SOBRE EL TOTAL GENERAL DE LA CARTERA */}
          <div className="sm:col-span-7 flex items-center justify-center">
            <svg
              viewBox="-14 45 408 335"
              className="w-full max-w-[455px] h-[310px] select-none overflow-visible"
            >
              {/* Aro base del Total General de la Cartera (visible cuando hay filtro o saldo $0) */}
              <circle
                cx={cx}
                cy={cy}
                r={(rOuter + rInner) / 2}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth={rOuter - rInner}
              >
                {mostrarRestoEnAnillo && (
                  <title>{`Resto de la cartera (${etiquetaCentro}): ${formatCOP(restoUniverso)} (${formatearPctDonut(Math.max(0, 100 - pctSeleccionTotal))} de ${formatCOP(datosDonut.totalUniverso)})`}</title>
                )}
              </circle>

              {segmentos.map((seg) => {
                const activa = empresasFrecSel.includes(seg.empCorta);
                return (
                  <path
                    key={seg.empCorta}
                    d={crearArcoDonutPath(seg.startAngle, seg.endAngle)}
                    fill={seg.color}
                    stroke="#FFFFFF"
                    strokeWidth="1.1"
                    className="cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      opacity:
                        empresasFrecSel.length > 0 && !activa ? 0.55 : 1,
                    }}
                    onClick={() => toggleFiltroEmpresaDesdeTorta(seg.empCorta)}
                  >
                    <title>{`${seg.nombreLista}: ${formatCOP(seg.valor)} (${formatearPctDonut(seg.pct)} del total general ${formatCOP(datosDonut.totalUniverso)})`}</title>
                  </path>
                );
              })}

              {/* Agujero blanco central grande y cifra ejecutiva */}
              <circle cx={cx} cy={cy} r={rInner - 1} fill="#FFFFFF" />
              <text
                x={cx}
                y={mostrarRestoEnAnillo ? cy - 8 : cy - 2}
                textAnchor="middle"
                fontSize="19.5"
                fontWeight="800"
                fill="#0F172A"
              >
                {formatMillones(datosDonut.sumaTotal)}
              </text>
              <text
                x={cx}
                y={mostrarRestoEnAnillo ? cy + 8 : cy + 16}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#475569"
              >
                {etiquetaCentro}
              </text>
              {mostrarRestoEnAnillo && (
                <text
                  x={cx}
                  y={cy + 23}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#1D58D8"
                >
                  {`${formatearPctDonut(pctSeleccionTotal)} de ${formatMillones(datosDonut.totalUniverso)}`}
                </text>
              )}

              {/* Líneas guía con Entidad + % sobre el Total General en una sola línea clara */}
              {callouts.map((c) => {
                const pts =
                  c.pasoSuperiorY !== undefined
                    ? `${c.anchorX.toFixed(1)},${c.anchorY.toFixed(1)} ${c.anchorX.toFixed(1)},${c.pasoSuperiorY.toFixed(1)} ${c.elbowX.toFixed(1)},${c.labelY.toFixed(1)} ${c.lineEndX},${c.labelY.toFixed(1)}`
                    : `${c.anchorX.toFixed(1)},${c.anchorY.toFixed(1)} ${c.elbowX.toFixed(1)},${c.labelY.toFixed(1)} ${c.lineEndX},${c.labelY.toFixed(1)}`;
                return (
                  <g
                    key={`callout-${c.empCorta}`}
                    className="cursor-pointer"
                    onClick={() => toggleFiltroEmpresaDesdeTorta(c.empCorta)}
                  >
                    <polyline
                      points={pts}
                      fill="none"
                      stroke="#64748B"
                      strokeWidth="0.8"
                    />
                    <text
                      x={c.textX}
                      y={c.labelY - 3.5}
                      textAnchor={c.lado === "der" ? "end" : "start"}
                      fontSize="8.8"
                      fontWeight="600"
                      fill="#0F172A"
                    >
                      {c.nombreAnillo}{" "}
                      <tspan fontWeight="800" fill="#0E245E">
                        {formatearPctDonut(c.pct)}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* LEYENDA CON BARRA DE SCROLL VERTICAL Y ENCABEZADO FIJO $M | % TOTAL */}
          <div className="sm:col-span-5 max-h-[310px] overflow-y-auto space-y-0.5 pl-1 pr-1.5">
            <div
              className="sticky top-0 z-10 flex items-center justify-end gap-2 px-1.5 py-1 text-[10px] font-bold border-b mb-1"
              style={{
                color: "#475569",
                borderColor: "#E2ECF8",
                backgroundColor: "#FFFFFF",
              }}
            >
              <span>$M</span>
              <span className="w-11 text-right">% Total</span>
            </div>
            {datosDonut.items.length === 0 ? (
              <div
                className="py-8 px-2 text-center text-xs font-medium"
                style={{ color: "#64748B" }}
              >
                Sin saldo en este concepto para la selección actual ($0)
              </div>
            ) : (
              <>
                {datosDonut.items.map((it) => {
                  const sel = empresasFrecSel.includes(it.empCorta);
                  return (
                    <div
                      key={`leg-${it.empCorta}`}
                      onClick={() => toggleFiltroEmpresaDesdeTorta(it.empCorta)}
                      title={`${it.nombreLista}: ${formatCOP(it.valor)} (${formatearPctDonut(it.pct)} del total general ${formatCOP(datosDonut.totalUniverso)}) — Clic para filtrar`}
                      className="flex items-center justify-between gap-1.5 px-1.5 py-[2.5px] rounded-md cursor-pointer transition hover:bg-slate-50"
                      style={{
                        backgroundColor: sel ? "#EFF6FF" : "transparent",
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: it.color }}
                        />
                        <span
                          className="text-[10.5px] font-semibold truncate"
                          style={{ color: "#0F172A" }}
                        >
                          {it.nombreLista}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10.5px] font-mono">
                        <span className="font-bold" style={{ color: "#0F172A" }}>
                          {formatMillones(it.valor)}
                        </span>
                        <span
                          className="w-11 text-right font-bold"
                          style={{ color: "#0E245E" }}
                        >
                          {formatearPctDonut(it.pct)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {mostrarRestoEnAnillo && (
                  <div
                    className="mt-1.5 pt-1.5 px-1.5 border-t flex items-center justify-between text-[10px] font-semibold"
                    style={{ borderColor: "#E2ECF8", color: "#475569" }}
                  >
                    <span>Total general período</span>
                    <span className="font-mono font-bold" style={{ color: "#0F172A" }}>
                      {formatMillones(datosDonut.totalUniverso)} (100%)
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTarjetaTendenciaTotalCartera = () => {
    const uConMismoCorte = datosSismaVivo?.desgloseUniverso?.conMutual;
    const totalBaseRef =
      uConMismoCorte?.carteraTotal ||
      (datosSismaVivo?.catalogoEmpresasPeriodo || []).reduce(
        (acc, e) => acc + (e.total || 0),
        0
      ) ||
      datosSismaCompletaRef.current?.edades?.saldoTotal ||
      corteBaseSeleccionado?.carteraTotal ||
      cortesTodas[cortesTodas.length - 1]?.carteraTotal ||
      1;
    const girosBaseRef =
      uConMismoCorte?.anticiposPorCruzar ||
      corteBaseSeleccionado?.anticiposPorCruzar ||
      cortesTodas[cortesTodas.length - 1]?.anticiposPorCruzar ||
      1;
    const factorFiltro =
      tieneFiltroEntidadDirecto || modalidadSisma === "PYP"
        ? Math.min(1, Math.max(0, corteSeleccionado.carteraTotal / Math.max(1, totalBaseRef)))
        : 1;
    const factorGiros =
      tieneFiltroEntidadDirecto || modalidadSisma === "PYP"
        ? Math.min(
            1,
            Math.max(0, corteSeleccionado.anticiposPorCruzar / Math.max(1, girosBaseRef))
          )
        : 1;

    const ayerIsoRef = datosSismaVivo?.ayerISO || ayerEnColombia();
    const corteIsoActivo = datosSismaVivo?.corteISO || fechaCorteVivo || ayerIsoRef;
    const esCorteCongeladoAyer = corteIsoActivo === ayerIsoRef;

    type PuntoCorteTabla = {
      id: string;
      idxCorte: number;
      fechaRaw: string;
      etiquetaTabla: string;
      etiquetaEje: string;
      esVivo: boolean;
      esCongeladoAyer: boolean;
      carteraTotal: number;
      totalCarteraReal: number;
      carteraCorriente: number;
      carteraVencida: number;
      anticiposPorCruzar: number;
    };

    const puntosCortes: PuntoCorteTabla[] = listaCortesActiva.map((c, idx) => {
      const fClean = String(c.fechaCorte || "").slice(0, 10);
      const esVivo =
        String(c.fechaCorte || "").toUpperCase().includes("VIVO") ||
        (Boolean(datosSismaVivo) &&
          idx === listaCortesActiva.length - 1 &&
          fClean === datosSismaVivo?.fechaCorte.slice(0, 10));
      const congAyer = esVivo && esCorteCongeladoAyer;

      const usarDirecto =
        (tieneFiltroEntidadDirecto || modalidadSisma === "PYP" || esVivo) &&
        idx === indiceCorteActivo;

      const cTotal = usarDirecto
        ? corteSeleccionado.carteraTotal
        : Math.round(c.carteraTotal * factorFiltro);
      const cCorr = usarDirecto
        ? corteSeleccionado.carteraCorriente
        : Math.round((c.carteraCorriente ?? c.carteraTotal - c.carteraVencida) * factorFiltro);
      const cVenc = usarDirecto
        ? corteSeleccionado.carteraVencida
        : Math.max(0, cTotal - cCorr);
      const cGiros = usarDirecto
        ? corteSeleccionado.anticiposPorCruzar
        : Math.round((c.anticiposPorCruzar || 0) * factorGiros);
      const cReal = usarDirecto
        ? corteSeleccionado.totalCarteraReal
        : Math.round(cTotal - cGiros);

      return {
        id: `corte-${fClean}-${idx}`,
        idxCorte: idx,
        fechaRaw: fClean,
        etiquetaTabla: congAyer
          ? `Ayer ${fClean}`
          : esVivo
          ? `Vivo ${fClean}`
          : `Corte ${fClean}`,
        etiquetaEje: congAyer
          ? `Ayer ${fClean.slice(0, 5)}`
          : esVivo
          ? `Vivo ${fClean.slice(0, 5)}`
          : fClean,
        esVivo,
        esCongeladoAyer: congAyer,
        carteraTotal: cTotal,
        totalCarteraReal: cReal,
        carteraCorriente: cCorr,
        carteraVencida: cVenc,
        anticiposPorCruzar: cGiros,
      };
    });

    const ultimoCorteLista = puntosCortes[puntosCortes.length - 1];
    const puntosTablaCortes: PuntoCorteTabla[] =
      datosSismaVivo &&
      !sinGiros &&
      ultimoCorteLista &&
      datosSismaVivo.fechaCorte.slice(0, 10) !== ultimoCorteLista.fechaRaw
        ? [
            ...puntosCortes,
            {
              id: `corte-vivo-${datosSismaVivo.fechaCorte}`,
              idxCorte: listaCortesActiva.length - 1,
              fechaRaw: datosSismaVivo.fechaCorte.slice(0, 10),
              etiquetaTabla: esCorteCongeladoAyer
                ? `Ayer ${datosSismaVivo.fechaCorte.slice(0, 10)}`
                : `Vivo ${datosSismaVivo.fechaCorte.slice(0, 10)}`,
              etiquetaEje: esCorteCongeladoAyer
                ? `Ayer ${datosSismaVivo.fechaCorte.slice(0, 5)}`
                : `Vivo ${datosSismaVivo.fechaCorte.slice(0, 5)}`,
              esVivo: true,
              esCongeladoAyer: esCorteCongeladoAyer,
              carteraTotal: corteSeleccionado.carteraTotal,
              totalCarteraReal: corteSeleccionado.totalCarteraReal,
              carteraCorriente: corteSeleccionado.carteraCorriente,
              carteraVencida: corteSeleccionado.carteraVencida,
              anticiposPorCruzar: corteSeleccionado.anticiposPorCruzar,
            },
          ]
        : puntosCortes.map((pt, i) =>
            i === puntosCortes.length - 1 && datosSismaVivo
              ? {
                  ...pt,
                  esVivo: true,
                  esCongeladoAyer: esCorteCongeladoAyer,
                  etiquetaTabla: esCorteCongeladoAyer
                    ? `Ayer ${datosSismaVivo.fechaCorte.slice(0, 10)}`
                    : `Vivo ${datosSismaVivo.fechaCorte.slice(0, 10)}`,
                }
              : pt
          );

    /* -----------------------------------------------------------------
       LA TENDENCIA MENSUAL SALE DE LOS CIERRES GUARDADOS, Y EL MES EN
       CURSO SE CONECTA SIEMPRE AL CORTE CONGELADO DEL DÍA ANTERIOR PARA
       QUE NUNCA QUEDE EN LÍNEA RECTA HORIZONTAL CON EL MES ANTERIOR.
       ----------------------------------------------------------------- */
    const anioCorteVivo = Number(corteIsoActivo.slice(0, 4)) || anioTendencia;
    const mesCorteVivo = Number(corteIsoActivo.slice(5, 7)) || 0;
    const mmCorteVivo = String(mesCorteVivo).padStart(2, "0");
    const nombresMesCorto = [
      "",
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];

    const cierresFiltrados = cierresMensuales.filter((c) => {
      if (mesesFrecSel.length > 0 && mesesFrecSel.length < 12) {
        const mm = String(c.mes).padStart(2, "0");
        if (!mesesFrecSel.includes(mm)) return false;
      }
      return true;
    });

    const puntosMesesBase = cierresFiltrados.map((c) => {
      const usarCorteCongeladoVivo =
        (c.esMesEnCurso || (c.anio === anioCorteVivo && c.mes === mesCorteVivo)) &&
        Boolean(datosSismaVivo) &&
        !sinGiros;

      const cTotal = usarCorteCongeladoVivo
        ? corteSeleccionado.carteraTotal
        : Math.round(c.carteraTotal * factorFiltro);
      const cCorr = usarCorteCongeladoVivo
        ? corteSeleccionado.carteraCorriente
        : Math.round(c.carteraCorriente * factorFiltro);
      const cVenc = usarCorteCongeladoVivo
        ? corteSeleccionado.carteraVencida
        : Math.max(0, cTotal - cCorr);
      const cGiros = usarCorteCongeladoVivo
        ? corteSeleccionado.anticiposPorCruzar
        : Math.round((c.girosPorCruzar ?? Math.max(0, c.carteraTotal - c.carteraReal)) * factorGiros);
      const cReal = usarCorteCongeladoVivo
        ? corteSeleccionado.totalCarteraReal
        : Math.round(cTotal - cGiros);

      const fechaCierreLatam = usarCorteCongeladoVivo
        ? `${datosSismaVivo?.fechaCorte || formatearISOaLatam(corteIsoActivo)}${esCorteCongeladoAyer ? " (Ayer)" : ""}`
        : formatearISOaLatam(c.fechaCorte);

      return {
        id: `cierre-${c.anio}-${c.mes}`,
        idxCorte: listaCortesActiva.length - 1,
        etiquetaEje: usarCorteCongeladoVivo && esCorteCongeladoAyer ? `${c.etiqueta}*` : c.etiqueta,
        fechaDetalle: fechaCierreLatam,
        esCongeladoAyer: usarCorteCongeladoVivo && esCorteCongeladoAyer,
        carteraTotal: cTotal,
        totalCarteraReal: cReal,
        carteraCorriente: cCorr,
        carteraVencida: cVenc,
        anticiposPorCruzar: cGiros,
        mostrarLabel: true,
      };
    });

    const yaTieneMesVivo = cierresFiltrados.some(
      (c) => c.anio === anioCorteVivo && c.mes === mesCorteVivo
    );
    const permiteMesVivo =
      mesesFrecSel.length === 0 ||
      mesesFrecSel.length >= 12 ||
      mesesFrecSel.includes(mmCorteVivo);

    const puntosMeses =
      !yaTieneMesVivo &&
      puntosMesesBase.length > 0 &&
      anioTendencia === anioCorteVivo &&
      mesCorteVivo >= 1 &&
      permiteMesVivo &&
      Boolean(datosSismaVivo) &&
      !sinGiros
        ? [
            ...puntosMesesBase,
            {
              id: `cierre-vivo-${anioCorteVivo}-${mesCorteVivo}`,
              idxCorte: listaCortesActiva.length - 1,
              etiquetaEje: `${nombresMesCorto[mesCorteVivo] || mmCorteVivo}${esCorteCongeladoAyer ? "*" : ""}`,
              fechaDetalle: `${datosSismaVivo?.fechaCorte || formatearISOaLatam(corteIsoActivo)}${esCorteCongeladoAyer ? " (Ayer)" : ""}`,
              esCongeladoAyer: esCorteCongeladoAyer,
              carteraTotal: corteSeleccionado.carteraTotal,
              totalCarteraReal: corteSeleccionado.totalCarteraReal,
              carteraCorriente: corteSeleccionado.carteraCorriente,
              carteraVencida: corteSeleccionado.carteraVencida,
              anticiposPorCruzar: corteSeleccionado.anticiposPorCruzar,
              mostrarLabel: true,
            },
          ]
        : puntosMesesBase;

    const puntosGrafica =
      modoTendenciaCartera === "MES"
        ? puntosMeses
        : puntosTablaCortes.map((c) => ({
            id: c.id,
            idxCorte: c.idxCorte,
            etiquetaEje: c.etiquetaEje,
            fechaDetalle: c.etiquetaTabla,
            esCongeladoAyer: c.esCongeladoAyer,
            carteraTotal: c.carteraTotal,
            totalCarteraReal: c.totalCarteraReal,
            carteraCorriente: c.carteraCorriente,
            carteraVencida: c.carteraVencida,
            anticiposPorCruzar: c.anticiposPorCruzar,
            mostrarLabel: true,
          }));

    const n = puntosGrafica.length;
    const svgW = 760;
    const svgH = 352;
    const padL = 82;
    const padR = 34;
    const padT = 26;
    const baseLineY = 314;
    const yFloor = 314;
    const plotW = svgW - padL - padR;
    const plotH = yFloor - padT;

    const todosValores = puntosGrafica.flatMap((p) => [
      p.carteraTotal,
      p.totalCarteraReal,
      p.carteraCorriente,
      p.carteraVencida,
    ]);
    const escalaTendencia = generarTicksEjeY(Math.max(...todosValores, 1) * 1.05, 4);
    const minVal = 0;
    const rangoVal = Math.max(1, escalaTendencia.techo - minVal);

    const getX = (i: number) =>
      n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
    const getYRaw = (val: number) =>
      yFloor - ((val - minVal) / rangoVal) * plotH;

    // Garantizar separación mínima vertical de 15px entre el punto azul (Total) y el verde (Real) incluso en Ene
    const coordsReal = puntosGrafica.map((p, i) => ({
      x: getX(i),
      y: getYRaw(p.totalCarteraReal),
      val: p.totalCarteraReal,
    }));
    const coordsTotal = puntosGrafica.map((p, i) => {
      const yR = coordsReal[i].y;
      const yT = getYRaw(p.carteraTotal);
      return {
        x: getX(i),
        y: Math.min(yT, yR - 15),
        val: p.carteraTotal,
      };
    });

    const construirCurvaSuave = (coords: { x: number; y: number }[]) => {
      if (coords.length === 0) return "";
      if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
      let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];
        const cx1 = p0.x + (p1.x - p0.x) * 0.42;
        const cx2 = p1.x - (p1.x - p0.x) * 0.42;
        d += ` C ${cx1.toFixed(1)} ${p0.y.toFixed(1)}, ${cx2.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
      return d;
    };

    const pathTotal = construirCurvaSuave(coordsTotal);
    const pathReal = construirCurvaSuave(coordsReal);

    const coordsCorriente = puntosGrafica.map((p, i) => ({
      x: getX(i),
      y: getYRaw(p.carteraCorriente),
      val: p.carteraCorriente,
    }));
    const coordsVencida = puntosGrafica.map((p, i) => ({
      x: getX(i),
      y: getYRaw(p.carteraVencida),
      val: p.carteraVencida,
    }));
    const hayDesglose = puntosGrafica.some(
      (p) => p.carteraCorriente > 0 || p.carteraVencida > 0,
    );
    const pathCorriente = hayDesglose ? construirCurvaSuave(coordsCorriente) : "";
    const pathVencida = hayDesglose ? construirCurvaSuave(coordsVencida) : "";

    const areaTotal =
      coordsTotal.length > 1
        ? `${pathTotal} L ${coordsTotal[coordsTotal.length - 1].x.toFixed(1)} ${baseLineY} L ${coordsTotal[0].x.toFixed(1)} ${baseLineY} Z`
        : "";
    const areaReal =
      coordsReal.length > 1
        ? `${pathReal} L ${coordsReal[coordsReal.length - 1].x.toFixed(1)} ${baseLineY} L ${coordsReal[0].x.toFixed(1)} ${baseLineY} Z`
        : "";

    const idxActivoCursor =
      hoverTendenciaIdx !== null && hoverTendenciaIdx < puntosGrafica.length
        ? hoverTendenciaIdx
        : puntosGrafica.length > 0
        ? puntosGrafica.length - 1
        : null;
    const puntoInspeccionado =
      idxActivoCursor !== null ? puntosGrafica[idxActivoCursor] : null;
    const puntoAnteriorInsp =
      idxActivoCursor !== null && idxActivoCursor > 0
        ? puntosGrafica[idxActivoCursor - 1]
        : null;

    return (
      <div
        className="rounded-xl p-4 sm:p-5 border shadow-2xs space-y-3"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        {/* ENCABEZADO, LEYENDAS EN CÁPSULAS Y BOTÓN [VER EN GRÁFICA: POR MES (ENE-OCT) | POR CORTES] */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4
                className="text-[13.5px] sm:text-[14.5px] font-bold tracking-tight"
                style={{ color: "#0F172A" }}
              >
                Tendencia del Total de Cartera: Evolución Mensual y Fechas de Corte
              </h4>
              {(tieneFiltroEntidadDirecto || modalidadSisma === "PYP" || (mesesFrecSel.length > 0 && mesesFrecSel.length < 12)) && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border shadow-2xs"
                  style={{
                    backgroundColor: "#EFF6FF",
                    borderColor: "#BFDBFE",
                    color: "#1D4ED8",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>
                    Filtrado por:{" "}
                    {filtroEmpresa !== "TODAS"
                      ? filtroEmpresa
                      : empresasFrecSel.length > 0
                      ? `${empresasFrecSel.length} entidades`
                      : filtroResponsable !== "TODAS"
                      ? filtroResponsable
                      : responsablesFrecSel.length > 0
                      ? `${responsablesFrecSel.length} responsables`
                      : modalidadSisma === "PYP"
                      ? "PyP"
                      : "Meses seleccionados"}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11.5px]" style={{ color: "#475569" }}>
              Evolución por corte: Cartera Total vs. Total Cartera Real Neta (descontando Giros por Cruzar)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Pastillas de leyenda limpias (evitan cualquier choque con Ene) */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-2xs"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#DCE6F5",
                color: "#0F172A",
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#1D58D8" }}
              />
              <span>Cartera Total</span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-2xs"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#DCE6F5",
                color: "#0F172A",
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#059669" }}
              />
              <span>Cartera Real</span>
            </div>

            {/* Las dos partes del Total. Se muestran en la leyenda con la
                misma linea punteada con que se dibujan, para que se
                entienda de un vistazo que son el desglose y no otra cosa. */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-2xs"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#DCE6F5", color: "#0F172A" }}
            >
              <span
                className="w-3.5 h-0 shrink-0"
                style={{ borderTop: "2px dashed #38BDF8" }}
              />
              <span>Corriente</span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-2xs"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#DCE6F5", color: "#0F172A" }}
            >
              <span
                className="w-3.5 h-0 shrink-0"
                style={{ borderTop: "2px dashed #DC2626" }}
              />
              <span>Vencida</span>
            </div>

            <div
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px]"
              style={{ backgroundColor: "#F1F5F9", borderColor: "#94A3B8" }}
            >
              <span className="font-semibold mr-1.5" style={{ color: "#0F172A" }}>
                Ver en Gráfica:
              </span>
              <button
                type="button"
                onClick={() => setModoTendenciaCartera("MES")}
                className="px-2 py-0.5 rounded-full font-bold transition cursor-pointer"
                style={{
                  backgroundColor:
                    modoTendenciaCartera === "MES" ? "#0E245E" : "transparent",
                  color: modoTendenciaCartera === "MES" ? "#FFFFFF" : "#0F172A",
                }}
              >
                {/* El rango sale de los cierres que de verdad hay, no de
                    un texto fijo. Decia "Ene-Oct" aunque la gráfica
                    mostrara otra cosa. */}
                {cierresFiltrados.length > 0
                  ? `Por Mes (${cierresFiltrados[0].etiqueta}-${cierresFiltrados[cierresFiltrados.length - 1].etiqueta} ${anioTendencia})`
                  : `Por Mes (${anioTendencia})`}
              </button>
              <span className="mx-1.5 font-bold" style={{ color: "#1D58D8" }}>
                |
              </span>
              <button
                type="button"
                onClick={() => setModoTendenciaCartera("CORTES")}
                className="px-2 py-0.5 rounded-full font-bold transition cursor-pointer"
                style={{
                  backgroundColor:
                    modoTendenciaCartera === "CORTES" ? "#0E245E" : "transparent",
                  color: modoTendenciaCartera === "CORTES" ? "#FFFFFF" : "#0F172A",
                }}
              >
                Por Cortes ({puntosTablaCortes.length} fechas)
              </button>
            </div>

            {/* Selector de ano: solo aparece si hay cierres de mas de un
                ano guardados. No se ofrece un ano que no tenga datos. */}
            {modoTendenciaCartera === "MES" && aniosCierres.length > 1 ? (
              <div
                className="ml-2 inline-flex items-center gap-1 rounded-full border px-1 py-0.5 text-[11px]"
                style={{ borderColor: "#DCE5F2", backgroundColor: "#FFFFFF" }}
              >
                {aniosCierres.map((a) => (
                  <button
                    key={`anio-tend-${a}`}
                    type="button"
                    onClick={() => setAnioTendencia(a)}
                    className="cursor-pointer rounded-full px-2 py-0.5 font-bold transition"
                    style={{
                      backgroundColor: anioTendencia === a ? "#1D58D8" : "transparent",
                      color: anioTendencia === a ? "#FFFFFF" : "#0F172A",
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* CUERPO: GRÁFICA LIMPIA A LA IZQUIERDA + TABLA DE FECHAS DE CORTE A LA DERECHA */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
          <div className="xl:col-span-8">
            {modoTendenciaCartera === "MES" && puntosGrafica.length === 0 ? (
              /* Sin cierres guardados NO se dibuja nada. Antes, en este
                 hueco, se fabricaba una curva interpolando cuatro cortes.
                 Un espacio vacio que explica por que esta vacio es mejor
                 que una linea que nadie sabe que es inventada. */
              <div className="flex h-[240px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#DCE5F2] bg-[#FAFBFD] px-6 text-center">
                <p className="text-[13px] font-semibold text-[#0E245E]">
                  {estadoCierres === "cargando"
                    ? "Trayendo los cierres mensuales…"
                    : estadoCierres === "sin-tabla"
                      ? "Todavía no está creada la tabla de cierres mensuales"
                      : estadoCierres === "error"
                        ? "No se pudieron traer los cierres mensuales"
                        : mesesFrecSel.length > 0 && mesesFrecSel.length < 12
                          ? `No hay cierres mensuales para los meses seleccionados de ${anioTendencia}`
                          : `No hay cierres mensuales guardados de ${anioTendencia}`}
                </p>
                {estadoCierres !== "cargando" ? (
                  <p className="mt-1.5 max-w-[420px] text-[11.5px] leading-relaxed text-[#5B6B8C]">
                    Cada punto de esta tendencia es el cierre real de un mes
                    (Corriente + Vencida = Total, menos Giros = Real), pedido a
                    SISMA una vez y guardado. Mientras no existan, aquí no se
                    dibuja nada: antes se mostraba una curva estimada y no había
                    forma de distinguirla de la real.
                  </p>
                ) : null}
              </div>
            ) : (
            <div className="space-y-2.5">
              {/* BARRA INTERACTIVA DE SEGUIMIENTO CON CURSOR */}
              {puntoInspeccionado && (
                <div
                  className="rounded-xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] transition-colors"
                  style={{
                    backgroundColor: hoverTendenciaIdx !== null ? "#EFF6FF" : "#F8FAFC",
                    borderColor: hoverTendenciaIdx !== null ? "#93C5FD" : "#E2ECF8",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-md font-extrabold text-[11px]"
                      style={{
                        backgroundColor: hoverTendenciaIdx !== null ? "#1D58D8" : "#0E245E",
                        color: "#FFFFFF",
                      }}
                    >
                      {puntoInspeccionado.etiquetaEje.replace("*", "")}
                    </span>
                    <span className="font-semibold text-[#475569]">
                      Corte: {puntoInspeccionado.fechaDetalle}
                    </span>
                    {puntoInspeccionado.esCongeladoAyer && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Congelado día anterior cerrado
                      </span>
                    )}
                    {puntoAnteriorInsp && puntoAnteriorInsp.carteraTotal > 0 && (() => {
                      const diff = puntoInspeccionado.carteraTotal - puntoAnteriorInsp.carteraTotal;
                      const pct = (diff / puntoAnteriorInsp.carteraTotal) * 100;
                      const sube = diff >= 0;
                      return (
                        <span
                          className="font-mono font-bold text-[10.5px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: sube ? "#FEF2F2" : "#ECFDF5",
                            color: sube ? "#B91C1C" : "#047857",
                          }}
                        >
                          {sube ? "▲ +" : "▼ "}
                          {formatMillones(diff)} ({sube ? "+" : ""}
                          {pct.toFixed(1)}% vs. {puntoAnteriorInsp.etiquetaEje.replace("*", "")})
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono text-[11px]">
                    <span className="text-[#0E245E]">
                      <strong>Total:</strong> {formatCOP(puntoInspeccionado.carteraTotal)}
                    </span>
                    <span className="text-[#0369A1]">
                      <strong>Corr:</strong> {formatCOP(puntoInspeccionado.carteraCorriente)}
                    </span>
                    <span className="text-[#B91C1C]">
                      <strong>Venc:</strong> {formatCOP(puntoInspeccionado.carteraVencida)} (
                      {puntoInspeccionado.carteraTotal > 0
                        ? ((puntoInspeccionado.carteraVencida / puntoInspeccionado.carteraTotal) * 100).toFixed(1)
                        : "0.0"}
                      %)
                    </span>
                    <span className="text-[#92400E]">
                      <strong>(-) Giros:</strong> {formatCOP(puntoInspeccionado.anticiposPorCruzar)}
                    </span>
                    <span className="text-[#047857] font-extrabold">
                      <strong>Real:</strong> {realCOP(puntoInspeccionado.totalCarteraReal)}
                    </span>
                  </div>
                </div>
              )}

            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto select-none overflow-visible"
              onMouseLeave={() => setHoverTendenciaIdx(null)}
            >
              <defs>
                <linearGradient id="gradTendenciaTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D58D8" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#1D58D8" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="gradTendenciaReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                </linearGradient>
                <filter id="sombraCapsulaTendencia" x="-15%" y="-20%" width="130%" height="145%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#0F172A" floodOpacity="0.09" />
                </filter>
              </defs>

              {/* ESCALA MONETARIA DEL EJE Y IZQUIERDO + LÍNEAS GUÍA */}
              <line
                x1={padL - 10}
                y1={padT - 4}
                x2={padL - 10}
                y2={baseLineY}
                stroke="#CBD5E1"
                strokeWidth="1.2"
              />
              {escalaTendencia.ticks.map((tk, idx) => {
                const gy = getYRaw(tk.valor);
                return (
                  <g key={`grid-tend-${idx}`}>
                    <line
                      x1={padL - 10}
                      y1={gy}
                      x2={svgW - padR + 14}
                      y2={gy}
                      stroke={tk.valor === 0 ? "#334155" : "#E2E8F0"}
                      strokeWidth={tk.valor === 0 ? "1.2" : "1"}
                      strokeDasharray={tk.valor === 0 ? undefined : "3.5 3.5"}
                    />
                    <line
                      x1={padL - 14}
                      y1={gy}
                      x2={padL - 10}
                      y2={gy}
                      stroke="#94A3B8"
                      strokeWidth="1.1"
                    />
                    <text
                      x={padL - 17}
                      y={gy + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight="700"
                      fill="#334155"
                      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                    >
                      {tk.label}
                    </text>
                  </g>
                );
              })}

              {/* FRANJA Y CROSSHAIR VERTICAL DEL CURSOR */}
              {hoverTendenciaIdx !== null && hoverTendenciaIdx < puntosGrafica.length && (() => {
                const hx = getX(hoverTendenciaIdx);
                const pasoX = n > 1 ? plotW / (n - 1) : 56;
                const bandW = Math.min(54, pasoX * 0.72);
                return (
                  <g pointerEvents="none">
                    <rect
                      x={hx - bandW / 2}
                      y={padT - 6}
                      width={bandW}
                      height={baseLineY - padT + 6}
                      rx={6}
                      fill="#DBEAFE"
                      opacity="0.32"
                    />
                    <line
                      x1={hx}
                      y1={padT - 6}
                      x2={hx}
                      y2={baseLineY}
                      stroke="#1D58D8"
                      strokeWidth="1.4"
                      strokeDasharray="4 3"
                    />
                  </g>
                );
              })()}

              {/* Áreas degradadas */}
              {areaTotal && <path d={areaTotal} fill="url(#gradTendenciaTotal)" />}
              {areaReal && <path d={areaReal} fill="url(#gradTendenciaReal)" />}

              {/* Las dos partes que suman el Total. Van PRIMERO para que
                  queden por debajo: Total y Real son las que se leen, estas
                  dos son el desglose y no deben taparlas. Linea fina y
                  punteada, sin relleno. */}
              {pathCorriente ? (
                <path
                  d={pathCorriente}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1.6"
                  strokeDasharray="5 3"
                  opacity="0.95"
                />
              ) : null}
              {pathVencida ? (
                <path
                  d={pathVencida}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="1.6"
                  strokeDasharray="5 3"
                  opacity="0.95"
                />
              ) : null}

              {/* Curva Azul: Cartera Total */}
              <path
                d={pathTotal}
                fill="none"
                stroke="#1D58D8"
                strokeWidth="2.6"
              />

              {/* Puntos chicos de Corriente y Vencida: sin capsula, pero
                  con el valor al pasar el mouse. Asi el dato exacto esta
                  disponible sin llenar la grafica de numeros. */}
              {hayDesglose
                ? coordsCorriente.map((c, i) => (
                    <circle key={`pc-${i}`} cx={c.x} cy={c.y} r="2.6" fill="#38BDF8">
                      <title>{`${puntosGrafica[i].etiquetaEje} · Cartera Corriente: ${formatCOP(c.val)}`}</title>
                    </circle>
                  ))
                : null}
              {hayDesglose
                ? coordsVencida.map((c, i) => (
                    <circle key={`pv-${i}`} cx={c.x} cy={c.y} r="2.6" fill="#DC2626">
                      <title>{`${puntosGrafica[i].etiquetaEje} · Cartera Vencida: ${formatCOP(c.val)}`}</title>
                    </circle>
                  ))
                : null}

              {/* Curva Verde: Cartera Real */}
              <path
                d={pathReal}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
              />

              {/* LAS CUATRO CIFRAS DEL MES, DENTRO DEL DIBUJO.

                  Antes esto se resolvia con una tabla debajo de la
                  grafica. Funcionaba, pero obligaba a mirar dos veces:
                  la forma arriba y el numero abajo.

                  Meter cuatro cifras por mes dentro del dibujo tiene un
                  solo problema de verdad: que se tapen entre ellas. Se
                  resuelve de una manera y no a parches:

                    1. Cada cifra pide el lugar donde se entiende sola
                       -- la de arriba encima de su punto, la de abajo
                       debajo del suyo.
                    2. Se ordenan de arriba a abajo y se separan hasta
                       dejar SEPARACION entre una y la siguiente.
                    3. Si la pila se sale por abajo, se sube entera; si
                       entonces se sale por arriba, se baja entera.

                  Al separarlas en bloque nunca quedan dos encima, por
                  mas que las lineas se junten. Lo que antes se hacia
                  puntuando posiciones una por una fallaba justo cuando
                  mas falta hacia: en los meses donde las curvas se
                  tocan.

                  Y cuando una cifra tuvo que correrse de su punto, se
                  le dibuja un hilo punteado hasta el: asi nunca hay
                  duda de a cual linea pertenece. */}
              {puntosGrafica.map((pt, i) => {
                const x = getX(i);
                const yTot = coordsTotal[i].y;
                const yReal = coordsReal[i].y;
                const yCorr = coordsCorriente[i].y;
                const yVenc = coordsVencida[i].y;

                const SEPARACION = 20.5; // de centro a centro
                const TECHO = 13;
                const PISO = baseLineY - 12;

                type Capsula = {
                  k: string;
                  ancla: number;   // el punto al que pertenece
                  deseado: number; // donde le gustaria estar
                  y: number;       // donde termina
                  texto: string;
                  ancho: number;
                  fondo: string;
                  borde: string;
                  color: string;
                  fuente: number;
                  peso: number;
                };

                const anchoDe = (t: string, f: number, minimo: number) =>
                  Math.max(minimo, t.length * f + 12);

                const txtTotal = formatMillones(pt.carteraTotal);
                const txtReal = formatMillones(pt.totalCarteraReal);
                const txtCorr = formatMillones(pt.carteraCorriente);
                const txtVenc = formatMillones(pt.carteraVencida);

                const capsulas: Capsula[] = [
                  {
                    k: "tot",
                    ancla: yTot,
                    deseado: yTot - 19,
                    y: 0,
                    texto: txtTotal,
                    ancho: anchoDe(txtTotal, 5.9, 42),
                    fondo: "#FFFFFF",
                    borde: "#C3D9FA",
                    color: "#0E245E",
                    fuente: 10,
                    peso: 800,
                  },
                  {
                    k: "real",
                    ancla: yReal,
                    deseado: yReal + 19,
                    y: 0,
                    texto: txtReal,
                    ancho: anchoDe(txtReal, 5.9, 42),
                    fondo: "#FFFFFF",
                    borde: "#A7E8CD",
                    color: "#065F46",
                    fuente: 10,
                    peso: 800,
                  },
                ];

                /* Corriente y Vencida son el desglose: van con el color
                   de su linea y mas chicas, para que se lean como lo que
                   son y no compitan con Total y Real. */
                if (hayDesglose) {
                  capsulas.push({
                    k: "corr",
                    ancla: yCorr,
                    deseado: yCorr - 17,
                    y: 0,
                    texto: txtCorr,
                    ancho: anchoDe(txtCorr, 5.3, 36),
                    fondo: "#F0F9FF",
                    borde: "#7DD3FC",
                    color: "#0369A1",
                    fuente: 9,
                    peso: 700,
                  });
                  capsulas.push({
                    k: "venc",
                    ancla: yVenc,
                    deseado: yVenc + 17,
                    y: 0,
                    texto: txtVenc,
                    ancho: anchoDe(txtVenc, 5.3, 36),
                    fondo: "#FEF2F2",
                    borde: "#FCA5A5",
                    color: "#B91C1C",
                    fuente: 9,
                    peso: 700,
                  });
                }

                // 1. de arriba a abajo, separandolas
                const pila = [...capsulas].sort((p1, p2) => p1.deseado - p2.deseado);
                let anterior = -Infinity;
                for (const c of pila) {
                  c.y = Math.max(c.deseado, anterior + SEPARACION);
                  anterior = c.y;
                }
                // 2. si la pila se paso del piso, baja entera
                const sobra = pila[pila.length - 1].y - PISO;
                if (sobra > 0) for (const c of pila) c.y -= sobra;
                // 3. y si al subirla se salio por el techo, baja lo justo
                const falta = TECHO - pila[0].y;
                if (falta > 0) for (const c of pila) c.y += falta;
                // 4. ultimo seguro: ninguna fuera del dibujo
                for (const c of pila) c.y = Math.max(TECHO, Math.min(PISO, c.y));

                /* En el primer y el ultimo mes la capsula se saldria por
                   el borde: va centrada en el punto y el punto esta
                   pegado al margen. Se corre hacia adentro lo necesario. */
                const dentro = (w: number) =>
                  Math.max(padL - 8 + w / 2, Math.min(svgW - w / 2 - 2, x));
                const esHover = hoverTendenciaIdx === i;
                const hitW = n > 1 ? Math.max(28, plotW / (n - 1)) : 80;

                return (
                  <g
                    key={pt.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverTendenciaIdx(i)}
                    onClick={() => setIndiceCorteActivo(pt.idxCorte)}
                  >
                    {/* Zona invisible ancha para seguimiento fluido con el cursor */}
                    <rect
                      x={x - hitW / 2}
                      y={padT - 8}
                      width={hitW}
                      height={baseLineY - padT + 36}
                      fill="transparent"
                    />
                    {pt.mostrarLabel && (
                      <>
                        {/* Nodos de las dos series principales */}
                        <circle
                          cx={x}
                          cy={yTot}
                          r={esHover ? 6.4 : 4.6}
                          fill="#1D58D8"
                          stroke="#FFFFFF"
                          strokeWidth={esHover ? "2.2" : "1.6"}
                        >
                          <title>{`${pt.etiquetaEje} · Cartera Total: ${formatCOP(pt.carteraTotal)}`}</title>
                        </circle>
                        <circle
                          cx={x}
                          cy={yReal}
                          r={esHover ? 6.4 : 4.6}
                          fill="#059669"
                          stroke="#FFFFFF"
                          strokeWidth={esHover ? "2.2" : "1.6"}
                        >
                          <title>{`${pt.etiquetaEje} · Cartera Real: ${realCOP(pt.totalCarteraReal)}`}</title>
                        </circle>

                        {/* El desglose va primero: si dos se rozan, la que
                            tiene que quedar legible es la principal. */}
                        {capsulas
                          .slice()
                          .sort((p1, p2) => (p1.fuente === p2.fuente ? 0 : p1.fuente - p2.fuente))
                          .map((c) => {
                            const cx = dentro(c.ancho);
                            const corrida = Math.abs(c.y - c.ancla) > 13;
                            return (
                              <g key={`${pt.id}-${c.k}`}>
                                {corrida ? (
                                  <line
                                    x1={x}
                                    y1={c.ancla}
                                    x2={cx}
                                    y2={c.y}
                                    stroke={c.borde}
                                    strokeWidth="1"
                                    strokeDasharray="2 2.5"
                                    opacity="0.85"
                                  />
                                ) : null}
                                <rect
                                  x={cx - c.ancho / 2}
                                  y={c.y - 9.5}
                                  width={c.ancho}
                                  height={19}
                                  rx={9.5}
                                  fill={esHover ? "#EFF6FF" : c.fondo}
                                  stroke={esHover ? "#2563EB" : c.borde}
                                  strokeWidth={esHover ? "1.4" : "1"}
                                  filter="url(#sombraCapsulaTendencia)"
                                />
                                <text
                                  x={cx}
                                  y={c.y + 3.4}
                                  textAnchor="middle"
                                  fontSize={c.fuente}
                                  fontWeight={c.peso}
                                  fill={c.color}
                                >
                                  {c.texto}
                                </text>
                              </g>
                            );
                          })}
                      </>
                    )}

                    {/* Etiqueta del Eje X (debajo de la línea divisoria con aire amplio) */}
                    <text
                      x={x}
                      y={baseLineY + 20}
                      textAnchor="middle"
                      fontSize={esHover ? "11.2" : "10.5"}
                      fontWeight={esHover ? "800" : "600"}
                      fill={esHover ? "#1D4ED8" : "#0F172A"}
                    >
                      {pt.etiquetaEje}
                    </text>
                  </g>
                );
              })}
            </svg>
            </div>
            )}
          </div>

          {/* PANEL DERECHO: TABLA ESTRUCTURADA "FECHAS DE CORTE (EXCEL / SISMA)" */}
          <div className="xl:col-span-4">
            <div
              className="rounded-xl p-3.5 border space-y-2"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="text-[13px] font-bold"
                  style={{ color: "#0F172A" }}
                >
                  Fechas de Corte (Excel / SISMA)
                </div>
                {esCorteCongeladoAyer && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Congelado ayer
                  </span>
                )}
              </div>

              <div className="grid grid-cols-12 text-[10.5px] font-semibold pb-1 border-b" style={{ color: "#475569", borderColor: "#E2ECF8" }}>
                <div className="col-span-5">Fecha de Corte</div>
                <div className="col-span-4 text-right">Cartera Total</div>
                <div className="col-span-3 text-right">Cartera Real</div>
              </div>

              <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                {puntosTablaCortes.map((c, idx) => {
                  const esUltimaViva =
                    c.esVivo && idx === puntosTablaCortes.length - 1;
                  const esActivo = c.idxCorte === indiceCorteActivo;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        seleccionarCorteYSincronizar(c.idxCorte, c.fechaRaw);
                        setModoTendenciaCartera("CORTES");
                      }}
                      title="Clic para seleccionar este corte y verlo en la gráfica"
                      className={`grid grid-cols-12 items-center py-1.5 px-2 text-[11px] cursor-pointer transition ${
                        esUltimaViva ? "rounded-full mt-1" : "rounded-md hover:bg-slate-50"
                      }`}
                      style={{
                        backgroundColor: esUltimaViva
                          ? "#15803D"
                          : esActivo
                          ? "#EFF6FF"
                          : "transparent",
                        color: esUltimaViva ? "#FFFFFF" : "#0F172A",
                        fontWeight: esUltimaViva || esActivo ? 700 : 600,
                      }}
                    >
                      <div className="col-span-5 truncate">{c.etiquetaTabla}</div>
                      <div className="col-span-4 text-right font-mono font-bold">
                        {formatMillones(c.carteraTotal)}
                      </div>
                      <div className="col-span-3 text-right font-mono font-bold">
                        {realMillones(c.totalCarteraReal)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE DATOS INFERIOR SINCRONIZADA CON EL CURSOR */}
        {puntosGrafica.length > 0 && (
          <div
            className="pt-2 border-t space-y-2"
            style={{ borderColor: "#E2ECF8" }}
            onMouseLeave={() => setHoverTendenciaIdx(null)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-[#0E245E]">
                Tabla Detallada de Evolución ({modoTendenciaCartera === "MES" ? `Cierres Mensuales ${anioTendencia}` : "Fechas de Corte"}) — Pasa el cursor sobre cualquier columna o punto de la gráfica
              </span>
              <span className="text-[#64748B]">
                * Mes actual conectado al cierre congelado del día anterior ({formatearISOaLatam(ayerIsoRef)})
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#E2ECF8" }}>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC" }}>
                    <th className="p-2 text-left font-extrabold text-[#0E245E] sticky left-0 bg-[#F8FAFC] border-b border-r min-w-[155px]" style={{ borderColor: "#E2ECF8" }}>
                      Indicador Contable
                    </th>
                    {puntosGrafica.map((pt, i) => {
                      const colActiva = hoverTendenciaIdx === i;
                      return (
                        <th
                          key={`th-tend-${pt.id}`}
                          onMouseEnter={() => setHoverTendenciaIdx(i)}
                          className="p-2 text-right font-extrabold border-b cursor-pointer transition-colors min-w-[76px]"
                          style={{
                            borderColor: "#E2ECF8",
                            backgroundColor: colActiva ? "#DBEAFE" : pt.esCongeladoAyer ? "#ECFDF5" : "#F8FAFC",
                            color: colActiva ? "#1D4ED8" : pt.esCongeladoAyer ? "#047857" : "#0E245E",
                          }}
                          title={`Corte: ${pt.fechaDetalle}`}
                        >
                          <div>{pt.etiquetaEje}</div>
                          <div className="text-[9.5px] font-normal opacity-80">
                            {pt.fechaDetalle.slice(0, 10)}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                  <tr>
                    <td className="p-2 font-bold text-[#1D58D8] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                      Cartera Total
                    </td>
                    {puntosGrafica.map((pt, i) => (
                      <td
                        key={`td-tot-${pt.id}`}
                        onMouseEnter={() => setHoverTendenciaIdx(i)}
                        className="p-2 text-right font-mono font-bold text-[#0E245E] cursor-pointer transition-colors"
                        style={{ backgroundColor: hoverTendenciaIdx === i ? "#EFF6FF" : "transparent" }}
                        title={formatCOP(pt.carteraTotal)}
                      >
                        {formatMillones(pt.carteraTotal)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-[#0369A1] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                      Corriente (&lt; 60d)
                    </td>
                    {puntosGrafica.map((pt, i) => (
                      <td
                        key={`td-corr-${pt.id}`}
                        onMouseEnter={() => setHoverTendenciaIdx(i)}
                        className="p-2 text-right font-mono text-[#0369A1] cursor-pointer transition-colors"
                        style={{ backgroundColor: hoverTendenciaIdx === i ? "#EFF6FF" : "transparent" }}
                        title={formatCOP(pt.carteraCorriente)}
                      >
                        {formatMillones(pt.carteraCorriente)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-[#B91C1C] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                      Vencida (&gt;= 60d)
                    </td>
                    {puntosGrafica.map((pt, i) => (
                      <td
                        key={`td-venc-${pt.id}`}
                        onMouseEnter={() => setHoverTendenciaIdx(i)}
                        className="p-2 text-right font-mono text-[#B91C1C] cursor-pointer transition-colors"
                        style={{ backgroundColor: hoverTendenciaIdx === i ? "#EFF6FF" : "transparent" }}
                        title={formatCOP(pt.carteraVencida)}
                      >
                        {formatMillones(pt.carteraVencida)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-[#92400E] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                      (−) Giros por Cruzar
                    </td>
                    {puntosGrafica.map((pt, i) => (
                      <td
                        key={`td-gir-${pt.id}`}
                        onMouseEnter={() => setHoverTendenciaIdx(i)}
                        className="p-2 text-right font-mono text-[#92400E] cursor-pointer transition-colors"
                        style={{ backgroundColor: hoverTendenciaIdx === i ? "#EFF6FF" : "transparent" }}
                        title={formatCOP(pt.anticiposPorCruzar)}
                      >
                        {formatMillones(pt.anticiposPorCruzar)}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: "#F0FDF4" }}>
                    <td className="p-2 font-extrabold text-[#047857] sticky left-0 bg-[#F0FDF4] border-r" style={{ borderColor: "#E2ECF8" }}>
                      (=) Cartera Real Neta
                    </td>
                    {puntosGrafica.map((pt, i) => (
                      <td
                        key={`td-real-${pt.id}`}
                        onMouseEnter={() => setHoverTendenciaIdx(i)}
                        className="p-2 text-right font-mono font-extrabold text-[#047857] cursor-pointer transition-colors"
                        style={{ backgroundColor: hoverTendenciaIdx === i ? "#DCFCE7" : "#F0FDF4" }}
                        title={realCOP(pt.totalCarteraReal)}
                      >
                        {realMillones(pt.totalCarteraReal)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-[#475569] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                      % Cartera Vencida
                    </td>
                    {puntosGrafica.map((pt, i) => {
                      const pctV = pt.carteraTotal > 0 ? (pt.carteraVencida / pt.carteraTotal) * 100 : 0;
                      return (
                        <td
                          key={`td-pct-${pt.id}`}
                          onMouseEnter={() => setHoverTendenciaIdx(i)}
                          className="p-2 text-right font-mono font-semibold text-[#475569] cursor-pointer transition-colors"
                          style={{ backgroundColor: hoverTendenciaIdx === i ? "#EFF6FF" : "transparent" }}
                        >
                          {pctV.toFixed(1)}%
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to get display value of a cell for column filter menu
  const obtenerValorCelda = (row: Record<string, unknown>, colKey: string): string => {
    if (colKey === "tipo") {
      return normalizarEtiquetaTipo(String(row.tipo || ""));
    }
    if (colKey === "responsable" || colKey === "facturador") {
      return normalizarResponsableReal(String(row[colKey] || ""), String(row.empresa || ""));
    }
    if (colKey === "fechaRadicacion") {
      // Si no hay fecha de radicacion pero alguien escribio algo en esa
      // casilla ("NO RADICA", "PDT"...), se muestra ESO. Antes se caia a la
      // fecha de factura, que es otra cosa: una factura sin radicar se veia
      // con fecha de radicacion. La nota dice la verdad; la otra fecha miente.
      const nota = (row as Record<string, unknown>).fechaRadicacionNota;
      if (!row.fechaRadicacion && nota) return String(nota);
      return String(row.fechaRadicacion || "-");
    }
    if (colKey === "facturaReemplaza") {
      return String(row.facturaReemplaza || "PENDIENTE");
    }
    if (
      colKey === "valorRadicado" ||
      colKey === "valorGlosaDevolucion" ||
      colKey === "valorFactura" ||
      colKey === "valorGlosado" ||
      colKey === "valorServicio"
    ) {
      return formatCOP(Number(row[colKey] || 0));
    }
    if (colKey === "subtabla") {
      const st = String(row.subtabla || "");
      if (st === "ACEPTADA_NOTA_CREDITO") return "Aceptada (NC)";
      if (st === "RESPONDIDA_NO_ACEPTADA") return "Respondida";
      return "En Gestión";
    }
    const v = row[colKey];
    return v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "-";
  };

  // Apply common column-level exclusions & text filters + sorting
  const aplicarFiltrosColumnaYOrden = <T extends Record<string, unknown>>(lista: T[]): T[] => {
    const filtrada = lista.filter((r) => {
      for (const [colKey, excluidos] of Object.entries(valoresExcluidosPorCol)) {
        if (excluidos && excluidos.length > 0) {
          const valStr = obtenerValorCelda(r, colKey);
          if (excluidos.includes(valStr)) return false;
        }
      }
      for (const [colKey, txt] of Object.entries(busquedaTextoPorCol)) {
        if (txt && txt.trim() !== "") {
          const valStr = obtenerValorCelda(r, colKey).toLowerCase();
          if (!valStr.includes(txt.toLowerCase().trim())) return false;
        }
      }
      return true;
    });

    if (!ordenColumna) return filtrada;
    const { campo, dir } = ordenColumna;
    return [...filtrada].sort((a, b) => {
      const va = a[campo];
      const vb = b[campo];
      if (typeof va === "number" || typeof vb === "number") {
        return dir === "asc"
          ? (Number(va) || 0) - (Number(vb) || 0)
          : (Number(vb) || 0) - (Number(va) || 0);
      }
      return dir === "asc"
        ? String(va ?? "").localeCompare(String(vb ?? ""))
        : String(vb ?? "").localeCompare(String(va ?? ""));
    });
  };

  // Mapa determinístico de cruces clínicos (cf_pendientes_facturar) + contables (SISMA en vivo) por factura FCOE
  const mapasCrucePorFactura = useMemo(() => {
    const clinicoMap = new Map<
      string,
      {
        pacientes: string[];
        docs: string[];
        medicos: string[];
        cups: string[];
        descripciones: string[];
        contratos: string[];
        ufs: string[];
      }
    >();
    const addUniq = (arr: string[], v: string) => {
      if (v && !arr.includes(v)) arr.push(v);
    };

    for (const p of pendientes) {
      const facts = p.facturaAsociada
        ? [claveFacturaNorm(p.facturaAsociada)]
        : extraerFacturasFcoe(p.observaciones);
      if (facts.length === 0) continue;
      const pac = limpiarNombrePersona(p.pacienteNombre);
      const doc = String(p.pacienteDoc || "").trim();
      const med = limpiarNombrePersona(p.medicoNombre || p.medico);
      for (const fk of facts) {
        if (!fk) continue;
        const prev = clinicoMap.get(fk) || {
          pacientes: [],
          docs: [],
          medicos: [],
          cups: [],
          descripciones: [],
          contratos: [],
          ufs: [],
        };
        addUniq(prev.pacientes, pac);
        addUniq(prev.docs, doc);
        addUniq(prev.medicos, med);
        addUniq(prev.cups, String(p.cups || "").trim());
        addUniq(prev.descripciones, String(p.descripcion || "").trim());
        addUniq(prev.contratos, String(p.contrato || "").trim());
        addUniq(prev.ufs, String(p.unidadFuncional || "").trim());
        clinicoMap.set(fk, prev);
      }
    }

    const sismaMap = new Map<string, FacturaSismaVivaRow>();
    const fuentesSisma = [
      datosSismaVivo?.facturasAbiertas || [],
      (datosSismaCompletaRef.current as { facturasAbiertas?: FacturaSismaVivaRow[] } | null)?.facturasAbiertas || [],
    ];
    for (const lista of fuentesSisma) {
      for (const f of lista) {
        const k = claveFacturaNorm(f.factura);
        if (k && !sismaMap.has(k)) sismaMap.set(k, f);
      }
    }

    return { clinicoMap, sismaMap };
  }, [pendientes, datosSismaVivo]);

  const cruzarFilaMaestra = (input: {
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
    unidadFuncional?: string;
    contrato?: string;
    descripcion?: string;
    motivoTexto?: string;
  }) => {
    const fk = input.factura ? claveFacturaNorm(input.factura) : "";
    const clin = fk ? mapasCrucePorFactura.clinicoMap.get(fk) : undefined;
    const sisma = fk ? mapasCrucePorFactura.sismaMap.get(fk) : undefined;

    const empInfo = homologarEmpresaYOrigen({
      empresa: input.empresa || sisma?.empresaHomologada,
      empresaOriginal: input.empresaOriginal || sisma?.razonSocialOriginal,
      contrato: input.contrato || clin?.contratos[0],
      nit: input.nit || sisma?.nit,
      descripcionCuenta: sisma?.descripcionCuenta,
      tipoFactura: sisma?.tipoFactura,
    });

    const cupsFinal = input.cups || (clin ? clin.cups.join(", ") : "");
    const descClin = input.descripcion || (clin ? clin.descripciones.join(" · ") : "");
    const atInfo = clasificarAtencionYSede({
      esMutual: empInfo.esMutual,
      cups: clin?.cups[0] || input.cups,
      unidadFuncional: input.unidadFuncional || clin?.ufs[0],
      descripcion: descClin,
      contrato: input.contrato || clin?.contratos[0],
      cuentaContable: sisma?.cuenta,
      descripcionCuenta: sisma?.descripcionCuenta,
      tipoFactura: sisma?.tipoFactura,
      motivoTexto: input.motivoTexto,
    });

    const tipoGrupoFinal =
      input.tipoGrupo && input.tipoGrupo !== "SIN_DETALLE"
        ? input.tipoGrupo
        : atInfo.tipoGrupo !== "SIN_DETALLE"
        ? atInfo.tipoGrupo
        : sisma?.tipoGrupo || atInfo.tipoGrupo;

    const tipoAtencionFinal =
      input.tipoAtencion && input.tipoGrupo !== "SIN_DETALLE"
        ? input.tipoAtencion
        : atInfo.tipoGrupo !== "SIN_DETALLE"
        ? atInfo.tipoAtencion
        : sisma?.tipoAtencion || atInfo.tipoAtencion;

    return {
      nit: input.nit || sisma?.nit || empInfo.nit,
      empresaHomologada: input.empresaHomologada || sisma?.empresaHomologada || empInfo.empresaHomologada,
      esMutual: empInfo.esMutual,
      deDondeEs: input.deDondeEs || sisma?.deDondeEs || empInfo.deDondeEs,
      sedeGrupo: input.sedeGrupo || atInfo.sedeGrupo,
      sede:
        tipoGrupoFinal === "CIRUGIA"
          ? empInfo.esMutual
            ? "Sede 2 · Quirófano"
            : "Sede 1 · Quirófano"
          : input.sede || atInfo.sede,
      tipoGrupo: tipoGrupoFinal,
      tipoAtencion: tipoAtencionFinal,
      pacienteNombre:
        input.pacienteNombre ||
        (clin && clin.pacientes.length > 0 ? clin.pacientes.join(" / ") : "") ||
        sisma?.pacienteNombre ||
        "",
      pacienteDoc:
        input.pacienteDoc ||
        (clin && clin.docs.length > 0 ? clin.docs.join(" / ") : "") ||
        sisma?.pacienteDoc ||
        "",
      medicoNombre:
        input.medicoNombre ||
        (clin && clin.medicos.length > 0 ? clin.medicos.join(" / ") : ""),
      cups: cupsFinal,
      servicioDescripcion: descClin,
      fechaFacturaSisma: sisma?.fechaFactura || "",
      fechaRadicacionSisma: sisma?.fechaRadicacion || "",
      saldoSisma: sisma?.saldo,
      diasSisma: sisma?.dias,
      descripcionCuentaSisma: sisma?.descripcionCuenta || "",
    };
  };

  const filtrarBaseAnuladas = (lista: AnuladaRow[]) => {
    const q = busqueda.toLowerCase().trim();
    const base = lista.filter((r) => {
      const respReal = normalizarResponsableReal(r.responsable, r.empresa);
      if (
        !cumpleFiltrosFrecuencias(
          r.anio,
          r.empresa,
          respReal,
          r.fechaRadicacion || r.fechaFactura || r.periodo,
          r.empresaOriginal
        )
      ) {
        return false;
      }
      if (aniosFrecSel.length === 0 && filtroAnio !== "TODOS" && r.anio !== filtroAnio) {
        return false;
      }
      if (
        empresasFrecSel.length === 0 &&
        filtroEmpresa !== "TODAS" &&
        !coincideEmpresaSeleccionada(r.empresa, r.empresaOriginal || r.empresa, [
          filtroEmpresa,
        ])
      ) {
        return false;
      }
      if (filtroTipo !== "TODOS" && !normalizarEtiquetaTipo(r.tipo).includes(filtroTipo)) return false;
      if (filtroEstado !== "TODOS") {
        const tieneReemplazo = Boolean(r.facturaReemplaza && r.facturaReemplaza.trim() !== "");
        if (filtroEstado === "REEMPLAZADA" && !tieneReemplazo) return false;
        if (filtroEstado === "PENDIENTE" && tieneReemplazo) return false;
      }
      if (
        responsablesFrecSel.length === 0 &&
        filtroResponsable !== "TODAS" &&
        respReal !== filtroResponsable
      ) {
        return false;
      }
      const cr = cruzarFilaMaestra({ ...r, motivoTexto: r.motivo });
      if (filtroSedeTop !== "TODAS" && cr.sedeGrupo !== filtroSedeTop) return false;
      if (filtroAtencionTop !== "TODAS" && cr.tipoGrupo !== filtroAtencionTop) return false;
      if (q) {
        const texto = `${r.factura} ${r.empresa} ${cr.empresaHomologada} ${cr.nit} ${cr.deDondeEs} ${cr.sede} ${cr.tipoAtencion} ${cr.pacienteNombre} ${cr.medicoNombre} ${r.motivo} ${r.facturaReemplaza} ${respReal} ${r.revisionFinanciera} ${r.rips}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
    return aplicarFiltrosColumnaYOrden(base as unknown as Record<string, unknown>[]) as unknown as AnuladaRow[];
  };

  const anuladasFiltradas = useMemo(
    () => filtrarBaseAnuladas(anuladas),
    [
      anuladas,
      filtroAnio,
      filtroEmpresa,
      filtroTipo,
      filtroEstado,
      filtroResponsable,
      busqueda,
      valoresExcluidosPorCol,
      busquedaTextoPorCol,
      ordenColumna,
      aniosFrecSel,
      mesesFrecSel,
      empresasFrecSel,
      responsablesFrecSel,
      incluirMutual,
      diasFiltroActivo,
      diasDesde,
      diasHasta,
      diasSemanaSel,
      filtroSedeTop,
      filtroAtencionTop,
      mapasCrucePorFactura,
    ]
  );

  const legalizadasFiltradas = useMemo(
    () => filtrarBaseAnuladas(legalizadas),
    [
      legalizadas,
      filtroAnio,
      filtroEmpresa,
      filtroTipo,
      filtroEstado,
      filtroResponsable,
      busqueda,
      valoresExcluidosPorCol,
      busquedaTextoPorCol,
      ordenColumna,
      aniosFrecSel,
      mesesFrecSel,
      empresasFrecSel,
      responsablesFrecSel,
      incluirMutual,
      diasFiltroActivo,
      diasDesde,
      diasHasta,
      diasSemanaSel,
      filtroSedeTop,
      filtroAtencionTop,
      mapasCrucePorFactura,
    ]
  );

  const facturasBaseFiltradas = useMemo(
    () => filtrarBaseAnuladas(facturasBaseDb),
    [
      facturasBaseDb,
      filtroAnio,
      filtroEmpresa,
      filtroTipo,
      filtroEstado,
      filtroResponsable,
      busqueda,
      valoresExcluidosPorCol,
      busquedaTextoPorCol,
      ordenColumna,
      aniosFrecSel,
      mesesFrecSel,
      empresasFrecSel,
      responsablesFrecSel,
      incluirMutual,
      diasFiltroActivo,
      diasDesde,
      diasHasta,
      diasSemanaSel,
      filtroSedeTop,
      filtroAtencionTop,
      mapasCrucePorFactura,
    ]
  );

  const glosasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    const base = glosas.filter((r) => {
      const facReal = normalizarResponsableReal(r.facturador, r.empresa);
      if (
        !cumpleFiltrosFrecuencias(
          r.anio,
          r.empresa,
          facReal,
          r.fechaNotificacionGlosa || r.fechaRadicacion || r.fechaFactura || r.periodo,
          r.empresaOriginal
        )
      ) {
        return false;
      }
      if (aniosFrecSel.length === 0 && filtroAnio !== "TODOS" && r.anio !== filtroAnio) {
        return false;
      }
      if (
        empresasFrecSel.length === 0 &&
        filtroEmpresa !== "TODAS" &&
        !coincideEmpresaSeleccionada(r.empresa, r.empresaOriginal || r.empresa, [
          filtroEmpresa,
        ])
      ) {
        return false;
      }
      if (
        responsablesFrecSel.length === 0 &&
        filtroResponsable !== "TODAS" &&
        facReal !== filtroResponsable
      ) {
        return false;
      }
      if (filtroEstado !== "TODOS") {
        if (filtroEstado === "REEMPLAZADA" && r.subtabla !== "RESPONDIDA_NO_ACEPTADA") return false;
        if (filtroEstado === "PENDIENTE" && r.subtabla === "RESPONDIDA_NO_ACEPTADA") return false;
      }
      const cr = cruzarFilaMaestra({ ...r, motivoTexto: `${r.motivoGlosa} ${r.observacionInterna}` });
      if (filtroSedeTop !== "TODAS" && cr.sedeGrupo !== filtroSedeTop) return false;
      if (filtroAtencionTop !== "TODAS" && cr.tipoGrupo !== filtroAtencionTop) return false;
      if (q) {
        const texto = `${r.factura} ${r.empresa} ${cr.empresaHomologada} ${cr.nit} ${cr.deDondeEs} ${cr.sede} ${cr.tipoAtencion} ${cr.pacienteNombre} ${cr.medicoNombre} ${r.motivoGlosa} ${r.observacionInterna} ${r.notaCredito} ${facReal} ${r.responsableAceptacion || ""}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
    return aplicarFiltrosColumnaYOrden(base as unknown as Record<string, unknown>[]) as unknown as GlosaRow[];
  }, [
    glosas,
    filtroAnio,
    filtroEmpresa,
    filtroEstado,
    filtroResponsable,
    busqueda,
    valoresExcluidosPorCol,
    busquedaTextoPorCol,
    ordenColumna,
    aniosFrecSel,
    mesesFrecSel,
    empresasFrecSel,
    responsablesFrecSel,
    incluirMutual,
    diasFiltroActivo,
    diasDesde,
    diasHasta,
    diasSemanaSel,
    filtroSedeTop,
    filtroAtencionTop,
    mapasCrucePorFactura,
  ]);

  const pendientesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    const base = pendientes.filter((r) => {
      const respReal = normalizarResponsableReal(r.responsable, r.empresa);
      if (
        !cumpleFiltrosFrecuencias(
          r.anio,
          r.empresa,
          respReal,
          r.fechaServicio,
          r.empresaOriginal
        )
      ) {
        return false;
      }
      if (aniosFrecSel.length === 0 && filtroAnio !== "TODOS" && r.anio !== filtroAnio) {
        return false;
      }
      if (
        empresasFrecSel.length === 0 &&
        filtroEmpresa !== "TODAS" &&
        !coincideEmpresaSeleccionada(r.empresa, r.empresaOriginal || r.empresa, [
          filtroEmpresa,
        ])
      ) {
        return false;
      }
      if (
        responsablesFrecSel.length === 0 &&
        filtroResponsable !== "TODAS" &&
        respReal !== filtroResponsable
      ) {
        return false;
      }
      if (filtroEstado !== "TODOS") {
        if (filtroEstado === "REEMPLAZADA" && r.estado !== "FACTURADO") return false;
        if (filtroEstado === "PENDIENTE" && r.estado === "FACTURADO") return false;
      }
      const cr = cruzarFilaMaestra({
        ...r,
        factura: r.facturaAsociada,
        cups: r.cups,
        unidadFuncional: r.unidadFuncional,
        contrato: r.contrato,
        descripcion: r.descripcion,
      });
      if (filtroSedeTop !== "TODAS" && cr.sedeGrupo !== filtroSedeTop) return false;
      if (filtroAtencionTop !== "TODAS" && cr.tipoGrupo !== filtroAtencionTop) return false;
      if (q) {
        const texto = `${r.cups} ${r.descripcion} ${r.empresa} ${cr.empresaHomologada} ${cr.deDondeEs} ${cr.sede} ${cr.tipoAtencion} ${r.pacienteNombre || ""} ${r.pacienteDoc || ""} ${r.medico} ${r.observaciones} ${respReal}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
    return aplicarFiltrosColumnaYOrden(base as unknown as Record<string, unknown>[]) as unknown as PendienteRow[];
  }, [
    pendientes,
    filtroAnio,
    filtroEmpresa,
    filtroEstado,
    filtroResponsable,
    busqueda,
    valoresExcluidosPorCol,
    busquedaTextoPorCol,
    ordenColumna,
    aniosFrecSel,
    mesesFrecSel,
    empresasFrecSel,
    responsablesFrecSel,
    incluirMutual,
    diasFiltroActivo,
    diasDesde,
    diasHasta,
    diasSemanaSel,
    filtroSedeTop,
    filtroAtencionTop,
    mapasCrucePorFactura,
  ]);

  const facturasSismaFiltradas = useMemo(() => {
    const origen = datosSismaVivo?.facturasAbiertas || [];
    const q = busqueda.toLowerCase().trim();
    return origen.filter((f) => {
      const cr = cruzarFilaMaestra({
        factura: f.factura,
        empresa: f.empresaHomologada,
        empresaOriginal: f.razonSocialOriginal,
        nit: f.nit,
        deDondeEs: f.deDondeEs,
        sede: f.sede,
        sedeGrupo: f.sedeGrupo,
        tipoAtencion: f.tipoAtencion,
        tipoGrupo: f.tipoGrupo,
        pacienteNombre: f.pacienteNombre,
        pacienteDoc: f.pacienteDoc,
      });
      const anioFact = (f.fechaFactura || "").slice(0, 4);
      if (
        !cumpleFiltrosFrecuencias(
          anioFact,
          f.empresaCorta,
          f.responsable,
          f.fechaFactura || f.fechaRadicacion,
          f.razonSocialOriginal
        )
      ) {
        return false;
      }
      if (filtroSedeTop !== "TODAS" && cr.sedeGrupo !== filtroSedeTop) return false;
      if (filtroAtencionTop !== "TODAS" && cr.tipoGrupo !== filtroAtencionTop) return false;
      if (q) {
        const texto = `${f.factura} ${cr.empresaHomologada} ${f.nit} ${cr.deDondeEs} ${cr.sede} ${cr.tipoAtencion} ${cr.pacienteNombre} ${cr.medicoNombre} ${f.descripcionCuenta} ${f.responsable}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [
    datosSismaVivo,
    busqueda,
    filtroSedeTop,
    filtroAtencionTop,
    aniosFrecSel,
    mesesFrecSel,
    empresasFrecSel,
    responsablesFrecSel,
    incluirMutual,
    diasFiltroActivo,
    diasDesde,
    diasHasta,
    diasSemanaSel,
    filtroEmpresa,
    filtroAnio,
    filtroResponsable,
    mapasCrucePorFactura,
  ]);

  const listaActivaCompleta = useMemo(() => {
    if (tabActiva === "cartera_viva") return (datosSismaVivo?.facturasAbiertas || []) as unknown as Record<string, unknown>[];
    if (tabActiva === "anuladas") return anuladas as unknown as Record<string, unknown>[];
    if (tabActiva === "legalizadas") return legalizadas as unknown as Record<string, unknown>[];
    if (tabActiva === "glosas") return glosas as unknown as Record<string, unknown>[];
    return pendientes as unknown as Record<string, unknown>[];
  }, [tabActiva, datosSismaVivo, anuladas, legalizadas, glosas, pendientes]);

  const listaActivaPaginada = useMemo(() => {
    const start = (paginaActual - 1) * filasPorPagina;
    const end = start + filasPorPagina;
    if (tabActiva === "cartera_viva") {
      return {
        total: facturasSismaFiltradas.length,
        totalPaginas: Math.max(1, Math.ceil(facturasSismaFiltradas.length / filasPorPagina)),
        items: facturasSismaFiltradas.slice(start, end),
      };
    }
    if (tabActiva === "anuladas") {
      return {
        total: anuladasFiltradas.length,
        totalPaginas: Math.max(1, Math.ceil(anuladasFiltradas.length / filasPorPagina)),
        items: anuladasFiltradas.slice(start, end),
      };
    }
    if (tabActiva === "legalizadas") {
      return {
        total: legalizadasFiltradas.length,
        totalPaginas: Math.max(1, Math.ceil(legalizadasFiltradas.length / filasPorPagina)),
        items: legalizadasFiltradas.slice(start, end),
      };
    }
    if (tabActiva === "glosas") {
      return {
        total: glosasFiltradas.length,
        totalPaginas: Math.max(1, Math.ceil(glosasFiltradas.length / filasPorPagina)),
        items: glosasFiltradas.slice(start, end),
      };
    }
    return {
      total: pendientesFiltradas.length,
      totalPaginas: Math.max(1, Math.ceil(pendientesFiltradas.length / filasPorPagina)),
      items: pendientesFiltradas.slice(start, end),
    };
  }, [tabActiva, facturasSismaFiltradas, anuladasFiltradas, legalizadasFiltradas, glosasFiltradas, pendientesFiltradas, paginaActual]);

  const maxValorGrafica = useMemo(() => {
    return Math.max(...listaCortesActiva.map((c) => c.carteraTotal), 1);
  }, [listaCortesActiva]);

  // Unique values for the currently open column filter dropdown
  const valoresUnicosColumnaAbierta = useMemo(() => {
    if (!colMenuAbierto) return [];
    const setVals = new Set<string>();
    listaActivaCompleta.forEach((row) => {
      setVals.add(obtenerValorCelda(row, colMenuAbierto));
    });
    const arr = Array.from(setVals).sort((a, b) => a.localeCompare(b));
    if (!busquedaMenuCol.trim()) return arr.slice(0, 60);
    const q = busquedaMenuCol.toLowerCase().trim();
    return arr.filter((v) => v.toLowerCase().includes(q)).slice(0, 60);
  }, [colMenuAbierto, listaActivaCompleta, busquedaMenuCol]);

  const toggleValorColumna = (colKey: string, val: string) => {
    setValoresExcluidosPorCol((prev) => {
      const actual = prev[colKey] || [];
      const existe = actual.includes(val);
      const next = existe ? actual.filter((x) => x !== val) : [...actual, val];
      return { ...prev, [colKey]: next };
    });
    setPaginaActual(1);
  };

  // Render a single table header cell with the Excel-style `▾` dropdown popover
  const renderCeldaHeaderConFiltro = (col: ColDef, idx: number, totalCols: number) => {
    const abierto = colMenuAbierto === col.key;
    const excluidos = valoresExcluidosPorCol[col.key] || [];
    const txtFiltro = busquedaTextoPorCol[col.key] || "";
    const tieneFiltroCol =
      excluidos.length > 0 ||
      txtFiltro.trim() !== "" ||
      (ordenColumna && ordenColumna.campo === col.key);
    const alinearDerecha = idx >= totalCols - 4;

    return (
      <th
        key={col.key}
        style={{
          width: col.expand ? "100%" : "1%",
          whiteSpace: "nowrap",
        }}
        className={`relative px-2 py-2.5 font-bold select-none ${
          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (abierto) {
              setColMenuAbierto(null);
            } else {
              setColMenuAbierto(col.key);
              setBusquedaMenuCol(busquedaTextoPorCol[col.key] || "");
            }
          }}
          className={`inline-flex items-center gap-1 font-bold cursor-pointer hover:opacity-90 whitespace-nowrap ${
            col.align === "right" ? "justify-end w-full" : ""
          }`}
          style={{ color: tieneFiltroCol ? "#93C5FD" : "#FFFFFF" }}
        >
          <span>{col.label}</span>
          <span className="text-[10px] opacity-90">
            {ordenColumna?.campo === col.key
              ? ordenColumna.dir === "asc"
                ? "▲"
                : "▼"
              : "▾"}
          </span>
        </button>

        {abierto && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setColMenuAbierto(null)}
            />
            <div
              className={`absolute top-full mt-1 w-56 rounded-xl shadow-2xl border p-2.5 z-40 text-left font-normal space-y-2 ${
                alinearDerecha ? "right-0" : "left-0"
              }`}
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#CBD5E1",
                color: "#0E245E",
                whiteSpace: "normal",
              }}
            >
              <div className="space-y-1 pb-2 border-b" style={{ borderColor: "#E2ECF8" }}>
                <button
                  type="button"
                  onClick={() => {
                    setOrdenColumna({ campo: col.key, dir: "asc" });
                    setColMenuAbierto(null);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor:
                      ordenColumna?.campo === col.key && ordenColumna.dir === "asc"
                        ? "#EFF6FF"
                        : "transparent",
                    color: "#0E245E",
                  }}
                >
                  <span>↓↑</span>
                  <span>Ordenar A-Z (Menor a mayor)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrdenColumna({ campo: col.key, dir: "desc" });
                    setColMenuAbierto(null);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor:
                      ordenColumna?.campo === col.key && ordenColumna.dir === "desc"
                        ? "#EFF6FF"
                        : "transparent",
                    color: "#0E245E",
                  }}
                >
                  <span>↑↓</span>
                  <span>Ordenar Z-A (Mayor a menor)</span>
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={busquedaMenuCol}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBusquedaMenuCol(val);
                    setBusquedaTextoPorCol((prev) => ({ ...prev, [col.key]: val }));
                    setPaginaActual(1);
                  }}
                  placeholder="🔍 Busca..."
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                />
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                <label
                  onClick={() => {
                    setValoresExcluidosPorCol((prev) => ({ ...prev, [col.key]: [] }));
                    setBusquedaTextoPorCol((prev) => ({ ...prev, [col.key]: "" }));
                    setBusquedaMenuCol("");
                    setPaginaActual(1);
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs font-bold"
                >
                  <input
                    type="checkbox"
                    checked={excluidos.length === 0}
                    onChange={() => {}}
                    className="rounded cursor-pointer"
                  />
                  <span>Todas</span>
                </label>

                {valoresUnicosColumnaAbierta.map((val) => {
                  const marcado = !excluidos.includes(val);
                  return (
                    <label
                      key={val}
                      onClick={() => toggleValorColumna(col.key, val)}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs truncate"
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => {}}
                        className="rounded cursor-pointer shrink-0"
                      />
                      <span className="truncate" title={val}>
                        {val}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-1.5 border-t" style={{ borderColor: "#E2ECF8" }}>
                <button
                  type="button"
                  onClick={() => {
                    setValoresExcluidosPorCol((prev) => ({ ...prev, [col.key]: [] }));
                    setBusquedaTextoPorCol((prev) => ({ ...prev, [col.key]: "" }));
                    setBusquedaMenuCol("");
                    if (ordenColumna?.campo === col.key) setOrdenColumna(null);
                    setColMenuAbierto(null);
                  }}
                  className="text-[11px] font-bold cursor-pointer"
                  style={{ color: "#BE123C" }}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setColMenuAbierto(null)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                  style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
                >
                  Listo
                </button>
              </div>
            </div>
          </>
        )}
      </th>
    );
  };

  // CSV / File Upload handler
  const manejarArchivoSubido = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || "");
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        mostrarMensaje("El archivo seleccionado no contiene filas válidas.");
        return;
      }

      const sep = lines[0].includes(";") ? ";" : ",";
      const rows = lines.slice(1).map((line) =>
        line.split(sep).map((cell) => cell.replace(/^"|"$/g, "").trim())
      );

      if (tipoArchivoCarga === "VENCIMIENTO") {
        let sumaCorriente = 0;
        let sumaVencida = 0;
        rows.forEach((cols) => {
          const nums = cols
            .map((c) => Number(c.replace(/[^0-9.-]/g, "")))
            .filter((n) => !isNaN(n) && n > 1000);
          if (nums.length >= 2) {
            sumaCorriente += nums[0];
            sumaVencida += nums[1];
          }
        });
        if (sumaCorriente > 0 || sumaVencida > 0) {
          const total = sumaCorriente + sumaVencida;
          const anticipos = corteSeleccionado.anticiposPorCruzar;
          const nuevo: CorteSismaBack = {
            fechaCorte: new Date().toLocaleDateString("es-CO"),
            modalidad: modalidadSisma === "TODAS" ? "Todas las Empresas" : "Modalidad PYP",
            carteraCorriente: sumaCorriente,
            carteraVencida: sumaVencida,
            carteraTotal: total,
            facturasPendientesRadicar: corteSeleccionado.facturasPendientesRadicar,
            glosasPendientesGestionar: corteSeleccionado.glosasPendientesGestionar,
            anticiposPorCruzar: anticipos,
            totalCarteraReal: total - anticipos,
          };
          if (modalidadSisma === "TODAS") {
            const next = [...cortesTodas, nuevo];
            setCortesTodas(next);
            setIndiceCorteActivo(next.length - 1);
            persistAll(anuladas, legalizadas, glosas, pendientes, next, cortesPyp);
          } else {
            const next = [...cortesPyp, nuevo];
            setCortesPyp(next);
            setIndiceCorteActivo(next.length - 1);
            persistAll(anuladas, legalizadas, glosas, pendientes, cortesTodas, next);
          }
          mostrarMensaje(`Archivo "${file.name}" procesado: nuevo corte de Cartera actualizado.`);
        } else {
          mostrarMensaje(`Archivo "${file.name}" leído (${rows.length} filas). Puedes ajustar el corte manual.`);
          setMostrarModalCorte(true);
        }
      } else if (tipoArchivoCarga === "GIROS") {
        let sumaGiros = 0;
        rows.forEach((cols) => {
          const joined = cols.join(" ");
          if (
            joined.includes("1301250602") ||
            joined.includes("2501010602") ||
            joined.includes("2501010607") ||
            cols.length >= 2
          ) {
            const nums = cols
              .map((c) => Number(c.replace(/[^0-9.-]/g, "")))
              .filter((n) => !isNaN(n) && n > 1000);
            if (nums.length > 0) {
              sumaGiros += nums[nums.length - 1];
            }
          }
        });
        if (sumaGiros > 0) {
          const actualizarLista = (lista: CorteSismaBack[]) =>
            lista.map((c, idx) =>
              idx === lista.length - 1
                ? {
                    ...c,
                    anticiposPorCruzar: sumaGiros,
                    totalCarteraReal: c.carteraTotal - sumaGiros,
                  }
                : c
            );
          if (modalidadSisma === "TODAS") {
            const next = actualizarLista(cortesTodas);
            setCortesTodas(next);
            persistAll(anuladas, legalizadas, glosas, pendientes, next, cortesPyp);
          } else {
            const next = actualizarLista(cortesPyp);
            setCortesPyp(next);
            persistAll(anuladas, legalizadas, glosas, pendientes, cortesTodas, next);
          }
          mostrarMensaje(`Auxiliar de Giros "${file.name}" aplicado al corte activo.`);
        } else {
          mostrarMensaje(`Archivo "${file.name}" cargado (${rows.length} líneas).`);
        }
      } else {
        const nuevasAnuladas: AnuladaRow[] = [];
        rows.forEach((cols, i) => {
          if (cols.length < 4) return;
          const emp = (cols[0] || "MUTUAL SER").toUpperCase();
          const fac = cols.find((c) => c.toUpperCase().startsWith("FCOE")) || cols[2] || `FCOE-${i + 1}`;
          const val = Number((cols[4] || "0").replace(/[^0-9]/g, "")) || 0;
          nuevasAnuladas.push({
            id: `IMP-${Date.now()}-${i}`,
            numero: anuladas.length + i + 1,
            empresa: emp,
            empresaOriginal: emp,
            // Si el archivo no trae fecha, NO se le inventa una. Aqui decia
            // `cols[1] || "2026-10-19"`: cada fila sin fecha entraba con el
            // 19 de octubre, una fecha que nadie escribio y que despues nadie
            // podria distinguir de una de verdad. Vacio es incomodo; una
            // fecha falsa es peor, porque se puede filtrar y sumar.
            fechaFactura: cols[1] || "",
            periodo: "",
            anio: "2026",
            factura: fac,
            fechaRadicacion: cols[3] || "",
            valorRadicado: val,
            copagos: 0,
            valorGlosaDevolucion: val,
            tipo: "GLOSA",
            motivo: cols[5] || "Importado desde archivo",
            facturaReemplaza: cols[6] || "",
            fechaAnulacion: "",
            fechaRadicacionReemplazo: "",
            rips: cols[7] || "",
            revisionFinanciera: cols[8] || "",
            preagrupado: "",
            responsable: normalizarResponsableReal(cols[9], emp),
            estadoGestion: cols[6] ? "REEMPLAZADA" : "PENDIENTE REEMPLAZO",
          });
        });
        if (nuevasAnuladas.length > 0) {
          const next = [...nuevasAnuladas, ...anuladas];
          setAnuladas(next);
          persistAll(next, legalizadas, glosas, pendientes, cortesTodas, cortesPyp);
          mostrarMensaje(`Se importaron ${nuevasAnuladas.length} registros desde "${file.name}".`);
        }
      }
      setMostrarPanelCarga(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file, "utf-8");
  };

  // Save new Cut
  const guardarNuevoCorteSismaBack = () => {
    const corr = Number(nuevoCorteForm.carteraCorriente.replace(/[^0-9]/g, "")) || 0;
    const venc = Number(nuevoCorteForm.carteraVencida.replace(/[^0-9]/g, "")) || 0;
    const total = corr + venc;
    const pendRad = Number(nuevoCorteForm.facturasPendientesRadicar.replace(/[^0-9]/g, "")) || 0;
    const glosasPend = Number(nuevoCorteForm.glosasPendientesGestionar.replace(/[^0-9]/g, "")) || 0;
    const antic = Number(nuevoCorteForm.anticiposPorCruzar.replace(/[^0-9]/g, "")) || 0;
    const real = total - antic;

    const nuevo: CorteSismaBack = {
      fechaCorte: nuevoCorteForm.fechaCorte,
      modalidad: nuevoCorteForm.modalidad === "TODAS" ? "Todas las Empresas" : "Modalidad PYP",
      carteraCorriente: corr,
      carteraVencida: venc,
      carteraTotal: total,
      facturasPendientesRadicar: pendRad,
      glosasPendientesGestionar: glosasPend,
      anticiposPorCruzar: antic,
      totalCarteraReal: real,
    };

    if (nuevoCorteForm.modalidad === "TODAS") {
      const next = [...cortesTodas, nuevo];
      setCortesTodas(next);
      setModalidadSisma("TODAS");
      setIndiceCorteActivo(next.length - 1);
      persistAll(anuladas, legalizadas, glosas, pendientes, next, cortesPyp);
    } else {
      const next = [...cortesPyp, nuevo];
      setCortesPyp(next);
      setModalidadSisma("PYP");
      setIndiceCorteActivo(next.length - 1);
      persistAll(anuladas, legalizadas, glosas, pendientes, cortesTodas, next);
    }

    setMostrarModalCorte(false);
    mostrarMensaje(`Corte ${nuevo.fechaCorte} (${nuevo.modalidad}) registrado.`);
  };

  // Save edited row
  const guardarEdicionFila = () => {
    if (!filaEditando) return;
    const id = String(filaEditando.id);

    if (tabActiva === "anuladas") {
      const next = anuladas.map((r) =>
        r.id === id
          ? {
              ...r,
              ...(filaEditando as unknown as AnuladaRow),
              estadoGestion: String(filaEditando.facturaReemplaza || "").toUpperCase().includes("FCOE")
                ? "REEMPLAZADA"
                : "PENDIENTE REEMPLAZO",
            }
          : r
      );
      setAnuladas(next);
      persistAll(next, legalizadas, glosas, pendientes, cortesTodas, cortesPyp);
    } else if (tabActiva === "legalizadas") {
      const next = legalizadas.map((r) =>
        r.id === id ? { ...r, ...(filaEditando as unknown as AnuladaRow) } : r
      );
      setLegalizadas(next);
      persistAll(anuladas, next, glosas, pendientes, cortesTodas, cortesPyp);
    } else if (tabActiva === "glosas") {
      const next = glosas.map((r) =>
        r.id === id ? { ...r, ...(filaEditando as unknown as GlosaRow) } : r
      );
      setGlosas(next);
      persistAll(anuladas, legalizadas, next, pendientes, cortesTodas, cortesPyp);
    } else if (tabActiva === "pendientes") {
      const next = pendientes.map((r) =>
        r.id === id ? { ...r, ...(filaEditando as unknown as PendienteRow) } : r
      );
      setPendientes(next);
      persistAll(anuladas, legalizadas, glosas, next, cortesTodas, cortesPyp);
    }

    void guardarEnBase(tabActiva, "EDITAR", { ...filaEditando, id });
    setFilaEditando(null);
    mostrarMensaje(`Registro ${id} actualizado.`);
  };

  // Create new row in active tab
  const crearNuevoRegistro = () => {
    const valRad = Number(nuevoRegistroForm.valorRadicado.replace(/[^0-9]/g, "")) || 0;
    const valGlo = Number(nuevoRegistroForm.valorGlosado.replace(/[^0-9]/g, "")) || valRad;

    if (tabActiva === "anuladas" || tabActiva === "legalizadas") {
      const nueva: AnuladaRow = {
        id: `${tabActiva === "anuladas" ? "ANU" : "LEG"}-${Date.now()}`,
        numero: (tabActiva === "anuladas" ? anuladas.length : legalizadas.length) + 1,
        empresa: nuevoRegistroForm.empresa,
        empresaOriginal: nuevoRegistroForm.empresa,
        fechaFactura: nuevoRegistroForm.fechaFactura,
        periodo: nuevoRegistroForm.periodo,
        anio: nuevoRegistroForm.anio,
        factura: nuevoRegistroForm.factura,
        fechaRadicacion: nuevoRegistroForm.fechaRadicacion,
        valorRadicado: valRad,
        copagos: 0,
        valorGlosaDevolucion: valGlo,
        tipo: nuevoRegistroForm.tipo,
        motivo: nuevoRegistroForm.motivo,
        facturaReemplaza: nuevoRegistroForm.facturaReemplaza,
        fechaAnulacion: nuevoRegistroForm.fechaFactura,
        fechaRadicacionReemplazo: nuevoRegistroForm.fechaRadicacion,
        rips: nuevoRegistroForm.rips,
        revisionFinanciera: nuevoRegistroForm.revisionFinanciera,
        preagrupado: "",
        responsable: nuevoRegistroForm.responsable,
        estadoGestion: nuevoRegistroForm.facturaReemplaza.toUpperCase().includes("FCOE")
          ? "REEMPLAZADA"
          : "PENDIENTE REEMPLAZO",
      };
      if (tabActiva === "anuladas") {
        const next = [nueva, ...anuladas];
        setAnuladas(next);
        persistAll(next, legalizadas, glosas, pendientes, cortesTodas, cortesPyp);
        void guardarEnBase(tabActiva, "CREAR", nueva);
      } else {
        const next = [nueva, ...legalizadas];
        setLegalizadas(next);
        persistAll(anuladas, next, glosas, pendientes, cortesTodas, cortesPyp);
        void guardarEnBase(tabActiva, "CREAR", nueva);
      }
    } else if (tabActiva === "glosas") {
      const nueva: GlosaRow = {
        id: `GLO-${Date.now()}`,
        subtabla: nuevoRegistroForm.notaCredito ? "ACEPTADA_NOTA_CREDITO" : "EN_GESTION",
        empresa: nuevoRegistroForm.empresa,
        empresaOriginal: nuevoRegistroForm.empresa,
        fechaFactura: nuevoRegistroForm.fechaFactura,
        periodo: nuevoRegistroForm.periodo,
        anio: nuevoRegistroForm.anio,
        factura: nuevoRegistroForm.factura,
        fechaRadicacion: nuevoRegistroForm.fechaRadicacion,
        valorRadicado: valRad,
        valorFactura: valRad,
        valorGlosado: valGlo,
        motivoGlosa: nuevoRegistroForm.motivo,
        facturador: nuevoRegistroForm.responsable,
        responsableAceptacion: nuevoRegistroForm.responsable,
        observacionInterna: nuevoRegistroForm.revisionFinanciera,
        notaCredito: nuevoRegistroForm.notaCredito,
      };
      const next = [nueva, ...glosas];
      setGlosas(next);
      persistAll(anuladas, legalizadas, next, pendientes, cortesTodas, cortesPyp);
      void guardarEnBase(tabActiva, "CREAR", nueva);
    } else {
      const nueva: PendienteRow = {
        id: `PEN-${Date.now()}`,
        empresa: nuevoRegistroForm.empresa,
        empresaOriginal: nuevoRegistroForm.empresa,
        contrato: nuevoRegistroForm.contrato || nuevoRegistroForm.empresa,
        unidadFuncional: "CONSULTA EXTERNA",
        cups: nuevoRegistroForm.cups || "890207",
        descripcion: nuevoRegistroForm.motivo || "PROCEDIMIENTO OFTALMOLÓGICO",
        fechaServicio: nuevoRegistroForm.fechaFactura,
        anio: nuevoRegistroForm.anio,
        medico: nuevoRegistroForm.medico || "ESPECIALISTA OFTALMOLOGÍA",
        valorServicio: valRad,
        responsable: nuevoRegistroForm.responsable,
        observaciones: nuevoRegistroForm.revisionFinanciera,
        estado: "PENDIENTE",
      };
      const next = [nueva, ...pendientes];
      setPendientes(next);
      persistAll(anuladas, legalizadas, glosas, next, cortesTodas, cortesPyp);
      void guardarEnBase(tabActiva, "CREAR", nueva);
    }

    setMostrarModalNuevo(false);
    mostrarMensaje(`Nuevo registro agregado en ${tabActiva.toUpperCase()}.`);
  };

  // Export current filtered table to CSV (Excel compatible UTF-8 BOM) with full SISMA crossings in executive order
  const exportarVistaExcelCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (tabActiva === "glosas") {
      headers = [
        "Factura",
        "Fecha Factura",
        "Fecha Radicación",
        "Fecha Notificación Glosa",
        "Año",
        "Sede",
        "Consulta o Cirugía",
        "Empresa Homologada",
        "NIT",
        "De dónde es (Convenio / Régimen)",
        "Paciente (Cruce)",
        "Documento Paciente",
        "Médico / Especialista (Cruce)",
        "CUPS",
        "Facturador",
        "Responsable Respuesta Glosa",
        "Valor Facturado",
        "Valor Glosado",
        "Valor Aceptado",
        "Causa Normativa (FA-CO)",
        "Código Causal",
        "Motivo de Glosa",
        "Nota Crédito",
        "Estado",
        "Observación / Respuesta",
      ];
      rows = glosasFiltradas.map((r) => {
        const cr = cruzarFilaMaestra({ ...r, motivoTexto: `${r.motivoGlosa} ${r.observacionInterna}` });
        const facReal = normalizarResponsableReal(r.facturador, r.empresa);
        return [
          r.factura,
          r.fechaFactura || cr.fechaFacturaSisma,
          r.fechaRadicacion || cr.fechaRadicacionSisma,
          r.fechaNotificacionGlosa || "",
          r.anio,
          cr.sede,
          cr.tipoAtencion,
          cr.empresaHomologada,
          cr.nit,
          cr.deDondeEs,
          cr.pacienteNombre || "Sin detalle clínico en factura",
          cr.pacienteDoc,
          cr.medicoNombre,
          cr.cups,
          facReal,
          r.responsableAceptacion || r.responsableRespuesta || facReal,
          r.valorFacturado || r.valorFactura || r.valorRadicado,
          r.valorGlosado,
          r.valorAceptado ?? "",
          causaNormativaDe(r.motivoCodigo),
          r.motivoCodigo || "",
          r.motivoGlosa,
          r.notaCredito,
          r.estado || r.subtabla,
          r.observacionInterna,
        ];
      });
    } else if (tabActiva === "cartera_viva") {
      headers = [
        "Factura",
        "Fecha Emisión",
        "Fecha Radicación",
        "Días Edad",
        "Sede",
        "Consulta o Cirugía",
        "Empresa Homologada",
        "NIT",
        "De dónde es (Convenio / Régimen)",
        "Paciente (Cruce)",
        "Médico (Cruce)",
        "Responsable Cartera",
        "Cuenta Contable SISMA",
        "Descripción Cuenta",
        "Corriente (<=60d)",
        "Vencida (>60d)",
        "Saldo Total Abierto",
        "Estado Radicación",
      ];
      rows = facturasSismaFiltradas.map((f) => {
        const cr = cruzarFilaMaestra({
          factura: f.factura,
          empresa: f.empresaHomologada,
          empresaOriginal: f.razonSocialOriginal,
          nit: f.nit,
          deDondeEs: f.deDondeEs,
          sede: f.sede,
          sedeGrupo: f.sedeGrupo,
          tipoAtencion: f.tipoAtencion,
          tipoGrupo: f.tipoGrupo,
          pacienteNombre: f.pacienteNombre,
          pacienteDoc: f.pacienteDoc,
        });
        return [
          f.factura,
          f.fechaFactura,
          f.fechaRadicacion,
          f.dias,
          cr.sede,
          cr.tipoAtencion,
          cr.empresaHomologada,
          f.nit,
          cr.deDondeEs,
          cr.pacienteNombre || "Factura corporativa / Sin paciente individual",
          cr.medicoNombre,
          f.responsable,
          f.cuenta,
          f.descripcionCuenta,
          f.corriente,
          f.vencida,
          f.saldo,
          f.esPendienteRadicar ? "PENDIENTE RADICAR (130125)" : "RADICADA",
        ];
      });
    } else if (tabActiva === "pendientes") {
      headers = [
        "Fecha Servicio",
        "Factura Asociada",
        "Año",
        "Sede",
        "Consulta o Cirugía",
        "Empresa Homologada",
        "NIT",
        "De dónde es (Convenio / Régimen)",
        "Contrato / Plan",
        "Paciente",
        "Documento Paciente",
        "Médico / Especialista",
        "Responsable Facturación",
        "CUPS",
        "Descripción del Servicio",
        "Valor Servicio",
        "Estado",
        "Observaciones",
      ];
      rows = pendientesFiltradas.map((r) => {
        const cr = cruzarFilaMaestra({
          ...r,
          factura: r.facturaAsociada,
          cups: r.cups,
          unidadFuncional: r.unidadFuncional,
          contrato: r.contrato,
          descripcion: r.descripcion,
        });
        return [
          r.fechaServicio,
          r.facturaAsociada || "",
          r.anio,
          cr.sede,
          cr.tipoAtencion,
          cr.empresaHomologada,
          cr.nit,
          cr.deDondeEs,
          r.contrato,
          r.pacienteNombre || "",
          r.pacienteDoc || "",
          r.medico,
          normalizarResponsableReal(r.responsable, r.empresa),
          r.cups,
          r.descripcion,
          r.valorServicio,
          r.estado,
          r.observaciones,
        ];
      });
    } else {
      const source = tabActiva === "anuladas" ? anuladasFiltradas : legalizadasFiltradas;
      headers = [
        "Factura",
        "Fecha Factura",
        "Fecha Radicación",
        "Fecha Anulación",
        "Año",
        "Sede",
        "Consulta o Cirugía",
        "Empresa Homologada",
        "NIT",
        "De dónde es (Convenio / Régimen)",
        "Paciente (Cruce)",
        "Médico (Cruce)",
        "Responsable",
        "Valor Facturado",
        "Factura Reemplazo",
        "RIPS",
        "Motivo",
        "Estado",
      ];
      rows = source.map((r) => {
        const cr = cruzarFilaMaestra({ ...r, motivoTexto: r.motivo });
        return [
          r.factura,
          r.fechaFactura,
          r.fechaRadicacion,
          r.fechaAnulacion,
          r.anio,
          cr.sede,
          cr.tipoAtencion,
          cr.empresaHomologada,
          cr.nit,
          cr.deDondeEs,
          cr.pacienteNombre || "Sin detalle clínico en factura",
          cr.medicoNombre,
          normalizarResponsableReal(r.responsable, r.empresa),
          r.valorRadicado,
          r.facturaReemplaza,
          r.rips,
          r.motivo,
          r.estadoGestion,
        ];
      });
    }

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((e) => e.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ebenezer_cartera_${tabActiva}_${filtroAnio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [filasExpandidas, setFilasExpandidas] = useState<Record<string, boolean>>({});

  const togglePersianaFila = (id: string) => {
    setFilasExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const columnasAnuladas: ColDef[] = [
    { key: "anio", label: "Año" },
    { key: "empresa", label: "Empresa" },
    { key: "factura", label: "Factura" },
    { key: "fechaRadicacion", label: "Fecha Rad." },
    { key: "valorRadicado", label: "Vlr. Facturado", align: "right" },
    { key: "valorGlosaDevolucion", label: "Vlr. Glosa", align: "right" },
    { key: "tipo", label: "Tipo" },
    { key: "motivo", label: "Motivo / Revisión", expand: true },
    { key: "facturaReemplaza", label: "Reemplazo" },
    { key: "rips", label: "RIPS" },
    { key: "responsable", label: "Responsable" },
  ];

  const columnasGlosas: ColDef[] = [
    { key: "subtabla", label: "Estado" },
    { key: "anio", label: "Año" },
    { key: "empresa", label: "Empresa" },
    { key: "factura", label: "Factura" },
    { key: "valorFactura", label: "Vlr. Factura", align: "right" },
    { key: "valorGlosado", label: "Vlr. Glosado", align: "right" },
    { key: "motivoGlosa", label: "Motivo de Glosa", expand: true },
    { key: "observacionInterna", label: "Respuesta / Obs." },
    { key: "facturador", label: "Facturador" },
    { key: "notaCredito", label: "Nota Créd." },
  ];

  const columnasPendientes: ColDef[] = [
    { key: "estado", label: "Estado" },
    { key: "empresa", label: "Empresa" },
    { key: "contrato", label: "Contrato" },
    { key: "cups", label: "CUPS" },
    { key: "descripcion", label: "Descripción Servicio", expand: true },
    { key: "fechaServicio", label: "Fecha" },
    { key: "medico", label: "Médico" },
    { key: "valorServicio", label: "Vlr. Servicio", align: "right" },
    { key: "responsable", label: "Responsable" },
    { key: "observaciones", label: "Observación" },
  ];

  return (
    <div className="space-y-6" style={{ color: "#0E245E" }}>
      {/* GIROS QUE NO LLEGARON — va de primero, antes de cualquier cifra.
          Si SISMA no entrego los giros por cruzar, la Cartera Real que se
          ve abajo es la Total sin restar nada: mas alta de lo que es.
          Antes esto pasaba en silencio. */}
      {datosSismaVivo?.girosIncompletos && (
        <div
          className="rounded-xl border px-5 py-3.5 text-[13px] font-semibold"
          style={{ backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}
        >
          ⚠️ SISMA no entregó los giros por cruzar. La <strong>Cartera Real</strong> que
          aparece abajo está SIN restar los giros — es decir, igual a la Total y más alta
          de lo que realmente es. No la use hasta que esto se resuelva.
          {datosSismaVivo.girosMotivo && (
            <span className="block mt-1 font-medium opacity-80">
              Detalle: {datosSismaVivo.girosMotivo}
            </span>
          )}
        </div>
      )}

      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
        <div
          className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl font-bold flex items-center gap-3 border"
          style={{ backgroundColor: "#047857", color: "#FFFFFF", borderColor: "#059669" }}
        >
          <span>✓</span>
          <span>{notificacion}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BARRA DE FILTROS SUPERIOR ESTILO TABLERO DE FRECUENCIAS (.period-bar) */}
      {/* ===================================================================== */}
      <div
        className="rounded-xl px-3.5 py-2.5 border shadow-2xs flex flex-wrap xl:flex-nowrap items-center gap-1.5 relative"
        style={{
          background: "linear-gradient(90deg, #F4F8FE 0%, #E7F0FD 58%, #D4E5FA 100%)",
          borderColor: "#D5E3F7",
        }}
      >
        {ddFrecAbierto && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => setDdFrecAbierto(null)}
          />
        )}

        {/* 1. DESPLEGABLE DE AÑO */}
        <div className="relative z-40">
          <button
            type="button"
            onClick={() => setDdFrecAbierto((p) => (p === "year" ? null : "year"))}
            className="inline-flex items-center justify-between gap-2 rounded-[9px] px-3 py-1.5 text-[12.5px] transition cursor-pointer border whitespace-nowrap"
            style={{
              backgroundColor:
                aniosFrecSel.length > 0 ? "#E7ECFE" : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "year"
                  ? "#1A3174"
                  : aniosFrecSel.length > 0
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: "#0E245E",
              fontWeight: aniosFrecSel.length > 0 ? 600 : 500,
              boxShadow:
                ddFrecAbierto === "year"
                  ? "0 0 0 3px rgba(58,100,148,0.12)"
                  : "none",
            }}
          >
            <span>
              {aniosFrecSel.length === 0 ||
              aniosFrecSel.length === ANIOS_SISMA_DISPONIBLES.length
                ? "Todos los años"
                : [...aniosFrecSel].sort().join(" · ")}
            </span>
            <span className="text-[11px]" style={{ color: "#5B6483" }}>
              ▾
            </span>
          </button>

          {ddFrecAbierto === "year" && (
            <div
              className="absolute left-0 top-full mt-1.5 w-56 rounded-xl border bg-white p-2 shadow-2xl z-50 max-h-72 overflow-y-auto"
              style={{ borderColor: "#E1E4EC" }}
            >
              <div
                className="flex gap-1.5 pb-2 mb-1.5 border-b"
                style={{ borderColor: "#EFF1F6" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAniosFrecSel([]);
                    setFiltroAnio("TODOS");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAniosFrecSel([]);
                    setFiltroAnio("TODOS");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Ninguno
                </button>
              </div>
              <div className="space-y-0.5">
                {ANIOS_SISMA_DISPONIBLES.map((yr) => {
                  const sel = aniosFrecSel.includes(yr);
                  return (
                    <div
                      key={yr}
                      onClick={() => {
                        setFiltroAnio("TODOS");
                        if (
                          aniosFrecSel.length === ANIOS_SISMA_DISPONIBLES.length
                        ) {
                          setAniosFrecSel([yr]);
                          setPaginaActual(1);
                        } else {
                          toggleItemEnLista(aniosFrecSel, yr, setAniosFrecSel);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition"
                      style={{
                        backgroundColor: sel ? "#E7ECFE" : "transparent",
                        color: sel ? "#0E245E" : "#2A335A",
                        fontWeight: sel ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-[4px] border-2 flex items-center justify-center text-[10px] text-white shrink-0"
                        style={{
                          backgroundColor: sel ? "#1A3174" : "transparent",
                          borderColor: sel ? "#1A3174" : "#C7CDE0",
                        }}
                      >
                        {sel ? "✓" : ""}
                      </span>
                      <span>{yr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. DESPLEGABLE DE MES */}
        <div className="relative z-40">
          <button
            type="button"
            onClick={() =>
              setDdFrecAbierto((p) => (p === "month" ? null : "month"))
            }
            className="inline-flex items-center justify-between gap-2 rounded-[9px] px-3 py-1.5 text-[12.5px] transition cursor-pointer border whitespace-nowrap"
            style={{
              backgroundColor:
                mesesFrecSel.length > 0 && mesesFrecSel.length < 12
                  ? "#E7ECFE"
                  : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "month"
                  ? "#1A3174"
                  : mesesFrecSel.length > 0 && mesesFrecSel.length < 12
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: "#0E245E",
              fontWeight:
                mesesFrecSel.length > 0 && mesesFrecSel.length < 12 ? 600 : 500,
            }}
          >
            <span>
              {mesesFrecSel.length === 0 || mesesFrecSel.length === 12
                ? "Todos los meses"
                : mesesFrecSel.length === 1
                ? MESES_FREC.find((m) => m.id === mesesFrecSel[0])?.label ||
                  "1 mes"
                : `${mesesFrecSel.length} seleccionados`}
            </span>
            <span className="text-[11px]" style={{ color: "#5B6483" }}>
              ▾
            </span>
          </button>

          {ddFrecAbierto === "month" && (
            <div
              className="absolute left-0 top-full mt-1.5 w-56 rounded-xl border bg-white p-2 shadow-2xl z-50 max-h-72 overflow-y-auto"
              style={{ borderColor: "#E1E4EC" }}
            >
              <div
                className="flex gap-1.5 pb-2 mb-1.5 border-b"
                style={{ borderColor: "#EFF1F6" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMesesFrecSel([]);
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMesesFrecSel([]);
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Ninguno
                </button>
              </div>
              <div className="space-y-0.5">
                {MESES_FREC.map((m) => {
                  const sel = mesesFrecSel.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (mesesFrecSel.length === 12) {
                          setMesesFrecSel([m.id]);
                          setPaginaActual(1);
                        } else {
                          toggleItemEnLista(mesesFrecSel, m.id, setMesesFrecSel);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition"
                      style={{
                        backgroundColor: sel ? "#E7ECFE" : "transparent",
                        color: sel ? "#0E245E" : "#2A335A",
                        fontWeight: sel ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-[4px] border-2 flex items-center justify-center text-[10px] text-white shrink-0"
                        style={{
                          backgroundColor: sel ? "#1A3174" : "transparent",
                          borderColor: sel ? "#1A3174" : "#C7CDE0",
                        }}
                      >
                        {sel ? "✓" : ""}
                      </span>
                      <span>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. DESPLEGABLE DE DÍAS (RANGO DE FECHAS Y DÍAS DE LA SEMANA IDÉNTICO A FRECUENCIAS) */}
        <div className="relative z-40">
          <button
            type="button"
            onClick={() =>
              setDdFrecAbierto((p) => (p === "dias" ? null : "dias"))
            }
            className="inline-flex items-center justify-between gap-2 rounded-[9px] px-3 py-1.5 text-[12.5px] transition cursor-pointer border whitespace-nowrap"
            style={{
              backgroundColor:
                ddFrecAbierto === "dias"
                  ? "#0E245E"
                  : diasFiltroActivo
                  ? "#E7ECFE"
                  : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "dias"
                  ? "#0E245E"
                  : diasFiltroActivo
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: ddFrecAbierto === "dias" ? "#FFFFFF" : "#0E245E",
              fontWeight: diasFiltroActivo || ddFrecAbierto === "dias" ? 600 : 500,
            }}
          >
            <span>{diasEtiqueta}</span>
            <span
              className="text-[11px]"
              style={{
                color: ddFrecAbierto === "dias" ? "#FFFFFF" : "#5B6483",
              }}
            >
              ▾
            </span>
          </button>

          {ddFrecAbierto === "dias" && (
            <div
              className="absolute left-0 top-full mt-1.5 w-80 rounded-[14px] border bg-white p-4 shadow-2xl z-50 space-y-3"
              style={{ borderColor: "#C7CDE0" }}
            >
              <div>
                <div
                  className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5"
                  style={{ color: "#5B6483" }}
                >
                  RANGO DE FECHAS
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={diasDesde}
                    onChange={(e) => setDiasDesde(e.target.value)}
                    className="flex-1 rounded-lg border px-2 py-1.5 text-xs"
                    style={{ borderColor: "#C7CDE0", color: "#0E245E" }}
                  />
                  <input
                    type="date"
                    value={diasHasta}
                    onChange={(e) => setDiasHasta(e.target.value)}
                    className="flex-1 rounded-lg border px-2 py-1.5 text-xs"
                    style={{ borderColor: "#C7CDE0", color: "#0E245E" }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 0 as const, label: "Hoy" },
                  { id: 1 as const, label: "Ayer" },
                  { id: 7 as const, label: "Últimos 7" },
                  { id: 30 as const, label: "Últimos 30" },
                  { id: "sem" as const, label: "Semana" },
                ].map((b) => (
                  <button
                    type="button"
                    key={String(b.id)}
                    onClick={() => aplicarPreseleccionDias(b.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer hover:bg-slate-100"
                    style={{
                      backgroundColor: "#EFF1F6",
                      borderColor: "#E1E4EC",
                      color: "#0E245E",
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div>
                <div
                  className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5"
                  style={{ color: "#5B6483" }}
                >
                  DÍAS DE LA SEMANA
                </div>
                <div
                  className="flex flex-wrap gap-1 rounded-[10px] p-1 border"
                  style={{ backgroundColor: "#EFF1F6", borderColor: "#E1E4EC" }}
                >
                  {DIAS_SEMANA_FREC.map((d) => {
                    const act = diasSemanaSel.includes(d.id);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() =>
                          toggleItemEnLista(
                            diasSemanaSel,
                            d.id,
                            setDiasSemanaSel
                          )
                        }
                        className="px-2 py-1 rounded-[7px] text-[11.5px] font-bold transition cursor-pointer"
                        style={{
                          backgroundColor: act ? "#FFFFFF" : "transparent",
                          color: act ? "#0E245E" : "#5B6483",
                          boxShadow: act
                            ? "0 1px 3px rgba(15,23,42,0.12)"
                            : "none",
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={aplicarPanelDias}
                  className="flex-1 rounded-[9px] py-2 text-xs font-extrabold uppercase tracking-wider text-white cursor-pointer"
                  style={{ backgroundColor: "#0E245E" }}
                >
                  APLICAR
                </button>
                <button
                  type="button"
                  onClick={quitarPanelDias}
                  className="flex-1 rounded-[9px] py-2 text-xs font-bold uppercase border bg-white cursor-pointer"
                  style={{ borderColor: "#C7CDE0", color: "#1A3174" }}
                >
                  QUITAR
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. DESPLEGABLE DE EMPRESA */}
        <div className="relative z-40">
          <button
            type="button"
            onClick={() =>
              setDdFrecAbierto((p) => (p === "grp" ? null : "grp"))
            }
            className="inline-flex items-center justify-between gap-2 rounded-[9px] px-3 py-1.5 text-[12.5px] transition cursor-pointer border whitespace-nowrap"
            style={{
              backgroundColor:
                empresasFrecSel.length > 0 &&
                empresasFrecSel.length < todasLasEmpresasDisponibles.length
                  ? "#E7ECFE"
                  : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "grp"
                  ? "#1A3174"
                  : empresasFrecSel.length > 0 &&
                    empresasFrecSel.length < todasLasEmpresasDisponibles.length
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: "#0E245E",
              fontWeight:
                empresasFrecSel.length > 0 &&
                empresasFrecSel.length < todasLasEmpresasDisponibles.length
                  ? 600
                  : 500,
            }}
          >
            <span>
              {empresasFrecSel.length === 0 ||
              empresasFrecSel.length === todasLasEmpresasDisponibles.length
                ? "Todas las empresas"
                : empresasFrecSel.length === 1
                ? empresasFrecSel[0]
                : `${empresasFrecSel.length} seleccionadas`}
            </span>
            <span className="text-[11px]" style={{ color: "#5B6483" }}>
              ▾
            </span>
          </button>

          {ddFrecAbierto === "grp" && (
            <div
              className="absolute left-0 top-full mt-1.5 w-80 sm:w-[340px] rounded-xl border bg-white p-2 shadow-2xl z-50 max-h-80 overflow-y-auto"
              style={{ borderColor: "#E1E4EC" }}
            >
              <div
                className="flex gap-1.5 pb-2 mb-1.5 border-b"
                style={{ borderColor: "#EFF1F6" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEmpresasFrecSel([]);
                    setFiltroEmpresa("TODAS");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmpresasFrecSel([]);
                    setFiltroEmpresa("TODAS");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Ninguno
                </button>
              </div>
              <div className="space-y-0.5">
                {todasLasEmpresasDisponibles.map((emp) => {
                  const sel = empresasFrecSel.includes(emp);
                  return (
                    <div
                      key={emp}
                      onClick={() => {
                        setFiltroEmpresa("TODAS");
                        if (!sel && esEmpresaMutual(emp)) {
                          setIncluirMutual(true);
                        }
                        if (
                          empresasFrecSel.length ===
                          todasLasEmpresasDisponibles.length
                        ) {
                          setEmpresasFrecSel([emp]);
                          setPaginaActual(1);
                        } else {
                          toggleItemEnLista(
                            empresasFrecSel,
                            emp,
                            setEmpresasFrecSel
                          );
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] cursor-pointer transition"
                      style={{
                        backgroundColor: sel ? "#E7ECFE" : "transparent",
                        color: sel ? "#0E245E" : "#2A335A",
                        fontWeight: sel ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-[4px] border-2 flex items-center justify-center text-[10px] text-white shrink-0"
                        style={{
                          backgroundColor: sel ? "#1A3174" : "transparent",
                          borderColor: sel ? "#1A3174" : "#C7CDE0",
                        }}
                      >
                        {sel ? "✓" : ""}
                      </span>
                      <span className="leading-tight">{emp}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. DESPLEGABLE DE RESPONSABLES */}
        <div className="relative z-40">
          <button
            type="button"
            onClick={() =>
              setDdFrecAbierto((p) => (p === "resp" ? null : "resp"))
            }
            className="inline-flex items-center justify-between gap-2 rounded-[9px] px-3 py-1.5 text-[12.5px] transition cursor-pointer border whitespace-nowrap"
            style={{
              backgroundColor:
                responsablesFrecSel.length > 0 &&
                responsablesFrecSel.length <
                  carteraInitialData.responsablesDisponibles.length
                  ? "#E7ECFE"
                  : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "resp"
                  ? "#1A3174"
                  : responsablesFrecSel.length > 0 &&
                    responsablesFrecSel.length <
                      carteraInitialData.responsablesDisponibles.length
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: "#0E245E",
              fontWeight:
                responsablesFrecSel.length > 0 &&
                responsablesFrecSel.length <
                  carteraInitialData.responsablesDisponibles.length
                  ? 600
                  : 500,
            }}
          >
            <span>
              {responsablesFrecSel.length === 0 ||
              responsablesFrecSel.length ===
                carteraInitialData.responsablesDisponibles.length
                ? "Todas las responsables"
                : responsablesFrecSel.length === 1
                ? responsablesFrecSel[0]
                : `${responsablesFrecSel.length} seleccionadas`}
            </span>
            <span className="text-[11px]" style={{ color: "#5B6483" }}>
              ▾
            </span>
          </button>

          {ddFrecAbierto === "resp" && (
            <div
              className="absolute left-0 top-full mt-1.5 w-60 rounded-xl border bg-white p-2 shadow-2xl z-50 max-h-72 overflow-y-auto"
              style={{ borderColor: "#E1E4EC" }}
            >
              <div
                className="flex gap-1.5 pb-2 mb-1.5 border-b"
                style={{ borderColor: "#EFF1F6" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setResponsablesFrecSel([]);
                    setFiltroResponsable("TODAS");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResponsablesFrecSel([]);
                    setFiltroResponsable("TODAS");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition cursor-pointer hover:bg-[#1A3174] hover:text-white"
                  style={{
                    backgroundColor: "#FAFBFC",
                    borderColor: "#E1E4EC",
                    color: "#1A3174",
                  }}
                >
                  Ninguno
                </button>
              </div>
              <div className="space-y-0.5">
                {carteraInitialData.responsablesDisponibles.map((resp) => {
                  const sel = responsablesFrecSel.includes(resp);
                  return (
                    <div
                      key={resp}
                      onClick={() => {
                        setFiltroResponsable("TODAS");
                        if (
                          responsablesFrecSel.length ===
                          carteraInitialData.responsablesDisponibles.length
                        ) {
                          setResponsablesFrecSel([resp]);
                          setPaginaActual(1);
                        } else {
                          toggleItemEnLista(
                            responsablesFrecSel,
                            resp,
                            setResponsablesFrecSel
                          );
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] cursor-pointer transition"
                      style={{
                        backgroundColor: sel ? "#E7ECFE" : "transparent",
                        color: sel ? "#0E245E" : "#2A335A",
                        fontWeight: sel ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-[4px] border-2 flex items-center justify-center text-[10px] text-white shrink-0"
                        style={{
                          backgroundColor: sel ? "#1A3174" : "transparent",
                          borderColor: sel ? "#1A3174" : "#C7CDE0",
                        }}
                      >
                        {sel ? "✓" : ""}
                      </span>
                      <span>{resp}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6. BOTONES APLICAR Y LIMPIAR */}
        <button
          type="button"
          onClick={() => {
            setDdFrecAbierto(null);
            setPaginaActual(1);
            sincronizarConSismaVivo(fechaCorteVivo, false);
          }}
          className="px-3.5 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider text-white cursor-pointer transition shrink-0"
          style={{
            backgroundColor: "#0F2FF3",
            boxShadow: "0 4px 10px rgba(15,47,243,0.22)",
          }}
        >
          Aplicar
        </button>

        <button
          type="button"
          onClick={limpiarTodosLosFiltros}
          className="px-3 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider border bg-white cursor-pointer transition shrink-0"
          style={{ borderColor: "#C7CDE0", color: "#1A3174" }}
        >
          Limpiar
        </button>

        {/* 6B. FILTROS RÁPIDOS DE SEDE Y ATENCIÓN (CONSULTA / CIRUGÍA) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "#5B6483" }}
          >
            SEDE
          </span>
          <div
            className="inline-flex rounded-[10px] p-0.5 border"
            style={{ backgroundColor: "#EFF1F6", borderColor: "#E1E4EC" }}
          >
            {(
              [
                { id: "TODAS", label: "Todas" },
                { id: "SEDE_1", label: "Sede 1" },
                { id: "SEDE_2", label: "Sede 2" },
              ] as const
            ).map((op) => {
              const act = filtroSedeTop === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    setFiltroSedeTop(op.id);
                    if (op.id === "SEDE_2" && !incluirMutual) setIncluirMutual(true);
                    setPaginaActual(1);
                  }}
                  className="px-2.5 py-1 rounded-[7px] text-[11px] font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: act ? "#0E245E" : "transparent",
                    color: act ? "#FFFFFF" : "#5B6483",
                  }}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "#5B6483" }}
          >
            ATENCIÓN
          </span>
          <div
            className="inline-flex rounded-[10px] p-0.5 border"
            style={{ backgroundColor: "#EFF1F6", borderColor: "#E1E4EC" }}
          >
            {(
              [
                { id: "TODAS", label: "Todas" },
                { id: "CONSULTA", label: "Consulta" },
                { id: "CIRUGIA", label: "Cirugía" },
                { id: "AYUDA_DX", label: "Ayuda Dx" },
              ] as const
            ).map((op) => {
              const act = filtroAtencionTop === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    setFiltroAtencionTop(op.id);
                    setPaginaActual(1);
                  }}
                  className="px-2.5 py-1 rounded-[7px] text-[11px] font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: act ? "#1D58D8" : "transparent",
                    color: act ? "#FFFFFF" : "#5B6483",
                  }}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. INTERRUPTOR MUTUAL DE 3 VÍAS: CON MUTUAL | SOLO MUTUAL | SIN MUTUAL */}
        {(() => {
          const modoSoloMutual =
            incluirMutual &&
            ((empresasFrecSel.length === 1 && esEmpresaMutual(empresasFrecSel[0])) ||
              (empresasFrecSel.length === 0 &&
                filtroEmpresa !== "TODAS" &&
                esEmpresaMutual(filtroEmpresa)));
          const modoSinMutual = !incluirMutual && !modoSoloMutual;
          const modoConMutual = incluirMutual && !modoSoloMutual;

          return (
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#5B6483" }}
              >
                MUTUAL SER
              </span>
              <div
                className="inline-flex rounded-[10px] p-0.5 border"
                style={{ backgroundColor: "#EFF1F6", borderColor: "#E1E4EC" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIncluirMutual(true);
                    if (modoSoloMutual) {
                      setEmpresasFrecSel([]);
                      setFiltroEmpresa("TODAS");
                    }
                    setPaginaActual(1);
                  }}
                  className="px-2.5 py-1 rounded-[7px] text-[11px] font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: modoConMutual ? "#FFFFFF" : "transparent",
                    color: modoConMutual ? "#0E245E" : "#5B6483",
                    boxShadow: modoConMutual
                      ? "0 1px 3px rgba(15,23,42,0.1)"
                      : "none",
                  }}
                  title="Mostrar todas las entidades incluyendo Mutual Ser"
                >
                  Con Mutual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncluirMutual(true);
                    setFiltroEmpresa("TODAS");
                    setEmpresasFrecSel(["MUTUAL SER"]);
                    setPaginaActual(1);
                  }}
                  className="px-2.5 py-1 rounded-[7px] text-[11px] font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: modoSoloMutual ? "#1D58D8" : "transparent",
                    color: modoSoloMutual ? "#FFFFFF" : "#5B6483",
                    boxShadow: modoSoloMutual
                      ? "0 1px 3px rgba(29,88,216,0.28)"
                      : "none",
                  }}
                  title="Filtrar únicamente Mutual Ser (NIT 806008394) en todo el tablero"
                >
                  Solo Mutual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncluirMutual(false);
                    setEmpresasFrecSel((prev) =>
                      prev.filter((e) => !esEmpresaMutual(e))
                    );
                    if (esEmpresaMutual(filtroEmpresa)) {
                      setFiltroEmpresa("TODAS");
                    }
                    setPaginaActual(1);
                  }}
                  className="px-2.5 py-1 rounded-[7px] text-[11px] font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: modoSinMutual ? "#FFFFFF" : "transparent",
                    color: modoSinMutual ? "#B91C1C" : "#5B6483",
                    boxShadow: modoSinMutual
                      ? "0 1px 3px rgba(15,23,42,0.1)"
                      : "none",
                  }}
                  title="Excluir Mutual Ser de todos los indicadores, curvas y glosas"
                >
                  Excluir
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ===================================================================== */}
      {/* CUADRO 1: RESUMEN DE CARTERA (DESPLEGABLE COMO PERSIANA AL CLIC)      */}
      {/* ===================================================================== */}
      <div
        className="rounded-xl p-6 shadow-xs border space-y-5"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        <div
          className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-3 border-b"
          style={{ borderColor: "#E2ECF8" }}
        >
          <button
            type="button"
            onClick={() => setPersianaResumenAbierta((prev) => !prev)}
            className="text-left flex items-center gap-3 cursor-pointer group"
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
              style={{ backgroundColor: "#EFF6FF", color: "#1D58D8" }}
            >
              {persianaResumenAbierta ? "▴" : "▾"}
            </span>
            <div>
              <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: "#0E245E" }}>
                <span>Resumen de Cartera ({corteSeleccionado.modalidad} — Corte {corteSeleccionado.fechaCorte})</span>
              </h3>
              <p className="text-xs sm:text-sm" style={{ color: "#64748B" }}>
                Cartera Corriente (&lt; 60 días) + Cartera Vencida (&gt;= 60 días) − Giros por cruzar = Total Cartera Real (Clic para plegar/desplegar)
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {datosSismaVivo ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[11.5px] font-semibold text-[#047857]">
                      {(datosSismaVivo.corteISO || fechaCorteVivo) === ayerEnColombia()
                        ? `Corte congelado al día anterior cerrado: ${datosSismaVivo.fechaCorte} (hoy: ${formatearISOaLatam(hoyEnColombia())})`
                        : `En vivo desde SISMA · corte ${datosSismaVivo.fechaCorte}`}
                    </span>
                    {(datosSismaVivo.corteISO || fechaCorteVivo) !== ayerEnColombia() && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          const ay = ayerEnColombia();
                          setFechaCorteVivo(ay);
                          sincronizarConSismaVivo(ay, false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            const ay = ayerEnColombia();
                            setFechaCorteVivo(ay);
                            sincronizarConSismaVivo(ay, false);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1D58D8] hover:bg-blue-100 transition"
                      >
                        Volver al día anterior ({formatearISOaLatam(ayerEnColombia())})
                      </span>
                    )}
                  </>
                ) : (
                  <FechaDelDato
                    fecha={carteraInitialData.ultimaActualizacion}
                    queEs="Sin conexión a SISMA · datos guardados"
                    avisaA={1}
                    alarmaA={3}
                    comoSeActualiza="pulse el botón de sincronizar"
                  />
                )}
              </div>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">

            <div
              className="inline-flex rounded-xl p-1 border"
              style={{ backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" }}
            >
              <button
                type="button"
                onClick={() => {
                  setModalidadSisma("TODAS");
                  setIndiceCorteActivo(cortesTodas.length - 1);
                }}
                className="px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer"
                style={{
                  backgroundColor: modalidadSisma === "TODAS" ? "#1D58D8" : "transparent",
                  color: modalidadSisma === "TODAS" ? "#FFFFFF" : "#0E245E",
                }}
              >
                Todas las Empresas
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalidadSisma("PYP");
                  setIndiceCorteActivo(cortesPyp.length - 1);
                }}
                className="px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer"
                style={{
                  backgroundColor: modalidadSisma === "PYP" ? "#1D58D8" : "transparent",
                  color: modalidadSisma === "PYP" ? "#FFFFFF" : "#0E245E",
                }}
              >
                Modalidad PYP
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarioAbierto((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 border text-xs sm:text-sm font-bold transition cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: calendarioAbierto ? "#EFF6FF" : "#F8FAFC",
                  borderColor: calendarioAbierto ? "#1D58D8" : "#CBD5E1",
                  color: "#0E245E",
                }}
              >
                <span>📅</span>
                <span>Fechas de corte ({listaCortesActiva.length})</span>
                <span className="text-[10px]" style={{ color: "#1D58D8" }}>
                  {calendarioAbierto ? "▴" : "▾"}
                </span>
              </button>

              {calendarioAbierto && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setCalendarioAbierto(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl border p-4 z-40 space-y-3"
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#CBD5E1",
                      color: "#0E245E",
                    }}
                  >
                    {/* Navegación Mes / Año */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => cambiarMesCalendario(-1)}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm hover:bg-slate-50 cursor-pointer"
                        style={{ borderColor: "#E2ECF8", color: "#0E245E" }}
                      >
                        ‹
                      </button>
                      <span className="font-extrabold text-sm" style={{ color: "#0E245E" }}>
                        {MESES_NOMBRES[mesCalendario]} {anioCalendario}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarMesCalendario(1)}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm hover:bg-slate-50 cursor-pointer"
                        style={{ borderColor: "#E2ECF8", color: "#0E245E" }}
                      >
                        ›
                      </button>
                    </div>

                    {/* Encabezado días de la semana */}
                    <div className="grid grid-cols-7 text-center text-[11px] font-bold" style={{ color: "#64748B" }}>
                      {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => (
                        <div key={d} className="py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Cuadrícula de días del mes */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {(() => {
                        const primerDiaSemana = new Date(anioCalendario, mesCalendario, 1).getDay();
                        const offsetLunes = (primerDiaSemana + 6) % 7;
                        const totalDiasMes = new Date(anioCalendario, mesCalendario + 1, 0).getDate();
                        const celdas = [];

                        for (let i = 0; i < offsetLunes; i++) {
                          celdas.push(<div key={`empty-${i}`} className="h-8" />);
                        }

                        for (let d = 1; d <= totalDiasMes; d++) {
                          const dd = String(d).padStart(2, "0");
                          const mm = String(mesCalendario + 1).padStart(2, "0");
                          const label = `${dd}/${mm}/${anioCalendario}`;
                          const idxCorte = listaCortesActiva.findIndex(
                            (c) => c.fechaCorte.slice(0, 10) === label
                          );
                          const marcado = idxCorte !== -1;
                          const esCorteActivo = idxCorte === indiceCorteActivo;

                          celdas.push(
                            <button
                              type="button"
                              key={label}
                              onClick={() => toggleFechaEnCalendario(d)}
                              className="h-8 w-8 mx-auto rounded-full flex items-center justify-center font-bold transition cursor-pointer"
                              style={{
                                backgroundColor: marcado ? "#1D58D8" : "transparent",
                                color: marcado ? "#FFFFFF" : "#0E245E",
                                boxShadow: esCorteActivo
                                  ? "0 0 0 2px #93C5FD"
                                  : "none",
                              }}
                              title={
                                marcado
                                  ? `Corte ${label} seleccionado (clic para ver o quitar)`
                                  : `Marcar corte ${label} en SISMA`
                              }
                            >
                              {d}
                            </button>
                          );
                        }
                        return celdas;
                      })()}
                    </div>

                    {/* Fechas seleccionadas dentro del popover para cambiar vista o desmarcar */}
                    <div className="pt-2 border-t space-y-2" style={{ borderColor: "#E2ECF8" }}>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {listaCortesActiva.map((c, idx) => {
                          const activo = idx === indiceCorteActivo;
                          return (
                            <div
                              key={c.fechaCorte}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold cursor-pointer"
                              style={{
                                backgroundColor: activo ? "#0E245E" : "#EFF6FF",
                                color: activo ? "#FFFFFF" : "#1D58D8",
                              }}
                              onClick={() =>
                                seleccionarCorteYSincronizar(idx, c.fechaCorte)
                              }
                            >
                              <span>{c.fechaCorte.slice(0, 10)}</span>
                              {listaCortesActiva.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const label = c.fechaCorte.slice(0, 10);
                                    if (modalidadSisma === "TODAS") {
                                      const filtrada = cortesTodas.filter(
                                        (x) => x.fechaCorte.slice(0, 10) !== label
                                      );
                                      setCortesTodas(filtrada);
                                      setIndiceCorteActivo(Math.max(0, filtrada.length - 1));
                                    } else {
                                      const filtrada = cortesPyp.filter(
                                        (x) => x.fechaCorte.slice(0, 10) !== label
                                      );
                                      setCortesPyp(filtrada);
                                      setIndiceCorteActivo(Math.max(0, filtrada.length - 1));
                                    }
                                  }}
                                  className="ml-0.5 hover:opacity-75 cursor-pointer"
                                  title="Quitar fecha"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-semibold" style={{ color: "#64748B" }}>
                          {cargandoSismaVivo
                            ? "Consultando SISMA..."
                            : `${listaCortesActiva.length} ${
                                listaCortesActiva.length === 1 ? "fecha marcada" : "fechas marcadas"
                              }`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCalendarioAbierto(false)}
                          className="px-3.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer"
                          style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
                        >
                          Listo
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DESPLEGABLE DE CARGA DIRECTA DE ARCHIVOS EXCEL / CSV */}
        {mostrarPanelCarga && (
          <div
            className="rounded-xl p-5 border space-y-4"
            style={{ backgroundColor: "#F4F8FD", borderColor: "#BFDBFE" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold" style={{ color: "#0E245E" }}>
                  Cargar Información desde Archivo (.csv / .xlsx)
                </h4>
                <p className="text-xs" style={{ color: "#475569" }}>
                  Selecciona el tipo de reporte que deseas subir desde tu computador:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarPanelCarga(false)}
                className="text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer"
                style={{ backgroundColor: "#FFFFFF", color: "#475569", borderColor: "#CBD5E1" }}
              >
                Cerrar ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: "VENCIMIENTO" as const,
                  titulo: "1. Análisis de Vencimiento",
                  desc: "Actualiza Cartera Corriente (< 60 días) y Cartera Vencida (>= 60 días)",
                },
                {
                  id: "GIROS" as const,
                  titulo: "2. Auxiliar Abierto de Giros",
                  desc: "Actualiza los giros y anticipos pendientes por cruzar",
                },
                {
                  id: "GLOSAS" as const,
                  titulo: "3. Base de Glosas / Facturas Anuladas",
                  desc: "Importa nuevas filas a la tabla de gestión",
                },
              ].map((op) => {
                const activo = tipoArchivoCarga === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => setTipoArchivoCarga(op.id)}
                    className="p-3.5 rounded-xl border cursor-pointer transition"
                    style={{
                      backgroundColor: activo ? "#FFFFFF" : "#F8FAFC",
                      borderColor: activo ? "#1D58D8" : "#CBD5E1",
                      boxShadow: activo ? "0 0 0 2px rgba(29,88,216,0.15)" : "none",
                    }}
                  >
                    <div className="font-bold text-xs sm:text-sm" style={{ color: "#0E245E" }}>
                      {op.titulo}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#64748B" }}>
                      {op.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={manejarArchivoSubido}
                className="text-xs sm:text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:cursor-pointer"
                style={{ color: "#0E245E" }}
              />
              <span className="text-xs" style={{ color: "#475569" }}>
                Al seleccionar el archivo, las cifras se actualizan automáticamente.
              </span>
            </div>
          </div>
        )}

        {persianaResumenAbierta && (
          <div className="space-y-5">
            {/* 5 TARJETAS EJECUTIVAS DE LA FÓRMULA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div
                className="rounded-xl p-4 border"
                style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" }}
              >
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: "#1D58D8" }}>
                  <span>CARTERA CORRIENTE</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">+</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono mt-1.5" style={{ color: "#0E245E" }}>
                  {formatCOP(corteSeleccionado.carteraCorriente)}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#64748B" }}>
                  Radicada &lt; 60 días
                </div>
              </div>

              <div
                className="rounded-xl p-4 border"
                style={{ backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }}
              >
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: "#BE123C" }}>
                  <span>CARTERA VENCIDA</span>
                  <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900">+</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono mt-1.5" style={{ color: "#9F1239" }}>
                  {formatCOP(corteSeleccionado.carteraVencida)}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#BE123C" }}>
                  Radicada &gt;= 60 días
                </div>
              </div>

              <div
                className="rounded-xl p-4 border"
                style={{ backgroundColor: "#EFF6FF", borderColor: "#93C5FD" }}
              >
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: "#1E40AF" }}>
                  <span>CARTERA TOTAL</span>
                  <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-900">=</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono mt-1.5" style={{ color: "#0E245E" }}>
                  {formatCOP(corteSeleccionado.carteraTotal)}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#1E40AF" }}>
                  Suma Corriente + Vencida
                </div>
              </div>

              <div
                className="rounded-xl p-4 border"
                style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
              >
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: "#B45309" }}>
                  <span>GIROS POR CRUZAR</span>
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900">−</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono mt-1.5" style={{ color: "#92400E" }}>
                  {formatCOP(corteSeleccionado.anticiposPorCruzar)}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#B45309" }}>
                  Anticipos y giros aplicados
                </div>
              </div>

              <div
                className="rounded-xl p-4 border-2"
                style={{ backgroundColor: "#ECFDF5", borderColor: "#10B981" }}
              >
                <div className="flex items-center justify-between text-xs font-extrabold" style={{ color: "#047857" }}>
                  <span>TOTAL CARTERA REAL</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">NETO</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono mt-1.5" style={{ color: "#065F46" }}>
                  {realCOP(corteSeleccionado.totalCarteraReal)}
                </div>
                <div className="text-[11px] mt-1 font-medium" style={{ color: "#047857" }}>
                  Saldo real neto por cobrar
                </div>
              </div>
            </div>

            {/* 2 TORTAS EJECUTIVAS POR EMPRESA (CARTERA TOTAL Y CARTERA VENCIDA > 60 DÍAS) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {renderTarjetaTortaEmpresa(
                "Distribución de Cartera Total por Empresa (SISMA)",
                "Total",
                donutCarteraTotal
              )}
              {renderTarjetaTortaEmpresa(
                "Concentración de Cartera Vencida (> 60 días) por Empresa",
                "Vencida",
                donutCarteraVencida
              )}
            </div>

            {/* TARJETA ÚNICA DE TENDENCIA DEL TOTAL DE CARTERA POR MES Y FECHA DE CORTE (EXCEL / SISMA) */}
            {renderTarjetaTendenciaTotalCartera()}

            {/* CORTINA DESPLEGABLE: DESGLOSE EN VIVO POR EDADES Y ENTIDADES (API SISMA CONTABILIDAD) */}
            {datosSismaVivo && (
              <div
                className="rounded-xl p-4 border space-y-4"
                style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }}
              >
                <button
                  type="button"
                  onClick={() => setPersianaEdadesVivaAbierta((prev) => !prev)}
                  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: "#FFFFFF", color: "#047857", border: "1px solid #86EFAC" }}
                    >
                      {persianaEdadesVivaAbierta ? "▴" : "▾"}
                    </span>
                    <h4 className="text-sm font-extrabold" style={{ color: "#065F46" }}>
                      {persianaEdadesVivaAbierta
                        ? "▴ Replegar Cortina: Cartera por Edades y Auxiliar Abierto en Vivo (API SISMA)"
                        : `▾ Desplegar Cortina: Cartera por Edades (${datosSismaVivo.filasFacturas.toLocaleString("es-CO")} facturas) y Giros en Vivo — Corte ${datosSismaVivo.fechaCorte}`}
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#065F46" }}>
                    Conectado a Contabilidad SISMA
                  </span>
                </button>

                {persianaEdadesVivaAbierta && (
                  <div className="space-y-4 pt-1">
                    {/* 8 TRAMOS DE EDAD DE CARTERA EN VIVO */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                      {[
                        { label: "Por Vencer", val: datosSismaVivo.edades.porVencer, cor: true },
                        { label: "1 a 30 Días", val: datosSismaVivo.edades.d30, cor: true },
                        { label: "31 a 60 Días", val: datosSismaVivo.edades.d60, cor: true },
                        { label: "61 a 90 Días", val: datosSismaVivo.edades.d90, cor: false },
                        { label: "91 a 120 Días", val: datosSismaVivo.edades.d120, cor: false },
                        { label: "121 a 180 Días", val: datosSismaVivo.edades.d180, cor: false },
                        { label: "181 a 360 Días", val: datosSismaVivo.edades.d360, cor: false },
                        { label: "Más de 360 Días", val: datosSismaVivo.edades.mas360, cor: false },
                      ].map((tramo) => (
                        <div
                          key={tramo.label}
                          className="rounded-xl p-3 border bg-white"
                          style={{ borderColor: tramo.cor ? "#BFDBFE" : "#FECDD3" }}
                        >
                          <div
                            className="text-[10px] font-extrabold uppercase"
                            style={{ color: tramo.cor ? "#1D58D8" : "#BE123C" }}
                          >
                            {tramo.label}
                          </div>
                          <div className="text-xs sm:text-sm font-mono font-extrabold mt-1" style={{ color: "#0E245E" }}>
                            {formatCOP(tramo.val)}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>
                            {tramo.cor ? "Corriente (<=60d)" : "Vencida (>60d)"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CUENTAS DE AUXILIAR ABIERTO DE GIROS EN VIVO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {datosSismaVivo.cuentasGirosDetalle.map((cg) => (
                        <div
                          key={cg.codigo}
                          className="rounded-xl p-3.5 border bg-white flex items-center justify-between gap-2"
                          style={{ borderColor: "#FDE68A" }}
                        >
                          <div>
                            <div className="text-xs font-extrabold font-mono" style={{ color: "#B45309" }}>
                              Cuenta {cg.codigo} ({cg.documentos} docs)
                            </div>
                            <div className="text-[11px] font-medium" style={{ color: "#475569" }}>
                              {cg.nombre}
                            </div>
                          </div>
                          <div className="text-sm font-mono font-extrabold whitespace-nowrap" style={{ color: "#92400E" }}>
                            {formatCOP(cg.saldoAbsoluto)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* TOP ENTIDADES EN CARTERA POR EDADES EN VIVO (HOMOLOGADAS POR NIT, SEDE Y ORIGEN) */}
                    <div className="overflow-x-auto border rounded-xl bg-white" style={{ borderColor: "#E2ECF8" }}>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                            <th className="text-left p-2.5 font-bold">Sede</th>
                            <th className="text-left p-2.5 font-bold">Entidad Homologada (NIT SISMA)</th>
                            <th className="text-left p-2.5 font-bold">De dónde es (Convenio / Régimen)</th>
                            <th className="text-left p-2.5 font-bold">Responsable</th>
                            <th className="text-right p-2.5 font-bold">Facturas</th>
                            <th className="text-right p-2.5 font-bold">Pend. Radicar (130125)</th>
                            <th className="text-right p-2.5 font-bold">Corriente (&lt;= 60d)</th>
                            <th className="text-right p-2.5 font-bold">Vencida (&gt; 60d)</th>
                            <th className="text-right p-2.5 font-bold">Saldo Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                          {empresasSismaFiltradas.map((emp) => {
                            const infoH = homologarEmpresaYOrigen({
                              empresa: emp.nombreHomologado || emp.razonSocial,
                              empresaOriginal: emp.razonSocialOriginal || emp.razonSocial,
                              nit: emp.nit,
                            });
                            const sedeLbl = emp.sede || (infoH.esMutual ? "Sede 2 · Consultorios" : "Sede 1 · Principal");
                            const respLbl = emp.responsable || normalizarResponsableReal("", infoH.empresaCorta);
                            return (
                              <tr key={emp.nit + emp.razonSocial} className="hover:bg-[#EFF6FF] transition-colors">
                                <td className="p-2.5 whitespace-nowrap">
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                                    style={{
                                      backgroundColor: infoH.esMutual ? "#EFF6FF" : "#ECFDF5",
                                      color: infoH.esMutual ? "#1D4ED8" : "#047857",
                                      borderColor: infoH.esMutual ? "#BFDBFE" : "#A7F3D0",
                                    }}
                                  >
                                    {sedeLbl}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-[#0E245E]">{infoH.empresaHomologada}</div>
                                  {infoH.nit && (
                                    <div className="text-[10.5px] font-mono text-[#64748B]">NIT {infoH.nit}</div>
                                  )}
                                </td>
                                <td className="p-2.5 font-semibold text-[#334155]">
                                  {emp.deDondeEs || infoH.deDondeEs}
                                </td>
                                <td className="p-2.5 font-semibold text-[#475569]">{respLbl}</td>
                                <td className="p-2.5 text-right font-mono" style={{ color: "#334155" }}>
                                  {emp.facturasCount.toLocaleString("es-CO")}
                                </td>
                                <td className="p-2.5 text-right font-mono" style={{ color: "#B45309" }}>
                                  {formatCOP(emp.pendienteRadicar)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-semibold" style={{ color: "#1D58D8" }}>
                                  {formatCOP(emp.corriente)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-semibold" style={{ color: "#BE123C" }}>
                                  {formatCOP(emp.vencida)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-extrabold" style={{ color: "#0E245E" }}>
                                  {formatCOP(emp.total)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GRÁFICA Y TABLA COMPARATIVA DE CORTES CON PERSIANA */}
            <div
              className="rounded-xl p-4 border space-y-4"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2ECF8" }}
            >
              <button
                type="button"
                onClick={() => setPersianaCortesAbierta((prev) => !prev)}
                className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: "#FFFFFF", color: "#1D58D8", border: "1px solid #CBD5E1" }}
                  >
                    {persianaCortesAbierta ? "▴" : "▾"}
                  </span>
                  <h4 className="text-sm font-extrabold" style={{ color: "#0E245E" }}>
                    Comparativo por Corte y Tabla de Saldos ({modalidadSisma === "TODAS" ? "Todas las Empresas" : "Modalidad PYP"})
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold" style={{ color: "#334155" }}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: "#1D58D8" }} /> Corriente (&lt; 60 d)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: "#E11D48" }} /> Vencida (&gt;= 60 d)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: "#F59E0B" }} /> Giros por Cruzar
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: "#059669" }} /> Total Cartera Real
                  </span>
                </div>
              </button>

              {persianaCortesAbierta && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {listaCortesActiva.map((corte, idx) => {
                      const pctCorriente = Math.round((corte.carteraCorriente / maxValorGrafica) * 100);
                      const pctVencida = Math.round((corte.carteraVencida / maxValorGrafica) * 100);
                      const pctAnticipos = Math.round((corte.anticiposPorCruzar / maxValorGrafica) * 100);
                      const pctReal = Math.round((corte.totalCarteraReal / maxValorGrafica) * 100);
                      const activo = idx === indiceCorteActivo;

                      return (
                        <div
                          key={corte.fechaCorte}
                          onClick={() =>
                            seleccionarCorteYSincronizar(idx, corte.fechaCorte)
                          }
                          className="rounded-xl p-4 border transition cursor-pointer"
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderColor: activo ? "#1D58D8" : "#E2ECF8",
                            boxShadow: activo ? "0 0 0 2px rgba(29,88,216,0.15)" : "none",
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-extrabold text-sm" style={{ color: "#0E245E" }}>
                              Corte {corte.fechaCorte}
                            </span>
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                              style={{
                                backgroundColor: activo ? "#EFF6FF" : "#F1F5F9",
                                color: activo ? "#1D58D8" : "#475569",
                              }}
                            >
                              {corte.modalidad}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span style={{ color: "#475569" }}>Corriente (&lt; 60 d)</span>
                                <span className="font-mono font-bold" style={{ color: "#1D58D8" }}>
                                  {formatCOP(corte.carteraCorriente)}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                                <div className="h-full rounded-full" style={{ width: `${pctCorriente}%`, backgroundColor: "#1D58D8" }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span style={{ color: "#475569" }}>Vencida (&gt;= 60 d)</span>
                                <span className="font-mono font-bold" style={{ color: "#E11D48" }}>
                                  {formatCOP(corte.carteraVencida)}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                                <div className="h-full rounded-full" style={{ width: `${pctVencida}%`, backgroundColor: "#E11D48" }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span style={{ color: "#475569" }}>(-) Giros por cruzar</span>
                                <span className="font-mono font-bold" style={{ color: "#D97706" }}>
                                  {formatCOP(corte.anticiposPorCruzar)}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                                <div className="h-full rounded-full" style={{ width: `${pctAnticipos}%`, backgroundColor: "#F59E0B" }} />
                              </div>
                            </div>

                            <div className="pt-1.5 border-t" style={{ borderColor: "#F1F5F9" }}>
                              <div className="flex justify-between mb-1">
                                <span className="font-bold" style={{ color: "#0E245E" }}>
                                  Total Cartera Real
                                </span>
                                <span className="font-mono font-extrabold" style={{ color: "#059669" }}>
                                  {realCOP(corte.totalCarteraReal)}
                                </span>
                              </div>
                              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0" }}>
                                <div className="h-full rounded-full" style={{ width: `${pctReal}%`, backgroundColor: "#059669" }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* TABLA RESUMEN DE CORTES A ANCHO COMPLETO */}
                  <div className="overflow-x-auto border rounded-xl bg-white" style={{ borderColor: "#E2ECF8" }}>
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                          <th className="text-left p-3 font-bold">
                            Concepto ({modalidadSisma === "TODAS" ? "Todas las Empresas" : "Modalidad PYP"})
                          </th>
                          <th className="text-center p-3 font-bold">Clasificación</th>
                          {listaCortesActiva.map((c) => (
                            <th key={c.fechaCorte} className="text-right p-3 font-bold">
                              Corte {c.fechaCorte}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                        <tr>
                          <td className="p-3 font-bold" style={{ color: "#0E245E" }}>
                            Cartera Corriente
                          </td>
                          <td className="p-3 text-center font-semibold" style={{ color: "#1D58D8" }}>
                            (+) Radicada &lt; 60 días
                          </td>
                          {listaCortesActiva.map((c) => (
                            <td key={c.fechaCorte} className="p-3 text-right font-mono font-semibold" style={{ color: "#0E245E" }}>
                              {formatCOP(c.carteraCorriente)}
                            </td>
                          ))}
                        </tr>

                        <tr>
                          <td className="p-3 font-bold" style={{ color: "#0E245E" }}>
                            Cartera Vencida
                          </td>
                          <td className="p-3 text-center font-semibold" style={{ color: "#E11D48" }}>
                            (+) Radicada &gt;= 60 días
                          </td>
                          {listaCortesActiva.map((c) => (
                            <td key={c.fechaCorte} className="p-3 text-right font-mono font-bold" style={{ color: "#BE123C" }}>
                              {formatCOP(c.carteraVencida)}
                            </td>
                          ))}
                        </tr>

                        <tr style={{ backgroundColor: "#EFF6FF" }}>
                          <td className="p-3 font-extrabold" style={{ color: "#0E245E" }}>
                            Cartera Total
                          </td>
                          <td className="p-3 text-center font-bold" style={{ color: "#1E40AF" }}>
                            (=) Suma Corriente + Vencida
                          </td>
                          {listaCortesActiva.map((c) => (
                            <td key={c.fechaCorte} className="p-3 text-right font-mono font-extrabold" style={{ color: "#1E40AF" }}>
                              {formatCOP(c.carteraTotal)}
                            </td>
                          ))}
                        </tr>

                        <tr>
                          <td className="p-3 font-medium" style={{ color: "#334155" }}>
                            Facturas pendientes por radicar
                          </td>
                          <td className="p-3 text-center text-xs" style={{ color: "#64748B" }}>
                            Pendientes de radicación
                          </td>
                          {listaCortesActiva.map((c) => (
                            <td key={c.fechaCorte} className="p-3 text-right font-mono" style={{ color: "#334155" }}>
                              {formatCOP(c.facturasPendientesRadicar)}
                            </td>
                          ))}
                        </tr>

                        <tr>
                          <td className="p-3 font-medium" style={{ color: "#334155" }}>
                            Glosas pendientes por gestionar
                          </td>
                          <td className="p-3 text-center text-xs" style={{ color: "#64748B" }}>
                            En gestión operativa
                          </td>
                          {listaCortesActiva.map((c) => (
                            <td key={c.fechaCorte} className="p-3 text-right font-mono" style={{ color: "#334155" }}>
                              {formatCOP(c.glosasPendientesGestionar)}
                            </td>
                          ))}
                        </tr>

                        <tr style={{ backgroundColor: "#FFFBEB" }}>
                          <td className="p-3 font-bold" style={{ color: "#92400E" }}>
                            Anticipos / Giros por cruzar
                          </td>
                          <td className="p-3 text-center text-xs font-semibold" style={{ color: "#B45309" }}>
                            (−) Auxiliar abierto de giros
                          </td>
                          {listaCortesActiva.map((c) => (
                            <td key={c.fechaCorte} className="p-3 text-right font-mono font-bold" style={{ color: "#92400E" }}>
                              {formatCOP(c.anticiposPorCruzar)}
                            </td>
                          ))}
                        </tr>

                        <tr style={{ backgroundColor: "#ECFDF5" }}>
                          <td className="p-3 font-extrabold" style={{ color: "#065F46" }}>
                            TOTAL CARTERA REAL
                          </td>
                          <td className="p-3 text-center font-extrabold" style={{ color: "#047857" }}>
                            (=) Cartera Total − Giros por cruzar
                          </td>
                          {listaCortesActiva.map((c) => (
                            <td key={c.fechaCorte} className="p-3 text-right font-mono font-extrabold text-base" style={{ color: "#047857" }}>
                              {realCOP(c.totalCarteraReal)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* CUADRO 2A: VENTA TOTAL Y TOTAL FACTURADO VS. CARTERA (MENSUAL)        */}
      {/* ===================================================================== */}
      {(() => {
        const anioActivoComp =
          aniosFrecSel.length === 1
            ? Number(aniosFrecSel[0])
            : filtroAnio !== "TODOS"
            ? Number(filtroAnio)
            : anioTendencia;

        const uConComp = datosSismaVivo?.desgloseUniverso?.conMutual;
        const baseTotComp =
          uConComp?.carteraTotal ||
          datosSismaCompletaRef.current?.edades?.saldoTotal ||
          corteBaseSeleccionado?.carteraTotal ||
          1;
        const baseGirComp =
          uConComp?.anticiposPorCruzar ||
          corteBaseSeleccionado?.anticiposPorCruzar ||
          1;
        const factorTotComp =
          tieneFiltroEntidadDirecto || modalidadSisma === "PYP"
            ? Math.min(1, Math.max(0, corteSeleccionado.carteraTotal / Math.max(1, baseTotComp)))
            : 1;
        const factorGirComp =
          tieneFiltroEntidadDirecto || modalidadSisma === "PYP"
            ? Math.min(1, Math.max(0, corteSeleccionado.anticiposPorCruzar / Math.max(1, baseGirComp)))
            : 1;

        // Deduplicación estricta por número de factura real (jamás sumar 2 veces una factura con varias glosas)
        const mapaFacturasUnicas = new Map<
          string,
          { valor: number; fechaIso: string; anio: string; anulada: boolean }
        >();
        const registrarFacturaUnica = (
          numRaw: string | undefined,
          idFallback: string,
          valor: number,
          fechaRaw: string | undefined,
          anioRaw: string | undefined,
          esAnulada: boolean
        ) => {
          const v = Math.max(0, Number(valor || 0));
          const numLimpio = String(numRaw || "").trim().toUpperCase();
          const clave =
            numLimpio && numLimpio !== "-" && numLimpio !== "PENDIENTE"
              ? `FAC:${numLimpio}`
              : `ID:${idFallback}`;
          const prev = mapaFacturasUnicas.get(clave);
          const fIso = String(fechaRaw || "").trim().slice(0, 10);
          if (!prev) {
            mapaFacturasUnicas.set(clave, {
              valor: v,
              fechaIso: fIso,
              anio: String(anioRaw || fIso.slice(0, 4) || ""),
              anulada: esAnulada,
            });
          } else {
            if (v > prev.valor) prev.valor = v;
            if (!prev.fechaIso && fIso) prev.fechaIso = fIso;
            if (esAnulada) prev.anulada = true;
          }
        };

        for (const f of facturasBaseFiltradas) {
          const est = String(f.estadoGestion || "").toUpperCase();
          const esAnul = est === "ANULADA" || est === "REEMPLAZADA" || est === "PENDIENTE_REEMPLAZO";
          registrarFacturaUnica(
            f.factura,
            f.id,
            f.valorRadicado || 0,
            f.fechaFactura || f.fechaRadicacion || f.periodo,
            f.anio,
            esAnul
          );
        }
        for (const l of legalizadasFiltradas) {
          registrarFacturaUnica(
            l.factura,
            `leg-${l.id}`,
            l.valorRadicado || 0,
            l.fechaFactura || l.fechaRadicacion || l.periodo,
            l.anio,
            false
          );
        }
        for (const g of glosasFiltradas) {
          registrarFacturaUnica(
            g.factura,
            `glo-${g.id}`,
            g.valorFacturado || g.valorFactura || g.valorRadicado || 0,
            g.fechaFactura || g.fechaRadicacion || g.periodo,
            g.anio,
            false
          );
        }
        for (const a of anuladasFiltradas) {
          registrarFacturaUnica(
            a.factura,
            `anu-${a.id}`,
            a.valorRadicado || 0,
            a.fechaFactura || a.fechaRadicacion || a.periodo,
            a.anio,
            true
          );
        }

        let totalFacturadoAuditadoVigente = 0;
        let cantFacturasAuditadasVigentes = 0;
        const facturadoAuditadoMes = new Array<number>(12).fill(0);

        mapaFacturasUnicas.forEach((info) => {
          if (info.anulada) return;
          totalFacturadoAuditadoVigente += info.valor;
          if (info.valor > 0) cantFacturasAuditadasVigentes += 1;
          if (
            /^\d{4}-\d{2}/.test(info.fechaIso) &&
            Number(info.fechaIso.slice(0, 4)) === anioActivoComp
          ) {
            const mIdx = Number(info.fechaIso.slice(5, 7)) - 1;
            if (mIdx >= 0 && mIdx < 12) facturadoAuditadoMes[mIdx] += info.valor;
          }
        });

        const glosadoPorMesComp = new Array<number>(12).fill(0);
        for (const g of glosasFiltradas) {
          const fRef = String(
            g.fechaNotificacionGlosa || g.fechaRadicacion || g.fechaFactura || g.periodo || ""
          ).trim();
          if (/^\d{4}-\d{2}/.test(fRef) && Number(fRef.slice(0, 4)) === anioActivoComp) {
            const mIdx = Number(fRef.slice(5, 7)) - 1;
            if (mIdx >= 0 && mIdx < 12) glosadoPorMesComp[mIdx] += g.valorGlosado || 0;
          }
        }

        const factSisma = datosSismaVivo?.facturacionSisma;
        const hayVentaContableSisma = Boolean(
          factSisma?.ventaContableDisponible && (factSisma.ventaContableTotal || 0) > 0
        );
        const totalEmitidoAbiertoSisma = (factSisma?.porMes || []).reduce(
          (acc, m) => acc + (m.saldoAbiertoEmitidoMes || 0),
          0
        );
        const totalGlosadoActivoComp = glosasFiltradas.reduce(
          (acc, g) => acc + (g.valorGlosado || 0),
          0
        );

        const corteIsoAct = datosSismaVivo?.corteISO || fechaCorteVivo || ayerEnColombia();
        const mesCorteAct = Number(corteIsoAct.slice(5, 7)) || 11;
        const maxMesComp =
          anioActivoComp === Number(corteIsoAct.slice(0, 4)) ? mesCorteAct : 12;
        const etiquetasMesesCortas = [
          "Ene",
          "Feb",
          "Mar",
          "Abr",
          "May",
          "Jun",
          "Jul",
          "Ago",
          "Sep",
          "Oct",
          "Nov",
          "Dic",
        ];

        const mapaCierresAnio = new Map<number, CierreMes>();
        for (const c of cierresTodos) {
          if (c.anio === anioActivoComp) mapaCierresAnio.set(c.mes, c);
        }

        const filasCompMensual = Array.from({ length: maxMesComp }, (_, idx) => {
          const mesNum = idx + 1;
          const mm = String(mesNum).padStart(2, "0");
          if (
            mesesFrecSel.length > 0 &&
            mesesFrecSel.length < 12 &&
            !mesesFrecSel.includes(mm)
          ) {
            return null;
          }
          const sismaMes = factSisma?.porMes?.find((x) => x.mes === `${anioActivoComp}-${mm}`);
          const cierreMes = mapaCierresAnio.get(mesNum);
          const esMesCongeladoActual =
            anioActivoComp === Number(corteIsoAct.slice(0, 4)) &&
            mesNum === mesCorteAct &&
            Boolean(datosSismaVivo) &&
            !sinGiros;

          const carteraTotMes = esMesCongeladoActual
            ? corteSeleccionado.carteraTotal
            : cierreMes
            ? Math.round(cierreMes.carteraTotal * factorTotComp)
            : 0;
          const girosMes = esMesCongeladoActual
            ? corteSeleccionado.anticiposPorCruzar
            : cierreMes
            ? Math.round(
                (cierreMes.girosPorCruzar ??
                  Math.max(0, cierreMes.carteraTotal - cierreMes.carteraReal)) *
                  factorGirComp
              )
            : 0;
          const carteraRealMes = esMesCongeladoActual
            ? corteSeleccionado.totalCarteraReal
            : cierreMes
            ? Math.round(carteraTotMes - girosMes)
            : 0;

          const ventaContable = hayVentaContableSisma ? sismaMes?.ventaContable || 0 : null;
          const emitidoAbierto = sismaMes?.saldoAbiertoEmitidoMes || 0;
          const facturadoAudit = facturadoAuditadoMes[idx] || 0;
          const barraFacturacion =
            ventaContable !== null ? ventaContable : Math.max(emitidoAbierto, facturadoAudit);

          return {
            mesNum,
            mm,
            etiqueta: `${etiquetasMesesCortas[idx]}${esMesCongeladoActual ? "*" : ""}`,
            ventaContable,
            emitidoAbierto,
            facturadoAudit,
            barraFacturacion,
            carteraTotMes,
            carteraRealMes,
            glosadoMes: glosadoPorMesComp[idx] || 0,
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null);

        const nComp = filasCompMensual.length;
        const svgCompW = 780;
        const svgCompH = 290;
        const padCompL = 82;
        const padCompR = 28;
        const padCompT = 22;
        const baseCompY = 254;
        const plotCompW = svgCompW - padCompL - padCompR;
        const plotCompH = baseCompY - padCompT;

        const maxCompBruto = Math.max(
          1,
          ...filasCompMensual.flatMap((f) => [
            f.barraFacturacion,
            f.carteraTotMes,
            f.carteraRealMes,
            f.glosadoMes,
          ])
        );
        const escalaComp = generarTicksEjeY(maxCompBruto * 1.06, 4);
        const getXComp = (i: number) =>
          nComp <= 1
            ? padCompL + plotCompW / 2
            : padCompL + ((i + 0.5) / nComp) * plotCompW;
        const getYComp = (v: number) =>
          baseCompY - (Math.max(0, v) / escalaComp.techo) * plotCompH;

        const curvaSuaveComp = (pts: { x: number; y: number }[]) => {
          if (pts.length === 0) return "";
          if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
          let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i + 1];
            const cx1 = p0.x + (p1.x - p0.x) * 0.4;
            const cx2 = p1.x - (p1.x - p0.x) * 0.4;
            d += ` C ${cx1.toFixed(1)} ${p0.y.toFixed(1)}, ${cx2.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
          }
          return d;
        };

        const ptsCarteraTot = filasCompMensual
          .map((f, i) => ({ x: getXComp(i), y: getYComp(f.carteraTotMes), v: f.carteraTotMes }))
          .filter((p) => p.v > 0);
        const ptsCarteraReal = filasCompMensual
          .map((f, i) => ({ x: getXComp(i), y: getYComp(f.carteraRealMes), v: f.carteraRealMes }))
          .filter((p) => p.v > 0);

        const idxInspVenta =
          hoverVentaMesIdx !== null && hoverVentaMesIdx < filasCompMensual.length
            ? hoverVentaMesIdx
            : filasCompMensual.length > 0
            ? filasCompMensual.length - 1
            : null;
        const filaInspVenta = idxInspVenta !== null ? filasCompMensual[idxInspVenta] : null;

        return (
          <div
            className="rounded-xl p-6 shadow-xs border space-y-5"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#E2ECF8]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold text-[#0E245E]">
                    Venta Total y Total Facturado vs. Cartera ({anioActivoComp})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {hayVentaContableSisma
                      ? "Ingresos PUC 41–43 + Cartera SISMA"
                      : "Facturación Emitida / Auditada Real vs. Cierre Cartera"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B]">
                  Compara mes a mes la facturación real registrada frente al saldo acumulado de Cartera Total, Cartera Real Neta y Glosas del período.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E2ECF8] bg-white text-[#312E81]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#4F46E5]" />
                  {hayVentaContableSisma ? "Venta Contable Mes" : "Facturado Emitido / Auditado Mes"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E2ECF8] bg-white text-[#BE123C]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#E11D48]" />
                  Glosado Mes
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E2ECF8] bg-white text-[#1D58D8]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1D58D8]" />
                  Cartera Total
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E2ECF8] bg-white text-[#047857]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                  Cartera Real
                </span>
              </div>
            </div>

            {/* 5 KPIs DE VENTA / TOTAL FACTURADO VS CARTERA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="p-3.5 rounded-xl border bg-[#EEF2FF]/55" style={{ borderColor: "#C7D2FE" }}>
                <div className="text-[10.5px] font-bold text-[#3730A3] uppercase tracking-wider">
                  {hayVentaContableSisma ? "Venta Total Contable (SISMA)" : "Total Facturado Auditado Único"}
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#312E81]">
                  {hayVentaContableSisma
                    ? formatCOP(factSisma?.ventaContableTotal || 0)
                    : formatCOP(totalFacturadoAuditadoVigente)}
                </div>
                <div className="mt-1 text-[11px] text-[#4338CA] leading-snug">
                  {hayVentaContableSisma
                    ? `PUC 41–43 SISMA (${factSisma?.cuentasIngresos?.length || 0} cuentas)`
                    : `${cantFacturasAuditadasVigentes.toLocaleString("es-CO")} facturas únicas vigentes en control`}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#F8FAFC]" style={{ borderColor: "#E2ECF8" }}>
                <div className="text-[10.5px] font-bold text-[#475569] uppercase tracking-wider">
                  Saldo Emitido Abierto ({anioActivoComp})
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#0E245E]">
                  {formatCOP(totalEmitidoAbiertoSisma || corteSeleccionado.carteraTotal)}
                </div>
                <div className="mt-1 text-[11px] text-[#64748B] leading-snug">
                  Facturas emitidas en {anioActivoComp} con saldo activo en SISMA
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#EFF6FF]/65" style={{ borderColor: "#BFDBFE" }}>
                <div className="text-[10.5px] font-bold text-[#1D4ED8] uppercase tracking-wider">
                  Cartera Total (Corte Activo)
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#1D4ED8]">
                  {formatCOP(corteSeleccionado.carteraTotal)}
                </div>
                <div className="mt-1 text-[11px] text-[#1E40AF] leading-snug">
                  Corriente {formatMillones(corteSeleccionado.carteraCorriente)} · Vencida {formatMillones(corteSeleccionado.carteraVencida)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#ECFDF5]/65" style={{ borderColor: "#A7F3D0" }}>
                <div className="text-[10.5px] font-bold text-[#047857] uppercase tracking-wider">
                  Cartera Real Neta (− Giros)
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#047857]">
                  {realCOP(corteSeleccionado.totalCarteraReal)}
                </div>
                <div className="mt-1 text-[11px] text-[#065F46] leading-snug">
                  Descontando {formatMillones(corteSeleccionado.anticiposPorCruzar)} en giros por cruzar
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#FFF1F2]/65" style={{ borderColor: "#FECDD3" }}>
                <div className="text-[10.5px] font-bold text-[#BE123C] uppercase tracking-wider">
                  Peso Glosa vs. Facturado / Cartera
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#BE123C]">
                  {totalFacturadoAuditadoVigente > 0
                    ? `${((totalGlosadoActivoComp / totalFacturadoAuditadoVigente) * 100).toFixed(1)}%`
                    : "0.0%"}
                  <span className="text-xs font-bold text-[#64748B] ml-1.5">
                    ({corteSeleccionado.carteraTotal > 0
                      ? `${((totalGlosadoActivoComp / corteSeleccionado.carteraTotal) * 100).toFixed(1)}% s/cartera`
                      : "0% s/cartera"})
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[#9F1239] leading-snug">
                  Glosado activo: {formatCOP(totalGlosadoActivoComp)}
                </div>
              </div>
            </div>

            {/* BARRA INTERACTIVA DE CURSOR + GRÁFICA COMPARATIVA CON EJE Y IZQUIERDO */}
            {filaInspVenta && (
              <div
                className="rounded-xl border px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] transition-colors"
                style={{
                  backgroundColor: hoverVentaMesIdx !== null ? "#EEF2FF" : "#F8FAFC",
                  borderColor: hoverVentaMesIdx !== null ? "#A5B4FC" : "#E2ECF8",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md font-extrabold text-white bg-[#312E81]">
                    {filaInspVenta.etiqueta.replace("*", "")} {anioActivoComp}
                  </span>
                  <span className="text-[#475569] font-semibold">
                    {hoverVentaMesIdx !== null ? "Inspección activa con cursor" : "Mueve el cursor sobre las barras o la tabla inferior"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono text-[11px]">
                  {filaInspVenta.ventaContable !== null && (
                    <span className="text-[#312E81]">
                      <strong>Venta SISMA:</strong> {formatCOP(filaInspVenta.ventaContable)}
                    </span>
                  )}
                  <span className="text-[#4338CA]">
                    <strong>Emitido Abierto:</strong> {formatCOP(filaInspVenta.emitidoAbierto)}
                  </span>
                  <span className="text-[#0F172A]">
                    <strong>Fact. Auditado:</strong> {formatCOP(filaInspVenta.facturadoAudit)}
                  </span>
                  <span className="text-[#1D58D8]">
                    <strong>Cartera Total:</strong> {formatCOP(filaInspVenta.carteraTotMes)}
                  </span>
                  <span className="text-[#047857]">
                    <strong>Cartera Real:</strong> {realCOP(filaInspVenta.carteraRealMes)}
                  </span>
                  <span className="text-[#BE123C] font-bold">
                    <strong>Glosado:</strong> {formatCOP(filaInspVenta.glosadoMes)}
                  </span>
                </div>
              </div>
            )}

            {nComp > 0 && (
              <svg
                viewBox={`0 0 ${svgCompW} ${svgCompH}`}
                className="w-full h-auto select-none overflow-visible"
                onMouseLeave={() => setHoverVentaMesIdx(null)}
              >
                <line
                  x1={padCompL - 10}
                  y1={padCompT - 4}
                  x2={padCompL - 10}
                  y2={baseCompY}
                  stroke="#CBD5E1"
                  strokeWidth="1.2"
                />
                {escalaComp.ticks.map((tk, idx) => {
                  const gy = getYComp(tk.valor);
                  return (
                    <g key={`tk-comp-${idx}`}>
                      <line
                        x1={padCompL - 10}
                        y1={gy}
                        x2={svgCompW - padCompR}
                        y2={gy}
                        stroke={tk.valor === 0 ? "#334155" : "#E2E8F0"}
                        strokeWidth={tk.valor === 0 ? "1.2" : "1"}
                        strokeDasharray={tk.valor === 0 ? undefined : "3.5 3.5"}
                      />
                      <text
                        x={padCompL - 16}
                        y={gy + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fontWeight="700"
                        fill="#334155"
                        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                      >
                        {tk.label}
                      </text>
                    </g>
                  );
                })}

                {filasCompMensual.map((f, i) => {
                  const cx = getXComp(i);
                  const paso = plotCompW / Math.max(1, nComp);
                  const barW = Math.min(20, Math.max(8, paso * 0.28));
                  const yFact = getYComp(f.barraFacturacion);
                  const yGlos = getYComp(f.glosadoMes);
                  const activo = hoverVentaMesIdx === i;
                  return (
                    <g
                      key={`bar-comp-${f.mm}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverVentaMesIdx(i)}
                    >
                      {activo && (
                        <>
                          <rect
                            x={cx - paso * 0.44}
                            y={padCompT - 4}
                            width={paso * 0.88}
                            height={baseCompY - padCompT + 4}
                            rx={6}
                            fill="#E0E7FF"
                            opacity="0.35"
                          />
                          <line
                            x1={cx}
                            y1={padCompT - 4}
                            x2={cx}
                            y2={baseCompY}
                            stroke="#4F46E5"
                            strokeWidth="1.2"
                            strokeDasharray="4 3"
                          />
                        </>
                      )}
                      <rect
                        x={cx - barW - 1.5}
                        y={yFact}
                        width={barW}
                        height={Math.max(1.5, baseCompY - yFact)}
                        rx={3.5}
                        fill="#4F46E5"
                        opacity={activo ? 1 : 0.85}
                      />
                      <rect
                        x={cx + 1.5}
                        y={yGlos}
                        width={barW}
                        height={Math.max(f.glosadoMes > 0 ? 2.5 : 0, baseCompY - yGlos)}
                        rx={3.5}
                        fill="#E11D48"
                        opacity={activo ? 1 : 0.9}
                      />
                      <text
                        x={cx}
                        y={baseCompY + 18}
                        textAnchor="middle"
                        fontSize={activo ? "11" : "10.2"}
                        fontWeight={activo ? "800" : "600"}
                        fill={activo ? "#312E81" : "#0F172A"}
                      >
                        {f.etiqueta}
                      </text>
                      <rect
                        x={cx - paso / 2}
                        y={padCompT - 4}
                        width={paso}
                        height={baseCompY - padCompT + 28}
                        fill="transparent"
                      />
                    </g>
                  );
                })}

                {ptsCarteraTot.length > 0 && (
                  <path
                    d={curvaSuaveComp(ptsCarteraTot)}
                    fill="none"
                    stroke="#1D58D8"
                    strokeWidth="2.4"
                    pointerEvents="none"
                  />
                )}
                {ptsCarteraReal.length > 0 && (
                  <path
                    d={curvaSuaveComp(ptsCarteraReal)}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.3"
                    pointerEvents="none"
                  />
                )}
                {filasCompMensual.map((f, i) => {
                  const cx = getXComp(i);
                  const activo = hoverVentaMesIdx === i;
                  return (
                    <g key={`nds-comp-${f.mm}`} pointerEvents="none">
                      {f.carteraTotMes > 0 && (
                        <circle
                          cx={cx}
                          cy={getYComp(f.carteraTotMes)}
                          r={activo ? 5.6 : 3.8}
                          fill="#1D58D8"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      )}
                      {f.carteraRealMes > 0 && (
                        <circle
                          cx={cx}
                          cy={getYComp(f.carteraRealMes)}
                          r={activo ? 5.6 : 3.8}
                          fill="#059669"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* TABLA MENSUAL VENTA / FACTURACIÓN VS CARTERA SINCRONIZADA CON CURSOR */}
            {nComp > 0 && (
              <div
                className="overflow-x-auto rounded-xl border"
                style={{ borderColor: "#E2ECF8" }}
                onMouseLeave={() => setHoverVentaMesIdx(null)}
              >
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC" }}>
                      <th className="p-2 text-left font-extrabold text-[#0E245E] sticky left-0 bg-[#F8FAFC] border-b border-r min-w-[190px]" style={{ borderColor: "#E2ECF8" }}>
                        Serie Mensual ({anioActivoComp})
                      </th>
                      {filasCompMensual.map((f, i) => (
                        <th
                          key={`th-vc-${f.mm}`}
                          onMouseEnter={() => setHoverVentaMesIdx(i)}
                          className="p-2 text-right font-extrabold border-b cursor-pointer transition-colors min-w-[74px]"
                          style={{
                            borderColor: "#E2ECF8",
                            backgroundColor: hoverVentaMesIdx === i ? "#E0E7FF" : "#F8FAFC",
                            color: hoverVentaMesIdx === i ? "#312E81" : "#0E245E",
                          }}
                        >
                          {f.etiqueta}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                    {hayVentaContableSisma && (
                      <tr>
                        <td className="p-2 font-bold text-[#312E81] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                          Venta Contable SISMA (PUC 41–43)
                        </td>
                        {filasCompMensual.map((f, i) => (
                          <td
                            key={`td-vcs-${f.mm}`}
                            onMouseEnter={() => setHoverVentaMesIdx(i)}
                            className="p-2 text-right font-mono font-bold text-[#312E81] cursor-pointer"
                            style={{ backgroundColor: hoverVentaMesIdx === i ? "#EEF2FF" : "transparent" }}
                            title={formatCOP(f.ventaContable || 0)}
                          >
                            {formatMillones(f.ventaContable || 0)}
                          </td>
                        ))}
                      </tr>
                    )}
                    <tr>
                      <td className="p-2 font-semibold text-[#4338CA] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                        Saldo Emitido Abierto (SISMA)
                      </td>
                      {filasCompMensual.map((f, i) => (
                        <td
                          key={`td-emi-${f.mm}`}
                          onMouseEnter={() => setHoverVentaMesIdx(i)}
                          className="p-2 text-right font-mono text-[#4338CA] cursor-pointer"
                          style={{ backgroundColor: hoverVentaMesIdx === i ? "#EEF2FF" : "transparent" }}
                          title={formatCOP(f.emitidoAbierto)}
                        >
                          {formatMillones(f.emitidoAbierto)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-[#0F172A] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                        Facturado Auditado Único (Control)
                      </td>
                      {filasCompMensual.map((f, i) => (
                        <td
                          key={`td-fau-${f.mm}`}
                          onMouseEnter={() => setHoverVentaMesIdx(i)}
                          className="p-2 text-right font-mono text-[#0F172A] cursor-pointer"
                          style={{ backgroundColor: hoverVentaMesIdx === i ? "#EEF2FF" : "transparent" }}
                          title={formatCOP(f.facturadoAudit)}
                        >
                          {formatMillones(f.facturadoAudit)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-[#1D58D8] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                        Cierre Cartera Total
                      </td>
                      {filasCompMensual.map((f, i) => (
                        <td
                          key={`td-ct-${f.mm}`}
                          onMouseEnter={() => setHoverVentaMesIdx(i)}
                          className="p-2 text-right font-mono font-bold text-[#1D58D8] cursor-pointer"
                          style={{ backgroundColor: hoverVentaMesIdx === i ? "#EEF2FF" : "transparent" }}
                          title={formatCOP(f.carteraTotMes)}
                        >
                          {f.carteraTotMes > 0 ? formatMillones(f.carteraTotMes) : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ backgroundColor: "#F0FDF4" }}>
                      <td className="p-2 font-extrabold text-[#047857] sticky left-0 bg-[#F0FDF4] border-r" style={{ borderColor: "#E2ECF8" }}>
                        Cierre Cartera Real Neta
                      </td>
                      {filasCompMensual.map((f, i) => (
                        <td
                          key={`td-cr-${f.mm}`}
                          onMouseEnter={() => setHoverVentaMesIdx(i)}
                          className="p-2 text-right font-mono font-extrabold text-[#047857] cursor-pointer"
                          style={{ backgroundColor: hoverVentaMesIdx === i ? "#DCFCE7" : "#F0FDF4" }}
                          title={realCOP(f.carteraRealMes)}
                        >
                          {f.carteraRealMes > 0 ? realMillones(f.carteraRealMes) : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-[#BE123C] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                        Valor Glosado del Mes
                      </td>
                      {filasCompMensual.map((f, i) => (
                        <td
                          key={`td-gl-${f.mm}`}
                          onMouseEnter={() => setHoverVentaMesIdx(i)}
                          className="p-2 text-right font-mono font-bold text-[#BE123C] cursor-pointer"
                          style={{ backgroundColor: hoverVentaMesIdx === i ? "#FFF1F2" : "transparent" }}
                          title={formatCOP(f.glosadoMes)}
                        >
                          {formatMillones(f.glosadoMes)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {!hayVentaContableSisma && factSisma?.ventaContableNota && (
              <p className="text-[11px] text-[#64748B]">
                Nota de fuente contable: {factSisma.ventaContableNota}
              </p>
            )}
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* CUADRO 2B: DASHBOARD EJECUTIVO DE GLOSAS Y HOMENAJE AL EQUIPO         */}
      {/* ===================================================================== */}
      {(() => {
        const clasificarMontosGlosa = (g: GlosaRow) => {
          const vGlosa = Math.max(0, Number(g.valorGlosado || 0));
          const est = String(g.estado || g.subtabla || "PENDIENTE").toUpperCase();
          const tieneAceptExp = g.valorAceptado !== null && g.valorAceptado !== undefined;
          const vAceptExp = tieneAceptExp
            ? Math.min(vGlosa, Math.max(0, Number(g.valorAceptado || 0)))
            : null;

          if (est === "PENDIENTE" || est === "EN_GESTION") {
            return { glosado: vGlosa, defendido: 0, aceptado: 0, pendiente: vGlosa, estadoNorm: "PENDIENTE" as const };
          }
          if (est === "NO_ACEPTADA" || est === "RESPONDIDA_NO_ACEPTADA") {
            const ac = vAceptExp !== null && vAceptExp > 0 ? vAceptExp : 0;
            return {
              glosado: vGlosa,
              defendido: Math.max(0, vGlosa - ac),
              aceptado: ac,
              pendiente: 0,
              estadoNorm: "DEFENDIDA" as const,
            };
          }
          const ac = vAceptExp !== null ? vAceptExp : vGlosa;
          return {
            glosado: vGlosa,
            defendido: Math.max(0, vGlosa - ac),
            aceptado: ac,
            pendiente: 0,
            estadoNorm: "ACEPTADA" as const,
          };
        };

        // Totales por Causa Normativa sobre el universo filtrado (para poder alternar clic entre causas sin apagar las demás tarjetas)
        const porCausaNorma: Record<string, { monto: number; defendido: number; cantidad: number }> = {
          FA: { monto: 0, defendido: 0, cantidad: 0 },
          TA: { monto: 0, defendido: 0, cantidad: 0 },
          SO: { monto: 0, defendido: 0, cantidad: 0 },
          AU: { monto: 0, defendido: 0, cantidad: 0 },
          CO: { monto: 0, defendido: 0, cantidad: 0 },
        };
        let montoOtrasCausas = 0;
        let defOtrasCausas = 0;
        let cantOtrasCausas = 0;

        for (const g of glosasFiltradas) {
          const cod = causaNormativaDe(g.motivoCodigo);
          const m = clasificarMontosGlosa(g);
          if (cod && porCausaNorma[cod]) {
            porCausaNorma[cod].monto += m.glosado;
            porCausaNorma[cod].defendido += m.defendido;
            porCausaNorma[cod].cantidad += 1;
          } else {
            montoOtrasCausas += m.glosado;
            defOtrasCausas += m.defendido;
            cantOtrasCausas += 1;
          }
        }
        const totGlosadoBaseCausas = glosasFiltradas.reduce((a, g) => a + (g.valorGlosado || 0), 0);

        // Subconjunto activo si el usuario hizo clic en una causa normativa (FA, TA, SO, AU, CO u OTRAS)
        const glosasDash = causaFiltroDash
          ? glosasFiltradas.filter((g) => {
              const cod = causaNormativaDe(g.motivoCodigo);
              return causaFiltroDash === "OTRAS" ? !cod : cod === causaFiltroDash;
            })
          : glosasFiltradas;

        // Facturado único sin duplicar facturas con múltiples glosas
        const factUnicasGlosa = new Map<string, number>();
        for (const g of glosasDash) {
          const k = String(g.factura || "").trim().toUpperCase() || `ID:${g.id}`;
          const vf = Math.max(0, Number(g.valorFacturado || g.valorFactura || g.valorRadicado || 0));
          factUnicasGlosa.set(k, Math.max(factUnicasGlosa.get(k) || 0, vf));
        }
        if (!causaFiltroDash) {
          for (const l of legalizadasFiltradas) {
            const k = String(l.factura || "").trim().toUpperCase() || `LEG:${l.id}`;
            const vf = Math.max(0, Number(l.valorRadicado || 0));
            factUnicasGlosa.set(k, Math.max(factUnicasGlosa.get(k) || 0, vf));
          }
        }
        let totFacturadoUnico = 0;
        factUnicasGlosa.forEach((v) => {
          totFacturadoUnico += v;
        });

        let totGlosado = 0;
        let totDefendido = 0;
        let totAceptado = 0;
        let totPendiente = 0;
        let cantDefendidas = 0;
        let cantAceptadas = 0;
        let cantPendientes = 0;

        for (const g of glosasDash) {
          const m = clasificarMontosGlosa(g);
          totGlosado += m.glosado;
          totDefendido += m.defendido;
          totAceptado += m.aceptado;
          totPendiente += m.pendiente;
          if (m.estadoNorm === "PENDIENTE") cantPendientes += 1;
          else if (m.defendido > 0 && m.defendido >= m.aceptado) cantDefendidas += 1;
          else cantAceptadas += 1;
        }

        const totGestionado = totDefendido + totAceptado;
        const pctEfectividadDefensa =
          totGestionado > 0 ? (totDefendido / totGestionado) * 100 : 0;
        const pctGlosaSobreFact =
          totFacturadoUnico > 0 ? (totGlosado / totFacturadoUnico) * 100 : 0;
        const pctGlosaSobreCartera =
          corteSeleccionado.carteraTotal > 0
            ? (totGlosado / corteSeleccionado.carteraTotal) * 100
            : 0;

        const totAnuladasMonto = anuladasFiltradas.reduce((a, r) => a + (r.valorRadicado || 0), 0);
        const cantReemplazadas = anuladasFiltradas.filter(
          (r) => Boolean(r.facturaReemplaza && r.facturaReemplaza.trim() !== "" && r.facturaReemplaza.trim().toUpperCase() !== "PENDIENTE")
        ).length;
        const cantSinReemplazo = Math.max(0, anuladasFiltradas.length - cantReemplazadas);

        const conNC = glosasDash.filter((g) => {
          const nc = (g.notaCredito || "").trim().toUpperCase();
          return Boolean(nc && nc !== "N/A" && nc !== "NA" && nc !== "NO APLICA");
        });
        const conNA = glosasDash.filter((g) => {
          const nc = (g.notaCredito || "").trim().toUpperCase();
          return nc === "N/A" || nc === "NA" || nc === "NO APLICA";
        });
        const sinDiligenciarNC = Math.max(0, glosasDash.length - conNC.length - conNA.length);

        // SERIE MENSUAL REAL DE GLOSAS (¿Cuánto hay de glosa por mes y cuál es la tendencia?)
        const nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const mapaGlosasMes = new Map<
          string,
          {
            ym: string;
            etiqueta: string;
            glosado: number;
            defendido: number;
            aceptado: number;
            pendiente: number;
            cantidad: number;
            facturasMes: Map<string, number>;
          }
        >();
        let glosasSinMesExplicitoMonto = 0;
        let glosasSinMesExplicitoCant = 0;

        const anioUnicoSel =
          aniosFrecSel.length === 1
            ? aniosFrecSel[0]
            : filtroAnio !== "TODOS"
            ? filtroAnio
            : null;
        if (anioUnicoSel) {
          const topeM = anioUnicoSel === String(ayerEnColombia().slice(0, 4))
            ? Number(ayerEnColombia().slice(5, 7)) || 11
            : 12;
          for (let m = 1; m <= topeM; m++) {
            const mm = String(m).padStart(2, "0");
            if (mesesFrecSel.length > 0 && mesesFrecSel.length < 12 && !mesesFrecSel.includes(mm)) continue;
            const ym = `${anioUnicoSel}-${mm}`;
            mapaGlosasMes.set(ym, {
              ym,
              etiqueta: `${nombresMes[m - 1]} ${anioUnicoSel.slice(2)}`,
              glosado: 0,
              defendido: 0,
              aceptado: 0,
              pendiente: 0,
              cantidad: 0,
              facturasMes: new Map(),
            });
          }
        }

        for (const g of glosasDash) {
          const fRef = String(
            g.fechaNotificacionGlosa || g.fechaRadicacion || g.fechaFactura || g.periodo || ""
          ).trim();
          const m = clasificarMontosGlosa(g);
          if (/^\d{4}-\d{2}/.test(fRef)) {
            const ym = fRef.slice(0, 7);
            const mIdx = Number(ym.slice(5, 7)) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              const item = mapaGlosasMes.get(ym) || {
                ym,
                etiqueta: `${nombresMes[mIdx]} ${ym.slice(2, 4)}`,
                glosado: 0,
                defendido: 0,
                aceptado: 0,
                pendiente: 0,
                cantidad: 0,
                facturasMes: new Map<string, number>(),
              };
              item.glosado += m.glosado;
              item.defendido += m.defendido;
              item.aceptado += m.aceptado;
              item.pendiente += m.pendiente;
              item.cantidad += 1;
              const fk = String(g.factura || "").trim().toUpperCase() || `ID:${g.id}`;
              const vf = Math.max(0, Number(g.valorFacturado || g.valorFactura || g.valorRadicado || 0));
              item.facturasMes.set(fk, Math.max(item.facturasMes.get(fk) || 0, vf));
              mapaGlosasMes.set(ym, item);
              continue;
            }
          }
          glosasSinMesExplicitoMonto += m.glosado;
          glosasSinMesExplicitoCant += 1;
        }

        const serieGlosasMensual = Array.from(mapaGlosasMes.values())
          .sort((a, b) => a.ym.localeCompare(b.ym))
          .slice(-14)
          .map((it) => {
            let factMes = 0;
            it.facturasMes.forEach((v) => {
              factMes += v;
            });
            return {
              ym: it.ym,
              etiqueta: it.etiqueta,
              glosado: it.glosado,
              defendido: it.defendido,
              aceptado: it.aceptado,
              pendiente: it.pendiente,
              cantidad: it.cantidad,
              facturadoMes: factMes,
            };
          });

        const nGlM = serieGlosasMensual.length;
        const svgGlW = 780;
        const svgGlH = 285;
        const padGlL = 82;
        const padGlR = 28;
        const padGlT = 22;
        const baseGlY = 248;
        const plotGlW = svgGlW - padGlL - padGlR;
        const plotGlH = baseGlY - padGlT;
        const maxGlMes = Math.max(1, ...serieGlosasMensual.map((x) => x.glosado));
        const escalaGlMes = generarTicksEjeY(maxGlMes * 1.08, 4);
        const getXGl = (i: number) =>
          nGlM <= 1 ? padGlL + plotGlW / 2 : padGlL + ((i + 0.5) / nGlM) * plotGlW;
        const getYGl = (v: number) =>
          baseGlY - (Math.max(0, v) / escalaGlMes.techo) * plotGlH;

        const ptsLineaGlosa = serieGlosasMensual.map((x, i) => ({
          x: getXGl(i),
          y: getYGl(x.glosado),
        }));
        const pathLineaGlosa = (() => {
          if (ptsLineaGlosa.length === 0) return "";
          if (ptsLineaGlosa.length === 1) return `M ${ptsLineaGlosa[0].x} ${ptsLineaGlosa[0].y}`;
          let d = `M ${ptsLineaGlosa[0].x.toFixed(1)} ${ptsLineaGlosa[0].y.toFixed(1)}`;
          for (let i = 0; i < ptsLineaGlosa.length - 1; i++) {
            const p0 = ptsLineaGlosa[i];
            const p1 = ptsLineaGlosa[i + 1];
            const cx1 = p0.x + (p1.x - p0.x) * 0.38;
            const cx2 = p1.x - (p1.x - p0.x) * 0.38;
            d += ` C ${cx1.toFixed(1)} ${p0.y.toFixed(1)}, ${cx2.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
          }
          return d;
        })();

        const idxInspGlosa =
          hoverGlosaMesIdx !== null && hoverGlosaMesIdx < serieGlosasMensual.length
            ? hoverGlosaMesIdx
            : serieGlosasMensual.length > 0
            ? serieGlosasMensual.length - 1
            : null;
        const mesInspGlosa = idxInspGlosa !== null ? serieGlosasMensual[idxInspGlosa] : null;

        // Top Empresas por NIT (apiladas: Defendido vs Aceptado vs Pendiente)
        const porEmpresaNit: Record<
          string,
          { nit: string; nombre: string; monto: number; defendido: number; aceptado: number; pendiente: number; glosas: number }
        > = {};
        for (const g of glosasDash) {
          const info = normalizarEmpresaYNit(g.empresa || g.empresaOriginal);
          const clave = info.nombre || "SIN EMPRESA";
          const m = clasificarMontosGlosa(g);
          if (!porEmpresaNit[clave]) {
            porEmpresaNit[clave] = {
              nit: info.nit,
              nombre: clave,
              monto: 0,
              defendido: 0,
              aceptado: 0,
              pendiente: 0,
              glosas: 0,
            };
          }
          porEmpresaNit[clave].monto += m.glosado;
          porEmpresaNit[clave].defendido += m.defendido;
          porEmpresaNit[clave].aceptado += m.aceptado;
          porEmpresaNit[clave].pendiente += m.pendiente;
          porEmpresaNit[clave].glosas += 1;
        }
        const topEmpresas = Object.values(porEmpresaNit).sort((a, b) => b.monto - a.monto);
        const maxEmpMonto = topEmpresas[0]?.monto || 1;

        // Desempeño real por Responsable de Respuesta (sin inventar asignaciones vacías)
        const porResp: Record<
          string,
          { monto: number; defendido: number; aceptado: number; pendiente: number; glosas: number }
        > = {};
        for (const g of glosasDash) {
          const r =
            (g.responsableRespuesta || g.responsableAceptacion || "").trim().toUpperCase() ||
            "SIN ASIGNAR EN WORKCENTER";
          const m = clasificarMontosGlosa(g);
          if (!porResp[r]) {
            porResp[r] = { monto: 0, defendido: 0, aceptado: 0, pendiente: 0, glosas: 0 };
          }
          porResp[r].monto += m.glosado;
          porResp[r].defendido += m.defendido;
          porResp[r].aceptado += m.aceptado;
          porResp[r].pendiente += m.pendiente;
          porResp[r].glosas += 1;
        }
        const topResponsables = Object.entries(porResp).sort((a, b) => b[1].monto - a[1].monto);
        const maxRespMonto = topResponsables[0]?.[1]?.monto || 1;

        return (
          <div
            className="rounded-xl p-6 shadow-xs border space-y-6"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
          >
            {/* CABECERA EJECUTIVA */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#E2ECF8]">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
                  style={{ backgroundColor: "#ECFDF5", color: "#047857" }}
                >
                  🛡️
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold text-[#0E245E]">
                      Dashboard Ejecutivo de Glosas, Tendencia Mensual y Defensa Financiera
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Resolución 2284 / Decreto 4747
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Homenaje a la Gestión de Auditoría y Facturación
                    </span>
                    {causaFiltroDash && (
                      <button
                        type="button"
                        onClick={() => setCausaFiltroDash(null)}
                        className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer"
                      >
                        Causa activa: {causaFiltroDash} ×
                      </button>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#64748B]">
                    Explica cuánto corresponde a glosa frente a lo facturado, cuánto ha defendido el equipo a favor de Ebenezer y cómo evoluciona la tendencia mes a mes.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/workcenter/cartera"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs transition hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: "#0E245E" }}
                >
                  <span>Abrir Tablero de Trabajo (WorkCenter)</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* 6 KPIs AUTOEXPLICATIVOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl border bg-[#F8FAFC]" style={{ borderColor: "#E2ECF8" }}>
                <div className="text-[10.5px] font-bold text-[#475569] uppercase tracking-wider">
                  1. Total Facturado Auditado
                </div>
                <div className="mt-1 font-mono text-lg font-extrabold text-[#0E245E]">
                  {formatCOP(totFacturadoUnico)}
                </div>
                <p className="mt-1 text-[10.5px] text-[#64748B] leading-snug">
                  Base única de {factUnicasGlosa.size.toLocaleString("es-CO")} facturas auditadas (sin duplicar facturas).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#FFF1F2]/65" style={{ borderColor: "#FECDD3" }}>
                <div className="text-[10.5px] font-bold text-[#BE123C] uppercase tracking-wider">
                  2. ¿Cuánto es la Glosa?
                </div>
                <div className="mt-1 font-mono text-lg font-extrabold text-[#BE123C]">
                  {formatCOP(totGlosado)}
                </div>
                <p className="mt-1 text-[10.5px] text-[#9F1239] font-semibold leading-snug">
                  Equivale al {pctGlosaSobreFact.toFixed(1)}% de lo facturado auditado ({pctGlosaSobreCartera.toFixed(1)}% s/cartera) · {glosasDash.length} registros.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#ECFDF5]/80" style={{ borderColor: "#6EE7B7" }}>
                <div className="text-[10.5px] font-bold text-[#047857] uppercase tracking-wider">
                  3. Defendido por el Equipo
                </div>
                <div className="mt-1 font-mono text-lg font-extrabold text-[#047857]">
                  {formatCOP(totDefendido)}
                </div>
                <p className="mt-1 text-[10.5px] text-[#065F46] font-semibold leading-snug">
                  {pctEfectividadDefensa.toFixed(1)}% de efectividad sobre lo gestionado ({cantDefendidas} glosas objetadas a favor).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#FFFBEB]/80" style={{ borderColor: "#FDE68A" }}>
                <div className="text-[10.5px] font-bold text-[#B45309] uppercase tracking-wider">
                  4. Pendiente por Responder
                </div>
                <div className="mt-1 font-mono text-lg font-extrabold text-[#B45309]">
                  {formatCOP(totPendiente)}
                </div>
                <p className="mt-1 text-[10.5px] text-[#92400E] font-semibold leading-snug">
                  {cantPendientes} registros abiertos en revisión técnica dentro del WorkCenter.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#FAF5FF]/70" style={{ borderColor: "#DDD6FE" }}>
                <div className="text-[10.5px] font-bold text-[#6D28D9] uppercase tracking-wider">
                  5. Aceptado / Notas Crédito
                </div>
                <div className="mt-1 font-mono text-lg font-extrabold text-[#6D28D9]">
                  {formatCOP(totAceptado)}
                </div>
                <p className="mt-1 text-[10.5px] text-[#5B21B6] font-semibold leading-snug">
                  {conNC.length} con N° NC · {conNA.length} N/A · {sinDiligenciarNC} sin N°/N/A ({cantAceptadas} cerradas).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-[#EFF6FF]/65" style={{ borderColor: "#BFDBFE" }}>
                <div className="text-[10.5px] font-bold text-[#1D4ED8] uppercase tracking-wider">
                  6. Anuladas vs. Reemplazadas
                </div>
                <div className="mt-1 font-mono text-lg font-extrabold text-[#1D4ED8]">
                  {cantReemplazadas} / {anuladasFiltradas.length}
                </div>
                <p className="mt-1 text-[10.5px] text-[#1E40AF] font-semibold leading-snug">
                  {cantReemplazadas} ya refacturadas · {cantSinReemplazo} por reemplazar ({formatMillones(totAnuladasMonto)}).
                </p>
              </div>
            </div>

            {/* EMBUDO EJECUTIVO: HOMENAJE AL TRABAJO REALIZADO POR EL EQUIPO */}
            <div className="rounded-xl border p-4 sm:p-5 bg-gradient-to-r from-[#F8FAFC] via-[#F0FDF4]/50 to-[#EFF6FF]/50 space-y-3" style={{ borderColor: "#D1FAE5" }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h4 className="text-[13.5px] sm:text-[14.5px] font-extrabold text-[#0E245E]">
                    Trazabilidad de Defensa Financiera — Impacto Real del Equipo de Facturación y Glosas
                  </h4>
                  <p className="text-[11.5px] text-[#475569]">
                    De cada <strong>$100</strong> ya gestionados en glosas, el equipo ha defendido y objetado con soporte clínico/contractual <strong>${Math.round(pctEfectividadDefensa)}</strong> a favor de la institución.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-2xs self-start md:self-auto">
                  Recuperado / Defendido: {formatCOP(totDefendido)}
                </span>
              </div>

              <div className="w-full h-4 rounded-full bg-slate-200 overflow-hidden flex">
                {totGlosado > 0 && (
                  <>
                    <div
                      style={{ width: `${(totDefendido / totGlosado) * 100}%`, backgroundColor: "#059669" }}
                      title={`Defendido a favor: ${formatCOP(totDefendido)}`}
                    />
                    <div
                      style={{ width: `${(totAceptado / totGlosado) * 100}%`, backgroundColor: "#7C3AED" }}
                      title={`Valor aceptado: ${formatCOP(totAceptado)}`}
                    />
                    <div
                      style={{ width: `${(totPendiente / totGlosado) * 100}%`, backgroundColor: "#F59E0B" }}
                      title={`Pendiente por responder: ${formatCOP(totPendiente)}`}
                    />
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
                <span className="text-[#047857]">
                  ● Defendido a favor: {formatCOP(totDefendido)} ({totGlosado > 0 ? ((totDefendido / totGlosado) * 100).toFixed(1) : "0.0"}% del total glosado)
                </span>
                <span className="text-[#6D28D9]">
                  ● Aceptado / Conciliado: {formatCOP(totAceptado)} ({totGlosado > 0 ? ((totAceptado / totGlosado) * 100).toFixed(1) : "0.0"}%)
                </span>
                <span className="text-[#B45309]">
                  ● En gestión / Pendiente: {formatCOP(totPendiente)} ({totGlosado > 0 ? ((totPendiente / totGlosado) * 100).toFixed(1) : "0.0"}%)
                </span>
              </div>
            </div>

            {/* GRÁFICA DE TENDENCIA MENSUAL DE GLOSAS + ESCALA IZQUIERDA + CURSOR + TABLA ABAJO */}
            <div className="rounded-xl border p-4 sm:p-5 space-y-3" style={{ borderColor: "#E2ECF8" }}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                <div>
                  <h4 className="text-[13.5px] sm:text-[14.5px] font-extrabold text-[#0E245E]">
                    Tendencia Mensual de Glosas: ¿Cuánto hay de glosa por mes y cómo se resolvió?
                  </h4>
                  <p className="text-[11.5px] text-[#64748B]">
                    Barras apiladas por estado de resolución (Defendido, Aceptado, Pendiente) + curva de Total Glosado mensual con escala monetaria izquierda.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E2ECF8] text-[#BE123C]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" /> Curva Total Glosa
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E2ECF8] text-[#047857]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" /> Defendido
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E2ECF8] text-[#6D28D9]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#7C3AED]" /> Aceptado
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E2ECF8] text-[#B45309]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" /> Pendiente
                  </span>
                </div>
              </div>

              {mesInspGlosa && (
                <div
                  className="rounded-xl border px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] transition-colors"
                  style={{
                    backgroundColor: hoverGlosaMesIdx !== null ? "#FFF1F2" : "#F8FAFC",
                    borderColor: hoverGlosaMesIdx !== null ? "#FDA4AF" : "#E2ECF8",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-extrabold text-white bg-[#BE123C]">
                      {mesInspGlosa.etiqueta}
                    </span>
                    <span className="text-[#475569] font-semibold">
                      {mesInspGlosa.cantidad} glosas en el mes
                      {mesInspGlosa.facturadoMes > 0
                        ? ` · ${((mesInspGlosa.glosado / mesInspGlosa.facturadoMes) * 100).toFixed(1)}% sobre facturado base (${formatMillones(mesInspGlosa.facturadoMes)})`
                        : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono text-[11px]">
                    <span className="text-[#BE123C] font-extrabold">
                      <strong>Glosado Mes:</strong> {formatCOP(mesInspGlosa.glosado)}
                    </span>
                    <span className="text-[#047857] font-bold">
                      <strong>Defendido:</strong> {formatCOP(mesInspGlosa.defendido)}
                    </span>
                    <span className="text-[#6D28D9]">
                      <strong>Aceptado:</strong> {formatCOP(mesInspGlosa.aceptado)}
                    </span>
                    <span className="text-[#B45309]">
                      <strong>Pendiente:</strong> {formatCOP(mesInspGlosa.pendiente)}
                    </span>
                  </div>
                </div>
              )}

              {nGlM > 0 ? (
                <>
                  <svg
                    viewBox={`0 0 ${svgGlW} ${svgGlH}`}
                    className="w-full h-auto select-none overflow-visible"
                    onMouseLeave={() => setHoverGlosaMesIdx(null)}
                  >
                    <line
                      x1={padGlL - 10}
                      y1={padGlT - 4}
                      x2={padGlL - 10}
                      y2={baseGlY}
                      stroke="#CBD5E1"
                      strokeWidth="1.2"
                    />
                    {escalaGlMes.ticks.map((tk, idx) => {
                      const gy = getYGl(tk.valor);
                      return (
                        <g key={`tk-gl-${idx}`}>
                          <line
                            x1={padGlL - 10}
                            y1={gy}
                            x2={svgGlW - padGlR}
                            y2={gy}
                            stroke={tk.valor === 0 ? "#334155" : "#E2E8F0"}
                            strokeWidth={tk.valor === 0 ? "1.2" : "1"}
                            strokeDasharray={tk.valor === 0 ? undefined : "3.5 3.5"}
                          />
                          <text
                            x={padGlL - 16}
                            y={gy + 3.5}
                            textAnchor="end"
                            fontSize="10"
                            fontWeight="700"
                            fill="#334155"
                            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                          >
                            {tk.label}
                          </text>
                        </g>
                      );
                    })}

                    {serieGlosasMensual.map((m, i) => {
                      const cx = getXGl(i);
                      const paso = plotGlW / Math.max(1, nGlM);
                      const barW = Math.min(34, Math.max(12, paso * 0.48));
                      const hDef = (m.defendido / escalaGlMes.techo) * plotGlH;
                      const hAcp = (m.aceptado / escalaGlMes.techo) * plotGlH;
                      const hPnd = (m.pendiente / escalaGlMes.techo) * plotGlH;
                      const yDef = baseGlY - hDef;
                      const yAcp = yDef - hAcp;
                      const yPnd = yAcp - hPnd;
                      const activo = hoverGlosaMesIdx === i;

                      return (
                        <g
                          key={`gl-bar-${m.ym}`}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoverGlosaMesIdx(i)}
                        >
                          {activo && (
                            <>
                              <rect
                                x={cx - paso * 0.44}
                                y={padGlT - 4}
                                width={paso * 0.88}
                                height={baseGlY - padGlT + 4}
                                rx={6}
                                fill="#FFE4E6"
                                opacity="0.4"
                              />
                              <line
                                x1={cx}
                                y1={padGlT - 4}
                                x2={cx}
                                y2={baseGlY}
                                stroke="#E11D48"
                                strokeWidth="1.2"
                                strokeDasharray="4 3"
                              />
                            </>
                          )}
                          {hDef > 0 && (
                            <rect
                              x={cx - barW / 2}
                              y={yDef}
                              width={barW}
                              height={hDef}
                              fill="#059669"
                              opacity={activo ? 1 : 0.88}
                            />
                          )}
                          {hAcp > 0 && (
                            <rect
                              x={cx - barW / 2}
                              y={yAcp}
                              width={barW}
                              height={hAcp}
                              fill="#7C3AED"
                              opacity={activo ? 1 : 0.85}
                            />
                          )}
                          {hPnd > 0 && (
                            <rect
                              x={cx - barW / 2}
                              y={yPnd}
                              width={barW}
                              height={hPnd}
                              fill="#F59E0B"
                              opacity={activo ? 1 : 0.9}
                            />
                          )}
                          {m.glosado > 0 && (
                            <text
                              x={cx}
                              y={Math.max(12, getYGl(m.glosado) - 8)}
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="800"
                              fill="#9F1239"
                            >
                              {formatEscalaEjeY(m.glosado)}
                            </text>
                          )}
                          <text
                            x={cx}
                            y={baseGlY + 18}
                            textAnchor="middle"
                            fontSize={activo ? "10.8" : "10"}
                            fontWeight={activo ? "800" : "600"}
                            fill={activo ? "#BE123C" : "#0F172A"}
                          >
                            {m.etiqueta}
                          </text>
                          <rect
                            x={cx - paso / 2}
                            y={padGlT - 4}
                            width={paso}
                            height={baseGlY - padGlT + 28}
                            fill="transparent"
                          />
                        </g>
                      );
                    })}

                    {pathLineaGlosa && (
                      <path
                        d={pathLineaGlosa}
                        fill="none"
                        stroke="#E11D48"
                        strokeWidth="2.3"
                        pointerEvents="none"
                      />
                    )}
                    {ptsLineaGlosa.map((pt, i) => (
                      <circle
                        key={`gl-nd-${i}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoverGlosaMesIdx === i ? 5.6 : 3.8}
                        fill="#E11D48"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        pointerEvents="none"
                      />
                    ))}
                  </svg>

                  {/* TABLA MENSUAL DE GLOSAS SINCRONIZADA CON EL CURSOR */}
                  <div
                    className="overflow-x-auto rounded-xl border"
                    style={{ borderColor: "#E2ECF8" }}
                    onMouseLeave={() => setHoverGlosaMesIdx(null)}
                  >
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: "#F8FAFC" }}>
                          <th className="p-2 text-left font-extrabold text-[#0E245E] sticky left-0 bg-[#F8FAFC] border-b border-r min-w-[175px]" style={{ borderColor: "#E2ECF8" }}>
                            Detalle Mensual Glosas
                          </th>
                          {serieGlosasMensual.map((m, i) => (
                            <th
                              key={`th-glm-${m.ym}`}
                              onMouseEnter={() => setHoverGlosaMesIdx(i)}
                              className="p-2 text-right font-extrabold border-b cursor-pointer transition-colors min-w-[74px]"
                              style={{
                                borderColor: "#E2ECF8",
                                backgroundColor: hoverGlosaMesIdx === i ? "#FFE4E6" : "#F8FAFC",
                                color: hoverGlosaMesIdx === i ? "#BE123C" : "#0E245E",
                              }}
                            >
                              <div>{m.etiqueta}</div>
                              <div className="text-[9.5px] font-normal text-[#64748B]">{m.cantidad} reg.</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                        <tr>
                          <td className="p-2 font-extrabold text-[#BE123C] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                            Total Glosado Mes
                          </td>
                          {serieGlosasMensual.map((m, i) => (
                            <td
                              key={`td-glt-${m.ym}`}
                              onMouseEnter={() => setHoverGlosaMesIdx(i)}
                              className="p-2 text-right font-mono font-extrabold text-[#BE123C] cursor-pointer"
                              style={{ backgroundColor: hoverGlosaMesIdx === i ? "#FFF1F2" : "transparent" }}
                              title={formatCOP(m.glosado)}
                            >
                              {formatEscalaEjeY(m.glosado)}
                            </td>
                          ))}
                        </tr>
                        <tr style={{ backgroundColor: "#F0FDF4" }}>
                          <td className="p-2 font-bold text-[#047857] sticky left-0 bg-[#F0FDF4] border-r" style={{ borderColor: "#E2ECF8" }}>
                            Defendido a Favor
                          </td>
                          {serieGlosasMensual.map((m, i) => (
                            <td
                              key={`td-gld-${m.ym}`}
                              onMouseEnter={() => setHoverGlosaMesIdx(i)}
                              className="p-2 text-right font-mono font-bold text-[#047857] cursor-pointer"
                              style={{ backgroundColor: hoverGlosaMesIdx === i ? "#DCFCE7" : "#F0FDF4" }}
                              title={formatCOP(m.defendido)}
                            >
                              {formatEscalaEjeY(m.defendido)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-[#6D28D9] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                            Aceptado / Conciliado
                          </td>
                          {serieGlosasMensual.map((m, i) => (
                            <td
                              key={`td-gla-${m.ym}`}
                              onMouseEnter={() => setHoverGlosaMesIdx(i)}
                              className="p-2 text-right font-mono text-[#6D28D9] cursor-pointer"
                              style={{ backgroundColor: hoverGlosaMesIdx === i ? "#FAF5FF" : "transparent" }}
                              title={formatCOP(m.aceptado)}
                            >
                              {formatEscalaEjeY(m.aceptado)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-[#B45309] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                            Pendiente por Responder
                          </td>
                          {serieGlosasMensual.map((m, i) => (
                            <td
                              key={`td-glp-${m.ym}`}
                              onMouseEnter={() => setHoverGlosaMesIdx(i)}
                              className="p-2 text-right font-mono text-[#B45309] cursor-pointer"
                              style={{ backgroundColor: hoverGlosaMesIdx === i ? "#FFFBEB" : "transparent" }}
                              title={formatCOP(m.pendiente)}
                            >
                              {formatEscalaEjeY(m.pendiente)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold text-[#475569] sticky left-0 bg-white border-r" style={{ borderColor: "#E2ECF8" }}>
                            % Glosa s/Facturado Mes
                          </td>
                          {serieGlosasMensual.map((m, i) => (
                            <td
                              key={`td-glpct-${m.ym}`}
                              onMouseEnter={() => setHoverGlosaMesIdx(i)}
                              className="p-2 text-right font-mono font-semibold text-[#475569] cursor-pointer"
                              style={{ backgroundColor: hoverGlosaMesIdx === i ? "#F8FAFC" : "transparent" }}
                            >
                              {m.facturadoMes > 0 ? `${((m.glosado / m.facturadoMes) * 100).toFixed(1)}%` : "—"}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No hay glosas con fecha mensual registrada para la combinación actual de filtros.
                </div>
              )}

              {glosasSinMesExplicitoCant > 0 && (
                <p className="text-[11px] text-[#64748B]">
                  Transparencia de datos: {glosasSinMesExplicitoCant} registros históricos ({formatCOP(glosasSinMesExplicitoMonto)}) solo traen año sin mes exacto en la fuente original y sí están incluidos en los KPIs superiores.
                </p>
              )}
            </div>

            {/* CAUSAS PRINCIPALES SEGÚN LA NORMA (INTERACTIVAS AL CLIC) */}
            <div className="rounded-xl border p-4 sm:p-5 space-y-3" style={{ borderColor: "#E2ECF8", backgroundColor: "#FAFBFD" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <div>
                  <h4 className="text-[13.5px] sm:text-[14.5px] font-bold text-[#0E245E]">
                    Causas Principales de Glosa según la Norma Técnica (FA, TA, SO, AU, CO) — Clic para filtrar
                  </h4>
                  <p className="text-[11.5px] text-[#64748B]">
                    Manual Único de Devoluciones y Glosas (Resolución 2284 de 2023). Haz clic en cualquier causal para inspeccionar su tendencia mensual y entidades.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#64748B]">
                  Universo glosado: {formatCOP(totGlosadoBaseCausas)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                {CAUSAS_NORMATIVAS.map((c) => {
                  const info = porCausaNorma[c.codigo] || { monto: 0, defendido: 0, cantidad: 0 };
                  const pct = totGlosadoBaseCausas > 0 ? Math.round((info.monto / totGlosadoBaseCausas) * 100) : 0;
                  const activa = causaFiltroDash === c.codigo;
                  return (
                    <div
                      key={c.codigo}
                      onClick={() => setCausaFiltroDash((prev) => (prev === c.codigo ? null : c.codigo))}
                      className="p-3.5 rounded-xl border bg-white shadow-2xs space-y-2 transition cursor-pointer hover:shadow-sm"
                      style={{
                        borderColor: activa ? c.color : c.badgeBorder,
                        boxShadow: activa ? `0 0 0 2px ${c.color}33` : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
                          style={{ backgroundColor: c.badgeBg, color: c.badgeText }}
                        >
                          {c.codigo} · {c.nombre}
                        </span>
                        <span className="text-xs font-mono font-bold" style={{ color: c.badgeText }}>
                          {pct}%
                        </span>
                      </div>

                      <div className="font-mono text-base font-extrabold text-[#0E245E]">
                        {formatCOP(info.monto)}
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: c.color }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-[#64748B]">
                        <span>{info.cantidad} glosas</span>
                        {info.defendido > 0 && (
                          <span className="text-[#047857] font-bold">
                            Def: {formatEscalaEjeY(info.defendido)}
                          </span>
                        )}
                      </div>

                      <p className="text-[10.5px] text-[#64748B] leading-tight line-clamp-2" title={c.descripcion}>
                        {c.descripcion}
                      </p>
                    </div>
                  );
                })}
              </div>
              {cantOtrasCausas > 0 && (
                <div
                  onClick={() => setCausaFiltroDash((prev) => (prev === "OTRAS" ? null : "OTRAS"))}
                  className="pt-2 flex flex-wrap items-center justify-between text-[11.5px] text-[#64748B] border-t border-[#E2ECF8] cursor-pointer hover:text-[#0E245E]"
                >
                  <span>
                    Códigos históricos / Devoluciones (`RE97`, `DEV` o pendientes de tipificar FA–CO en WorkCenter):{" "}
                    <strong className="text-[#0E245E]">{cantOtrasCausas} registros</strong>
                    {defOtrasCausas > 0 ? ` · Defendido: ${formatCOP(defOtrasCausas)}` : ""}
                  </span>
                  <span className="font-mono font-bold text-[#0E245E]">
                    {formatCOP(montoOtrasCausas)} (
                    {totGlosadoBaseCausas > 0 ? Math.round((montoOtrasCausas / totGlosadoBaseCausas) * 100) : 0}%)
                  </span>
                </div>
              )}
            </div>

            {/* TOP EMPRESAS POR NIT Y GESTIÓN POR RESPONSABLE (APILADAS DEFENDIDO / ACEPTADO / PENDIENTE) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 sm:p-5 rounded-xl border bg-white shadow-2xs space-y-3" style={{ borderColor: "#E2ECF8" }}>
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "#F1F5F9" }}>
                  <div>
                    <h4 className="text-[13px] font-bold text-[#0E245E]">
                      Empresas con Mayor Glosa y Recuperación (Unificadas por NIT)
                    </h4>
                    <p className="text-[11px] text-[#64748B]">Clic en una entidad para filtrar todo el tablero (incluye Mutual Ser)</p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#1D58D8]">
                    {topEmpresas.length} entidades
                  </span>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {topEmpresas.slice(0, 8).map((emp) => {
                    const pct = totGlosado > 0 ? Math.round((emp.monto / totGlosado) * 100) : 0;
                    const barW = Math.min(100, Math.max(3, Math.round((emp.monto / maxEmpMonto) * 100)));
                    const pDef = emp.monto > 0 ? (emp.defendido / emp.monto) * 100 : 0;
                    const pAcp = emp.monto > 0 ? (emp.aceptado / emp.monto) * 100 : 0;
                    const pPnd = Math.max(0, 100 - pDef - pAcp);
                    const empCortaClick = normalizarEmpresaCorta(emp.nombre);

                    return (
                      <div
                        key={emp.nombre}
                        onClick={() => {
                          if (esEmpresaMutual(empCortaClick)) setIncluirMutual(true);
                          setFiltroEmpresa("TODAS");
                          setEmpresasFrecSel((prev) =>
                            prev.length === 1 && prev[0] === empCortaClick ? [] : [empCortaClick]
                          );
                        }}
                        className="space-y-1 cursor-pointer rounded-lg p-1.5 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="min-w-0 flex-1 truncate pr-2">
                            <span className="font-bold text-[#0F172A]">{emp.nombre}</span>
                            {emp.nit && (
                              <span className="ml-1.5 text-[10px] font-mono text-[#64748B] bg-slate-100 px-1.5 py-0.5 rounded">
                                NIT: {emp.nit}
                              </span>
                            )}
                          </div>
                          <div className="text-right font-mono font-bold text-[#0E245E] shrink-0">
                            {formatCOP(emp.monto)} <span className="text-[10px] text-[#64748B]">({pct}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${barW}%` }}>
                            <div style={{ width: `${pDef}%`, backgroundColor: "#059669" }} />
                            <div style={{ width: `${pAcp}%`, backgroundColor: "#7C3AED" }} />
                            <div style={{ width: `${pPnd}%`, backgroundColor: "#F59E0B" }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                          <span>{emp.glosas} glosas</span>
                          <span className="font-mono">
                            <strong className="text-[#047857]">Def: {formatEscalaEjeY(emp.defendido)}</strong> · Acp: {formatEscalaEjeY(emp.aceptado)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border bg-white shadow-2xs space-y-3" style={{ borderColor: "#E2ECF8" }}>
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "#F1F5F9" }}>
                  <div>
                    <h4 className="text-[13px] font-bold text-[#0E245E]">
                      Gestión y Efectividad por Responsable de Respuesta
                    </h4>
                    <p className="text-[11px] text-[#64748B]">Muestra lo defendido, conciliado y pendiente según asignación real en WorkCenter</p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#059669]">
                    {topResponsables.length} responsables
                  </span>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {topResponsables.slice(0, 8).map(([resp, info]) => {
                    const pct = totGlosado > 0 ? Math.round((info.monto / totGlosado) * 100) : 0;
                    const barW = Math.min(100, Math.max(3, Math.round((info.monto / maxRespMonto) * 100)));
                    const pDef = info.monto > 0 ? (info.defendido / info.monto) * 100 : 0;
                    const pAcp = info.monto > 0 ? (info.aceptado / info.monto) * 100 : 0;
                    const pPnd = Math.max(0, 100 - pDef - pAcp);
                    return (
                      <div key={resp} className="space-y-1 p-1.5 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <div className="min-w-0 flex-1 truncate pr-2">
                            <span className="font-bold text-[#0F172A]">{resp}</span>
                            <span className="ml-1.5 text-[10px] text-[#64748B]">
                              ({info.glosas} glosas)
                            </span>
                          </div>
                          <div className="text-right font-mono font-bold text-[#0E245E] shrink-0">
                            {formatCOP(info.monto)} <span className="text-[10px] text-[#64748B]">({pct}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${barW}%` }}>
                            <div style={{ width: `${pDef}%`, backgroundColor: "#059669" }} />
                            <div style={{ width: `${pAcp}%`, backgroundColor: "#7C3AED" }} />
                            <div style={{ width: `${pPnd}%`, backgroundColor: "#F59E0B" }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono">
                          <span className="text-[#047857] font-bold">Defendido: {formatCOP(info.defendido)}</span>
                          <span>Aceptado: {formatEscalaEjeY(info.aceptado)} · Pend: {formatEscalaEjeY(info.pendiente)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CRUCE DE GLOSAS Y DEFENSA POR SEDE Y POR TIPO DE ATENCIÓN (CONSULTA VS CIRUGÍA) */}
            {(() => {
              const acumSede: Record<string, { label: string; glosado: number; defendido: number; cantidad: number }> = {
                SEDE_1: { label: "Sede 1 · Principal (PyP, Prepagadas, EPS, Particular)", glosado: 0, defendido: 0, cantidad: 0 },
                SEDE_2: { label: "Sede 2 · Consultorios y Convenio Mutual Ser", glosado: 0, defendido: 0, cantidad: 0 },
              };
              const acumAtencion: Record<string, { label: string; glosado: number; defendido: number; cantidad: number; color: string }> = {
                CONSULTA: { label: "Consulta", glosado: 0, defendido: 0, cantidad: 0, color: "#0284C7" },
                CIRUGIA: { label: "Cirugía (Quirófano)", glosado: 0, defendido: 0, cantidad: 0, color: "#7C3AED" },
                AYUDA_DX: { label: "Ayuda Dx / Procedimiento", glosado: 0, defendido: 0, cantidad: 0, color: "#D97706" },
                SIN_DETALLE: { label: "Factura global / Sin CUPS en fuente", glosado: 0, defendido: 0, cantidad: 0, color: "#64748B" },
              };
              for (const g of glosasDash) {
                const m = clasificarMontosGlosa(g);
                const cr = cruzarFilaMaestra({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` });
                const sg = cr.sedeGrupo === "SEDE_2" ? "SEDE_2" : "SEDE_1";
                acumSede[sg].glosado += m.glosado;
                acumSede[sg].defendido += m.defendido;
                acumSede[sg].cantidad += 1;

                const tg = acumAtencion[cr.tipoGrupo] ? cr.tipoGrupo : "SIN_DETALLE";
                acumAtencion[tg].glosado += m.glosado;
                acumAtencion[tg].defendido += m.defendido;
                acumAtencion[tg].cantidad += 1;
              }

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-xl border bg-white space-y-2.5" style={{ borderColor: "#E2ECF8" }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-bold text-[#0E245E]">
                        Glosa y Defensa por Sede (Clic para filtrar)
                      </h4>
                      {filtroSedeTop !== "TODAS" && (
                        <button
                          type="button"
                          onClick={() => setFiltroSedeTop("TODAS")}
                          className="text-[11px] font-bold text-[#1D58D8] cursor-pointer"
                        >
                          Ver ambas sedes
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(["SEDE_1", "SEDE_2"] as const).map((sk) => {
                        const d = acumSede[sk];
                        const pct = totGlosado > 0 ? Math.round((d.glosado / totGlosado) * 100) : 0;
                        const act = filtroSedeTop === sk;
                        return (
                          <button
                            key={sk}
                            type="button"
                            onClick={() => setFiltroSedeTop(act ? "TODAS" : sk)}
                            className="p-3 rounded-xl border text-left transition cursor-pointer"
                            style={{
                              borderColor: act ? "#1D58D8" : "#E2ECF8",
                              backgroundColor: act ? "#EFF6FF" : "#F8FAFC",
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-extrabold text-[#0E245E]">
                                {sk === "SEDE_1" ? "Sede 1 · Principal" : "Sede 2 · Consultorios"}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-[#1D58D8]">{pct}%</span>
                            </div>
                            <div className="mt-1 text-sm font-mono font-extrabold text-[#0E245E]">
                              {formatCOP(d.glosado)}
                            </div>
                            <div className="mt-0.5 text-[10.5px] font-mono text-[#047857] font-semibold">
                              Defendido: {formatCOP(d.defendido)} · {d.cantidad} glosas
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-white space-y-2.5" style={{ borderColor: "#E2ECF8" }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-bold text-[#0E245E]">
                        Glosa por Atención: Consulta vs. Cirugía
                      </h4>
                      {filtroAtencionTop !== "TODAS" && (
                        <button
                          type="button"
                          onClick={() => setFiltroAtencionTop("TODAS")}
                          className="text-[11px] font-bold text-[#1D58D8] cursor-pointer"
                        >
                          Ver todas
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["CONSULTA", "CIRUGIA", "AYUDA_DX", "SIN_DETALLE"] as const).map((tk) => {
                        const d = acumAtencion[tk];
                        const pct = totGlosado > 0 ? Math.round((d.glosado / totGlosado) * 100) : 0;
                        const filtrable = tk !== "SIN_DETALLE";
                        const act = filtrable && filtroAtencionTop === tk;
                        return (
                          <button
                            key={tk}
                            type="button"
                            disabled={!filtrable}
                            onClick={() => {
                              if (filtrable) {
                                setFiltroAtencionTop(act ? "TODAS" : tk);
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-left transition ${filtrable ? "cursor-pointer hover:bg-slate-50" : "opacity-90"}`}
                            style={{
                              borderColor: act ? d.color : "#E2ECF8",
                              backgroundColor: act ? "#EFF6FF" : "#F8FAFC",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-extrabold" style={{ color: d.color }}>
                                {tk === "CONSULTA" ? "Consulta" : tk === "CIRUGIA" ? "Cirugía" : tk === "AYUDA_DX" ? "Ayuda Dx" : "Sin CUPS"}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-[#64748B]">{pct}%</span>
                            </div>
                            <div className="mt-1 text-xs font-mono font-extrabold text-[#0E245E]">
                              {formatEscalaEjeY(d.glosado)}
                            </div>
                            <div className="mt-0.5 text-[10px] text-[#047857] font-mono">
                              Def: {formatEscalaEjeY(d.defendido)} ({d.cantidad})
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* CUADRO 3: REPORTE MAESTRO CRUZADO Y ORDENADO DE CARTERA Y GLOSAS      */}
      {/* ===================================================================== */}
      <div
        className="rounded-xl p-5 sm:p-6 shadow-xs border space-y-4"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        <div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b"
          style={{ borderColor: "#E2ECF8" }}
        >
          <button
            type="button"
            onClick={() => setCortinaTablaAbierta((prev) => !prev)}
            className="text-left flex items-center gap-3 cursor-pointer"
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
              style={{ backgroundColor: "#EFF6FF", color: "#1D58D8" }}
            >
              {cortinaTablaAbierta ? "▴" : "▾"}
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#0E245E]">
                Reporte Maestro Cruzado de Cartera, Facturación y Glosas (SISMA + WorkCenter)
              </h3>
              <p className="text-xs text-[#64748B]">
                Ordenado con cruces reales: Factura y Fechas → Sede → Consulta o Cirugía → Empresa (NIT) y De dónde es → Nombres → Valores y Estado
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="🔍 Buscar factura, paciente, médico, NIT, CUPS..."
                className="w-64 sm:w-72 rounded-xl border px-3 py-1.5 text-xs font-medium outline-none focus:border-[#1D58D8]"
                style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
              />
            </div>
            <button
              type="button"
              onClick={exportarVistaExcelCSV}
              className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition border"
              style={{ backgroundColor: "#0E245E", color: "#FFFFFF", borderColor: "#0E245E" }}
            >
              📥 Exportar Excel Cruzado ({listaActivaPaginada.total.toLocaleString("es-CO")})
            </button>
          </div>
        </div>

        {cortinaTablaAbierta && (
          <div className="space-y-3">
            {/* PESTAÑAS DEL REPORTE MAESTRO */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "glosas", label: "Glosas y Defensa", count: glosasFiltradas.length },
                  { id: "cartera_viva", label: "Cartera Abierta SISMA (Facturas)", count: facturasSismaFiltradas.length },
                  { id: "pendientes", label: "Servicios / Pendientes (Consulta y Cirugía)", count: pendientesFiltradas.length },
                  { id: "anuladas", label: "Facturas Anuladas / Reemplazadas", count: anuladasFiltradas.length },
                ] as const
              ).map((tb) => {
                const act = tabActiva === tb.id;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => {
                      setTabActiva(tb.id);
                      setPaginaActual(1);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border"
                    style={{
                      backgroundColor: act ? "#1D58D8" : "#F8FAFC",
                      color: act ? "#FFFFFF" : "#334155",
                      borderColor: act ? "#1D58D8" : "#E2ECF8",
                    }}
                  >
                    {tb.label}{" "}
                    <span
                      className="ml-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-mono"
                      style={{
                        backgroundColor: act ? "rgba(255,255,255,0.22)" : "#E2E8F0",
                        color: act ? "#FFFFFF" : "#0E245E",
                      }}
                    >
                      {tb.count.toLocaleString("es-CO")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* TABLA ORDENADA SEGÚN PESTAÑA ACTIVA */}
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#E2ECF8" }}>
              {tabActiva === "glosas" && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Factura · Fechas</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Sede</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Consulta / Cirugía</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Empresa Homologada (NIT)</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">De dónde es</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Nombres (Paciente · Médico · Resp.)</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Vlr. Facturado</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Vlr. Glosado</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Defendido / Aceptado</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Causal · NC · Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                    {(listaActivaPaginada.items as GlosaRow[]).map((g) => {
                      const cr = cruzarFilaMaestra({ ...g, motivoTexto: `${g.motivoGlosa} ${g.observacionInterna}` });
                      const facReal = normalizarResponsableReal(g.facturador, g.empresa);
                      const respR = g.responsableAceptacion && g.responsableAceptacion !== "SIN ASIGNAR"
                        ? g.responsableAceptacion
                        : facReal;
                      const estUp = String(g.estado || g.subtabla || "PENDIENTE").toUpperCase();
                      const vG = Number(g.valorGlosado || 0);
                      const vA = g.valorAceptado !== null && g.valorAceptado !== undefined
                        ? Number(g.valorAceptado)
                        : estUp.includes("ACEPTADA") && !estUp.includes("NO_ACEPTADA")
                        ? vG
                        : 0;
                      const vDef = estUp === "PENDIENTE" || estUp === "EN_GESTION" ? 0 : Math.max(0, vG - vA);
                      const codNorma = causaNormativaDe(g.motivoCodigo);
                      const expandida = Boolean(filasExpandidas[g.id]);
                      return (
                        <React.Fragment key={g.id}>
                          <tr
                            onClick={() => togglePersianaFila(g.id)}
                            className="hover:bg-[#EFF6FF] transition-colors cursor-pointer align-top"
                          >
                            <td className="p-2.5 font-mono whitespace-nowrap">
                              <div className="font-extrabold text-[#0E245E]">{g.factura || "—"}</div>
                              <div className="text-[10.5px] text-[#64748B]">
                                F: {(g.fechaFactura || cr.fechaFacturaSisma || g.anio || "—").slice(0, 10)}
                              </div>
                              {(g.fechaNotificacionGlosa || g.fechaRadicacion) && (
                                <div className="text-[10px] text-[#1D58D8]">
                                  {g.fechaNotificacionGlosa
                                    ? `Notif: ${g.fechaNotificacionGlosa.slice(0, 10)}`
                                    : `Rad: ${g.fechaRadicacion.slice(0, 10)}`}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                                style={{
                                  backgroundColor: cr.sedeGrupo === "SEDE_2" ? "#EFF6FF" : "#ECFDF5",
                                  color: cr.sedeGrupo === "SEDE_2" ? "#1D4ED8" : "#047857",
                                  borderColor: cr.sedeGrupo === "SEDE_2" ? "#BFDBFE" : "#A7F3D0",
                                }}
                              >
                                {cr.sede}
                              </span>
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                                style={{
                                  backgroundColor:
                                    cr.tipoGrupo === "CIRUGIA"
                                      ? "#F5F3FF"
                                      : cr.tipoGrupo === "CONSULTA"
                                      ? "#F0F9FF"
                                      : cr.tipoGrupo === "AYUDA_DX"
                                      ? "#FFFBEB"
                                      : "#F8FAFC",
                                  color:
                                    cr.tipoGrupo === "CIRUGIA"
                                      ? "#6D28D9"
                                      : cr.tipoGrupo === "CONSULTA"
                                      ? "#0369A1"
                                      : cr.tipoGrupo === "AYUDA_DX"
                                      ? "#B45309"
                                      : "#64748B",
                                  borderColor:
                                    cr.tipoGrupo === "CIRUGIA"
                                      ? "#DDD6FE"
                                      : cr.tipoGrupo === "CONSULTA"
                                      ? "#BAE6FD"
                                      : cr.tipoGrupo === "AYUDA_DX"
                                      ? "#FDE68A"
                                      : "#E2E8F0",
                                }}
                              >
                                {cr.tipoAtencion}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <div className="font-bold text-[#0E245E]">{cr.empresaHomologada}</div>
                              {cr.nit && <div className="text-[10px] font-mono text-[#64748B]">NIT {cr.nit}</div>}
                            </td>
                            <td className="p-2.5 text-[11px] font-semibold text-[#334155]">
                              {cr.deDondeEs}
                            </td>
                            <td className="p-2.5 text-[11px]">
                              {cr.pacienteNombre ? (
                                <div className="font-bold text-[#0E245E]">
                                  Pac: {cr.pacienteNombre}
                                  {cr.pacienteDoc ? ` (${cr.pacienteDoc})` : ""}
                                </div>
                              ) : (
                                <div className="text-[10px] text-[#94A3B8]">Factura contable sin detalle clínico</div>
                              )}
                              {cr.medicoNombre && (
                                <div className="text-[10.5px] text-[#334155]">Dr(a): {cr.medicoNombre}</div>
                              )}
                              <div className="text-[10.5px] text-[#475569]">
                                Resp: <strong className="text-[#0E245E]">{respR}</strong>
                                {facReal && facReal !== respR ? ` · Fact: ${facReal}` : ""}
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-mono text-[#334155]">
                              {formatCOP(g.valorFacturado || g.valorFactura || g.valorRadicado)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-extrabold text-[#BE123C]">
                              {formatCOP(vG)}
                            </td>
                            <td className="p-2.5 text-right font-mono whitespace-nowrap">
                              <div className="font-bold text-[#047857]">Def: {formatCOP(vDef)}</div>
                              <div className="text-[10px] text-[#6D28D9]">Acp: {formatCOP(vA)}</div>
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap items-center gap-1">
                                {codNorma && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] font-mono font-bold text-[10px]">
                                    {codNorma}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#0E245E]">
                                  {estUp === "RESPONDIDA_NO_ACEPTADA" || estUp === "NO_ACEPTADA"
                                    ? "Defendida"
                                    : estUp.includes("ACEPTADA")
                                    ? "Conciliada / NC"
                                    : "En Gestión"}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[10px] font-mono text-[#64748B]">
                                NC: {g.notaCredito || "Pendiente"}
                              </div>
                            </td>
                          </tr>
                          {expandida && (
                            <tr className="bg-[#F8FAFC]">
                              <td colSpan={10} className="p-3 text-[11.5px] text-[#334155] space-y-1">
                                <div>
                                  <strong className="text-[#0E245E]">Motivo de Glosa:</strong> {g.motivoGlosa || "—"}
                                </div>
                                {g.observacionInterna && (
                                  <div>
                                    <strong className="text-[#0E245E]">Respuesta / Observación:</strong> {g.observacionInterna}
                                  </div>
                                )}
                                {cr.servicioDescripcion && (
                                  <div>
                                    <strong className="text-[#0E245E]">Servicio Clínico Cruzado ({cr.cups}):</strong>{" "}
                                    {cr.servicioDescripcion}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tabActiva === "cartera_viva" && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Factura · Fechas · Edad</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Sede</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Consulta / Cirugía</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Empresa Homologada (NIT)</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">De dónde es · Cuenta SISMA</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Nombres / Responsable</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Corriente (&lt;=60d)</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Vencida (&gt;60d)</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Saldo Abierto</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Radicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                    {(listaActivaPaginada.items as FacturaSismaVivaRow[]).map((f, idx) => {
                      const cr = cruzarFilaMaestra({
                        factura: f.factura,
                        empresa: f.empresaHomologada,
                        empresaOriginal: f.razonSocialOriginal,
                        nit: f.nit,
                        deDondeEs: f.deDondeEs,
                        sede: f.sede,
                        sedeGrupo: f.sedeGrupo,
                        tipoAtencion: f.tipoAtencion,
                        tipoGrupo: f.tipoGrupo,
                        pacienteNombre: f.pacienteNombre,
                        pacienteDoc: f.pacienteDoc,
                      });
                      return (
                        <tr key={`${f.factura}-${f.cuenta}-${idx}`} className="hover:bg-[#EFF6FF] transition-colors align-top">
                          <td className="p-2.5 font-mono whitespace-nowrap">
                            <div className="font-extrabold text-[#0E245E]">{f.factura || "—"}</div>
                            <div className="text-[10.5px] text-[#64748B]">
                              Emis: {f.fechaFactura || "—"} · {f.dias}d
                            </div>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                              style={{
                                backgroundColor: cr.sedeGrupo === "SEDE_2" ? "#EFF6FF" : "#ECFDF5",
                                color: cr.sedeGrupo === "SEDE_2" ? "#1D4ED8" : "#047857",
                                borderColor: cr.sedeGrupo === "SEDE_2" ? "#BFDBFE" : "#A7F3D0",
                              }}
                            >
                              {cr.sede}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-slate-200 bg-slate-50 text-[#334155]">
                              {cr.tipoAtencion}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-[#0E245E]">{cr.empresaHomologada}</div>
                            {f.nit && <div className="text-[10px] font-mono text-[#64748B]">NIT {f.nit}</div>}
                          </td>
                          <td className="p-2.5 text-[11px]">
                            <div className="font-semibold text-[#334155]">{cr.deDondeEs}</div>
                            <div className="text-[10px] text-[#64748B] truncate max-w-[210px]" title={f.descripcionCuenta}>
                              {f.cuenta} · {f.descripcionCuenta}
                            </div>
                          </td>
                          <td className="p-2.5 text-[11px]">
                            {cr.pacienteNombre && (
                              <div className="font-bold text-[#0E245E]">Pac: {cr.pacienteNombre}</div>
                            )}
                            {cr.medicoNombre && (
                              <div className="text-[10.5px] text-[#334155]">Dr(a): {cr.medicoNombre}</div>
                            )}
                            <div className="text-[10.5px] text-[#475569]">Resp: {f.responsable}</div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-[#1D58D8]">
                            {formatCOP(f.corriente)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-[#BE123C]">
                            {formatCOP(f.vencida)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-[#0E245E]">
                            {formatCOP(f.saldo)}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: f.esPendienteRadicar ? "#FEF3C7" : "#DCFCE7",
                                color: f.esPendienteRadicar ? "#92400E" : "#047857",
                              }}
                            >
                              {f.esPendienteRadicar ? "Pend. Radicar" : "Radicada"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tabActiva === "pendientes" && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Fecha · Factura</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Sede</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Consulta / Cirugía</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Empresa Homologada (NIT)</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">De dónde es</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Nombres (Paciente · Médico · Resp.)</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Servicio Clínico / CUPS</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Valor Servicio</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                    {(listaActivaPaginada.items as PendienteRow[]).map((p) => {
                      const cr = cruzarFilaMaestra({
                        ...p,
                        factura: p.facturaAsociada,
                        cups: p.cups,
                        unidadFuncional: p.unidadFuncional,
                        contrato: p.contrato,
                        descripcion: p.descripcion,
                      });
                      const respR = normalizarResponsableReal(p.responsable, p.empresa);
                      return (
                        <tr key={p.id} className="hover:bg-[#EFF6FF] transition-colors align-top">
                          <td className="p-2.5 font-mono whitespace-nowrap">
                            <div className="font-bold text-[#0E245E]">{p.fechaServicio || p.anio || "—"}</div>
                            {p.facturaAsociada && (
                              <div className="text-[10.5px] font-extrabold text-[#1D58D8]">{p.facturaAsociada}</div>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                              style={{
                                backgroundColor: cr.sedeGrupo === "SEDE_2" ? "#EFF6FF" : "#ECFDF5",
                                color: cr.sedeGrupo === "SEDE_2" ? "#1D4ED8" : "#047857",
                                borderColor: cr.sedeGrupo === "SEDE_2" ? "#BFDBFE" : "#A7F3D0",
                              }}
                            >
                              {cr.sede}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                              style={{
                                backgroundColor:
                                  cr.tipoGrupo === "CIRUGIA"
                                    ? "#F5F3FF"
                                    : cr.tipoGrupo === "CONSULTA"
                                    ? "#F0F9FF"
                                    : "#FFFBEB",
                                color:
                                  cr.tipoGrupo === "CIRUGIA"
                                    ? "#6D28D9"
                                    : cr.tipoGrupo === "CONSULTA"
                                    ? "#0369A1"
                                    : "#B45309",
                                borderColor:
                                  cr.tipoGrupo === "CIRUGIA"
                                    ? "#DDD6FE"
                                    : cr.tipoGrupo === "CONSULTA"
                                    ? "#BAE6FD"
                                    : "#FDE68A",
                              }}
                            >
                              {cr.tipoAtencion}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-[#0E245E]">{cr.empresaHomologada}</div>
                            {cr.nit && <div className="text-[10px] font-mono text-[#64748B]">NIT {cr.nit}</div>}
                          </td>
                          <td className="p-2.5 text-[11px]">
                            <div className="font-semibold text-[#334155]">{cr.deDondeEs}</div>
                            {p.contrato && (
                              <div className="text-[10px] text-[#64748B] truncate max-w-[180px]" title={p.contrato}>
                                {p.contrato}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-[11px]">
                            {p.pacienteNombre && (
                              <div className="font-bold text-[#0E245E]">
                                Pac: {p.pacienteNombre}
                                {p.pacienteDoc ? ` (${p.pacienteDoc})` : ""}
                              </div>
                            )}
                            {p.medico && <div className="text-[10.5px] font-medium text-[#334155]">Dr(a): {p.medico}</div>}
                            <div className="text-[10px] text-[#64748B]">Resp: {respR}</div>
                          </td>
                          <td className="p-2.5 max-w-[260px]">
                            {p.cups && <span className="font-mono font-bold text-[#0E245E] mr-1">[{p.cups}]</span>}
                            <span className="text-[#334155]">{p.descripcion}</span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-[#0E245E]">
                            {formatCOP(p.valorServicio)}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: p.estado === "FACTURADO" ? "#DCFCE7" : "#FEF3C7",
                                color: p.estado === "FACTURADO" ? "#047857" : "#92400E",
                              }}
                            >
                              {p.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {(tabActiva === "anuladas" || tabActiva === "legalizadas") && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Factura · Fechas</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Sede</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Consulta / Cirugía</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Empresa Homologada (NIT)</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">De dónde es</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Nombres / Responsable</th>
                      <th className="p-2.5 text-right font-bold whitespace-nowrap">Valor Facturado</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Reemplazo</th>
                      <th className="p-2.5 text-left font-bold whitespace-nowrap">Motivo / Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                    {(listaActivaPaginada.items as AnuladaRow[]).map((a) => {
                      const cr = cruzarFilaMaestra({ ...a, motivoTexto: a.motivo });
                      const respR = normalizarResponsableReal(a.responsable, a.empresa);
                      return (
                        <tr key={a.id} className="hover:bg-[#EFF6FF] transition-colors align-top">
                          <td className="p-2.5 font-mono whitespace-nowrap">
                            <div className="font-extrabold text-[#0E245E]">{a.factura}</div>
                            <div className="text-[10.5px] text-[#64748B]">
                              F: {(a.fechaFactura || a.anio || "—").slice(0, 10)}
                            </div>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border"
                              style={{
                                backgroundColor: cr.sedeGrupo === "SEDE_2" ? "#EFF6FF" : "#ECFDF5",
                                color: cr.sedeGrupo === "SEDE_2" ? "#1D4ED8" : "#047857",
                                borderColor: cr.sedeGrupo === "SEDE_2" ? "#BFDBFE" : "#A7F3D0",
                              }}
                            >
                              {cr.sede}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-slate-200 bg-slate-50 text-[#334155]">
                              {cr.tipoAtencion}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-[#0E245E]">{cr.empresaHomologada}</div>
                            {cr.nit && <div className="text-[10px] font-mono text-[#64748B]">NIT {cr.nit}</div>}
                          </td>
                          <td className="p-2.5 text-[11px] font-semibold text-[#334155]">{cr.deDondeEs}</td>
                          <td className="p-2.5 text-[11px]">
                            {cr.pacienteNombre && (
                              <div className="font-bold text-[#0E245E]">Pac: {cr.pacienteNombre}</div>
                            )}
                            <div className="text-[#475569]">Resp: {respR}</div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-[#0E245E]">
                            {formatCOP(a.valorRadicado)}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[#1D58D8]">
                            {a.facturaReemplaza || "SIN REEMPLAZO"}
                          </td>
                          <td className="p-2.5 max-w-[260px]">
                            <div className="text-[11px] text-[#334155]">{a.motivo || "—"}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                              {a.estadoGestion}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINACIÓN DEL REPORTE MAESTRO */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#475569]">
              <div>
                Mostrando página <strong className="text-[#0E245E]">{paginaActual}</strong> de{" "}
                <strong className="text-[#0E245E]">{listaActivaPaginada.totalPaginas}</strong> —{" "}
                <strong className="text-[#0E245E]">{listaActivaPaginada.total.toLocaleString("es-CO")}</strong> registros filtrados
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border font-bold disabled:opacity-40 cursor-pointer"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={paginaActual >= listaActivaPaginada.totalPaginas}
                  onClick={() => setPaginaActual((p) => Math.min(listaActivaPaginada.totalPaginas, p + 1))}
                  className="px-3 py-1.5 rounded-lg border font-bold disabled:opacity-40 cursor-pointer"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR CORTE */}
      {mostrarModalCorte && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            className="rounded-xl max-w-xl w-full p-6 shadow-2xl border space-y-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0E245E" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E2ECF8" }}>
              <h4 className="text-base font-extrabold">+ Registrar Corte de Cartera</h4>
              <button
                type="button"
                onClick={() => setMostrarModalCorte(false)}
                className="font-bold text-base cursor-pointer"
                style={{ color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold mb-1">Modalidad</label>
                <select
                  value={nuevoCorteForm.modalidad}
                  onChange={(e) =>
                    setNuevoCorteForm({ ...nuevoCorteForm, modalidad: e.target.value as "TODAS" | "PYP" })
                  }
                  className="w-full rounded-lg border px-3 py-2 font-bold"
                  style={{ borderColor: "#CBD5E1" }}
                >
                  <option value="TODAS">Todas las Empresas</option>
                  <option value="PYP">Modalidad PYP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Fecha de Corte (DD/MM/AAAA)</label>
                <input
                  type="text"
                  value={nuevoCorteForm.fechaCorte}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, fechaCorte: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Cartera Corriente (&lt; 60 días)</label>
                <input
                  type="number"
                  value={nuevoCorteForm.carteraCorriente}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, carteraCorriente: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Cartera Vencida (&gt;= 60 días)</label>
                <input
                  type="number"
                  value={nuevoCorteForm.carteraVencida}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, carteraVencida: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Giros / Anticipos por Cruzar</label>
                <input
                  type="number"
                  value={nuevoCorteForm.anticiposPorCruzar}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, anticiposPorCruzar: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Facturas Pendientes por Radicar</label>
                <input
                  type="number"
                  value={nuevoCorteForm.facturasPendientesRadicar}
                  onChange={(e) =>
                    setNuevoCorteForm({ ...nuevoCorteForm, facturasPendientesRadicar: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "#E2ECF8" }}>
              <button
                type="button"
                onClick={() => setMostrarModalCorte(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border cursor-pointer"
                style={{ backgroundColor: "#F8FAFC", color: "#475569", borderColor: "#CBD5E1" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarNuevoCorteSismaBack}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
              >
                Guardar Corte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
