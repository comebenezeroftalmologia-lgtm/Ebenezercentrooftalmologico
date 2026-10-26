"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import carteraInitialData from "@/lib/cartera-data.json";
import { FechaDelDato } from "@/components/FechaDelDato";

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
  valorRadicado: number;
  valorFactura: number;
  valorGlosado: number;
  motivoGlosa: string;
  facturador: string;
  responsableAceptacion: string;
  observacionInterna: string;
  notaCredito: string;
};

type PendienteRow = {
  id: string;
  empresa: string;
  empresaOriginal: string;
  contrato: string;
  unidadFuncional: string;
  cups: string;
  descripcion: string;
  fechaServicio: string;
  anio: string;
  medico: string;
  valorServicio: number;
  responsable: string;
  observaciones: string;
  estado: string;
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

const normalizarEtiquetaTipo = (tipoRaw: string | undefined): string => {
  const t = String(tipoRaw || "").toUpperCase().trim();
  if (t.includes("DEVOL")) return "DEVOL.";
  return "GLOSA";
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

  // Persiana states for the main cards/boxes
  const [persianaResumenAbierta, setPersianaResumenAbierta] = useState<boolean>(true);
  const [persianaCortesAbierta, setPersianaCortesAbierta] = useState<boolean>(false);
  const [persianaEdadesVivaAbierta, setPersianaEdadesVivaAbierta] = useState<boolean>(false);
  const [cortinaTablaAbierta, setCortinaTablaAbierta] = useState<boolean>(true);
  const [persianaMesaAbierta, setPersianaMesaAbierta] = useState<boolean>(true);

  // Multi-date calendar popover state
  const [calendarioAbierto, setCalendarioAbierto] = useState<boolean>(false);
  const [mesCalendario, setMesCalendario] = useState<number>(9); // 0-indexed: 9 = Octubre
  const [anioCalendario, setAnioCalendario] = useState<number>(2026);

  // Live SISMA API state (Faber endpoints: cartera-edades & auxiliar-abierto)
  const [fechaCorteVivo, setFechaCorteVivo] = useState<string>("2026-10-20");
  const [cargandoSismaVivo, setCargandoSismaVivo] = useState<boolean>(false);
  const [datosSismaVivo, setDatosSismaVivo] = useState<{
    corteISO: string;
    fechaCorte: string;
    filasFacturas: number;
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
      facturasCount: number;
      corriente: number;
      vencida: number;
      pendienteRadicar: number;
      total: number;
    }[];
  } | null>(carteraInitialData.sismaBack.datosSismaVivo);

  // 6 Top Bar Filters
  const [tabActiva, setTabActiva] = useState<"anuladas" | "legalizadas" | "glosas" | "pendientes">("anuladas");
  const [filtroAnio, setFiltroAnio] = useState<string>("TODOS");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("TODAS");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroResponsable, setFiltroResponsable] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Barra de filtros superior estilo Tablero de Frecuencias (.period-bar)
  const [ddFrecAbierto, setDdFrecAbierto] = useState<
    "year" | "month" | "dias" | "grp" | "resp" | null
  >(null);
  const [aniosFrecSel, setAniosFrecSel] = useState<string[]>(
    () => [...carteraInitialData.aniosDisponibles]
  );
  const [mesesFrecSel, setMesesFrecSel] = useState<string[]>([]);
  const [empresasFrecSel, setEmpresasFrecSel] = useState<string[]>([]);
  const [responsablesFrecSel, setResponsablesFrecSel] = useState<string[]>([]);
  const [incluirMutual, setIncluirMutual] = useState<boolean>(true);
  const [diasDesde, setDiasDesde] = useState<string>("");
  const [diasHasta, setDiasHasta] = useState<string>("");
  const [diasSemanaSel, setDiasSemanaSel] = useState<number[]>([]);
  const [diasFiltroActivo, setDiasFiltroActivo] = useState<boolean>(false);
  const [diasEtiqueta, setDiasEtiqueta] = useState<string>("📅 Todos los días");

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
    fechaFactura: "2026-10-19",
    fechaRadicacion: "2026-10-19",
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.anuladas)) {
          setAnuladas(
            parsed.anuladas.map((r: AnuladaRow) => ({
              ...r,
              responsable: normalizarResponsableReal(r.responsable, r.empresa),
            }))
          );
        }
        if (Array.isArray(parsed.legalizadas)) {
          setLegalizadas(
            parsed.legalizadas.map((r: AnuladaRow) => ({
              ...r,
              responsable: normalizarResponsableReal(r.responsable, r.empresa),
            }))
          );
        }
        if (Array.isArray(parsed.glosas)) {
          setGlosas(
            parsed.glosas.map((r: GlosaRow) => ({
              ...r,
              facturador: normalizarResponsableReal(r.facturador, r.empresa),
            }))
          );
        }
        if (Array.isArray(parsed.pendientes)) {
          setPendientes(
            parsed.pendientes.map((r: PendienteRow) => ({
              ...r,
              responsable: normalizarResponsableReal(r.responsable, r.empresa),
            }))
          );
        }
        if (Array.isArray(parsed.cortesTodas) && parsed.cortesTodas.length >= carteraInitialData.sismaBack.cortes.TODAS.length) setCortesTodas(parsed.cortesTodas);
        if (Array.isArray(parsed.cortesPyp)) setCortesPyp(parsed.cortesPyp);
      }
    } catch {
      // Ignore storage error
    }
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

  const mostrarMensaje = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(""), 4000);
  };

  const sincronizarConSismaVivo = async (fechaISO?: string, silencioso?: boolean) => {
    const corteConsulta = fechaISO || fechaCorteVivo || "2026-10-20";
    setCargandoSismaVivo(true);
    try {
      const res = await fetch(`/api/cartera/sisma?corte=${encodeURIComponent(corteConsulta)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (!silencioso) {
          mostrarMensaje(`No se pudo sincronizar con SISMA: ${json.error || res.statusText}`);
        }
        return;
      }
      setDatosSismaVivo(json);
      if (json.resumenCorte) {
        const aClaveOrden = (f: string) => {
          const p = f.slice(0, 10).split("/");
          return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : f;
        };
        setCortesTodas((prev) => {
          const sinDuplicado = prev.filter(
            (c) =>
              !c.fechaCorte.includes("SISMA Vivo") &&
              c.fechaCorte.slice(0, 10) !== json.fechaCorte.slice(0, 10)
          );
          const nuevaLista = [...sinDuplicado, json.resumenCorte].sort((a, b) =>
            aClaveOrden(a.fechaCorte).localeCompare(aClaveOrden(b.fechaCorte))
          );
          const nuevoIdx = nuevaLista.findIndex(
            (c) => c.fechaCorte.slice(0, 10) === json.fechaCorte.slice(0, 10)
          );
          setIndiceCorteActivo(nuevoIdx !== -1 ? nuevoIdx : nuevaLista.length - 1);
          return nuevaLista;
        });
        setModalidadSisma("TODAS");
      }
      if (!silencioso) {
        mostrarMensaje(
          `✓ Sincronizado en vivo con SISMA (Corte ${json.fechaCorte} · ${json.filasFacturas.toLocaleString("es-CO")} facturas)`
        );
      }
    } catch {
      if (!silencioso) {
        mostrarMensaje("Error de red al conectar con el API de SISMA Contabilidad.");
      }
    } finally {
      setCargandoSismaVivo(false);
    }
  };

  useEffect(() => {
    const hoyCol = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setFechaCorteVivo(hoyCol);
    sincronizarConSismaVivo(hoyCol, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Si ya estaba marcada y hay más de 1 fecha, desmarcarla; si no era la activa, activarla
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
      // Si no estaba marcada, consultarla en vivo en SISMA y agregarla
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
      if (diasHasta && /^\d{4}-\d{2}-\d{2}$/.test(diasHasta)) {
        setFechaCorteVivo(diasHasta);
        sincronizarConSismaVivo(diasHasta, false);
      }
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
  };

  const cumpleFiltrosFrecuencias = (
    anioReg: string,
    empresaReg: string,
    responsableReg: string,
    fechaISO?: string
  ): boolean => {
    if (!incluirMutual && String(empresaReg || "").toUpperCase().includes("MUTUAL")) {
      return false;
    }
    if (
      aniosFrecSel.length > 0 &&
      aniosFrecSel.length < carteraInitialData.aniosDisponibles.length &&
      !aniosFrecSel.includes(String(anioReg || ""))
    ) {
      return false;
    }
    if (empresasFrecSel.length > 0 && !empresasFrecSel.includes(String(empresaReg || ""))) {
      return false;
    }
    if (
      responsablesFrecSel.length > 0 &&
      !responsablesFrecSel.includes(String(responsableReg || ""))
    ) {
      return false;
    }
    const fStr = String(fechaISO || "").trim().slice(0, 10);
    if (mesesFrecSel.length > 0) {
      if (!/^\d{4}-\d{2}/.test(fStr)) return false;
      const mm = fStr.slice(5, 7);
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
    setFiltroAnio("TODOS");
    setFiltroEmpresa("TODAS");
    setFiltroTipo("TODOS");
    setFiltroEstado("TODOS");
    setFiltroResponsable("TODAS");
    setBusqueda("");
    setAniosFrecSel([...carteraInitialData.aniosDisponibles]);
    setMesesFrecSel([]);
    setEmpresasFrecSel([]);
    setResponsablesFrecSel([]);
    setIncluirMutual(true);
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
  };

  const hayFiltrosActivos =
    filtroAnio !== "TODOS" ||
    filtroEmpresa !== "TODAS" ||
    filtroTipo !== "TODOS" ||
    filtroEstado !== "TODOS" ||
    filtroResponsable !== "TODAS" ||
    busqueda.trim() !== "" ||
    !incluirMutual ||
    (aniosFrecSel.length > 0 &&
      aniosFrecSel.length < carteraInitialData.aniosDisponibles.length) ||
    mesesFrecSel.length > 0 ||
    empresasFrecSel.length > 0 ||
    responsablesFrecSel.length > 0 ||
    diasFiltroActivo ||
    Object.values(valoresExcluidosPorCol).some((arr) => arr && arr.length > 0) ||
    Object.values(busquedaTextoPorCol).some((txt) => txt && txt.trim() !== "") ||
    ordenColumna !== null;

  const listaCortesActiva = modalidadSisma === "TODAS" ? cortesTodas : cortesPyp;
  const corteSeleccionado =
    listaCortesActiva[Math.min(indiceCorteActivo, listaCortesActiva.length - 1)] ||
    listaCortesActiva[listaCortesActiva.length - 1];

  // Helper to get display value of a cell for column filter menu
  const obtenerValorCelda = (row: Record<string, unknown>, colKey: string): string => {
    if (colKey === "tipo") {
      return normalizarEtiquetaTipo(String(row.tipo || ""));
    }
    if (colKey === "responsable" || colKey === "facturador") {
      return normalizarResponsableReal(String(row[colKey] || ""), String(row.empresa || ""));
    }
    if (colKey === "fechaRadicacion") {
      return String(row.fechaRadicacion || row.fechaFactura || "-");
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

  const filtrarBaseAnuladas = (lista: AnuladaRow[]) => {
    const q = busqueda.toLowerCase().trim();
    const base = lista.filter((r) => {
      const respReal = normalizarResponsableReal(r.responsable, r.empresa);
      if (
        !cumpleFiltrosFrecuencias(
          r.anio,
          r.empresa,
          respReal,
          r.fechaRadicacion || r.fechaFactura
        )
      ) {
        return false;
      }
      if (filtroAnio !== "TODOS" && r.anio !== filtroAnio) return false;
      if (filtroEmpresa !== "TODAS" && r.empresa !== filtroEmpresa) return false;
      if (filtroTipo !== "TODOS" && !normalizarEtiquetaTipo(r.tipo).includes(filtroTipo)) return false;
      if (filtroEstado !== "TODOS") {
        const tieneReemplazo = Boolean(r.facturaReemplaza && r.facturaReemplaza.trim() !== "");
        if (filtroEstado === "REEMPLAZADA" && !tieneReemplazo) return false;
        if (filtroEstado === "PENDIENTE" && tieneReemplazo) return false;
      }
      if (filtroResponsable !== "TODAS" && respReal !== filtroResponsable) return false;
      if (q) {
        const texto = `${r.factura} ${r.empresa} ${r.motivo} ${r.facturaReemplaza} ${respReal} ${r.revisionFinanciera} ${r.rips}`.toLowerCase();
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
    ]
  );

  const glosasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    const base = glosas.filter((r) => {
      const facReal = normalizarResponsableReal(r.facturador, r.empresa);
      if (!cumpleFiltrosFrecuencias(r.anio, r.empresa, facReal, "")) {
        return false;
      }
      if (filtroAnio !== "TODOS" && r.anio !== filtroAnio) return false;
      if (filtroEmpresa !== "TODAS" && r.empresa !== filtroEmpresa) return false;
      if (filtroResponsable !== "TODAS" && facReal !== filtroResponsable) return false;
      if (filtroEstado !== "TODOS") {
        if (filtroEstado === "REEMPLAZADA" && r.subtabla !== "RESPONDIDA_NO_ACEPTADA") return false;
        if (filtroEstado === "PENDIENTE" && r.subtabla === "RESPONDIDA_NO_ACEPTADA") return false;
      }
      if (q) {
        const texto = `${r.factura} ${r.empresa} ${r.motivoGlosa} ${r.observacionInterna} ${r.notaCredito} ${facReal}`.toLowerCase();
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
  ]);

  const pendientesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    const base = pendientes.filter((r) => {
      const respReal = normalizarResponsableReal(r.responsable, r.empresa);
      if (!cumpleFiltrosFrecuencias(r.anio, r.empresa, respReal, r.fechaServicio)) {
        return false;
      }
      if (filtroAnio !== "TODOS" && r.anio !== filtroAnio) return false;
      if (filtroEmpresa !== "TODAS" && r.empresa !== filtroEmpresa) return false;
      if (filtroResponsable !== "TODAS" && respReal !== filtroResponsable) return false;
      if (filtroEstado !== "TODOS") {
        if (filtroEstado === "REEMPLAZADA" && r.estado !== "FACTURADO") return false;
        if (filtroEstado === "PENDIENTE" && r.estado === "FACTURADO") return false;
      }
      if (q) {
        const texto = `${r.cups} ${r.descripcion} ${r.empresa} ${r.medico} ${r.observaciones} ${respReal}`.toLowerCase();
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
  ]);

  const listaActivaCompleta = useMemo(() => {
    if (tabActiva === "anuladas") return anuladas as unknown as Record<string, unknown>[];
    if (tabActiva === "legalizadas") return legalizadas as unknown as Record<string, unknown>[];
    if (tabActiva === "glosas") return glosas as unknown as Record<string, unknown>[];
    return pendientes as unknown as Record<string, unknown>[];
  }, [tabActiva, anuladas, legalizadas, glosas, pendientes]);

  const listaActivaPaginada = useMemo(() => {
    const start = (paginaActual - 1) * filasPorPagina;
    const end = start + filasPorPagina;
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
  }, [tabActiva, anuladasFiltradas, legalizadasFiltradas, glosasFiltradas, pendientesFiltradas, paginaActual]);

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
            fechaFactura: cols[1] || "2026-10-19",
            periodo: "",
            anio: "2026",
            factura: fac,
            fechaRadicacion: cols[3] || "2026-10-19",
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
      } else {
        const next = [nueva, ...legalizadas];
        setLegalizadas(next);
        persistAll(anuladas, next, glosas, pendientes, cortesTodas, cortesPyp);
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
    }

    setMostrarModalNuevo(false);
    mostrarMensaje(`Nuevo registro agregado en ${tabActiva.toUpperCase()}.`);
  };

  // Export current filtered table to CSV (Excel compatible UTF-8 BOM)
  const exportarVistaExcelCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (tabActiva === "anuladas" || tabActiva === "legalizadas") {
      const source = tabActiva === "anuladas" ? anuladasFiltradas : legalizadasFiltradas;
      headers = [
        "ID",
        "Año",
        "Periodo",
        "Empresa",
        "Factura",
        "Fecha Radicacion",
        "Valor Facturado",
        "Valor Glosa/Devolucion",
        "Tipo",
        "Motivo",
        "Factura Reemplaza",
        "RIPS",
        "Revision Financiera",
        "Responsable",
        "Estado",
      ];
      rows = source.map((r) => [
        r.id,
        r.anio,
        r.periodo,
        r.empresa,
        r.factura,
        r.fechaRadicacion,
        r.valorRadicado,
        r.valorGlosaDevolucion || 0,
        r.tipo,
        r.motivo,
        r.facturaReemplaza,
        r.rips,
        r.revisionFinanciera,
        normalizarResponsableReal(r.responsable, r.empresa),
        r.estadoGestion,
      ]);
    } else if (tabActiva === "glosas") {
      headers = [
        "ID",
        "Estado Glosa",
        "Año",
        "Empresa",
        "Factura",
        "Fecha Radicacion",
        "Valor Factura",
        "Valor Glosado",
        "Motivo Glosa",
        "Facturador",
        "Observacion Interna",
        "Nota Credito",
      ];
      rows = glosasFiltradas.map((r) => [
        r.id,
        r.subtabla,
        r.anio,
        r.empresa,
        r.factura,
        r.fechaRadicacion,
        r.valorFactura || r.valorRadicado,
        r.valorGlosado,
        r.motivoGlosa,
        normalizarResponsableReal(r.facturador, r.empresa),
        r.observacionInterna,
        r.notaCredito,
      ]);
    } else {
      headers = [
        "ID",
        "Año",
        "Empresa",
        "Contrato",
        "CUPS",
        "Descripcion",
        "Fecha Servicio",
        "Medico",
        "Valor Servicio",
        "Responsable",
        "Observaciones",
        "Estado",
      ];
      rows = pendientesFiltradas.map((r) => [
        r.id,
        r.anio,
        r.empresa,
        r.contrato,
        r.cups,
        r.descripcion,
        r.fechaServicio,
        r.medico,
        r.valorServicio,
        normalizarResponsableReal(r.responsable, r.empresa),
        r.observaciones,
        r.estado,
      ]);
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
        className="rounded-xl px-4 py-3 border shadow-2xs flex flex-wrap items-center gap-2 relative"
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
              {aniosFrecSel.length === 0
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
                    setAniosFrecSel([...carteraInitialData.aniosDisponibles]);
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
                {carteraInitialData.aniosDisponibles.map((yr) => {
                  const sel = aniosFrecSel.includes(yr);
                  return (
                    <div
                      key={yr}
                      onClick={() =>
                        toggleItemEnLista(aniosFrecSel, yr, setAniosFrecSel)
                      }
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
                mesesFrecSel.length > 0 ? "#E7ECFE" : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "month"
                  ? "#1A3174"
                  : mesesFrecSel.length > 0
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: "#0E245E",
              fontWeight: mesesFrecSel.length > 0 ? 600 : 500,
            }}
          >
            <span>
              {mesesFrecSel.length === 0
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
                    setMesesFrecSel(MESES_FREC.map((m) => m.id));
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
                      onClick={() =>
                        toggleItemEnLista(mesesFrecSel, m.id, setMesesFrecSel)
                      }
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
                empresasFrecSel.length > 0 ? "#E7ECFE" : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "grp"
                  ? "#1A3174"
                  : empresasFrecSel.length > 0
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: "#0E245E",
              fontWeight: empresasFrecSel.length > 0 ? 600 : 500,
            }}
          >
            <span>
              {empresasFrecSel.length === 0
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
              className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border bg-white p-2 shadow-2xl z-50 max-h-72 overflow-y-auto"
              style={{ borderColor: "#E1E4EC" }}
            >
              <div
                className="flex gap-1.5 pb-2 mb-1.5 border-b"
                style={{ borderColor: "#EFF1F6" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEmpresasFrecSel([
                      ...carteraInitialData.empresasDisponibles,
                    ]);
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
                {carteraInitialData.empresasDisponibles.map((emp) => {
                  const sel = empresasFrecSel.includes(emp);
                  return (
                    <div
                      key={emp}
                      onClick={() =>
                        toggleItemEnLista(
                          empresasFrecSel,
                          emp,
                          setEmpresasFrecSel
                        )
                      }
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
                      <span className="truncate">{emp}</span>
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
                responsablesFrecSel.length > 0 ? "#E7ECFE" : "#FFFFFF",
              borderColor:
                ddFrecAbierto === "resp"
                  ? "#1A3174"
                  : responsablesFrecSel.length > 0
                  ? "#0F2FF3"
                  : "#E1E4EC",
              color: "#0E245E",
              fontWeight: responsablesFrecSel.length > 0 ? 600 : 500,
            }}
          >
            <span>
              {responsablesFrecSel.length === 0
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
                    setResponsablesFrecSel([
                      ...carteraInitialData.responsablesDisponibles,
                    ]);
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
                      onClick={() =>
                        toggleItemEnLista(
                          responsablesFrecSel,
                          resp,
                          setResponsablesFrecSel
                        )
                      }
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
          }}
          className="px-4 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider text-white cursor-pointer transition shrink-0"
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
          className="px-3.5 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider border bg-white cursor-pointer transition shrink-0"
          style={{ borderColor: "#C7CDE0", color: "#1A3174" }}
        >
          Limpiar
        </button>

        {/* 7. INTERRUPTOR MUTUAL: INCLUIR | EXCLUIR (ALINEADO A LA DERECHA) */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span
            className="text-[10.5px] font-bold uppercase tracking-wider"
            style={{ color: "#5B6483" }}
          >
            MUTUAL
          </span>
          <div
            className="inline-flex rounded-[10px] p-0.5 border"
            style={{ backgroundColor: "#EFF1F6", borderColor: "#E1E4EC" }}
          >
            <button
              type="button"
              onClick={() => {
                setIncluirMutual(true);
                setPaginaActual(1);
              }}
              className="px-2.5 py-1 rounded-[7px] text-[11.5px] font-bold transition cursor-pointer"
              style={{
                backgroundColor: incluirMutual ? "#FFFFFF" : "transparent",
                color: incluirMutual ? "#0E245E" : "#5B6483",
                boxShadow: incluirMutual
                  ? "0 1px 3px rgba(15,23,42,0.1)"
                  : "none",
              }}
            >
              Incluir
            </button>
            <button
              type="button"
              onClick={() => {
                setIncluirMutual(false);
                setPaginaActual(1);
              }}
              className="px-2.5 py-1 rounded-[7px] text-[11.5px] font-bold transition cursor-pointer"
              style={{
                backgroundColor: !incluirMutual ? "#FFFFFF" : "transparent",
                color: !incluirMutual ? "#0E245E" : "#5B6483",
                boxShadow: !incluirMutual
                  ? "0 1px 3px rgba(15,23,42,0.1)"
                  : "none",
              }}
            >
              Excluir
            </button>
          </div>
        </div>
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
              {/* Esta pantalla consulta SISMA en vivo, pero si la consulta
                  falla el aviso dura 4 segundos y despues la pantalla se
                  queda mostrando la instantanea guardada como si fuera el
                  corte de hoy. Esto lo dice de forma permanente. */}
              <div className="mt-1.5">
                {datosSismaVivo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[11.5px] font-semibold text-[#047857]">
                    En vivo desde SISMA · corte {datosSismaVivo.fechaCorte}
                  </span>
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
                              onClick={() => {
                                setIndiceCorteActivo(idx);
                                const partes = c.fechaCorte.slice(0, 10).split("/");
                                if (partes.length === 3) {
                                  const iso = `${partes[2]}-${partes[1]}-${partes[0]}`;
                                  setFechaCorteVivo(iso);
                                }
                              }}
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
                  {formatCOP(corteSeleccionado.totalCarteraReal)}
                </div>
                <div className="text-[11px] mt-1 font-medium" style={{ color: "#047857" }}>
                  Saldo real neto por cobrar
                </div>
              </div>
            </div>

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

                    {/* TOP ENTIDADES EN CARTERA POR EDADES EN VIVO */}
                    <div className="overflow-x-auto border rounded-xl bg-white" style={{ borderColor: "#E2ECF8" }}>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                            <th className="text-left p-2.5 font-bold">NIT</th>
                            <th className="text-left p-2.5 font-bold">Entidad / Pagador (SISMA en Vivo)</th>
                            <th className="text-right p-2.5 font-bold">Facturas</th>
                            <th className="text-right p-2.5 font-bold">Pend. Radicar (130125)</th>
                            <th className="text-right p-2.5 font-bold">Corriente (&lt;= 60d)</th>
                            <th className="text-right p-2.5 font-bold">Vencida (&gt; 60d)</th>
                            <th className="text-right p-2.5 font-bold">Saldo Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                          {datosSismaVivo.topEmpresas.map((emp) => (
                            <tr key={emp.nit + emp.razonSocial} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono" style={{ color: "#475569" }}>
                                {emp.nit}
                              </td>
                              <td className="p-2.5 font-bold" style={{ color: "#0E245E" }}>
                                {emp.razonSocial}
                              </td>
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
                          ))}
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
                          onClick={() => setIndiceCorteActivo(idx)}
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
                                  {formatCOP(corte.totalCarteraReal)}
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
                              {formatCOP(c.totalCarteraReal)}
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
      {/* CUADRO 2: GESTIÓN DE GLOSAS Y ANULADAS (DESPLEGABLE COMO PERSIANA)    */}
      {/* ===================================================================== */}
      <div
        className="rounded-xl p-6 shadow-xs border space-y-4"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        <div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 border-b"
          style={{ borderColor: "#E2ECF8" }}
        >
          <button
            type="button"
            onClick={() => setPersianaMesaAbierta((prev) => !prev)}
            className="text-left flex items-center gap-3 cursor-pointer"
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
              style={{ backgroundColor: "#EFF6FF", color: "#1D58D8" }}
            >
              {persianaMesaAbierta ? "▴" : "▾"}
            </span>
            <div>
              <h3 className="text-lg font-extrabold" style={{ color: "#0E245E" }}>
                Gestión de Glosas, Facturas Anuladas y Pendientes (2021 – 2026)
              </h3>
              <p className="text-xs sm:text-sm" style={{ color: "#64748B" }}>
                Haz clic aquí para plegar/desplegar el cuadro como persiana, en cualquier columna (▾) para filtrar o en una fila para ver su detalle.
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarTodosLosFiltros}
                className="px-3.5 py-2 rounded-xl font-bold text-xs border transition cursor-pointer"
                style={{ backgroundColor: "#FFF1F2", color: "#BE123C", borderColor: "#FECDD3" }}
              >
                ✕ Limpiar Filtros
              </button>
            )}
            <button
              type="button"
              onClick={() => setMostrarModalNuevo(true)}
              className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer"
              style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
            >
              + Nuevo Registro
            </button>
            <button
              type="button"
              onClick={exportarVistaExcelCSV}
              className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border transition cursor-pointer"
              style={{ backgroundColor: "#F8FAFC", color: "#0E245E", borderColor: "#CBD5E1" }}
            >
              ↓ Exportar a Excel (CSV)
            </button>
          </div>
        </div>

        {persianaMesaAbierta && (
          <div className="space-y-4">
            {/* BARRA SUPERIOR DE 6 FILTROS ALINEADOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#0E245E" }}>
                  Año
                </label>
                <select
                  value={filtroAnio}
                  onChange={(e) => {
                    setFiltroAnio(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="w-full rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  <option value="TODOS">Todos</option>
                  {carteraInitialData.aniosDisponibles.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#0E245E" }}>
                  Empresa
                </label>
                <select
                  value={filtroEmpresa}
                  onChange={(e) => {
                    setFiltroEmpresa(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="w-full rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  <option value="TODAS">Todas</option>
                  {carteraInitialData.empresasDisponibles.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#0E245E" }}>
                  Tipo
                </label>
                <select
                  value={filtroTipo}
                  onChange={(e) => {
                    setFiltroTipo(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="w-full rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  <option value="TODOS">Glosa / Devolución</option>
                  <option value="GLOSA">GLOSA</option>
                  <option value="DEVOL">DEVOLUCIÓN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#0E245E" }}>
                  Estado
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => {
                    setFiltroEstado(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="w-full rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  <option value="TODOS">Reemplazada / Pendiente</option>
                  <option value="REEMPLAZADA">Reemplazada / Gestionada</option>
                  <option value="PENDIENTE">Pendiente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#0E245E" }}>
                  Responsable
                </label>
                <select
                  value={filtroResponsable}
                  onChange={(e) => {
                    setFiltroResponsable(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="w-full rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  <option value="TODAS">Todas</option>
                  {carteraInitialData.responsablesDisponibles.map((resp) => (
                    <option key={resp} value={resp}>
                      {resp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#0E245E" }}>
                  Buscar
                </label>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPaginaActual(1);
                  }}
                  placeholder="Buscar factura o motivo..."
                  className="w-full rounded-lg border bg-white px-2.5 py-2 text-xs"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                />
              </div>
            </div>

            {/* PESTAÑAS DE LAS 4 HOJAS OPERATIVAS */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className="inline-flex flex-wrap rounded-xl p-1 border gap-1"
                style={{ backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" }}
              >
                {[
                  {
                    id: "anuladas" as const,
                    label: `Facturas Anuladas / Reemplazos (${anuladasFiltradas.length})`,
                  },
                  {
                    id: "legalizadas" as const,
                    label: `Glosas Legalizadas (${legalizadasFiltradas.length})`,
                  },
                  {
                    id: "glosas" as const,
                    label: `Glosas y Notas Crédito (${glosasFiltradas.length})`,
                  },
                  {
                    id: "pendientes" as const,
                    label: `Servicios Pendientes Facturar (${pendientesFiltradas.length})`,
                  },
                ].map((t) => {
                  const activo = tabActiva === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        if (tabActiva === t.id) {
                          setCortinaTablaAbierta((prev) => !prev);
                        } else {
                          setTabActiva(t.id);
                          setCortinaTablaAbierta(true);
                        }
                        setColMenuAbierto(null);
                        setPaginaActual(1);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                      style={{
                        backgroundColor: activo ? "#1D58D8" : "transparent",
                        color: activo ? "#FFFFFF" : "#0E245E",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCortinaTablaAbierta((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5"
                  style={{ backgroundColor: "#EFF6FF", color: "#1D58D8", borderColor: "#BFDBFE" }}
                >
                  <span>{cortinaTablaAbierta ? "▴" : "▾"}</span>
                  <span>{cortinaTablaAbierta ? "Replegar cortina de tabla" : "Desplegar cortina de tabla"}</span>
                </button>
              </div>
            </div>

            {/* TABLA CON REPLIEGUE TIPO CORTINA Y FILAS EN 1 SOLA LÍNEA LIMPIA */}
            {cortinaTablaAbierta && (
            <div className="border rounded-xl overflow-x-auto" style={{ borderColor: "#E2ECF8" }}>
              {(tabActiva === "anuladas" || tabActiva === "legalizadas") && (
                <table
                  className="w-full text-[11px] border-collapse"
                  style={{ tableLayout: "auto", width: "100%" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                      {columnasAnuladas.map((col, idx) =>
                        renderCeldaHeaderConFiltro(col, idx, columnasAnuladas.length + 1)
                      )}
                      <th
                        style={{ width: "1%", whiteSpace: "nowrap" }}
                        className="px-2 py-2.5 text-center font-bold"
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                    {(listaActivaPaginada.items as AnuladaRow[]).map((r) => {
                      const abierta = Boolean(filasExpandidas[r.id]);
                      const etiquetaTipo = normalizarEtiquetaTipo(r.tipo);
                      const textoMotivoBase =
                        r.motivo && r.motivo !== "-"
                          ? r.motivo
                          : r.tipo && r.tipo.length > 15
                          ? r.tipo
                          : "Sin motivo registrado";
                      const nombreResp = normalizarResponsableReal(r.responsable, r.empresa);

                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            onClick={() => togglePersianaFila(r.id)}
                            className="hover:bg-slate-50 align-middle cursor-pointer"
                          >
                            <td className="px-2 py-2 font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {r.anio}
                            </td>
                            <td className="px-2 py-2 font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {r.empresa}
                            </td>
                            <td className="px-2 py-2 font-mono font-bold whitespace-nowrap" style={{ color: "#1D58D8" }}>
                              {r.factura}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap" style={{ color: "#334155" }}>
                              {r.fechaRadicacion || r.fechaFactura || "-"}
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {formatCOP(r.valorRadicado)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-semibold whitespace-nowrap" style={{ color: "#BE123C" }}>
                              {formatCOP(r.valorGlosaDevolucion)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-block"
                                style={{
                                  backgroundColor: etiquetaTipo === "GLOSA" ? "#FFE4E6" : "#EFF6FF",
                                  color: etiquetaTipo === "GLOSA" ? "#BE123C" : "#1D58D8",
                                }}
                              >
                                {etiquetaTipo}
                              </span>
                            </td>
                            <td className="px-2 py-2 leading-snug" style={{ color: "#334155", width: "100%" }}>
                              <div className="flex items-start justify-between gap-2">
                                <span>
                                  {abierta
                                    ? textoMotivoBase
                                    : textoMotivoBase.length > 28
                                    ? `${textoMotivoBase.slice(0, 28)}…`
                                    : textoMotivoBase}
                                </span>
                                <span
                                  className="text-[10px] font-bold shrink-0 px-2 py-0.5 rounded"
                                  style={{ backgroundColor: abierta ? "#DBEAFE" : "#EFF6FF", color: "#1D58D8" }}
                                >
                                  {abierta ? "▴ Replegar" : "▾ Desplegar"}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 font-mono font-bold whitespace-nowrap" style={{ color: "#047857" }}>
                              {r.facturaReemplaza || "PENDIENTE"}
                            </td>
                            <td className="px-2 py-2 font-mono whitespace-nowrap" style={{ color: "#334155" }}>
                              {r.rips || "-"}
                            </td>
                            <td className="px-2 py-2 font-semibold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {nombreResp}
                            </td>
                            <td
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-2 text-center whitespace-nowrap"
                            >
                              <button
                                type="button"
                                onClick={() => setFilaEditando({ ...r, responsable: nombreResp })}
                                className="px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer"
                                style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>

                          {/* PERSIANA DESPLEGABLE DE LA FILA */}
                          {abierta && (
                            <tr style={{ backgroundColor: "#F4F8FD" }}>
                              <td colSpan={12} className="px-4 py-3 border-t" style={{ borderColor: "#BFDBFE" }}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                  <div className="md:col-span-2 space-y-1">
                                    <div className="font-extrabold text-[11px] uppercase" style={{ color: "#1D58D8" }}>
                                      Detalle Completo del Registro ({r.factura})
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white border leading-relaxed" style={{ borderColor: "#CBD5E1", color: "#0E245E" }}>
                                      {textoMotivoBase}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="font-extrabold text-[11px] uppercase" style={{ color: "#047857" }}>
                                      Revisión Financiera y Trazabilidad
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white border space-y-1" style={{ borderColor: "#CBD5E1", color: "#334155" }}>
                                      <div>
                                        <strong>Revisión:</strong> {r.revisionFinanciera || "Registrada en seguimiento"}
                                      </div>
                                      <div>
                                        <strong>Factura Reemplaza:</strong>{" "}
                                        <span className="font-mono font-bold" style={{ color: "#047857" }}>
                                          {r.facturaReemplaza || "PENDIENTE"}
                                        </span>{" "}
                                        | <strong>RIPS:</strong> {r.rips || "-"}
                                      </div>
                                      <div>
                                        <strong>Fecha Factura:</strong> {r.fechaFactura || "-"} |{" "}
                                        <strong>Responsable:</strong> {nombreResp}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tabActiva === "glosas" && (
                <table
                  className="w-full text-[11px] border-collapse"
                  style={{ tableLayout: "auto", width: "100%" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                      {columnasGlosas.map((col, idx) =>
                        renderCeldaHeaderConFiltro(col, idx, columnasGlosas.length + 1)
                      )}
                      <th
                        style={{ width: "1%", whiteSpace: "nowrap" }}
                        className="px-2 py-2.5 text-center font-bold"
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                    {(listaActivaPaginada.items as GlosaRow[]).map((r) => {
                      const abierta = Boolean(filasExpandidas[r.id]);
                      const nombreFac = normalizarResponsableReal(r.facturador, r.empresa);

                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            onClick={() => togglePersianaFila(r.id)}
                            className="hover:bg-slate-50 align-middle cursor-pointer"
                          >
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span
                                className="px-2 py-0.5 rounded-full font-bold text-[10px] inline-block"
                                style={{
                                  backgroundColor:
                                    r.subtabla === "ACEPTADA_NOTA_CREDITO"
                                      ? "#FFE4E6"
                                      : r.subtabla === "RESPONDIDA_NO_ACEPTADA"
                                      ? "#ECFDF5"
                                      : "#FEF3C7",
                                  color:
                                    r.subtabla === "ACEPTADA_NOTA_CREDITO"
                                      ? "#BE123C"
                                      : r.subtabla === "RESPONDIDA_NO_ACEPTADA"
                                      ? "#047857"
                                      : "#B45309",
                                }}
                              >
                                {r.subtabla === "ACEPTADA_NOTA_CREDITO"
                                  ? "Aceptada (NC)"
                                  : r.subtabla === "RESPONDIDA_NO_ACEPTADA"
                                  ? "Respondida"
                                  : "En Gestión"}
                              </span>
                            </td>
                            <td className="px-2 py-2 font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {r.anio}
                            </td>
                            <td className="px-2 py-2 font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {r.empresa}
                            </td>
                            <td className="px-2 py-2 font-mono font-bold whitespace-nowrap" style={{ color: "#1D58D8" }}>
                              {r.factura}
                            </td>
                            <td className="px-2 py-2 text-right font-mono whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {formatCOP(r.valorFactura || r.valorRadicado)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap" style={{ color: "#BE123C" }}>
                              {formatCOP(r.valorGlosado)}
                            </td>
                            <td className="px-2 py-2 leading-snug" style={{ color: "#334155", width: "100%" }}>
                              <div className="flex items-start justify-between gap-2">
                                <span className={abierta ? "whitespace-normal" : "line-clamp-1"}>
                                  {r.motivoGlosa || "-"}
                                </span>
                                <span
                                  className="text-[10px] font-bold shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: abierta ? "#DBEAFE" : "#F1F5F9", color: "#1D58D8" }}
                                >
                                  {abierta ? "▴ Replegar" : "▾ Ver"}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 leading-snug" style={{ color: "#334155" }}>
                              <span className={abierta ? "whitespace-normal" : "line-clamp-1"}>
                                {r.observacionInterna || "-"}
                              </span>
                            </td>
                            <td className="px-2 py-2 font-semibold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {nombreFac}
                            </td>
                            <td className="px-2 py-2 font-mono font-bold whitespace-nowrap" style={{ color: "#6D28D9" }}>
                              {r.notaCredito || "-"}
                            </td>
                            <td
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-2 text-center whitespace-nowrap"
                            >
                              <button
                                type="button"
                                onClick={() => setFilaEditando({ ...r, facturador: nombreFac })}
                                className="px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer"
                                style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>

                          {abierta && (
                            <tr style={{ backgroundColor: "#F4F8FD" }}>
                              <td colSpan={11} className="px-4 py-3 border-t" style={{ borderColor: "#BFDBFE" }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <div className="font-extrabold text-[11px] uppercase mb-1" style={{ color: "#1D58D8" }}>
                                      Motivo Completo de Glosa ({r.factura})
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white border" style={{ borderColor: "#CBD5E1", color: "#0E245E" }}>
                                      {r.motivoGlosa || "-"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-[11px] uppercase mb-1" style={{ color: "#047857" }}>
                                      Respuesta / Observación Interna
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white border" style={{ borderColor: "#CBD5E1", color: "#334155" }}>
                                      {r.observacionInterna || "Sin observación adicional"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tabActiva === "pendientes" && (
                <table
                  className="w-full text-[11px] border-collapse"
                  style={{ tableLayout: "auto", width: "100%" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                      {columnasPendientes.map((col, idx) =>
                        renderCeldaHeaderConFiltro(col, idx, columnasPendientes.length + 1)
                      )}
                      <th
                        style={{ width: "1%", whiteSpace: "nowrap" }}
                        className="px-2 py-2.5 text-center font-bold"
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                    {(listaActivaPaginada.items as PendienteRow[]).map((r) => {
                      const abierta = Boolean(filasExpandidas[r.id]);
                      const nombreResp = normalizarResponsableReal(r.responsable, r.empresa);

                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            onClick={() => togglePersianaFila(r.id)}
                            className="hover:bg-slate-50 align-middle cursor-pointer"
                          >
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span
                                className="px-2 py-0.5 rounded-full font-bold text-[10px] inline-block"
                                style={{
                                  backgroundColor: r.estado === "FACTURADO" ? "#ECFDF5" : "#FEF3C7",
                                  color: r.estado === "FACTURADO" ? "#047857" : "#B45309",
                                }}
                              >
                                {r.estado}
                              </span>
                            </td>
                            <td className="px-2 py-2 font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {r.empresa}
                            </td>
                            <td className="px-2 py-2 leading-snug" style={{ color: "#334155" }}>
                              {r.contrato}
                            </td>
                            <td className="px-2 py-2 font-mono font-bold whitespace-nowrap" style={{ color: "#1D58D8" }}>
                              {r.cups}
                            </td>
                            <td className="px-2 py-2 leading-snug" style={{ color: "#334155", width: "100%" }}>
                              <div className="flex items-start justify-between gap-2">
                                <span>{r.descripcion}</span>
                                <span
                                  className="text-[10px] font-bold shrink-0 mt-0.5"
                                  style={{ color: "#1D58D8" }}
                                >
                                  {abierta ? "▴" : "▾"}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap" style={{ color: "#334155" }}>
                              {r.fechaServicio}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap" style={{ color: "#334155" }}>
                              {r.medico}
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {formatCOP(r.valorServicio)}
                            </td>
                            <td className="px-2 py-2 font-semibold whitespace-nowrap" style={{ color: "#0E245E" }}>
                              {nombreResp}
                            </td>
                            <td className="px-2 py-2 leading-snug" style={{ color: "#334155" }}>
                              {r.observaciones || "-"}
                            </td>
                            <td
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-2 text-center whitespace-nowrap"
                            >
                              <button
                                type="button"
                                onClick={() => setFilaEditando({ ...r, responsable: nombreResp })}
                                className="px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer"
                                style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>

                          {abierta && (
                            <tr style={{ backgroundColor: "#F4F8FD" }}>
                              <td colSpan={11} className="px-4 py-3 border-t" style={{ borderColor: "#BFDBFE" }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <div className="font-extrabold text-[11px] uppercase mb-1" style={{ color: "#1D58D8" }}>
                                      Descripción Completa del Procedimiento ({r.cups})
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white border" style={{ borderColor: "#CBD5E1", color: "#0E245E" }}>
                                      {r.descripcion}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-[11px] uppercase mb-1" style={{ color: "#047857" }}>
                                      Contrato y Observaciones
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white border space-y-1" style={{ borderColor: "#CBD5E1", color: "#334155" }}>
                                      <div>
                                        <strong>Contrato:</strong> {r.contrato}
                                      </div>
                                      <div>
                                        <strong>Observación:</strong> {r.observaciones || "Pendiente por facturar"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            )}

            {/* PAGINACIÓN */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 text-xs" style={{ color: "#475569" }}>
              <span>
                Mostrando <strong>{listaActivaPaginada.items.length}</strong> de{" "}
                <strong>{listaActivaPaginada.total}</strong> registros
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 font-bold cursor-pointer"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  Anterior
                </button>
                <span className="font-bold" style={{ color: "#0E245E" }}>
                  Página {paginaActual} de {listaActivaPaginada.totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={paginaActual >= listaActivaPaginada.totalPaginas}
                  onClick={() => setPaginaActual((p) => Math.min(listaActivaPaginada.totalPaginas, p + 1))}
                  className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 font-bold cursor-pointer"
                  style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDITAR FILA */}
      {filaEditando && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            className="rounded-xl max-w-2xl w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0E245E" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E2ECF8" }}>
              <h4 className="text-base font-extrabold">
                Editar Registro — {String(filaEditando.factura || filaEditando.cups || filaEditando.id)}
              </h4>
              <button
                type="button"
                onClick={() => setFilaEditando(null)}
                className="font-bold text-base cursor-pointer"
                style={{ color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold mb-1">Empresa</label>
                <input
                  type="text"
                  value={String(filaEditando.empresa || "")}
                  onChange={(e) => setFilaEditando({ ...filaEditando, empresa: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border px-3 py-2"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              {"factura" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold mb-1">No. Factura</label>
                  <input
                    type="text"
                    value={String(filaEditando.factura || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, factura: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border px-3 py-2 font-mono"
                    style={{ borderColor: "#CBD5E1" }}
                  />
                </div>
              )}

              {"facturaReemplaza" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "#047857" }}>
                    # Factura Reemplaza (FCOE...)
                  </label>
                  <input
                    type="text"
                    value={String(filaEditando.facturaReemplaza || "")}
                    onChange={(e) =>
                      setFilaEditando({ ...filaEditando, facturaReemplaza: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-lg border px-3 py-2 font-mono font-bold"
                    style={{ borderColor: "#10B981" }}
                  />
                </div>
              )}

              {"rips" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold mb-1">RIPS</label>
                  <input
                    type="text"
                    value={String(filaEditando.rips || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, rips: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    style={{ borderColor: "#CBD5E1" }}
                  />
                </div>
              )}

              {"revisionFinanciera" in filaEditando && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Revisión Financiera / Seguimiento</label>
                  <input
                    type="text"
                    value={String(filaEditando.revisionFinanciera || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, revisionFinanciera: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    style={{ borderColor: "#CBD5E1" }}
                  />
                </div>
              )}

              {"motivo" in filaEditando && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Motivo de Anulación / Devolución</label>
                  <input
                    type="text"
                    value={String(filaEditando.motivo || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, motivo: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    style={{ borderColor: "#CBD5E1" }}
                  />
                </div>
              )}

              {"notaCredito" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold mb-1">Nota Crédito</label>
                  <input
                    type="text"
                    value={String(filaEditando.notaCredito || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, notaCredito: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 font-mono"
                    style={{ borderColor: "#CBD5E1" }}
                  />
                </div>
              )}

              {"observacionInterna" in filaEditando && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Observación Interna</label>
                  <input
                    type="text"
                    value={String(filaEditando.observacionInterna || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, observacionInterna: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    style={{ borderColor: "#CBD5E1" }}
                  />
                </div>
              )}

              {"estado" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold mb-1">Estado</label>
                  <select
                    value={String(filaEditando.estado || "PENDIENTE")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, estado: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 font-bold"
                    style={{ borderColor: "#CBD5E1" }}
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="FACTURADO">FACTURADO</option>
                    <option value="EN REVISION">EN REVISIÓN</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1">Responsable / Facturadora</label>
                <select
                  value={String(filaEditando.responsable || filaEditando.facturador || "MARIA ALEJANDRA")}
                  onChange={(e) =>
                    setFilaEditando({
                      ...filaEditando,
                      responsable: e.target.value,
                      facturador: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2 font-semibold"
                  style={{ borderColor: "#CBD5E1" }}
                >
                  {carteraInitialData.responsablesDisponibles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "#E2ECF8" }}>
              <button
                type="button"
                onClick={() => setFilaEditando(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border cursor-pointer"
                style={{ backgroundColor: "#F8FAFC", color: "#475569", borderColor: "#CBD5E1" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicionFila}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO REGISTRO */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            className="rounded-xl max-w-2xl w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0E245E" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E2ECF8" }}>
              <h4 className="text-base font-extrabold">
                + Nuevo Registro ({tabActiva.toUpperCase()})
              </h4>
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="font-bold text-base cursor-pointer"
                style={{ color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold mb-1">Empresa</label>
                <select
                  value={nuevoRegistroForm.empresa}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, empresa: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 font-semibold"
                  style={{ borderColor: "#CBD5E1" }}
                >
                  {carteraInitialData.empresasDisponibles.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Año</label>
                <select
                  value={nuevoRegistroForm.anio}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, anio: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 font-semibold"
                  style={{ borderColor: "#CBD5E1" }}
                >
                  {carteraInitialData.aniosDisponibles.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">No. Factura (FCOE...)</label>
                <input
                  type="text"
                  value={nuevoRegistroForm.factura}
                  onChange={(e) =>
                    setNuevoRegistroForm({ ...nuevoRegistroForm, factura: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Valor Facturado ($ COP)</label>
                <input
                  type="number"
                  value={nuevoRegistroForm.valorRadicado}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, valorRadicado: e.target.value })}
                  placeholder="Ej. 1450000"
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1"># Factura Reemplaza / Nota Crédito</label>
                <input
                  type="text"
                  value={nuevoRegistroForm.facturaReemplaza}
                  onChange={(e) =>
                    setNuevoRegistroForm({
                      ...nuevoRegistroForm,
                      facturaReemplaza: e.target.value.toUpperCase(),
                      notaCredito: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ej. FCOE90012 o NC1204"
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Responsable / Facturadora</label>
                <select
                  value={nuevoRegistroForm.responsable}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, responsable: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 font-semibold"
                  style={{ borderColor: "#CBD5E1" }}
                >
                  {carteraInitialData.responsablesDisponibles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1">Motivo / Observación</label>
                <input
                  type="text"
                  value={nuevoRegistroForm.motivo}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, motivo: e.target.value })}
                  placeholder="Detalle del motivo de glosa, devolución o servicio..."
                  className="w-full rounded-lg border px-3 py-2"
                  style={{ borderColor: "#CBD5E1" }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "#E2ECF8" }}>
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border cursor-pointer"
                style={{ backgroundColor: "#F8FAFC", color: "#475569", borderColor: "#CBD5E1" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={crearNuevoRegistro}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
              >
                Guardar Registro
              </button>
            </div>
          </div>
        </div>
      )}

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
