"use client";

import React, { useState, useMemo, useEffect } from "react";
import carteraInitialData from "@/lib/cartera-data.json";

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

const formatCOP = (val: number) => {
  if (!val || isNaN(val)) return "$-";
  return "$" + Math.round(val).toLocaleString("es-CO");
};

const STORAGE_KEY = "ebenezer_sisma_back_mesa_v2";

export default function TableroCarteraAnalytics() {
  // Data state initialized with 100% real extracted data
  const [cortesTodas, setCortesTodas] = useState<CorteSismaBack[]>(
    carteraInitialData.sismaBack.cortes.TODAS
  );
  const [cortesPyp, setCortesPyp] = useState<CorteSismaBack[]>(
    carteraInitialData.sismaBack.cortes.PYP
  );
  const [anuladas, setAnuladas] = useState<AnuladaRow[]>(
    carteraInitialData.anuladas as AnuladaRow[]
  );
  const [legalizadas, setLegalizadas] = useState<AnuladaRow[]>(
    carteraInitialData.legalizadas as AnuladaRow[]
  );
  const [glosas, setGlosas] = useState<GlosaRow[]>(
    carteraInitialData.glosas as GlosaRow[]
  );
  const [pendientes, setPendientes] = useState<PendienteRow[]>(
    carteraInitialData.pendientes as PendienteRow[]
  );

  // Connection state for Faber's SISMA Back endpoints
  const [apiConectada, setApiConectada] = useState<boolean>(false);
  const [mensajeApi, setMensajeApi] = useState<string>(
    "Listo para conectar endpoints SISMA Back con Faber en api.centrooftalmologicoebenezer.com"
  );

  // Filters for SISMA Back Presentation
  const [modalidadSisma, setModalidadSisma] = useState<"TODAS" | "PYP">("TODAS");
  const [indiceCorteActivo, setIndiceCorteActivo] = useState<number>(2); // Default 30/09/2026

  // Filters for Operational Workbench (Reemplazo del Excel)
  const [tabActiva, setTabActiva] = useState<"anuladas" | "legalizadas" | "glosas" | "pendientes">("anuladas");
  const [filtroAnio, setFiltroAnio] = useState<string>("TODOS");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("TODAS");
  const [filtroResponsable, setFiltroResponsable] = useState<string>("TODAS");
  const [filtroSubtablaGlosa, setFiltroSubtablaGlosa] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const filasPorPagina = 25;

  // Modals state
  const [mostrarModalFaber, setMostrarModalFaber] = useState<boolean>(false);
  const [mostrarModalCorte, setMostrarModalCorte] = useState<boolean>(false);
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState<boolean>(false);
  const [filaEditando, setFilaEditando] = useState<Record<string, string | number> | null>(null);
  const [notificacion, setNotificacion] = useState<string>("");

  // Form for adding a new SISMA Back cut
  const [nuevoCorteForm, setNuevoCorteForm] = useState({
    modalidad: "TODAS" as "TODAS" | "PYP",
    fechaCorte: "16/10/2026",
    carteraCorriente: "",
    carteraVencida: "",
    facturasPendientesRadicar: "0",
    glosasPendientesGestionar: "0",
    anticiposPorCruzar: "",
  });

  // Form for adding a new operational record
  const [nuevoRegistroForm, setNuevoRegistroForm] = useState({
    empresa: "MUTUAL SER",
    anio: "2026",
    periodo: "OCTUBRE",
    factura: "FCOE",
    fechaFactura: "2026-10-19",
    fechaRadicacion: "2026-10-19",
    valorRadicado: "",
    valorGlosado: "",
    tipo: "DEVOLUCION",
    motivo: "",
    facturaReemplaza: "",
    rips: "SI",
    revisionFinanciera: "EN GESTION",
    responsable: "MARIA ALEJANDRA",
    notaCredito: "",
    contrato: "",
    cups: "",
    medico: "",
  });

  // Load saved edits from localStorage and check API status on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.anuladas)) setAnuladas(parsed.anuladas);
        if (Array.isArray(parsed.legalizadas)) setLegalizadas(parsed.legalizadas);
        if (Array.isArray(parsed.glosas)) setGlosas(parsed.glosas);
        if (Array.isArray(parsed.pendientes)) setPendientes(parsed.pendientes);
        if (Array.isArray(parsed.cortesTodas)) setCortesTodas(parsed.cortesTodas);
        if (Array.isArray(parsed.cortesPyp)) setCortesPyp(parsed.cortesPyp);
      }
    } catch {
      // Ignore storage parse error
    }

    fetch("/api/cartera")
      .then((r) => r.json())
      .then((res) => {
        if (res && typeof res.conexionSismaBackActiva === "boolean") {
          setApiConectada(res.conexionSismaBackActiva);
          if (res.mensajeConexion) setMensajeApi(res.mensajeConexion);
        }
      })
      .catch(() => {});
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
      // Storage quota fallback
    }
  };

  const mostrarAviso = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(""), 4000);
  };

  // Active SISMA Back cuts list
  const listaCortesActiva = modalidadSisma === "TODAS" ? cortesTodas : cortesPyp;
  const corteSeleccionado =
    listaCortesActiva[indiceCorteActivo] ||
    listaCortesActiva[listaCortesActiva.length - 1];

  // Dynamic filtering for the 4 operational tables
  const anuladasFiltradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return anuladas.filter((r) => {
      if (filtroAnio !== "TODOS" && r.anio !== filtroAnio) return false;
      if (filtroEmpresa !== "TODAS" && r.empresa !== filtroEmpresa) return false;
      if (filtroResponsable !== "TODAS" && r.responsable !== filtroResponsable) return false;
      if (q) {
        const hay = `${r.factura} ${r.facturaReemplaza} ${r.motivo} ${r.empresa} ${r.responsable} ${r.revisionFinanciera}`.toUpperCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [anuladas, filtroAnio, filtroEmpresa, filtroResponsable, busqueda]);

  const legalizadasFiltradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return legalizadas.filter((r) => {
      if (filtroAnio !== "TODOS" && r.anio !== filtroAnio) return false;
      if (filtroEmpresa !== "TODAS" && r.empresa !== filtroEmpresa) return false;
      if (filtroResponsable !== "TODAS" && r.responsable !== filtroResponsable) return false;
      if (q) {
        const hay = `${r.factura} ${r.facturaReemplaza} ${r.motivo} ${r.empresa} ${r.responsable}`.toUpperCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [legalizadas, filtroAnio, filtroEmpresa, filtroResponsable, busqueda]);

  const glosasFiltradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return glosas.filter((r) => {
      if (filtroAnio !== "TODOS" && r.anio !== filtroAnio) return false;
      if (filtroEmpresa !== "TODAS" && r.empresa !== filtroEmpresa) return false;
      if (filtroResponsable !== "TODAS" && r.facturador !== filtroResponsable) return false;
      if (filtroSubtablaGlosa !== "TODAS" && r.subtabla !== filtroSubtablaGlosa) return false;
      if (q) {
        const hay = `${r.factura} ${r.motivoGlosa} ${r.notaCredito} ${r.observacionInterna} ${r.empresa} ${r.facturador}`.toUpperCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [glosas, filtroAnio, filtroEmpresa, filtroResponsable, filtroSubtablaGlosa, busqueda]);

  const pendientesFiltradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return pendientes.filter((r) => {
      if (filtroAnio !== "TODOS" && r.anio !== filtroAnio) return false;
      if (filtroEmpresa !== "TODAS" && r.empresa !== filtroEmpresa) return false;
      if (filtroResponsable !== "TODAS" && r.responsable !== filtroResponsable) return false;
      if (q) {
        const hay = `${r.empresa} ${r.contrato} ${r.cups} ${r.descripcion} ${r.medico} ${r.observaciones} ${r.responsable}`.toUpperCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [pendientes, filtroAnio, filtroEmpresa, filtroResponsable, busqueda]);

  // Real-time KPIs over filtered operational data
  const kpisOperativos = useMemo(() => {
    const totalAnuladasVal = anuladasFiltradas.reduce((acc, r) => acc + (r.valorRadicado || 0), 0);
    const reemplazadasOk = anuladasFiltradas.filter(
      (r) => r.facturaReemplaza && r.facturaReemplaza.toUpperCase().includes("FCOE")
    ).length;
    const totalLegalizadasVal = legalizadasFiltradas.reduce((acc, r) => acc + (r.valorRadicado || 0), 0);
    const totalGlosadoVal = glosasFiltradas.reduce((acc, r) => acc + (r.valorGlosado || r.valorRadicado || 0), 0);
    const totalPendientesVal = pendientesFiltradas.reduce((acc, r) => acc + (r.valorServicio || 0), 0);

    return {
      totalAnuladasVal,
      reemplazadasOk,
      pendientesReemplazo: anuladasFiltradas.length - reemplazadasOk,
      totalLegalizadasVal,
      totalGlosadoVal,
      totalPendientesVal,
    };
  }, [anuladasFiltradas, legalizadasFiltradas, glosasFiltradas, pendientesFiltradas]);

  // Summary by Real Company for current filter
  const resumenEmpresasFiltrado = useMemo(() => {
    const map: Record<
      string,
      { empresa: string; registros: number; valorAnuladas: number; valorGlosas: number; valorPendientes: number }
    > = {};

    const ensure = (emp: string) => {
      if (!map[emp]) {
        map[emp] = { empresa: emp, registros: 0, valorAnuladas: 0, valorGlosas: 0, valorPendientes: 0 };
      }
    };

    anuladasFiltradas.forEach((r) => {
      ensure(r.empresa);
      map[r.empresa].registros += 1;
      map[r.empresa].valorAnuladas += r.valorRadicado || 0;
    });
    legalizadasFiltradas.forEach((r) => {
      ensure(r.empresa);
      map[r.empresa].registros += 1;
      map[r.empresa].valorAnuladas += r.valorRadicado || 0;
    });
    glosasFiltradas.forEach((r) => {
      ensure(r.empresa);
      map[r.empresa].registros += 1;
      map[r.empresa].valorGlosas += r.valorGlosado || r.valorRadicado || 0;
    });
    pendientesFiltradas.forEach((r) => {
      ensure(r.empresa);
      map[r.empresa].registros += 1;
      map[r.empresa].valorPendientes += r.valorServicio || 0;
    });

    return Object.values(map).sort(
      (a, b) =>
        b.valorAnuladas + b.valorGlosas + b.valorPendientes - (a.valorAnuladas + a.valorGlosas + a.valorPendientes)
    );
  }, [anuladasFiltradas, legalizadasFiltradas, glosasFiltradas, pendientesFiltradas]);

  // Summary by Real Facturadora / Responsable
  const resumenResponsables = useMemo(() => {
    const map: Record<string, { responsable: string; casos: number; valorTotal: number }> = {};
    const add = (resp: string, val: number) => {
      const key = resp || "SIN ASIGNAR";
      if (!map[key]) map[key] = { responsable: key, casos: 0, valorTotal: 0 };
      map[key].casos += 1;
      map[key].valorTotal += val || 0;
    };
    anuladasFiltradas.forEach((r) => add(r.responsable, r.valorRadicado));
    legalizadasFiltradas.forEach((r) => add(r.responsable, r.valorRadicado));
    glosasFiltradas.forEach((r) => add(r.facturador, r.valorGlosado || r.valorRadicado));
    pendientesFiltradas.forEach((r) => add(r.responsable, r.valorServicio));
    return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [anuladasFiltradas, legalizadasFiltradas, glosasFiltradas, pendientesFiltradas]);

  // Save edited row
  const guardarEdicionFila = async () => {
    if (!filaEditando) return;
    const id = String(filaEditando.id);

    if (tabActiva === "anuladas") {
      const next = anuladas.map((r) => (r.id === id ? ({ ...r, ...filaEditando } as AnuladaRow) : r));
      setAnuladas(next);
      persistAll(next, legalizadas, glosas, pendientes);
    } else if (tabActiva === "legalizadas") {
      const next = legalizadas.map((r) => (r.id === id ? ({ ...r, ...filaEditando } as AnuladaRow) : r));
      setLegalizadas(next);
      persistAll(anuladas, next, glosas, pendientes);
    } else if (tabActiva === "glosas") {
      const next = glosas.map((r) => (r.id === id ? ({ ...r, ...filaEditando } as GlosaRow) : r));
      setGlosas(next);
      persistAll(anuladas, legalizadas, next, pendientes);
    } else if (tabActiva === "pendientes") {
      const next = pendientes.map((r) => (r.id === id ? ({ ...r, ...filaEditando } as PendienteRow) : r));
      setPendientes(next);
      persistAll(anuladas, legalizadas, glosas, next);
    }

    try {
      await fetch("/api/cartera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_row", seccion: tabActiva, item: filaEditando }),
      });
    } catch {
      // Saved locally
    }

    setFilaEditando(null);
    mostrarAviso("Registro actualizado y guardado correctamente en el sistema.");
  };

  // Create new operational row
  const crearNuevoRegistro = async () => {
    const id = `NEW-${Date.now()}`;
    const valRad = Number(String(nuevoRegistroForm.valorRadicado).replace(/\D/g, "")) || 0;
    const valGlo = Number(String(nuevoRegistroForm.valorGlosado).replace(/\D/g, "")) || 0;

    if (tabActiva === "anuladas" || tabActiva === "legalizadas") {
      const nuevo: AnuladaRow = {
        id,
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
        tipo: nuevoRegistroForm.tipo,
        motivo: nuevoRegistroForm.motivo,
        facturaReemplaza: nuevoRegistroForm.facturaReemplaza,
        fechaAnulacion: nuevoRegistroForm.fechaFactura,
        fechaRadicacionReemplazo: nuevoRegistroForm.fechaRadicacion,
        rips: nuevoRegistroForm.rips,
        revisionFinanciera: nuevoRegistroForm.revisionFinanciera,
        preagrupado: "",
        responsable: nuevoRegistroForm.responsable,
        estadoGestion: tabActiva === "legalizadas" ? "LEGALIZADA" : (nuevoRegistroForm.facturaReemplaza ? "REEMPLAZADA" : "PENDIENTE REEMPLAZO"),
      };
      if (tabActiva === "anuladas") {
        const next = [nuevo, ...anuladas];
        setAnuladas(next);
        persistAll(next, legalizadas, glosas, pendientes);
      } else {
        const next = [nuevo, ...legalizadas];
        setLegalizadas(next);
        persistAll(anuladas, next, glosas, pendientes);
      }
      await fetch("/api/cartera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_row", seccion: tabActiva, item: nuevo }),
      }).catch(() => {});
    } else if (tabActiva === "glosas") {
      const nuevo: GlosaRow = {
        id,
        subtabla: nuevoRegistroForm.notaCredito ? "ACEPTADA_NOTA_CREDITO" : "RESPONDIDA_NO_ACEPTADA",
        empresa: nuevoRegistroForm.empresa,
        empresaOriginal: nuevoRegistroForm.empresa,
        fechaFactura: nuevoRegistroForm.fechaFactura,
        periodo: nuevoRegistroForm.periodo,
        anio: nuevoRegistroForm.anio,
        factura: nuevoRegistroForm.factura,
        fechaRadicacion: nuevoRegistroForm.fechaRadicacion,
        valorRadicado: valRad,
        valorFactura: valRad,
        valorGlosado: valGlo || valRad,
        motivoGlosa: nuevoRegistroForm.motivo,
        facturador: nuevoRegistroForm.responsable,
        responsableAceptacion: nuevoRegistroForm.responsable,
        observacionInterna: nuevoRegistroForm.revisionFinanciera,
        notaCredito: nuevoRegistroForm.notaCredito,
      };
      const next = [nuevo, ...glosas];
      setGlosas(next);
      persistAll(anuladas, legalizadas, next, pendientes);
      await fetch("/api/cartera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_row", seccion: "glosas", item: nuevo }),
      }).catch(() => {});
    } else {
      const nuevo: PendienteRow = {
        id,
        empresa: nuevoRegistroForm.empresa,
        empresaOriginal: nuevoRegistroForm.empresa,
        contrato: nuevoRegistroForm.contrato || "GENERAL",
        unidadFuncional: "CONSULTA EXTERNA / CIRUGIA",
        cups: nuevoRegistroForm.cups || "890274",
        descripcion: nuevoRegistroForm.motivo || "SERVICIO OFTALMOLOGICO",
        fechaServicio: nuevoRegistroForm.fechaFactura,
        anio: nuevoRegistroForm.anio,
        medico: nuevoRegistroForm.medico || "ESPECIALISTA EBENEZER",
        valorServicio: valRad,
        responsable: nuevoRegistroForm.responsable,
        observaciones: nuevoRegistroForm.revisionFinanciera,
        estado: "PENDIENTE",
      };
      const next = [nuevo, ...pendientes];
      setPendientes(next);
      persistAll(anuladas, legalizadas, glosas, next);
      await fetch("/api/cartera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_row", seccion: "pendientes", item: nuevo }),
      }).catch(() => {});
    }

    setMostrarModalNuevo(false);
    mostrarAviso("Nuevo registro creado en la Mesa de Trabajo.");
  };

  // Add new SISMA Back Cut
  const guardarNuevoCorteSismaBack = async () => {
    const corr = Number(String(nuevoCorteForm.carteraCorriente).replace(/\D/g, "")) || 0;
    const venc = Number(String(nuevoCorteForm.carteraVencida).replace(/\D/g, "")) || 0;
    const pendRad = Number(String(nuevoCorteForm.facturasPendientesRadicar).replace(/\D/g, "")) || 0;
    const gloPend = Number(String(nuevoCorteForm.glosasPendientesGestionar).replace(/\D/g, "")) || 0;
    const ant = Number(String(nuevoCorteForm.anticiposPorCruzar).replace(/\D/g, "")) || 0;
    const total = corr + venc;
    const real = Math.max(0, total - ant);

    const nuevoCorte: CorteSismaBack = {
      fechaCorte: nuevoCorteForm.fechaCorte,
      modalidad: nuevoCorteForm.modalidad === "TODAS" ? "Todas las Empresas" : "PYP",
      carteraCorriente: corr,
      carteraVencida: venc,
      carteraTotal: total,
      facturasPendientesRadicar: pendRad,
      glosasPendientesGestionar: gloPend,
      anticiposPorCruzar: ant,
      totalCarteraReal: real,
    };

    if (nuevoCorteForm.modalidad === "TODAS") {
      const next = [...cortesTodas, nuevoCorte];
      setCortesTodas(next);
      setModalidadSisma("TODAS");
      setIndiceCorteActivo(next.length - 1);
      persistAll(anuladas, legalizadas, glosas, pendientes, next, cortesPyp);
    } else {
      const next = [...cortesPyp, nuevoCorte];
      setCortesPyp(next);
      setModalidadSisma("PYP");
      setIndiceCorteActivo(next.length - 1);
      persistAll(anuladas, legalizadas, glosas, pendientes, cortesTodas, next);
    }

    await fetch("/api/cartera", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_corte_sisma_back",
        corteModalidad: nuevoCorteForm.modalidad,
        nuevoCorte,
      }),
    }).catch(() => {});

    setMostrarModalCorte(false);
    mostrarAviso(`Corte SISMA Back (${nuevoCorte.fechaCorte}) agregado exitosamente.`);
  };

  // Export active filtered table to CSV (compatible with Excel)
  const exportarVistaExcelCSV = () => {
    let rows: Record<string, string | number>[] = [];
    if (tabActiva === "anuladas") rows = anuladasFiltradas;
    else if (tabActiva === "legalizadas") rows = legalizadasFiltradas;
    else if (tabActiva === "glosas") rows = glosasFiltradas;
    else rows = pendientesFiltradas;

    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(";"),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SISMA_Back_${tabActiva}_${filtroAnio}_${filtroEmpresa}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const listaActivaPaginada = useMemo(() => {
    const source =
      tabActiva === "anuladas"
        ? anuladasFiltradas
        : tabActiva === "legalizadas"
        ? legalizadasFiltradas
        : tabActiva === "glosas"
        ? glosasFiltradas
        : pendientesFiltradas;
    const start = (paginaActual - 1) * filasPorPagina;
    return {
      total: source.length,
      totalPaginas: Math.max(1, Math.ceil(source.length / filasPorPagina)),
      items: source.slice(start, start + filasPorPagina),
    };
  }, [tabActiva, anuladasFiltradas, legalizadasFiltradas, glosasFiltradas, pendientesFiltradas, paginaActual]);

  const maxValorGrafica = useMemo(() => {
    return Math.max(...listaCortesActiva.map((c) => c.carteraTotal), 1);
  }, [listaCortesActiva]);

  return (
    <div className="space-y-8 text-slate-900">
      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl font-medium flex items-center gap-3 border border-emerald-500">
          <span>✓</span>
          <span>{notificacion}</span>
        </div>
      )}

      {/* CABECERA EXCLUSIVA SISMA BACK */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Exclusivo SISMA Back (Contabilidad y Cartera)
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  apiConectada
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : "bg-amber-500/20 text-amber-200 border-amber-400/40"
                }`}
              >
                {apiConectada ? "● API SISMA Back Conectada" : "◐ API Lista para Conectar con Faber"}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Tablero de Cartera SISMA Back & Mesa Operativa de Glosas (2021 – 2026)
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Origen: <code className="text-blue-300">ebenezerback.sismacorporation.com/BackOficce</code> →{" "}
              <strong>Análisis de vencimiento</strong> + <strong>Libro de anexos de balance (Auxiliar abierto)</strong>{" "}
              y Sistema Interactivo que reemplaza el archivo Excel de Cartera/Glosas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setMostrarModalCorte(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg transition cursor-pointer"
            >
              + Nuevo Corte SISMA Back
            </button>
            <button
              onClick={() => setMostrarModalFaber(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg transition cursor-pointer"
            >
              ⚡ Especificación API para Faber
            </button>
          </div>
        </div>

        {/* Cuentas Contables Oficiales de Giros en SISMA Back */}
        <div className="mt-5 pt-4 border-t border-slate-700/70 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {carteraInitialData.sismaBack.cuentasGiros.map((cta) => (
            <div
              key={cta.codigo}
              className="bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 flex items-center justify-between"
            >
              <div>
                <span className="text-slate-400 block text-[11px]">
                  SISMA Back → Auxiliar abierto (Filtro: giro)
                </span>
                <span className="font-semibold text-white">{cta.nombre}</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-900/70 text-blue-200 font-mono font-bold text-xs border border-blue-700">
                {cta.codigo}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BLOQUE 1: PIZARRA + PRESENTACIÓN DE CARTERA SISMA BACK               */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              1. Presentación de Cartera SISMA Back (Análisis de Vencimiento + Auxiliar Abierto de Giros)
            </h3>
            <p className="text-sm text-slate-600">
              Estructura exacta del esquema de pizarra y cortes oficiales de{" "}
              <strong>Presentación de cartera</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => {
                  setModalidadSisma("TODAS");
                  setIndiceCorteActivo(cortesTodas.length - 1);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                  modalidadSisma === "TODAS"
                    ? "bg-blue-700 text-white shadow"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                Todas las Empresas
              </button>
              <button
                onClick={() => {
                  setModalidadSisma("PYP");
                  setIndiceCorteActivo(cortesPyp.length - 1);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                  modalidadSisma === "PYP"
                    ? "bg-amber-600 text-white shadow"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                Modalidad PYP
              </button>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {listaCortesActiva.map((c, idx) => (
                <button
                  key={c.fechaCorte}
                  onClick={() => setIndiceCorteActivo(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    indiceCorteActivo === idx
                      ? "bg-slate-900 text-white shadow"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Corte {c.fechaCorte}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PARTE SUPERIOR DE LA PIZARRA: GRÁFICA EVOLUTIVA DE LOS CORTES SISMA BACK */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Gráfica Superior (Esquema Pizarra)
              </span>
              <h4 className="text-base font-bold text-slate-900">
                Evolución por Corte ({modalidadSisma === "TODAS" ? "Todas las Empresas" : "PYP"}) — Corriente vs. Vencida vs. Cartera Real
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" /> Cartera Corriente (&lt; 60 días)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-600 inline-block" /> Cartera Vencida (&gt;= 60 días)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Anticipos / Giros por Cruzar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" /> Total Cartera Real
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {listaCortesActiva.map((corte, idx) => {
              const pctCorriente = Math.round((corte.carteraCorriente / maxValorGrafica) * 100);
              const pctVencida = Math.round((corte.carteraVencida / maxValorGrafica) * 100);
              const pctAnticipos = Math.round((corte.anticiposPorCruzar / maxValorGrafica) * 100);
              const pctReal = Math.round((corte.totalCarteraReal / maxValorGrafica) * 100);
              const isSelected = idx === indiceCorteActivo;

              return (
                <div
                  key={corte.fechaCorte}
                  onClick={() => setIndiceCorteActivo(idx)}
                  className={`rounded-xl p-4 border transition cursor-pointer ${
                    isSelected
                      ? "bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-md"
                      : "bg-white/70 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-extrabold text-sm text-slate-900">
                      Corte: {corte.fechaCorte}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                      {corte.modalidad}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 font-medium">Cartera Corriente (&lt; 60 d)</span>
                        <span className="font-bold text-blue-700">{formatCOP(corte.carteraCorriente)}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pctCorriente}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 font-medium">Cartera Vencida (&gt;= 60 d)</span>
                        <span className="font-bold text-rose-700">{formatCOP(corte.carteraVencida)}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-600 rounded-full" style={{ width: `${pctVencida}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 font-medium">(-) Giros / Anticipos por cruzar</span>
                        <span className="font-bold text-amber-700">{formatCOP(corte.anticiposPorCruzar)}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pctAnticipos}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-900 font-bold">Total Cartera Real</span>
                        <span className="font-extrabold text-emerald-700">{formatCOP(corte.totalCarteraReal)}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pctReal}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PARTE INFERIOR DE LA PIZARRA: ESQUEMA EXACTO + TABLA COMPARATIVA DE CORTES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Esquema Pizarra del Corte Activo */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-400 font-bold block">
                  Fórmula Exacta Pizarra SISMA Back
                </span>
                <h4 className="text-lg font-extrabold">
                  Corte Seleccionado: {corteSeleccionado.fechaCorte} ({corteSeleccionado.modalidad})
                </h4>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between bg-slate-800/90 px-4 py-3 rounded-xl border border-slate-700">
                <div>
                  <span className="font-bold text-blue-300 block">Cartera Corriente</span>
                  <span className="text-xs text-slate-400">Radicada &lt; 60 días (Análisis de vencimiento)</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 mr-2">[ + ]</span>
                  <span className="font-mono font-bold text-base">{formatCOP(corteSeleccionado.carteraCorriente)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-800/90 px-4 py-3 rounded-xl border border-slate-700">
                <div>
                  <span className="font-bold text-rose-300 block">Cartera Vencida</span>
                  <span className="text-xs text-slate-400">Radicada &gt;= 60 días (Análisis de vencimiento)</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 mr-2">[ + ]</span>
                  <span className="font-mono font-bold text-base">{formatCOP(corteSeleccionado.carteraVencida)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-blue-950/90 px-4 py-3 rounded-xl border border-blue-700">
                <div>
                  <span className="font-extrabold text-white block">Total Cartera Radicada (↓)</span>
                  <span className="text-xs text-blue-300">Corriente + Vencida</span>
                </div>
                <span className="font-mono font-extrabold text-lg text-blue-200">
                  {formatCOP(corteSeleccionado.carteraTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-300">Facturas pendientes por radicar</span>
                <span className="font-mono font-semibold text-slate-200">
                  {formatCOP(corteSeleccionado.facturasPendientesRadicar)}
                </span>
              </div>

              <div className="flex items-center justify-between bg-amber-950/60 px-4 py-3 rounded-xl border border-amber-700/60">
                <div>
                  <span className="font-bold text-amber-300 block">(-) Anticipos / Giros por cruzar</span>
                  <span className="text-[11px] text-amber-200/80">
                    Auxiliar abierto: 1301250602, 2501010602, 2501010607
                  </span>
                </div>
                <span className="font-mono font-bold text-base text-amber-300">
                  {formatCOP(corteSeleccionado.anticiposPorCruzar)}
                </span>
              </div>

              <div className="flex items-center justify-between bg-emerald-950 px-4 py-3.5 rounded-xl border-2 border-emerald-500">
                <div>
                  <span className="font-extrabold text-emerald-300 text-base block">
                    TOTAL CARTERA REAL
                  </span>
                  <span className="text-xs text-emerald-200/80">Saldo real neto por cobrar</span>
                </div>
                <span className="font-mono font-extrabold text-xl text-emerald-300">
                  {formatCOP(corteSeleccionado.totalCarteraReal)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabla Oficial Presentación de Cartera (Todas las Empresas + PYP) */}
          <div className="lg:col-span-7 overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="text-left p-3 font-bold">Concepto SISMA Back</th>
                  {cortesTodas.map((c) => (
                    <th key={`th-t-${c.fechaCorte}`} className="text-right p-3 font-bold bg-blue-900/60">
                      Todas ({c.fechaCorte})
                    </th>
                  ))}
                  {cortesPyp.map((c) => (
                    <th key={`th-p-${c.fechaCorte}`} className="text-right p-3 font-bold bg-amber-700/80">
                      PYP ({c.fechaCorte})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">
                    Cartera corriente (Radicada &lt; 60 días)
                  </td>
                  {cortesTodas.map((c) => (
                    <td key={`cc-t-${c.fechaCorte}`} className="p-3 text-right font-mono">
                      {formatCOP(c.carteraCorriente)}
                    </td>
                  ))}
                  {cortesPyp.map((c) => (
                    <td key={`cc-p-${c.fechaCorte}`} className="p-3 text-right font-mono bg-amber-50/40">
                      {formatCOP(c.carteraCorriente)}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">
                    Cartera vencida (&gt; 60 días)
                  </td>
                  {cortesTodas.map((c) => (
                    <td key={`cv-t-${c.fechaCorte}`} className="p-3 text-right font-mono text-rose-700 font-semibold">
                      {formatCOP(c.carteraVencida)}
                    </td>
                  ))}
                  {cortesPyp.map((c) => (
                    <td key={`cv-p-${c.fechaCorte}`} className="p-3 text-right font-mono text-rose-700 font-semibold bg-amber-50/40">
                      {formatCOP(c.carteraVencida)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-blue-50/70 font-bold">
                  <td className="p-3 text-slate-900">Cartera Total</td>
                  {cortesTodas.map((c) => (
                    <td key={`ct-t-${c.fechaCorte}`} className="p-3 text-right font-mono text-blue-900">
                      {formatCOP(c.carteraTotal)}
                    </td>
                  ))}
                  {cortesPyp.map((c) => (
                    <td key={`ct-p-${c.fechaCorte}`} className="p-3 text-right font-mono text-amber-900 bg-amber-100/50">
                      {formatCOP(c.carteraTotal)}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 text-slate-700">Facturas pendiente por radicar</td>
                  {cortesTodas.map((c) => (
                    <td key={`fp-t-${c.fechaCorte}`} className="p-3 text-right font-mono">
                      {formatCOP(c.facturasPendientesRadicar)}
                    </td>
                  ))}
                  {cortesPyp.map((c) => (
                    <td key={`fp-p-${c.fechaCorte}`} className="p-3 text-right font-mono bg-amber-50/40">
                      {formatCOP(c.facturasPendientesRadicar)}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 text-slate-700">Glosa pendientes por gestionar</td>
                  {cortesTodas.map((c) => (
                    <td key={`gp-t-${c.fechaCorte}`} className="p-3 text-right font-mono">
                      {formatCOP(c.glosasPendientesGestionar)}
                    </td>
                  ))}
                  {cortesPyp.map((c) => (
                    <td key={`gp-p-${c.fechaCorte}`} className="p-3 text-right font-mono bg-amber-50/40">
                      {formatCOP(c.glosasPendientesGestionar)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-amber-50/60">
                  <td className="p-3 font-semibold text-amber-900">
                    Anticipos por cruzar (Cuentas 1301250602 / 2501010602 / 2501010607)
                  </td>
                  {cortesTodas.map((c) => (
                    <td key={`ac-t-${c.fechaCorte}`} className="p-3 text-right font-mono font-semibold text-amber-800">
                      {formatCOP(c.anticiposPorCruzar)}
                    </td>
                  ))}
                  {cortesPyp.map((c) => (
                    <td key={`ac-p-${c.fechaCorte}`} className="p-3 text-right font-mono font-semibold text-amber-800 bg-amber-100/40">
                      {formatCOP(c.anticiposPorCruzar)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-900 text-white font-extrabold">
                  <td className="p-3.5">Total cartera real</td>
                  {cortesTodas.map((c) => (
                    <td key={`tr-t-${c.fechaCorte}`} className="p-3.5 text-right font-mono text-emerald-200">
                      {formatCOP(c.totalCarteraReal)}
                    </td>
                  ))}
                  {cortesPyp.map((c) => (
                    <td key={`tr-p-${c.fechaCorte}`} className="p-3.5 text-right font-mono text-amber-200 bg-emerald-950">
                      {formatCOP(c.totalCarteraReal)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BLOQUE 2: MESA DE TRABAJO OPERATIVA (REEMPLAZO DEL ARCHIVO EXCEL)     */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Sistema Operativo Interactivo (Reemplaza el Excel de Glosas y Anulaciones)
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-2">
              2. Mesa de Trabajo de Facturación, Glosas, Notas Crédito y Pendientes (2021 – 2026)
            </h3>
            <p className="text-sm text-slate-600">
              Filtra por año, empresa o responsable, edita cualquier factura en línea y crea nuevos registros sin usar hojas de cálculo externas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setMostrarModalNuevo(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm shadow transition cursor-pointer"
            >
              + Nuevo Registro en esta Pestaña
            </button>
            <button
              onClick={exportarVistaExcelCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm shadow transition cursor-pointer"
            >
              ↓ Exportar Vista a Excel (CSV)
            </button>
          </div>
        </div>

        {/* FILTROS MULTIAÑO Y MULTIEMPRESA (SOLO EMPRESAS Y FACTURADORAS REALES) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Año (2021 – 2026)</label>
            <select
              value={filtroAnio}
              onChange={(e) => {
                setFiltroAnio(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="TODOS">Todos los años (2021 - 2026)</option>
              {carteraInitialData.aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  Año {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Empresa / Aseguradora Real</label>
            <select
              value={filtroEmpresa}
              onChange={(e) => {
                setFiltroEmpresa(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="TODAS">Todas las Empresas ({carteraInitialData.empresasDisponibles.length})</option>
              {carteraInitialData.empresasDisponibles.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Responsable / Facturadora</label>
            <select
              value={filtroResponsable}
              onChange={(e) => {
                setFiltroResponsable(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="TODAS">Todas las Responsables</option>
              {carteraInitialData.responsablesDisponibles.map((resp) => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Buscar por # Factura (FCOE...), Reemplazo, Nota Crédito, CUPS o Motivo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Ej. FCOE74852, MUTUAL SER, NC, 890274..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
              {(filtroAnio !== "TODOS" ||
                filtroEmpresa !== "TODAS" ||
                filtroResponsable !== "TODAS" ||
                busqueda !== "") && (
                <button
                  onClick={() => {
                    setFiltroAnio("TODOS");
                    setFiltroEmpresa("TODAS");
                    setFiltroResponsable("TODAS");
                    setFiltroSubtablaGlosa("TODAS");
                    setBusqueda("");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 shrink-0 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPIS OPERATIVOS EN VIVO SEGÚN FILTRO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 bg-blue-50/70 border border-blue-200">
            <span className="text-xs font-bold uppercase text-blue-800">
              1. Anuladas / Reemplazadas ({anuladasFiltradas.length})
            </span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCOP(kpisOperativos.totalAnuladasVal)}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Reemplazadas: <strong>{kpisOperativos.reemplazadasOk}</strong> | En gestión:{" "}
              <strong>{kpisOperativos.pendientesReemplazo}</strong>
            </p>
          </div>

          <div className="rounded-xl p-4 bg-emerald-50/70 border border-emerald-200">
            <span className="text-xs font-bold uppercase text-emerald-800">
              2. Glosas Legalizadas ({legalizadasFiltradas.length})
            </span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCOP(kpisOperativos.totalLegalizadasVal)}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Facturas conciliadas / subsanadas con RIPS
            </p>
          </div>

          <div className="rounded-xl p-4 bg-amber-50/70 border border-amber-200">
            <span className="text-xs font-bold uppercase text-amber-800">
              3. Glosas Respondidas y NC ({glosasFiltradas.length})
            </span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCOP(kpisOperativos.totalGlosadoVal)}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Respondidas, aceptadas con Nota Crédito y en gestión
            </p>
          </div>

          <div className="rounded-xl p-4 bg-purple-50/70 border border-purple-200">
            <span className="text-xs font-bold uppercase text-purple-800">
              4. Servicios Pendientes Facturar ({pendientesFiltradas.length})
            </span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {formatCOP(kpisOperativos.totalPendientesVal)}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Admisiones y procedimientos en revisión por facturadora
            </p>
          </div>
        </div>

        {/* RESUMEN RÁPIDO POR EMPRESA REAL Y POR RESPONSABLE REAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Consolidado por Empresa Real de Ebenezer (Clic para filtrar)
            </h4>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {resumenEmpresasFiltrado.map((e) => (
                <button
                  key={e.empresa}
                  onClick={() => {
                    setFiltroEmpresa(filtroEmpresa === e.empresa ? "TODAS" : e.empresa);
                    setPaginaActual(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
                    filtroEmpresa === e.empresa
                      ? "bg-blue-700 text-white border-blue-700 shadow"
                      : "bg-white text-slate-800 border-slate-200 hover:bg-blue-50"
                  }`}
                >
                  <span>{e.empresa}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                    {e.registros}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Carga por Responsable / Facturadora Real
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
              {resumenResponsables.map((r) => (
                <div
                  key={r.responsable}
                  onClick={() => {
                    setFiltroResponsable(filtroResponsable === r.responsable ? "TODAS" : r.responsable);
                    setPaginaActual(1);
                  }}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border cursor-pointer ${
                    filtroResponsable === r.responsable
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-800 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-bold">{r.responsable}</span>
                  <span className="font-mono">
                    {r.casos} reg. ({formatCOP(r.valorTotal)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE LAS 4 TABLAS DEL EXCEL */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => {
              setTabActiva("anuladas");
              setPaginaActual(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              tabActiva === "anuladas"
                ? "bg-blue-700 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            1. Facturas Anuladas / Reemplazadas ({anuladasFiltradas.length})
          </button>

          <button
            onClick={() => {
              setTabActiva("legalizadas");
              setPaginaActual(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              tabActiva === "legalizadas"
                ? "bg-emerald-700 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            2. Glosas Legalizadas ({legalizadasFiltradas.length})
          </button>

          <button
            onClick={() => {
              setTabActiva("glosas");
              setPaginaActual(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              tabActiva === "glosas"
                ? "bg-amber-600 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            3. Glosas Respondidas y Notas Crédito ({glosasFiltradas.length})
          </button>

          <button
            onClick={() => {
              setTabActiva("pendientes");
              setPaginaActual(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              tabActiva === "pendientes"
                ? "bg-purple-700 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            4. Servicios Pendientes por Facturar ({pendientesFiltradas.length})
          </button>
        </div>

        {/* SUBFILTRO PARA LA PESTAÑA 3 (GLOSAS RESPONDIDAS VS NOTAS CRÉDITO) */}
        {tabActiva === "glosas" && (
          <div className="flex flex-wrap items-center gap-2 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
            <span className="text-xs font-bold text-amber-900 mr-2">Subtabla de Glosas:</span>
            {[
              { id: "TODAS", label: "Todas" },
              { id: "RESPONDIDA_NO_ACEPTADA", label: "Glosas Respondidas / No Aceptadas" },
              { id: "ACEPTADA_NOTA_CREDITO", label: "Glosas Aceptadas con Nota Crédito" },
              { id: "EN_GESTION", label: "En Gestión / Autorizaciones" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setFiltroSubtablaGlosa(st.id);
                  setPaginaActual(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroSubtablaGlosa === st.id
                    ? "bg-amber-700 text-white"
                    : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-100"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}

        {/* TABLA OPERATIVA EDITABLE */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          {(tabActiva === "anuladas" || tabActiva === "legalizadas") && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-2.5 text-left">Año / Período</th>
                  <th className="p-2.5 text-left">Empresa</th>
                  <th className="p-2.5 text-left">No. Factura</th>
                  <th className="p-2.5 text-left">Fecha Rad.</th>
                  <th className="p-2.5 text-right">Valor Radicado</th>
                  <th className="p-2.5 text-left">Tipo</th>
                  <th className="p-2.5 text-left">Motivo de Anulación / Devolución</th>
                  <th className="p-2.5 text-left"># Factura Reemplaza</th>
                  <th className="p-2.5 text-left">RIPS</th>
                  <th className="p-2.5 text-left">Revisión Financiera</th>
                  <th className="p-2.5 text-left">Responsable</th>
                  <th className="p-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(listaActivaPaginada.items as AnuladaRow[]).map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/40">
                    <td className="p-2.5 font-semibold whitespace-nowrap">
                      {r.anio} <span className="text-slate-500 font-normal">({r.periodo})</span>
                    </td>
                    <td className="p-2.5 font-bold text-slate-900">{r.empresa}</td>
                    <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">{r.factura}</td>
                    <td className="p-2.5 whitespace-nowrap">{r.fechaRadicacion || r.fechaFactura}</td>
                    <td className="p-2.5 text-right font-mono font-semibold">{formatCOP(r.valorRadicado)}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                        {r.tipo}
                      </span>
                    </td>
                    <td className="p-2.5 max-w-xs truncate" title={r.motivo}>
                      {r.motivo}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {r.facturaReemplaza || "PENDIENTE"}
                    </td>
                    <td className="p-2.5">{r.rips}</td>
                    <td className="p-2.5 max-w-[180px] truncate" title={r.revisionFinanciera}>
                      {r.revisionFinanciera}
                    </td>
                    <td className="p-2.5 font-semibold whitespace-nowrap">{r.responsable}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => setFilaEditando({ ...r })}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tabActiva === "glosas" && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-2.5 text-left">Clasificación</th>
                  <th className="p-2.5 text-left">Año</th>
                  <th className="p-2.5 text-left">Empresa</th>
                  <th className="p-2.5 text-left">No. Factura</th>
                  <th className="p-2.5 text-right">Valor Factura</th>
                  <th className="p-2.5 text-right">Valor Glosado</th>
                  <th className="p-2.5 text-left">Motivo de Glosa</th>
                  <th className="p-2.5 text-left">Facturador</th>
                  <th className="p-2.5 text-left">Observación / Aceptación</th>
                  <th className="p-2.5 text-left">Nota Crédito</th>
                  <th className="p-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(listaActivaPaginada.items as GlosaRow[]).map((r) => (
                  <tr key={r.id} className="hover:bg-amber-50/40">
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          r.subtabla === "ACEPTADA_NOTA_CREDITO"
                            ? "bg-rose-100 text-rose-800"
                            : r.subtabla === "RESPONDIDA_NO_ACEPTADA"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.subtabla === "ACEPTADA_NOTA_CREDITO"
                          ? "Aceptada (NC)"
                          : r.subtabla === "RESPONDIDA_NO_ACEPTADA"
                          ? "Respondida"
                          : "En Gestión"}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold">{r.anio}</td>
                    <td className="p-2.5 font-bold text-slate-900">{r.empresa}</td>
                    <td className="p-2.5 font-mono font-bold text-blue-700">{r.factura}</td>
                    <td className="p-2.5 text-right font-mono">{formatCOP(r.valorFactura || r.valorRadicado)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                      {formatCOP(r.valorGlosado)}
                    </td>
                    <td className="p-2.5 max-w-xs truncate" title={r.motivoGlosa}>
                      {r.motivoGlosa}
                    </td>
                    <td className="p-2.5 font-semibold">{r.facturador}</td>
                    <td className="p-2.5 max-w-xs truncate" title={r.observacionInterna}>
                      {r.observacionInterna}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-purple-800">{r.notaCredito || "-"}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => setFilaEditando({ ...r })}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tabActiva === "pendientes" && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-2.5 text-left">Estado</th>
                  <th className="p-2.5 text-left">Empresa</th>
                  <th className="p-2.5 text-left">Contrato</th>
                  <th className="p-2.5 text-left">CUPS</th>
                  <th className="p-2.5 text-left">Descripción Procedimiento / Consulta</th>
                  <th className="p-2.5 text-left">Fecha Servicio</th>
                  <th className="p-2.5 text-left">Médico</th>
                  <th className="p-2.5 text-right">Valor Servicio</th>
                  <th className="p-2.5 text-left">Responsable</th>
                  <th className="p-2.5 text-left">Observaciones</th>
                  <th className="p-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(listaActivaPaginada.items as PendienteRow[]).map((r) => (
                  <tr key={r.id} className="hover:bg-purple-50/40">
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          r.estado === "FACTURADO"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-slate-900">{r.empresa}</td>
                    <td className="p-2.5 max-w-[180px] truncate" title={r.contrato}>
                      {r.contrato}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-purple-800">{r.cups}</td>
                    <td className="p-2.5 max-w-xs truncate" title={r.descripcion}>
                      {r.descripcion}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">{r.fechaServicio}</td>
                    <td className="p-2.5 whitespace-nowrap">{r.medico}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{formatCOP(r.valorServicio)}</td>
                    <td className="p-2.5 font-semibold">{r.responsable}</td>
                    <td className="p-2.5 max-w-xs truncate" title={r.observaciones}>
                      {r.observaciones}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => setFilaEditando({ ...r })}
                        className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINACIÓN */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 text-xs text-slate-600">
          <span>
            Mostrando <strong>{listaActivaPaginada.items.length}</strong> de{" "}
            <strong>{listaActivaPaginada.total}</strong> registros reales
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={paginaActual <= 1}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 font-semibold cursor-pointer"
            >
              Anterior
            </button>
            <span className="font-bold text-slate-800">
              Página {paginaActual} de {listaActivaPaginada.totalPaginas}
            </span>
            <button
              disabled={paginaActual >= listaActivaPaginada.totalPaginas}
              onClick={() => setPaginaActual((p) => Math.min(listaActivaPaginada.totalPaginas, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 font-semibold cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: EDITAR REGISTRO DE LA MESA DE TRABAJO                          */}
      {/* ===================================================================== */}
      {filaEditando && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-lg font-extrabold text-slate-900">
                Editar Registro — {String(filaEditando.factura || filaEditando.cups || filaEditando.id)}
              </h4>
              <button
                onClick={() => setFilaEditando(null)}
                className="text-slate-500 hover:text-slate-800 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Empresa</label>
                <input
                  type="text"
                  value={String(filaEditando.empresa || "")}
                  onChange={(e) => setFilaEditando({ ...filaEditando, empresa: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              {"factura" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Factura</label>
                  <input
                    type="text"
                    value={String(filaEditando.factura || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, factura: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              )}

              {"facturaReemplaza" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">
                    # Factura que Reemplaza (FCOE...)
                  </label>
                  <input
                    type="text"
                    value={String(filaEditando.facturaReemplaza || "")}
                    onChange={(e) =>
                      setFilaEditando({ ...filaEditando, facturaReemplaza: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-lg border border-emerald-400 px-3 py-2 font-mono font-bold"
                  />
                </div>
              )}

              {"rips" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RIPS</label>
                  <input
                    type="text"
                    value={String(filaEditando.rips || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, rips: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              )}

              {"revisionFinanciera" in filaEditando && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Revisión del Área Financiera / Estado
                  </label>
                  <input
                    type="text"
                    value={String(filaEditando.revisionFinanciera || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, revisionFinanciera: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              )}

              {"motivo" in filaEditando && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motivo de Anulación / Devolución</label>
                  <input
                    type="text"
                    value={String(filaEditando.motivo || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, motivo: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              )}

              {"notaCredito" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1">Nota Crédito</label>
                  <input
                    type="text"
                    value={String(filaEditando.notaCredito || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, notaCredito: e.target.value })}
                    className="w-full rounded-lg border border-purple-300 px-3 py-2 font-mono"
                  />
                </div>
              )}

              {"observacionInterna" in filaEditando && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observación Interna</label>
                  <input
                    type="text"
                    value={String(filaEditando.observacionInterna || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, observacionInterna: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              )}

              {"estado" in filaEditando && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado Servicio</label>
                  <select
                    value={String(filaEditando.estado || "PENDIENTE")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, estado: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="FACTURADO">FACTURADO</option>
                    <option value="EN REVISION">EN REVISION</option>
                  </select>
                </div>
              )}

              {"observaciones" in filaEditando && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones Facturación</label>
                  <input
                    type="text"
                    value={String(filaEditando.observaciones || "")}
                    onChange={(e) => setFilaEditando({ ...filaEditando, observaciones: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Responsable / Facturadora</label>
                <select
                  value={String(filaEditando.responsable || filaEditando.facturador || "MARIA ALEJANDRA")}
                  onChange={(e) =>
                    setFilaEditando({
                      ...filaEditando,
                      responsable: e.target.value,
                      facturador: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                >
                  {carteraInitialData.responsablesDisponibles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setFilaEditando(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicionFila}
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm shadow cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NUEVO REGISTRO OPERATIVO                                       */}
      {/* ===================================================================== */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-lg font-extrabold text-slate-900">
                + Crear Nuevo Registro ({tabActiva.toUpperCase()})
              </h4>
              <button
                onClick={() => setMostrarModalNuevo(false)}
                className="text-slate-500 hover:text-slate-800 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Empresa Real</label>
                <select
                  value={nuevoRegistroForm.empresa}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, empresa: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                >
                  {carteraInitialData.empresasDisponibles.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Año</label>
                <select
                  value={nuevoRegistroForm.anio}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, anio: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                >
                  {carteraInitialData.aniosDisponibles.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. Factura (FCOE...)</label>
                <input
                  type="text"
                  value={nuevoRegistroForm.factura}
                  onChange={(e) =>
                    setNuevoRegistroForm({ ...nuevoRegistroForm, factura: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Valor ($ COP)</label>
                <input
                  type="number"
                  value={nuevoRegistroForm.valorRadicado}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, valorRadicado: e.target.value })}
                  placeholder="Ej. 1450000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1"># Factura Reemplaza / Nota Crédito</label>
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
                  placeholder="Ej. FCOE75900 o NC1204"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Responsable / Facturadora</label>
                <select
                  value={nuevoRegistroForm.responsable}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, responsable: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                >
                  {carteraInitialData.responsablesDisponibles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo / Descripción / Observación
                </label>
                <input
                  type="text"
                  value={nuevoRegistroForm.motivo}
                  onChange={(e) => setNuevoRegistroForm({ ...nuevoRegistroForm, motivo: e.target.value })}
                  placeholder="Detalle del motivo de glosa, devolución o servicio pendiente..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setMostrarModalNuevo(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={crearNuevoRegistro}
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm shadow cursor-pointer"
              >
                Guardar Nuevo Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: AGREGAR NUEVO CORTE DE SISMA BACK                              */}
      {/* ===================================================================== */}
      {mostrarModalCorte && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-lg font-extrabold text-slate-900">
                + Registrar Corte Oficial de SISMA Back
              </h4>
              <button
                onClick={() => setMostrarModalCorte(false)}
                className="text-slate-500 hover:text-slate-800 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Modalidad</label>
                <select
                  value={nuevoCorteForm.modalidad}
                  onChange={(e) =>
                    setNuevoCorteForm({ ...nuevoCorteForm, modalidad: e.target.value as "TODAS" | "PYP" })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold"
                >
                  <option value="TODAS">Todas las Empresas</option>
                  <option value="PYP">Modalidad PYP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Corte (DD/MM/AAAA)</label>
                <input
                  type="text"
                  value={nuevoCorteForm.fechaCorte}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, fechaCorte: e.target.value })}
                  placeholder="Ej. 16/10/2026"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">
                  Cartera Corriente (&lt; 60 días)
                </label>
                <input
                  type="number"
                  value={nuevoCorteForm.carteraCorriente}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, carteraCorriente: e.target.value })}
                  placeholder="Análisis de vencimiento"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-800 mb-1">
                  Cartera Vencida (&gt;= 60 días)
                </label>
                <input
                  type="number"
                  value={nuevoCorteForm.carteraVencida}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, carteraVencida: e.target.value })}
                  placeholder="Análisis de vencimiento"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  Anticipos / Giros por Cruzar
                </label>
                <input
                  type="number"
                  value={nuevoCorteForm.anticiposPorCruzar}
                  onChange={(e) => setNuevoCorteForm({ ...nuevoCorteForm, anticiposPorCruzar: e.target.value })}
                  placeholder="Auxiliar abierto (1301250602...)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Facturas Pendientes por Radicar
                </label>
                <input
                  type="number"
                  value={nuevoCorteForm.facturasPendientesRadicar}
                  onChange={(e) =>
                    setNuevoCorteForm({ ...nuevoCorteForm, facturasPendientesRadicar: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setMostrarModalCorte(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevoCorteSismaBack}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow cursor-pointer"
              >
                Guardar Corte SISMA Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ESPECIFICACIÓN TÉCNICA DE ENDPOINTS SISMA BACK PARA FABER      */}
      {/* ===================================================================== */}
      {mostrarModalFaber && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase text-blue-700">
                  Integración Directa con api.centrooftalmologicoebenezer.com/node/swagger#/Informes
                </span>
                <h4 className="text-lg font-extrabold text-slate-900">
                  Especificación de los 2 Endpoints de SISMA Back para Faber
                </h4>
              </div>
              <button
                onClick={() => setMostrarModalFaber(false)}
                className="text-slate-500 hover:text-slate-800 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Este tablero ya tiene programada la conexión automática en{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">/api/cartera</code> usando la misma llave{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">X-API-Key</code>. Apenas Faber publique estos 2 endpoints en el servidor Node/Swagger apuntando a la base de datos de <strong>SISMA Back (Contabilidad)</strong>, los cortes se actualizarán solos en tiempo real:
            </p>

            <div className="space-y-4">
              {carteraInitialData.sismaBack.especificacionFaber.map((ep) => (
                <div key={ep.endpoint} className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs space-y-2">
                  <div className="font-mono font-bold text-blue-300 text-sm">{ep.endpoint}</div>
                  <div>
                    <span className="text-slate-400">Módulo en SISMA Back: </span>
                    <strong className="text-white">{ep.moduloOrigen}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Parámetros Query: </span>
                    <code className="text-amber-300">{ep.parametros}</code>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Campos requeridos en el JSON de respuesta:</span>
                    <ul className="list-disc list-inside text-emerald-300 font-mono space-y-1">
                      {ep.camposRetorno.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setMostrarModalFaber(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
