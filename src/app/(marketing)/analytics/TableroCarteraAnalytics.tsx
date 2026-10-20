"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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

const formatCOP = (val: number | undefined) => {
  if (!val || isNaN(val)) return "$-";
  return "$" + Math.round(val).toLocaleString("es-CO");
};

const STORAGE_KEY = "ebenezer_sisma_back_mesa_v3";

export default function TableroCarteraAnalytics() {
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

  const [apiConectada, setApiConectada] = useState<boolean>(false);
  const [modalidadSisma, setModalidadSisma] = useState<"TODAS" | "PYP">("TODAS");
  const [indiceCorteActivo, setIndiceCorteActivo] = useState<number>(2);

  // Operational workbench state
  const [tabActiva, setTabActiva] = useState<"anuladas" | "legalizadas" | "glosas" | "pendientes">("anuladas");
  const [filtroAnio, setFiltroAnio] = useState<string>("TODOS");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("TODAS");
  const [filtroResponsable, setFiltroResponsable] = useState<string>("TODAS");
  const [filtroSubtablaGlosa, setFiltroSubtablaGlosa] = useState<string>("TODAS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const filasPorPagina = 20;

  // Modals & Upload state
  const [mostrarPanelCarga, setMostrarPanelCarga] = useState<boolean>(false);
  const [tipoArchivoCarga, setTipoArchivoCarga] = useState<"VENCIMIENTO" | "GIROS" | "GLOSAS">("VENCIMIENTO");
  const [mostrarModalFaber, setMostrarModalFaber] = useState<boolean>(false);
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
        if (Array.isArray(parsed.anuladas)) setAnuladas(parsed.anuladas);
        if (Array.isArray(parsed.legalizadas)) setLegalizadas(parsed.legalizadas);
        if (Array.isArray(parsed.glosas)) setGlosas(parsed.glosas);
        if (Array.isArray(parsed.pendientes)) setPendientes(parsed.pendientes);
        if (Array.isArray(parsed.cortesTodas)) setCortesTodas(parsed.cortesTodas);
        if (Array.isArray(parsed.cortesPyp)) setCortesPyp(parsed.cortesPyp);
      }
    } catch {
      // Ignore storage error
    }

    fetch("/api/cartera")
      .then((r) => r.json())
      .then((res) => {
        if (res && typeof res.conexionSismaBackActiva === "boolean") {
          setApiConectada(res.conexionSismaBackActiva);
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
      // Ignore quota
    }
  };

  const mostrarAviso = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(""), 4500);
  };

  // Handle Excel / CSV File Upload
  const manejarArchivoSubido = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || "");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        mostrarAviso("El archivo seleccionado está vacío o requiere formato CSV/TXT delimitado.");
        return;
      }

      const sep = lines[0].includes(";") ? ";" : ",";
      const parseNum = (s: string) => {
        const clean = String(s || "")
          .replace(/[$"'\s]/g, "")
          .replace(/[,.]00$/, "")
          .replace(/[^0-9]/g, "");
        return Number(clean) || 0;
      };

      if (tipoArchivoCarga === "VENCIMIENTO" || tipoArchivoCarga === "GIROS") {
        let sumCorriente = 0;
        let sumVencida = 0;
        let sumGiros = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
          if (tipoArchivoCarga === "VENCIMIENTO") {
            const dias = parseNum(cols[4] || "0");
            const saldo = parseNum(cols[cols.length - 1] || "0");
            if (dias >= 60) sumVencida += saldo;
            else sumCorriente += saldo;
          } else {
            const lineaUpper = lines[i].toUpperCase();
            if (
              lineaUpper.includes("1301250602") ||
              lineaUpper.includes("2501010602") ||
              lineaUpper.includes("2501010607") ||
              lineaUpper.includes("GIRO")
            ) {
              sumGiros += parseNum(cols[cols.length - 1] || "0");
            }
          }
        }

        const hoy = new Date().toLocaleDateString("es-CO");
        if (tipoArchivoCarga === "VENCIMIENTO" && (sumCorriente > 0 || sumVencida > 0)) {
          const ultimo = cortesTodas[cortesTodas.length - 1];
          const ant = ultimo ? ultimo.anticiposPorCruzar : 0;
          const nuevo: CorteSismaBack = {
            fechaCorte: hoy,
            modalidad: "Todas las Empresas",
            carteraCorriente: sumCorriente,
            carteraVencida: sumVencida,
            carteraTotal: sumCorriente + sumVencida,
            facturasPendientesRadicar: 0,
            glosasPendientesGestionar: 0,
            anticiposPorCruzar: ant,
            totalCarteraReal: Math.max(0, sumCorriente + sumVencida - ant),
          };
          const next = [...cortesTodas, nuevo];
          setCortesTodas(next);
          setIndiceCorteActivo(next.length - 1);
          persistAll(anuladas, legalizadas, glosas, pendientes, next, cortesPyp);
          mostrarAviso(`Reporte de Análisis de Vencimiento cargado (${lines.length - 1} filas procesadas).`);
        } else if (tipoArchivoCarga === "GIROS" && sumGiros > 0) {
          const next = cortesTodas.map((c, idx) =>
            idx === cortesTodas.length - 1
              ? {
                  ...c,
                  anticiposPorCruzar: sumGiros,
                  totalCarteraReal: Math.max(0, c.carteraTotal - sumGiros),
                }
              : c
          );
          setCortesTodas(next);
          persistAll(anuladas, legalizadas, glosas, pendientes, next, cortesPyp);
          mostrarAviso(`Auxiliar Abierto de Giros actualizado (${formatCOP(sumGiros)}).`);
        } else {
          setMostrarModalCorte(true);
          mostrarAviso(`Archivo leído (${file.name}). Confirma los totales del corte en la ventana.`);
        }
      } else {
        // Import operational rows into active tab
        const nuevasFilas: AnuladaRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
          if (cols.length < 4) continue;
          nuevasFilas.push({
            id: `IMP-${Date.now()}-${i}`,
            numero: anuladas.length + i,
            empresa: (cols[1] || "MUTUAL SER").toUpperCase(),
            empresaOriginal: cols[1] || "",
            fechaFactura: cols[2] || "",
            periodo: cols[3] === "-" ? "" : cols[3] || "",
            anio: cols[4] || "2026",
            factura: cols[5] || cols[0] || "",
            fechaRadicacion: cols[6] || "",
            valorRadicado: parseNum(cols[7] || "0"),
            copagos: parseNum(cols[8] || "0"),
            valorGlosaDevolucion: parseNum(cols[9] || "0"),
            tipo: "GLOSA",
            motivo: cols[10] || "",
            facturaReemplaza: cols[11] || "",
            fechaAnulacion: cols[12] || "",
            fechaRadicacionReemplazo: cols[13] || "",
            rips: cols[14] || "",
            revisionFinanciera: cols[15] || "",
            preagrupado: "",
            responsable: (cols[17] || "MARIA ALEJANDRA").toUpperCase(),
            estadoGestion: cols[11] ? "REEMPLAZADA" : "EN GESTIÓN",
          });
        }
        if (nuevasFilas.length > 0) {
          const next = [...nuevasFilas, ...anuladas];
          setAnuladas(next);
          persistAll(next, legalizadas, glosas, pendientes);
          mostrarAviso(`Se importaron ${nuevasFilas.length} registros del archivo ${file.name}.`);
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file, "utf-8");
  };

  const listaCortesActiva = modalidadSisma === "TODAS" ? cortesTodas : cortesPyp;
  const corteSeleccionado =
    listaCortesActiva[indiceCorteActivo] ||
    listaCortesActiva[listaCortesActiva.length - 1];

  // Dynamic filtering for operational tables
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
      // Local persistence active
    }

    setFilaEditando(null);
    mostrarAviso("Registro guardado correctamente.");
  };

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
        estadoGestion:
          tabActiva === "legalizadas"
            ? "LEGALIZADA"
            : nuevoRegistroForm.facturaReemplaza
            ? "REEMPLAZADA"
            : "EN GESTIÓN",
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
    } else {
      const nuevo: PendienteRow = {
        id,
        empresa: nuevoRegistroForm.empresa,
        empresaOriginal: nuevoRegistroForm.empresa,
        contrato: nuevoRegistroForm.contrato || "GENERAL",
        unidadFuncional: "CONSULTA EXTERNA",
        cups: nuevoRegistroForm.cups || "890276",
        descripcion: nuevoRegistroForm.motivo || "SERVICIO OFTALMOLÓGICO",
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
    }

    setMostrarModalNuevo(false);
    mostrarAviso("Nuevo registro agregado exitosamente.");
  };

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

    setMostrarModalCorte(false);
    mostrarAviso(`Corte ${nuevoCorte.fechaCorte} guardado correctamente.`);
  };

  const exportarVistaExcelCSV = () => {
    let rows: Record<string, string | number | undefined>[] = [];
    if (tabActiva === "anuladas") rows = anuladasFiltradas;
    else if (tabActiva === "legalizadas") rows = legalizadasFiltradas;
    else if (tabActiva === "glosas") rows = glosasFiltradas;
    else rows = pendientesFiltradas;

    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(";"),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";")
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cartera_${tabActiva}_${filtroAnio}_${filtroEmpresa}.csv`;
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

      {/* BARRA SUPERIOR LIMPIA DE ACCIONES Y CARGA DE ARCHIVOS (TEMA CLARO EBENEZER) */}
      <div
        className="rounded-2xl p-5 shadow-xs border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold border"
            style={{
              backgroundColor: apiConectada ? "#ECFDF5" : "#EFF6FF",
              color: apiConectada ? "#047857" : "#1D58D8",
              borderColor: apiConectada ? "#A7F3D0" : "#BFDBFE",
            }}
          >
            {apiConectada ? "● Conectado a SISMA Back" : "● Fuente: SISMA Back (Cortes y Base de Glosas)"}
          </span>
          <span className="text-xs font-medium" style={{ color: "#475569" }}>
            Cuentas Giros Auxiliar Abierto: <strong>1301250602</strong> · <strong>2501010602</strong> ·{" "}
            <strong>2501010607</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMostrarPanelCarga(!mostrarPanelCarga)}
            className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer border shadow-2xs"
            style={{
              backgroundColor: "#1D58D8",
              color: "#FFFFFF",
              borderColor: "#1D58D8",
            }}
          >
            📂 Cargar Archivo Excel / CSV
          </button>

          <button
            type="button"
            onClick={() => setMostrarModalCorte(true)}
            className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer border"
            style={{
              backgroundColor: "#F8FAFC",
              color: "#0E245E",
              borderColor: "#CBD5E1",
            }}
          >
            + Registrar Corte Manual
          </button>

          <button
            type="button"
            onClick={() => setMostrarModalFaber(true)}
            className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer border"
            style={{
              backgroundColor: "#F8FAFC",
              color: "#1D58D8",
              borderColor: "#BFDBFE",
            }}
          >
            ⚡ Endpoints API (Faber)
          </button>
        </div>
      </div>

      {/* PANEL DESPLEGABLE DE CARGA DIRECTA DE ARCHIVOS EXCEL / CSV */}
      {mostrarPanelCarga && (
        <div
          className="rounded-2xl p-5 border shadow-xs space-y-4"
          style={{ backgroundColor: "#F4F8FD", borderColor: "#BFDBFE" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold" style={{ color: "#0E245E" }}>
                Cargar Información desde Archivo (SISMA Back o Base Operativa)
              </h3>
              <p className="text-xs" style={{ color: "#475569" }}>
                Selecciona qué reporte deseas subir desde tu computador (.csv / .xlsx exportado de SISMA Back)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarPanelCarga(false)}
              className="text-sm font-bold px-2.5 py-1 rounded-lg border cursor-pointer"
              style={{ backgroundColor: "#FFFFFF", color: "#475569", borderColor: "#CBD5E1" }}
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: "VENCIMIENTO" as const,
                titulo: "1. Análisis de Vencimiento (SISMA Back)",
                desc: "Actualiza Cartera Corriente (< 60 días) y Cartera Vencida (>= 60 días)",
              },
              {
                id: "GIROS" as const,
                titulo: "2. Auxiliar Abierto de Giros (SISMA Back)",
                desc: "Actualiza las cuentas 1301250602, 2501010602 y 2501010607",
              },
              {
                id: "GLOSAS" as const,
                titulo: "3. Base de Glosas / Facturas Anuladas",
                desc: "Importa nuevas filas a la Mesa de Trabajo operativa",
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

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={manejarArchivoSubido}
              className="text-xs sm:text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:cursor-pointer"
              style={{ color: "#0E245E" }}
            />
            <span className="text-xs" style={{ color: "#475569" }}>
              Al elegir el archivo, el tablero procesa y actualiza las cifras automáticamente.
            </span>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BLOQUE 1: RESUMEN DE CARTERA SISMA BACK (DISEÑO CLARO A ANCHO 100%)   */}
      {/* ===================================================================== */}
      <div
        className="rounded-2xl p-6 shadow-xs border space-y-6"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        {/* Cabecera y Selectores con Contraste Garantizado */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b"
          style={{ borderColor: "#E2ECF8" }}
        >
          <div>
            <h3 className="text-lg font-extrabold" style={{ color: "#0E245E" }}>
              1. Resumen de Cartera SISMA Back ({corteSeleccionado.modalidad} — Corte {corteSeleccionado.fechaCorte})
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: "#64748B" }}>
              Fórmula de pizarra: Cartera Corriente (&lt; 60 días) + Cartera Vencida (&gt;= 60 días) − Giros por cruzar = Total Cartera Real
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selector Modalidad con colores hexadecimales explícitos (nunca blanco sobre blanco) */}
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
                className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer"
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
                className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer"
                style={{
                  backgroundColor: modalidadSisma === "PYP" ? "#1D58D8" : "transparent",
                  color: modalidadSisma === "PYP" ? "#FFFFFF" : "#0E245E",
                }}
              >
                Modalidad PYP
              </button>
            </div>

            {/* Selector de Fecha de Corte */}
            <div
              className="inline-flex rounded-xl p-1 border"
              style={{ backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" }}
            >
              {listaCortesActiva.map((c, idx) => {
                const activo = indiceCorteActivo === idx;
                return (
                  <button
                    type="button"
                    key={c.fechaCorte}
                    onClick={() => setIndiceCorteActivo(idx)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    style={{
                      backgroundColor: activo ? "#0E245E" : "transparent",
                      color: activo ? "#FFFFFF" : "#334155",
                    }}
                  >
                    {c.fechaCorte}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5 TARJETAS EJECUTIVAS DE LA FÓRMULA DE PIZARRA (ANCHO COMPLETO, TEMA CLARO) */}
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
              Auxiliar abierto (3 cuentas)
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

        {/* GRÁFICA SUPERIOR DE LA PIZARRA (COMPARATIVO POR CORTE) */}
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2ECF8" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h4 className="text-sm font-extrabold" style={{ color: "#0E245E" }}>
              Gráfica Comparativa por Corte ({modalidadSisma === "TODAS" ? "Todas las Empresas" : "Modalidad PYP"})
            </h4>
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
          </div>

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
        </div>

        {/* TABLA INFERIOR DE LA PIZARRA A ANCHO COMPLETO (SIN CORTARSE A LA DERECHA) */}
        <div className="overflow-x-auto border rounded-xl" style={{ borderColor: "#E2ECF8" }}>
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                <th className="text-left p-3.5 font-bold">
                  Concepto ({modalidadSisma === "TODAS" ? "Todas las Empresas" : "Modalidad PYP"})
                </th>
                <th className="text-center p-3.5 font-bold">Regla Pizarra</th>
                {listaCortesActiva.map((c) => (
                  <th key={c.fechaCorte} className="text-right p-3.5 font-bold">
                    Corte {c.fechaCorte}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
              <tr>
                <td className="p-3.5 font-bold" style={{ color: "#0E245E" }}>
                  Cartera Corriente
                </td>
                <td className="p-3.5 text-center font-semibold" style={{ color: "#1D58D8" }}>
                  (+) Radicada &lt; 60 días
                </td>
                {listaCortesActiva.map((c) => (
                  <td key={c.fechaCorte} className="p-3.5 text-right font-mono font-semibold" style={{ color: "#0E245E" }}>
                    {formatCOP(c.carteraCorriente)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3.5 font-bold" style={{ color: "#0E245E" }}>
                  Cartera Vencida
                </td>
                <td className="p-3.5 text-center font-semibold" style={{ color: "#E11D48" }}>
                  (+) Radicada &gt;= 60 días
                </td>
                {listaCortesActiva.map((c) => (
                  <td key={c.fechaCorte} className="p-3.5 text-right font-mono font-bold" style={{ color: "#BE123C" }}>
                    {formatCOP(c.carteraVencida)}
                  </td>
                ))}
              </tr>

              <tr style={{ backgroundColor: "#EFF6FF" }}>
                <td className="p-3.5 font-extrabold" style={{ color: "#0E245E" }}>
                  Cartera Total
                </td>
                <td className="p-3.5 text-center font-bold" style={{ color: "#1E40AF" }}>
                  (=) Suma Corriente + Vencida (↓)
                </td>
                {listaCortesActiva.map((c) => (
                  <td key={c.fechaCorte} className="p-3.5 text-right font-mono font-extrabold" style={{ color: "#1E40AF" }}>
                    {formatCOP(c.carteraTotal)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3.5 font-medium" style={{ color: "#334155" }}>
                  Facturas pendientes por radicar
                </td>
                <td className="p-3.5 text-center text-xs" style={{ color: "#64748B" }}>
                  Pendientes de radicación
                </td>
                {listaCortesActiva.map((c) => (
                  <td key={c.fechaCorte} className="p-3.5 text-right font-mono" style={{ color: "#334155" }}>
                    {formatCOP(c.facturasPendientesRadicar)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3.5 font-medium" style={{ color: "#334155" }}>
                  Glosas pendientes por gestionar
                </td>
                <td className="p-3.5 text-center text-xs" style={{ color: "#64748B" }}>
                  En gestión operativa
                </td>
                {listaCortesActiva.map((c) => (
                  <td key={c.fechaCorte} className="p-3.5 text-right font-mono" style={{ color: "#334155" }}>
                    {formatCOP(c.glosasPendientesGestionar)}
                  </td>
                ))}
              </tr>

              <tr style={{ backgroundColor: "#FFFBEB" }}>
                <td className="p-3.5 font-bold" style={{ color: "#92400E" }}>
                  Anticipos / Giros por cruzar
                </td>
                <td className="p-3.5 text-center text-xs font-semibold" style={{ color: "#B45309" }}>
                  (−) Cuentas 1301250602 · 2501010602 · 2501010607
                </td>
                {listaCortesActiva.map((c) => (
                  <td key={c.fechaCorte} className="p-3.5 text-right font-mono font-bold" style={{ color: "#92400E" }}>
                    {formatCOP(c.anticiposPorCruzar)}
                  </td>
                ))}
              </tr>

              <tr style={{ backgroundColor: "#ECFDF5" }}>
                <td className="p-3.5 font-extrabold" style={{ color: "#065F46" }}>
                  TOTAL CARTERA REAL
                </td>
                <td className="p-3.5 text-center font-extrabold" style={{ color: "#047857" }}>
                  (=) Cartera Total − Giros por cruzar
                </td>
                {listaCortesActiva.map((c) => (
                  <td key={c.fechaCorte} className="p-3.5 text-right font-mono font-extrabold text-base" style={{ color: "#047857" }}>
                    {formatCOP(c.totalCarteraReal)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BLOQUE 2: MESA DE TRABAJO OPERATIVA (REEMPLAZO DEL ARCHIVO EXCEL)     */}
      {/* ===================================================================== */}
      <div
        className="rounded-2xl p-6 shadow-xs border space-y-5"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2ECF8" }}
      >
        <div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b"
          style={{ borderColor: "#E2ECF8" }}
        >
          <div>
            <h3 className="text-lg font-extrabold" style={{ color: "#0E245E" }}>
              2. Mesa de Trabajo de Glosas, Facturas Anuladas y Pendientes (2021 – 2026)
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: "#64748B" }}>
              Edita cualquier factura, registra reemplazos o notas crédito y exporta a Excel cuando lo requieras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

        {/* BARRA DE FILTROS */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2ECF8" }}
        >
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "#334155" }}>
              Año
            </label>
            <select
              value={filtroAnio}
              onChange={(e) => {
                setFiltroAnio(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-sm font-semibold"
              style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
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
            <label className="block text-xs font-bold mb-1" style={{ color: "#334155" }}>
              Empresa / Aseguradora
            </label>
            <select
              value={filtroEmpresa}
              onChange={(e) => {
                setFiltroEmpresa(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-sm font-semibold"
              style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
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
            <label className="block text-xs font-bold mb-1" style={{ color: "#334155" }}>
              Responsable / Facturadora
            </label>
            <select
              value={filtroResponsable}
              onChange={(e) => {
                setFiltroResponsable(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-sm font-semibold"
              style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
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
            <label className="block text-xs font-bold mb-1" style={{ color: "#334155" }}>
              Buscar Factura (FCOE...), Reemplazo, Nota Crédito o Motivo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Ej. FCOE73554, MUTUAL SER, NC..."
                className="w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-sm"
                style={{ borderColor: "#CBD5E1", color: "#0E245E" }}
              />
              {(filtroAnio !== "TODOS" ||
                filtroEmpresa !== "TODAS" ||
                filtroResponsable !== "TODAS" ||
                busqueda !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroAnio("TODOS");
                    setFiltroEmpresa("TODAS");
                    setFiltroResponsable("TODAS");
                    setFiltroSubtablaGlosa("TODAS");
                    setBusqueda("");
                    setPaginaActual(1);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-bold shrink-0 cursor-pointer border"
                  style={{ backgroundColor: "#FFFFFF", color: "#0E245E", borderColor: "#CBD5E1" }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PESTAÑAS CON CONTRASTE HEXADECIMAL EXPLÍCITO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: "anuladas" as const,
              titulo: `1. Anuladas / Reemplazadas (${anuladasFiltradas.length})`,
              valor: formatCOP(kpisOperativos.totalAnuladasVal),
              sub: `Reemplazadas: ${kpisOperativos.reemplazadasOk} · En gestión: ${kpisOperativos.pendientesReemplazo}`,
            },
            {
              id: "legalizadas" as const,
              titulo: `2. Glosas Legalizadas (${legalizadasFiltradas.length})`,
              valor: formatCOP(kpisOperativos.totalLegalizadasVal),
              sub: "Conciliadas / legalizadas",
            },
            {
              id: "glosas" as const,
              titulo: `3. Glosas y Notas Crédito (${glosasFiltradas.length})`,
              valor: formatCOP(kpisOperativos.totalGlosadoVal),
              sub: "Respondidas, Notas Crédito y en gestión",
            },
            {
              id: "pendientes" as const,
              titulo: `4. Servicios Pendientes (${pendientesFiltradas.length})`,
              valor: formatCOP(kpisOperativos.totalPendientesVal),
              sub: "Admisiones pendientes por facturar",
            },
          ].map((t) => {
            const activo = tabActiva === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setTabActiva(t.id);
                  setPaginaActual(1);
                }}
                className="rounded-xl p-4 border cursor-pointer transition"
                style={{
                  backgroundColor: activo ? "#0E245E" : "#F8FAFC",
                  color: activo ? "#FFFFFF" : "#0E245E",
                  borderColor: activo ? "#0E245E" : "#CBD5E1",
                }}
              >
                <div
                  className="text-xs font-bold uppercase"
                  style={{ color: activo ? "#93C5FD" : "#1D58D8" }}
                >
                  {t.titulo}
                </div>
                <div className="text-lg font-extrabold font-mono mt-1">{t.valor}</div>
                <div
                  className="text-[11px] mt-1"
                  style={{ color: activo ? "#E2E8F0" : "#64748B" }}
                >
                  {t.sub}
                </div>
              </div>
            );
          })}
        </div>

        {/* SUBFILTRO PESTAÑA 3 */}
        {tabActiva === "glosas" && (
          <div
            className="flex flex-wrap items-center gap-2 p-3 rounded-xl border"
            style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" }}
          >
            <span className="text-xs font-bold mr-2" style={{ color: "#0E245E" }}>
              Ver subtabla:
            </span>
            {[
              { id: "TODAS", label: "Todas" },
              { id: "RESPONDIDA_NO_ACEPTADA", label: "Respondidas / No Aceptadas" },
              { id: "ACEPTADA_NOTA_CREDITO", label: "Aceptadas con Nota Crédito" },
              { id: "EN_GESTION", label: "En Gestión / Autorizaciones" },
            ].map((st) => {
              const activo = filtroSubtablaGlosa === st.id;
              return (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => {
                    setFiltroSubtablaGlosa(st.id);
                    setPaginaActual(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border"
                  style={{
                    backgroundColor: activo ? "#1D58D8" : "#FFFFFF",
                    color: activo ? "#FFFFFF" : "#0E245E",
                    borderColor: activo ? "#1D58D8" : "#CBD5E1",
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        )}

        {/* TABLA OPERATIVA CORREGIDA (SIN PARÉNTESIS VACÍOS, SIN TEXTOS CORTADOS, ACCIÓN SIEMPRE VISIBLE) */}
        <div className="overflow-x-auto border rounded-xl" style={{ borderColor: "#E2ECF8" }}>
          {(tabActiva === "anuladas" || tabActiva === "legalizadas") && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                  <th className="p-3 text-left font-bold">Año</th>
                  <th className="p-3 text-left font-bold">Empresa</th>
                  <th className="p-3 text-left font-bold">No. Factura</th>
                  <th className="p-3 text-left font-bold">Fecha Rad.</th>
                  <th className="p-3 text-right font-bold">Valor Facturado</th>
                  <th className="p-3 text-right font-bold">Valor Glosa / Dev.</th>
                  <th className="p-3 text-left font-bold">Tipo</th>
                  <th className="p-3 text-left font-bold min-w-[240px]">Motivo de Anulación / Devolución</th>
                  <th className="p-3 text-left font-bold"># Factura Reemplaza</th>
                  <th className="p-3 text-left font-bold">RIPS</th>
                  <th className="p-3 text-left font-bold">Responsable</th>
                  <th className="p-3 text-center font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                {(listaActivaPaginada.items as AnuladaRow[]).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                      {r.anio}
                      {r.periodo && r.periodo !== "-" ? (
                        <span className="block text-[10px] font-normal" style={{ color: "#64748B" }}>
                          {r.periodo}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 font-bold" style={{ color: "#0E245E" }}>
                      {r.empresa}
                    </td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap" style={{ color: "#1D58D8" }}>
                      {r.factura}
                    </td>
                    <td className="p-3 whitespace-nowrap" style={{ color: "#334155" }}>
                      {r.fechaRadicacion || r.fechaFactura || "-"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                      {formatCOP(r.valorRadicado)}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold whitespace-nowrap" style={{ color: "#BE123C" }}>
                      {formatCOP(r.valorGlosaDevolucion)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-bold"
                        style={{
                          backgroundColor: r.tipo.includes("GLOSA") ? "#FFE4E6" : "#EFF6FF",
                          color: r.tipo.includes("GLOSA") ? "#BE123C" : "#1D58D8",
                        }}
                      >
                        {r.tipo}
                      </span>
                    </td>
                    <td className="p-3 leading-snug" style={{ color: "#334155" }}>
                      {r.motivo || "-"}
                      {r.revisionFinanciera ? (
                        <span className="block text-[11px] mt-1 font-medium" style={{ color: "#047857" }}>
                          Rev: {r.revisionFinanciera}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap" style={{ color: "#047857" }}>
                      {r.facturaReemplaza || "PENDIENTE"}
                    </td>
                    <td className="p-3 font-mono whitespace-nowrap" style={{ color: "#334155" }}>
                      {r.rips || "-"}
                    </td>
                    <td className="p-3 font-semibold whitespace-nowrap" style={{ color: "#0E245E" }}>
                      {r.responsable}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setFilaEditando({ ...r })}
                        className="px-3 py-1 rounded-lg font-bold text-xs cursor-pointer"
                        style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
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
                <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                  <th className="p-3 text-left font-bold">Estado</th>
                  <th className="p-3 text-left font-bold">Año</th>
                  <th className="p-3 text-left font-bold">Empresa</th>
                  <th className="p-3 text-left font-bold">No. Factura</th>
                  <th className="p-3 text-right font-bold">Valor Factura</th>
                  <th className="p-3 text-right font-bold">Valor Glosado</th>
                  <th className="p-3 text-left font-bold min-w-[220px]">Motivo de Glosa</th>
                  <th className="p-3 text-left font-bold min-w-[200px]">Respuesta / Observación</th>
                  <th className="p-3 text-left font-bold">Facturador</th>
                  <th className="p-3 text-left font-bold">Nota Crédito</th>
                  <th className="p-3 text-center font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                {(listaActivaPaginada.items as GlosaRow[]).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded font-bold text-[11px]"
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
                    <td className="p-3 font-bold" style={{ color: "#0E245E" }}>
                      {r.anio}
                    </td>
                    <td className="p-3 font-bold" style={{ color: "#0E245E" }}>
                      {r.empresa}
                    </td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap" style={{ color: "#1D58D8" }}>
                      {r.factura}
                    </td>
                    <td className="p-3 text-right font-mono whitespace-nowrap" style={{ color: "#0E245E" }}>
                      {formatCOP(r.valorFactura || r.valorRadicado)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap" style={{ color: "#BE123C" }}>
                      {formatCOP(r.valorGlosado)}
                    </td>
                    <td className="p-3 leading-snug" style={{ color: "#334155" }}>
                      {r.motivoGlosa || "-"}
                    </td>
                    <td className="p-3 leading-snug" style={{ color: "#334155" }}>
                      {r.observacionInterna || "-"}
                    </td>
                    <td className="p-3 font-semibold whitespace-nowrap" style={{ color: "#0E245E" }}>
                      {r.facturador}
                    </td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap" style={{ color: "#6D28D9" }}>
                      {r.notaCredito || "-"}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setFilaEditando({ ...r })}
                        className="px-3 py-1 rounded-lg font-bold text-xs cursor-pointer"
                        style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
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
                <tr style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}>
                  <th className="p-3 text-left font-bold">Estado</th>
                  <th className="p-3 text-left font-bold">Empresa</th>
                  <th className="p-3 text-left font-bold">Contrato</th>
                  <th className="p-3 text-left font-bold">CUPS</th>
                  <th className="p-3 text-left font-bold min-w-[220px]">Descripción Servicio</th>
                  <th className="p-3 text-left font-bold">Fecha</th>
                  <th className="p-3 text-left font-bold">Médico</th>
                  <th className="p-3 text-right font-bold">Valor Servicio</th>
                  <th className="p-3 text-left font-bold">Responsable</th>
                  <th className="p-3 text-left font-bold min-w-[180px]">Observaciones</th>
                  <th className="p-3 text-center font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#E2ECF8" }}>
                {(listaActivaPaginada.items as PendienteRow[]).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded font-bold text-[11px]"
                        style={{
                          backgroundColor: r.estado === "FACTURADO" ? "#ECFDF5" : "#FEF3C7",
                          color: r.estado === "FACTURADO" ? "#047857" : "#B45309",
                        }}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="p-3 font-bold" style={{ color: "#0E245E" }}>
                      {r.empresa}
                    </td>
                    <td className="p-3 leading-snug" style={{ color: "#334155" }}>
                      {r.contrato}
                    </td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap" style={{ color: "#1D58D8" }}>
                      {r.cups}
                    </td>
                    <td className="p-3 leading-snug" style={{ color: "#334155" }}>
                      {r.descripcion}
                    </td>
                    <td className="p-3 whitespace-nowrap" style={{ color: "#334155" }}>
                      {r.fechaServicio}
                    </td>
                    <td className="p-3" style={{ color: "#334155" }}>
                      {r.medico}
                    </td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap" style={{ color: "#0E245E" }}>
                      {formatCOP(r.valorServicio)}
                    </td>
                    <td className="p-3 font-semibold whitespace-nowrap" style={{ color: "#0E245E" }}>
                      {r.responsable}
                    </td>
                    <td className="p-3 leading-snug" style={{ color: "#334155" }}>
                      {r.observaciones || "-"}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setFilaEditando({ ...r })}
                        className="px-3 py-1 rounded-lg font-bold text-xs cursor-pointer"
                        style={{ backgroundColor: "#1D58D8", color: "#FFFFFF" }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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

      {/* MODAL EDITAR FILA */}
      {filaEditando && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl max-w-2xl w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto"
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
            className="rounded-2xl max-w-2xl w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto"
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

      {/* MODAL REGISTRAR CORTE SISMA BACK */}
      {mostrarModalCorte && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl max-w-xl w-full p-6 shadow-2xl border space-y-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0E245E" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E2ECF8" }}>
              <h4 className="text-base font-extrabold">+ Registrar Corte de Cartera SISMA Back</h4>
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

      {/* MODAL ESPECIFICACIÓN ENDPOINTS PARA FABER */}
      {mostrarModalFaber && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl max-w-3xl w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0E245E" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#E2ECF8" }}>
              <div>
                <span className="text-xs font-bold uppercase" style={{ color: "#1D58D8" }}>
                  Conexión Automática SISMA Back
                </span>
                <h4 className="text-base font-extrabold">
                  Especificación de Endpoints para Faber (api.centrooftalmologicoebenezer.com)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalFaber(false)}
                className="font-bold text-base cursor-pointer"
                style={{ color: "#64748B" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {carteraInitialData.sismaBack.especificacionFaber.map((ep) => (
                <div
                  key={ep.endpoint}
                  className="p-4 rounded-xl border text-xs space-y-2"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" }}
                >
                  <div className="font-mono font-bold text-sm" style={{ color: "#1D58D8" }}>
                    {ep.endpoint}
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Origen en SISMA Back: </span>
                    <strong>{ep.moduloOrigen}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Parámetros: </span>
                    <code className="font-mono">{ep.parametros}</code>
                  </div>
                  <div>
                    <span className="block mb-1" style={{ color: "#64748B" }}>
                      Campos JSON de retorno:
                    </span>
                    <ul className="list-disc list-inside font-mono space-y-1" style={{ color: "#047857" }}>
                      {ep.camposRetorno.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t" style={{ borderColor: "#E2ECF8" }}>
              <button
                type="button"
                onClick={() => setMostrarModalFaber(false)}
                className="px-5 py-2 rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
                style={{ backgroundColor: "#0E245E", color: "#FFFFFF" }}
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
