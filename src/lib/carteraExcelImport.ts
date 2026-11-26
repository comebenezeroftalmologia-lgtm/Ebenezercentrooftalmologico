/**
 * Lector nativo de libros Excel (.xlsx), archivos .csv/.txt y celdas pegadas para Cartera y Glosas.
 *
 * - Soporta libros .xlsx reales de una o múltiples hojas (ZIP Central Directory + DeflateRaw),
 *   archivos .csv/.tsv (UTF-8 y Windows-1252 conservando Ñ y tildes) y pegado directo desde Excel.
 * - Escanea las primeras filas para hallar la fila real de encabezados aunque haya títulos arriba.
 * - Convierte fechas seriales de Excel (p. ej. 46293 -> 2026-09-29) y formatos DD/MM/YYYY o YYYY-MM-DD.
 * - Autodetecta por cada hoja si corresponde a:
 *     1) "glosas"     -> cf_facturas + cf_glosas
 *     2) "pendientes" -> cf_pendientes_facturar (servicios clínicos con Paciente, Médico, CUPS, Sede)
 *     3) "anuladas"   -> cf_facturas (anuladas, reemplazadas o legalizadas)
 * - Respeta estrictamente la Regla de Cero Datos Inventados: cualquier celda vacía permanece vacía.
 */

import {
  clasificarAtencionYSede,
  claveFacturaNorm,
  extraerCodigoCausalExplicito,
  extraerFacturasFcoe,
  homologarEmpresaYOrigen,
  homologarPersonaFacturacion,
  limpiarNombrePersona,
  esNumeroNotaCreditoReal,
  limpiarTextoUtf8,
  resolverClaseYCausal,
  resolverNotaCreditoCondicional,
  resolverSeguimientoAutomatico,
  resolverValorAceptadoSegunRegla,
} from "@/lib/carteraCruces";

export type DestinoHojaCartera = "glosas" | "pendientes" | "anuladas" | "omitir";

export type FilaGlosaExcel = {
  filaExcel: number;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  empresaHomologada: string;
  nit: string;
  deDondeEs: string;
  sede: string;
  tipoAtencion: string;
  pacienteNombre: string;
  pacienteDoc: string;
  medicoNombre: string;
  cups: string;
  fechaPrestacionServicio: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaNotificacionGlosa: string;
  anio: string;
  valorFacturado: number;
  valorGlosado: number;
  valorAceptado: number | null;
  tipoGlosa: "GLOSA" | "DEVOLUCION";
  alcance: string;
  motivoCodigo: string;
  subcodigoCausal: string;
  motivoGlosa: string;
  observacionInterna: string;
  notaCredito: string;
  facturador: string;
  responsableRespuesta: string;
  seguimientoEstado: string;
  valorSeguimiento: number | null;
  estado: string;
  datosOriginales: Record<string, string>;
};

export type FilaPendienteExcel = {
  filaExcel: number;
  facturaAsociada: string;
  empresa: string;
  empresaOriginal: string;
  empresaHomologada: string;
  nit: string;
  deDondeEs: string;
  sede: string;
  tipoAtencion: string;
  contrato: string;
  unidadFuncional: string;
  cups: string;
  descripcion: string;
  fechaServicio: string;
  anio: string;
  pacienteTipoId: string;
  pacienteNumId: string;
  pacienteNombre: string;
  medico: string;
  autorizacion: string;
  cantidad: number;
  valorServicio: number;
  responsable: string;
  observaciones: string;
  estado: string;
  datosOriginales: Record<string, string>;
};

export type FilaAnuladaExcel = {
  filaExcel: number;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  empresaHomologada: string;
  nit: string;
  deDondeEs: string;
  sede: string;
  tipoAtencion: string;
  periodo: string;
  anio: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaAnulacion: string;
  valorRadicado: number;
  copagos: number;
  valorGlosaDevolucion: number;
  motivo: string;
  facturaReemplaza: string;
  rips: string;
  revisionFinanciera: string;
  responsable: string;
  estadoGestion: "ANULADA" | "REEMPLAZADA" | "LEGALIZADA";
  datosOriginales: Record<string, string>;
};

export type HojaExcelDetectada = {
  nombreHoja: string;
  encabezados: string[];
  filasCrudas: Record<string, string>[];
  filaEncabezado1Based: number;
  destinoDetectado: DestinoHojaCartera;
  destinoSeleccionado: DestinoHojaCartera;
  motivoDeteccion: string;
  glosas: FilaGlosaExcel[];
  pendientes: FilaPendienteExcel[];
  anuladas: FilaAnuladaExcel[];
};

const normHeader = (s: string): string =>
  limpiarTextoUtf8(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#%/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const decodeXmlEntities = (s: string): string =>
  s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function excelSerialAFechaISO(serial: number): string {
  if (!Number.isFinite(serial) || serial < 25000 || serial > 75000) return "";
  const utcDays = Math.floor(serial - 25569);
  const ms = utcDays * 86400 * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function normalizarFechaExcel(raw?: string | null): string {
  const s = limpiarTextoUtf8(raw);
  if (!s) return "";
  const up = s.toUpperCase();
  if (
    up === "N/A" ||
    up === "NA" ||
    up === "NO RADICADA" ||
    up === "NO APLICA" ||
    up.startsWith("#") ||
    up === "-"
  ) {
    return "";
  }
  if (/^\d{5}(?:\.\d+)?$/.test(s)) {
    return excelSerialAFechaISO(Number(s));
  }
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    if (y >= 1995 && y <= 2100) {
      return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    }
    return "";
  }
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (dmy) {
    const rawY = Number(dmy[3]);
    const y = dmy[3].length === 2 ? (rawY <= 49 ? 2000 + rawY : 1900 + rawY) : rawY;
    const p1 = Number(dmy[1]);
    const p2 = Number(dmy[2]);
    if (y >= 1995 && y <= 2100) {
      const mes = p1 > 12 ? p2 : p2 > 12 ? p1 : p2;
      const dia = p1 > 12 ? p1 : p2 > 12 ? p2 : p1;
      if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
        return `${y}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      }
    }
  }
  const mesesTxt: Record<string, string> = {
    ENE: "01", JAN: "01", FEB: "02", MAR: "03", ABR: "04", APR: "04",
    MAY: "05", JUN: "06", JUL: "07", AGO: "08", AUG: "08", SEP: "09",
    SET: "09", OCT: "10", NOV: "11", DIC: "12", DEC: "12",
  };
  const dMes = /^(\d{1,2})[-/\s.]([A-Za-z]{3,})[-/\s.](\d{2,4})/.exec(s);
  if (dMes) {
    const mm = mesesTxt[dMes[2].slice(0, 3).toUpperCase()];
    const rawY = Number(dMes[3]);
    const y = dMes[3].length === 2 ? (rawY <= 49 ? 2000 + rawY : 1900 + rawY) : rawY;
    const dd = Number(dMes[1]);
    if (mm && y >= 1995 && y <= 2100 && dd >= 1 && dd <= 31) {
      return `${y}-${mm}-${String(dd).padStart(2, "0")}`;
    }
  }
  return "";
}

export function normalizarNumeroMoneda(raw?: string | null): number {
  const s = limpiarTextoUtf8(raw);
  if (!s) return 0;
  const limpio = s.replace(/[$€£\s]/g, "");
  if (!limpio || limpio === "-" || /^N\/?A$/i.test(limpio)) return 0;
  // Si tiene coma decimal estilo es-CO (ej. 1.234.567,89) vs separador de miles (1,234,567.89)
  if (/^\-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) {
    const n = Number(limpio.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  if (/^\-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(limpio)) {
    const n = Number(limpio.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  const nDirecto = Number(limpio.replace(/,/g, "."));
  if (Number.isFinite(nDirecto)) return Math.round(nDirecto);
  const soloDig = Number(limpio.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(soloDig) ? Math.round(soloDig) : 0;
}

function colLetraAIndice(colLetters: string): number {
  let idx = 0;
  for (let i = 0; i < colLetters.length; i++) {
    idx = idx * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

async function descomprimirDeflateRaw(compBytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const copy = new Uint8Array(compBytes.byteLength);
  copy.set(compBytes);
  void writer.write(copy);
  void writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const ch of chunks) {
    out.set(ch, offset);
    offset += ch.byteLength;
  }
  return out;
}

async function extraerEntradasZipXlsx(buffer: ArrayBuffer): Promise<Record<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let eocd = -1;
  const minPos = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minPos; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error("El archivo no tiene estructura válida de libro Excel (.xlsx).");
  }

  const totalEntries = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder("utf-8");
  const textosXml: Record<string, string> = {};

  let ptr = cdOffset;
  for (let n = 0; n < totalEntries; n++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;
    const compMethod = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const fnLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commLen = view.getUint16(ptr + 32, true);
    const localOff = view.getUint32(ptr + 42, true);
    const entryName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fnLen));
    ptr += 46 + fnLen + extraLen + commLen;

    if (!entryName.endsWith(".xml") && !entryName.endsWith(".rels")) continue;
    if (localOff + 30 > bytes.length) continue;

    const lFnLen = view.getUint16(localOff + 26, true);
    const lExLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lFnLen + lExLen;
    const compSlice = bytes.subarray(dataStart, dataStart + compSize);

    let rawXmlBytes: Uint8Array;
    if (compMethod === 0) {
      rawXmlBytes = compSlice;
    } else if (compMethod === 8) {
      rawXmlBytes = await descomprimirDeflateRaw(compSlice);
    } else {
      continue;
    }
    textosXml[entryName] = decoder.decode(rawXmlBytes);
  }

  return textosXml;
}

function extraerSharedStrings(xml?: string): string[] {
  if (!xml) return [];
  const res: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml)) !== null) {
    const inner = m[1];
    const tRe = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    let texto = "";
    while ((tm = tRe.exec(inner)) !== null) {
      texto += decodeXmlEntities(tm[1]);
    }
    res.push(limpiarTextoUtf8(texto));
  }
  return res;
}

function extraerEstilosFechaXlsx(stylesXml?: string): Set<number> {
  const indicesFecha = new Set<number>();
  if (!stylesXml) return indicesFecha;

  const customDateFmtIds = new Set<number>();
  const numFmtRe = /<numFmt\b([^>]*)\/?>/g;
  let nm: RegExpExecArray | null;
  while ((nm = numFmtRe.exec(stylesXml)) !== null) {
    const attrs = nm[1];
    const idM = /\bnumFmtId="(\d+)"/.exec(attrs);
    const codeM = /\bformatCode="([^"]*)"/.exec(attrs);
    if (idM && codeM) {
      const id = Number(idM[1]);
      const codeClean = decodeXmlEntities(codeM[1]).replace(/\[[^\]]*\]/g, "").toLowerCase();
      if (/[ymd]/.test(codeClean) && !/[#0]/.test(codeClean)) {
        customDateFmtIds.add(id);
      }
    }
  }

  const cellXfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml);
  if (!cellXfsBlock) return indicesFecha;

  const xfRe = /<xf\b([^/>]*)(?:\/>|>[\s\S]*?<\/xf>)/g;
  let xm: RegExpExecArray | null;
  let styleIdx = 0;
  while ((xm = xfRe.exec(cellXfsBlock[1])) !== null) {
    const numFmtM = /\bnumFmtId="(\d+)"/.exec(xm[1]);
    if (numFmtM) {
      const fmtId = Number(numFmtM[1]);
      const esFechaNativa = (fmtId >= 14 && fmtId <= 22) || (fmtId >= 45 && fmtId <= 47);
      if (esFechaNativa || customDateFmtIds.has(fmtId)) {
        indicesFecha.add(styleIdx);
      }
    }
    styleIdx++;
  }
  return indicesFecha;
}

function parsearMatrizHojaXml(
  sheetXml: string,
  sharedStrings: string[],
  estilosFecha: Set<number>
): string[][] {
  const filas: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;

  while ((rm = rowRe.exec(sheetXml)) !== null) {
    const rowContent = rm[1];
    const cRe = /<c\b([^/>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    const filaActual: string[] = [];
    let nextCol = 0;

    while ((cm = cRe.exec(rowContent)) !== null) {
      const attrs = cm[1];
      const inner = cm[2] || "";
      const refM = /\br="([A-Z]+)\d+"/.exec(attrs);
      const colIdx = refM ? colLetraAIndice(refM[1]) : nextCol;
      nextCol = colIdx + 1;

      const typeM = /\bt="([^"]+)"/.exec(attrs);
      const styleM = /\bs="(\d+)"/.exec(attrs);
      const cellType = typeM ? typeM[1] : "";
      const styleIdx = styleM ? Number(styleM[1]) : -1;

      let valor = "";
      if (cellType === "inlineStr") {
        const tRe = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g;
        let tm: RegExpExecArray | null;
        while ((tm = tRe.exec(inner)) !== null) {
          valor += decodeXmlEntities(tm[1]);
        }
      } else {
        const vM = /<v>([\s\S]*?)<\/v>/.exec(inner);
        const rawV = vM ? decodeXmlEntities(vM[1]).trim() : "";
        if (cellType === "s") {
          const sIdx = Number(rawV);
          valor = sharedStrings[sIdx] ?? "";
        } else if (cellType === "b") {
          valor = rawV === "1" ? "SI" : "NO";
        } else if (cellType === "e") {
          valor = "";
        } else if (rawV !== "") {
          if (cellType !== "str" && estilosFecha.has(styleIdx) && /^\d+(?:\.\d+)?$/.test(rawV)) {
            valor = excelSerialAFechaISO(Number(rawV)) || rawV;
          } else {
            valor = rawV;
          }
        }
      }

      while (filaActual.length <= colIdx) filaActual.push("");
      filaActual[colIdx] = limpiarTextoUtf8(valor);
    }

    if (filaActual.some((v) => v !== "")) {
      filas.push(filaActual);
    } else {
      filas.push([]);
    }
  }
  return filas;
}

function puntajeFilaEncabezado(celdas: string[]): number {
  const noVacias = celdas.filter((c) => c.trim() !== "");
  if (noVacias.length < 3) return 0;
  const claves = [
    "factura", "empresa", "nombre_empresa", "valor", "vlr", "glosa", "glosado",
    "motivo", "causal", "nota credito", "responsable", "facturador", "fecha",
    "radicacion", "anulacion", "reemplaz", "rips", "cups", "medico", "nombre_medico",
    "paciente", "primer_nom", "num_id", "contrato", "uf", "nombre_uf", "unidad",
    "descripcion", "observacion", "estado", "sede", "puntoatencion",
    "prestacion", "seguimiento", "levantamiento", "ratificacion", "nit",
  ];
  let puntos = 0;
  for (const c of noVacias) {
    const n = normHeader(c);
    if (!n || /^\d+$/.test(n)) continue;
    if (claves.some((k) => n.includes(k))) puntos += 3;
    else if (n.length <= 35) puntos += 1;
  }
  return puntos;
}

function detectarDestinoPorEncabezados(
  nombreHoja: string,
  encabezados: string[]
): { destino: DestinoHojaCartera; motivo: string } {
  const hNorm = encabezados.map(normHeader);
  const hojaNorm = normHeader(nombreHoja);
  const tiene = (pred: (h: string) => boolean) => hNorm.some(pred);

  if (hojaNorm.includes("autorizacion")) {
    return { destino: "omitir", motivo: "Hoja de autorizaciones sin cruce de facturación/glosas" };
  }

  // 1. Glosas
  const tieneValorGlosado = tiene((h) => h.includes("glosado") || h === "valor glosa");
  const tieneMotivoGlosa = tiene((h) => h.includes("motivo de glosa") || h.includes("motivo glosa"));
  const tieneCausal = tiene((h) => h.includes("causal") || h.includes("causa normativa"));
  const tieneFacturador = tiene((h) => h.includes("facturador"));
  if (
    tieneValorGlosado ||
    tieneMotivoGlosa ||
    tieneCausal ||
    (hojaNorm.includes("glosa") && tiene((h) => h.includes("factura"))) ||
    (tieneFacturador && tiene((h) => h.includes("nota credito") || h === "nc"))
  ) {
    return { destino: "glosas", motivo: "Columnas de Glosas, Causal, Facturador o Nota Crédito detectadas" };
  }

  // 2. Anuladas / Reemplazadas / Legalizadas
  const tieneAnulacion = tiene((h) => h.includes("anulacion") || h.includes("motivo de anulacion"));
  const tieneReemplaza = tiene((h) => h.includes("reemplaz") || h.includes("reeemplaz"));
  if (
    tieneAnulacion ||
    tieneReemplaza ||
    ((hojaNorm.includes("anulad") || hojaNorm.includes("anulacion") || hojaNorm.includes("legaliz")) &&
      tiene((h) => h.includes("factura")))
  ) {
    return {
      destino: "anuladas",
      motivo: hojaNorm.includes("legaliz")
        ? "Hoja de Facturas Legalizadas detectada"
        : "Columnas de Anulación / Factura Reemplazo detectadas",
    };
  }

  // 3. Servicios clínicos / Pendientes por facturar
  const tieneCups = tiene((h) => h === "cups" || h.includes("codigo cups"));
  const tieneMedico = tiene((h) => h.includes("medico") || h.includes("especialista") || h.includes("cirujano"));
  const tieneUf = tiene((h) => h === "uf" || h === "nombre uf" || h.includes("unidad funcional") || h.includes("nombre_uf"));
  const tienePaciente = tiene(
    (h) => h.includes("paciente") || h.includes("primer nom") || h.includes("primer_nom") || h === "num id" || h === "num_id"
  );
  if (tieneCups || (tieneMedico && (tieneUf || tienePaciente || hojaNorm.includes("pendiente")))) {
    return {
      destino: "pendientes",
      motivo: "Columnas clínicas (Paciente / Médico / CUPS / Unidad Funcional) detectadas",
    };
  }

  // Fallback si trae Factura + Empresa + Valor
  if (tiene((h) => h.includes("factura")) && tiene((h) => h.includes("empresa"))) {
    return { destino: "glosas", motivo: "Columnas de Factura y Empresa detectadas" };
  }

  return { destino: "omitir", motivo: "No coincide con columnas de Glosas, Pendientes ni Anuladas" };
}

function obtenerCampo(
  fila: Record<string, string>,
  encabezados: string[],
  predicados: ((hNorm: string) => boolean)[]
): string {
  for (const pred of predicados) {
    for (const col of encabezados) {
      if (pred(normHeader(col)) && fila[col] !== undefined && fila[col] !== "") {
        return fila[col];
      }
    }
  }
  return "";
}

export function extraerCamposGlosaDesdeObjeto(rawObj: Record<string, unknown>): {
  factura: string;
  empRaw: string;
  nitRaw: string;
  contratoRaw: string;
  pacRaw: string;
  docRaw: string;
  medRaw: string;
  cupsRaw: string;
  fechaPrestacionServicio: string;
  fechaFactura: string;
  fechaRadicacion: string;
  fechaNotificacionGlosa: string;
  anio: string;
  valorFacturado: number;
  valorGlosado: number;
  valorAceptado: number | null;
  tipoGlosa: "GLOSA" | "DEVOLUCION";
  alcance: string;
  motivoCodigo: string;
  motivoGlosa: string;
  observacionInterna: string;
  notaCredito: string;
  facturador: string;
  responsableRespuesta: string;
  personaUnificada: string;
  seguimientoEstado: string;
  valorSeguimiento: number | null;
  estado: string;
} {
  const encabezados = Object.keys(rawObj || {});
  const raw: Record<string, string> = {};
  for (const k of encabezados) {
    raw[k] = rawObj[k] === null || rawObj[k] === undefined ? "" : limpiarTextoUtf8(String(rawObj[k]));
  }

  const facRaw = obtenerCampo(raw, encabezados, [
    (h) =>
      (h.includes("factura") || h.includes("no factura") || h.includes("nro factura") || h.includes("num factura")) &&
      !h.includes("fecha") &&
      !h.includes("valor") &&
      !h.includes("vlr") &&
      !h.includes("facturador") &&
      !h.includes("reemplaz"),
  ]);
  const factura = claveFacturaNorm(facRaw);

  const empRaw = obtenerCampo(raw, encabezados, [
    (h) =>
      h === "empresa" ||
      h === "erp" ||
      h.includes("empresa homologada") ||
      h.includes("empresa unificada") ||
      h.includes("erp unificada") ||
      h.includes("entidad") ||
      h.includes("pagador") ||
      h.includes("aseguradora") ||
      h === "eps",
    (h) => h.includes("empresa") || h.includes("erp"),
  ]);
  const nitRaw = obtenerCampo(raw, encabezados, [(h) => h === "nit" || h.startsWith("nit ") || h.endsWith(" nit")]);
  const contratoRaw = obtenerCampo(raw, encabezados, [
    (h) => h.includes("convenio") || h.includes("de donde es") || h.includes("contrato") || h.includes("regimen"),
  ]);
  const pacRaw = obtenerCampo(raw, encabezados, [(h) => h.includes("paciente") && !h.includes("documento")]);
  const docRaw = obtenerCampo(raw, encabezados, [
    (h) => h.includes("documento") || h === "num id" || h === "identificacion",
  ]);
  const medRaw = obtenerCampo(raw, encabezados, [(h) => h.includes("medico") || h.includes("especialista")]);
  const cupsRaw = obtenerCampo(raw, encabezados, [(h) => h === "cups" || h.includes("codigo cups")]);

  const fPrest = normalizarFechaExcel(
    obtenerCampo(raw, encabezados, [
      (h) =>
        h.includes("prestacion") ||
        h.includes("f prest") ||
        h.includes("fec prest") ||
        (h.includes("fecha") &&
          (h.includes("serv") ||
            h.includes("aten") ||
            h.includes("ingr") ||
            h.includes("proc") ||
            h.includes("cita") ||
            h.includes("qx") ||
            h.includes("cirug"))),
    ])
  );
  const fFact = normalizarFechaExcel(
    obtenerCampo(raw, encabezados, [
      (h) =>
        h.includes("fecha factura") ||
        h.includes("fecha de factura") ||
        h.includes("f factura") ||
        h.includes("fec fac") ||
        h.includes("elaboracion") ||
        h.includes("emision") ||
        h.includes("expedicion"),
    ])
  );
  const fRad = normalizarFechaExcel(
    obtenerCampo(raw, encabezados, [
      (h) => h.includes("radicacion") || h.includes("f rad") || h.includes("fec rad"),
    ])
  );
  const fNot = normalizarFechaExcel(
    obtenerCampo(raw, encabezados, [
      (h) =>
        h.includes("notificacion") ||
        h.includes("fecha glosa") ||
        h.includes("fecha de glosa") ||
        h.includes("f glosa") ||
        h.includes("fec glosa") ||
        h.includes("fecha objecion") ||
        h.includes("fecha devolucion"),
    ])
  );
  const anioRaw = obtenerCampo(raw, encabezados, [(h) => h === "ano" || h === "anio"]);
  const anio =
    /^\d{4}$/.test(anioRaw) && Number(anioRaw) >= 2000
      ? anioRaw
      : (fFact || fRad || fNot || fPrest).slice(0, 4);

  const vFact = normalizarNumeroMoneda(
    obtenerCampo(raw, encabezados, [
      (h) =>
        h.includes("valor radicado") ||
        h.includes("valor facturado") ||
        h.includes("valor factura") ||
        h.includes("valor de la factura") ||
        h.includes("vlr factura") ||
        h.includes("vlr facturado") ||
        h.includes("total factura") ||
        h === "facturado",
    ])
  );
  const vGlosa = normalizarNumeroMoneda(
    obtenerCampo(raw, encabezados, [
      (h) =>
        h.includes("glosado") ||
        h === "valor glosa" ||
        h.includes("vlr glosa") ||
        h.includes("valor devolucion") ||
        h.includes("valor objetado"),
    ])
  );
  const vAcepTxt = obtenerCampo(raw, encabezados, [
    (h) =>
      h.includes("valor aceptado") ||
      h.includes("vlr aceptado") ||
      h === "aceptado" ||
      h.includes("valor nota credito"),
  ]);
  const vAcep = vAcepTxt === "" ? null : normalizarNumeroMoneda(vAcepTxt);

  const claseRaw = obtenerCampo(raw, encabezados, [
    (h) =>
      h === "motivo 1" ||
      h === "clase" ||
      h.includes("tipo glosa") ||
      h.includes("tipo de glosa") ||
      h === "tipo" ||
      h.includes("glosa o devolucion") ||
      h.includes("glosa devolucion"),
  ]).toUpperCase();

  let codDetectado = "";
  for (const col of encabezados) {
    const h = normHeader(col);
    if (
      h.includes("causal") ||
      h.includes("causa") ||
      h.includes("codigo") ||
      h === "cod" ||
      h === "motivo 1"
    ) {
      const val = (raw[col] || "").trim().toUpperCase();
      const m = /^(TA|AU|SO|DE|CO|FA)(\d{2,4})?(?:\s*[-·:/]\s*.*)?$/.exec(val);
      if (m) {
        codDetectado = m[1];
        break;
      }
    }
  }
  if (!codDetectado) {
    for (const col of encabezados) {
      const h = normHeader(col);
      if (h.includes("factura") || h.includes("empresa") || h.includes("entidad") || h.includes("nit")) {
        continue;
      }
      const val = (raw[col] || "").trim().toUpperCase();
      const m = /^(TA|AU|SO|DE|CO|FA)(\d{2,4})?$/.exec(val);
      if (m) {
        codDetectado = m[1];
        break;
      }
    }
  }

  const esSoloCodigoOClase = (txtVal: string): boolean => {
    const u = txtVal.trim().toUpperCase();
    if (!u) return true;
    if (/^(TA|AU|SO|DE|CO|FA)(\d{2,4})?$/.test(u)) return true;
    if (/^(GLOSA|DEVOLUCION|DEVOLUCIÓN|GLOSA PARCIAL|GLOSA TOTAL|PARCIAL|TOTAL|N\/?A|-|SI|NO)$/.test(u)) {
      return true;
    }
    return false;
  };

  let motivoGlosa = "";
  for (const col of encabezados) {
    const h = normHeader(col);
    const val = (raw[col] || "").trim();
    if (!val || esSoloCodigoOClase(val)) continue;
    if (
      (h.includes("motivo") && !h.includes("codigo") && h !== "motivo 1") ||
      h.includes("descripcion") ||
      h.includes("detalle") ||
      h.includes("concepto") ||
      h.includes("justificacion") ||
      (h.includes("causal") && !h.includes("codigo"))
    ) {
      motivoGlosa = val;
      break;
    }
  }
  if (!motivoGlosa) {
    for (const col of encabezados) {
      const h = normHeader(col);
      const val = (raw[col] || "").trim();
      if (!val || val.length < 5 || esSoloCodigoOClase(val)) continue;
      if (h.startsWith("columna ") || h === "") {
        if (
          !/^FCOE\d+/i.test(val) &&
          !/^NC\s*[-#:]?\s*\d+/i.test(val) &&
          !normalizarFechaExcel(val) &&
          !/^[\d$.,\s-]+$/.test(val)
        ) {
          motivoGlosa = val;
          break;
        }
      }
    }
  }

  const obs = obtenerCampo(raw, encabezados, [
    (h) =>
      h.includes("observacion") ||
      (h.includes("respuesta") && !h.includes("responsable")) ||
      h.includes("comentario"),
  ]);

  let ncRaw = obtenerCampo(raw, encabezados, [
    (h) =>
      (h.includes("nota") && h.includes("cred")) ||
      h === "nc" ||
      h.startsWith("nc ") ||
      h.endsWith(" nc") ||
      h.includes("consecutivo nc") ||
      h.includes("nro nc") ||
      h.includes("numero nc") ||
      h.includes("n credito"),
  ]).trim();
  if (!ncRaw) {
    for (const col of encabezados) {
      const val = (raw[col] || "").trim();
      if (/^NC\s*[-#:]?\s*\d{2,}$/i.test(val)) {
        ncRaw = val.replace(/\s+/g, "").toUpperCase();
        break;
      }
    }
  }

  const facturador = homologarPersonaFacturacion(
    obtenerCampo(raw, encabezados, [
      (h) =>
        (h.includes("facturador") && !h.includes("responsable")) ||
        h.includes("quien facturo") ||
        h.includes("quien realiza la factura") ||
        h.includes("elaboro"),
      (h) => h.includes("facturador"),
    ])
  );
  const responsable = homologarPersonaFacturacion(
    obtenerCampo(raw, encabezados, [
      (h) =>
        (h.includes("responsable") && !h.includes("facturador")) ||
        h.includes("quien responde") ||
        h.includes("auditor") ||
        h.includes("asignado"),
      (h) => h.includes("responsable"),
    ])
  );
  const personaUnificada = facturador || responsable;

  const codExplicitoTxt = extraerCodigoCausalExplicito(motivoGlosa);
  const claseCausal = resolverClaseYCausal(
    claseRaw.includes("DEVOL") ? "DEVOLUCION" : "GLOSA",
    codDetectado || codExplicitoTxt
  );
  const tipoGlosa = claseCausal.tipoGlosa;
  const causalPrincipal = claseCausal.motivoCodigo;
  const alcance = "";

  const segTexto = obtenerCampo(raw, encabezados, [
    (h) =>
      h.includes("seguimiento") ||
      h.includes("levantamiento") ||
      h.includes("ratificacion") ||
      h.includes("rectificacion") ||
      h.includes("proceso de pago") ||
      h.includes("estado pago"),
  ]);
  const estRaw = obtenerCampo(raw, encabezados, [
    (h) => h.includes("estado") || h.includes("desenlace"),
  ]).toUpperCase();

  const vSegTxt = obtenerCampo(raw, encabezados, [
    (h) =>
      h.includes("valor seguimiento") ||
      h.includes("valor pagado") ||
      h.includes("valor levantado") ||
      h.includes("valor ratificado") ||
      h.includes("valor rectificado"),
  ]);
  const valorSeguimiento = vSegTxt === "" ? null : normalizarNumeroMoneda(vSegTxt);

  const tieneNcReal = esNumeroNotaCreditoReal(ncRaw);
  const ncPrelim = resolverNotaCreditoCondicional(ncRaw, vAcep, "");
  let estado: "PENDIENTE" | "ACEPTADA" | "NO_ACEPTADA" = "PENDIENTE";
  if (
    estRaw.includes("NO ACEPT") ||
    estRaw.includes("NO_ACEPT") ||
    estRaw.includes("NO ACEPTO") ||
    estRaw === "NO" ||
    estRaw.includes("DEFEND") ||
    estRaw.includes("LEVANTAMIENTO COMPLETO") ||
    (vAcep !== null &&
      vAcep === 0 &&
      !tieneNcReal &&
      (estRaw.includes("LEVANT") || estRaw.includes("CERRAD") || estRaw.includes("LEGALIZ") || ncPrelim === "N/A"))
  ) {
    estado = "NO_ACEPTADA";
  } else if (
    estRaw.includes("ACEPT") ||
    estRaw === "SI" ||
    estRaw === "SÍ" ||
    estRaw.includes("CONCILI") ||
    estRaw.includes("RATIFIC") ||
    estRaw.includes("RECTIFIC") ||
    tieneNcReal ||
    (vAcep !== null && vAcep > 0)
  ) {
    estado = "ACEPTADA";
  }

  const valorAceptadoFinal = resolverValorAceptadoSegunRegla({
    estado,
    tipoGlosa,
    valorFacturado: vFact,
    valorGlosado: vGlosa,
    valorAceptadoPrevio: vAcep,
  });
  const seguimientoEstado = resolverSeguimientoAutomatico(segTexto || estRaw, estado);
  const notaCredito = resolverNotaCreditoCondicional(ncRaw, valorAceptadoFinal, estado);

  return {
    factura,
    empRaw,
    nitRaw,
    contratoRaw,
    pacRaw,
    docRaw,
    medRaw,
    cupsRaw,
    fechaPrestacionServicio: fPrest,
    fechaFactura: fFact,
    fechaRadicacion: fRad,
    fechaNotificacionGlosa: fNot,
    anio,
    valorFacturado: vFact,
    valorGlosado: vGlosa,
    valorAceptado: valorAceptadoFinal,
    tipoGlosa,
    alcance,
    motivoCodigo: causalPrincipal,
    motivoGlosa,
    observacionInterna: obs,
    notaCredito,
    facturador,
    responsableRespuesta: responsable,
    personaUnificada,
    seguimientoEstado,
    valorSeguimiento,
    estado,
  };
}

export function mapearFilasSegunDestino(
  nombreHoja: string,
  encabezados: string[],
  filasCrudas: Record<string, string>[],
  filaBase1Based: number,
  destino: DestinoHojaCartera
): Pick<HojaExcelDetectada, "glosas" | "pendientes" | "anuladas"> {
  const glosas: FilaGlosaExcel[] = [];
  const pendientes: FilaPendienteExcel[] = [];
  const anuladas: FilaAnuladaExcel[] = [];

  if (destino === "omitir") return { glosas, pendientes, anuladas };

  const hojaEsLegalizada = normHeader(nombreHoja).includes("legaliz");

  filasCrudas.forEach((raw, idx) => {
    const filaExcel = filaBase1Based + idx + 1;

    if (destino === "glosas") {
      const ext = extraerCamposGlosaDesdeObjeto(raw);
      if (!ext.factura) return;

      const empInfo = homologarEmpresaYOrigen({
        empresa: ext.empRaw,
        contrato: ext.contratoRaw,
        nit: ext.nitRaw,
      });

      glosas.push({
        filaExcel,
        factura: ext.factura,
        empresa: empInfo.empresaCorta !== "SIN ENTIDAD" ? empInfo.empresaCorta : ext.empRaw.toUpperCase(),
        empresaOriginal: ext.empRaw,
        empresaHomologada: empInfo.empresaHomologada,
        nit: empInfo.nit,
        deDondeEs: ext.contratoRaw || empInfo.deDondeEs,
        sede: "",
        tipoAtencion: "",
        pacienteNombre: limpiarNombrePersona(ext.pacRaw),
        pacienteDoc: ext.docRaw,
        medicoNombre: limpiarNombrePersona(ext.medRaw),
        cups: ext.cupsRaw,
        fechaPrestacionServicio: ext.fechaPrestacionServicio,
        fechaFactura: ext.fechaFactura,
        fechaRadicacion: ext.fechaRadicacion,
        fechaNotificacionGlosa: ext.fechaNotificacionGlosa,
        anio: ext.anio,
        valorFacturado: ext.valorFacturado,
        valorGlosado: ext.valorGlosado,
        valorAceptado: ext.valorAceptado,
        tipoGlosa: ext.tipoGlosa,
        alcance: ext.alcance,
        motivoCodigo: ext.motivoCodigo,
        subcodigoCausal: "",
        motivoGlosa: ext.motivoGlosa,
        observacionInterna: ext.observacionInterna,
        notaCredito: ext.notaCredito,
        facturador: ext.facturador,
        responsableRespuesta: ext.responsableRespuesta,
        seguimientoEstado: ext.seguimientoEstado,
        valorSeguimiento: ext.valorSeguimiento,
        estado: ext.estado,
        datosOriginales: raw,
      });
      return;
    }

    if (destino === "pendientes") {
      const empRaw = obtenerCampo(raw, encabezados, [
        (h) => h.includes("nombre empresa") || h.includes("nombre_empresa") || h === "empresa" || h.includes("empresa homologada"),
      ]);
      const contrato = obtenerCampo(raw, encabezados, [(h) => h.includes("contrato") || h.includes("convenio") || h === "manual"]);
      const uf = obtenerCampo(raw, encabezados, [
        (h) => h.includes("unidad funcional") || h.includes("nombre uf") || h.includes("nombre_uf") || h === "uf",
      ]);
      const cups = obtenerCampo(raw, encabezados, [(h) => h === "cups" || h.includes("codigo cups")]);
      const descripcion = obtenerCampo(raw, encabezados, [(h) => h.includes("descripcion") || h.includes("servicio") && !h.includes("fecha") && !h.includes("valor") && !h.includes("vlr")]);
      const fechaServicio = normalizarFechaExcel(
        obtenerCampo(raw, encabezados, [
          (h) => h.includes("fecha servicio") || h.includes("fecha_servicio") || h.includes("fecha ing") || h.includes("fecha_ing") || h === "fecha",
        ])
      );
      const medico = limpiarNombrePersona(
        obtenerCampo(raw, encabezados, [(h) => h.includes("nombre medico") || h.includes("nombre_medico") || h.includes("medico") || h.includes("especialista")])
      );

      const pacDirecto = limpiarNombrePersona(
        obtenerCampo(raw, encabezados, [(h) => h.includes("paciente") && !h.includes("documento") && !h.includes("id")])
      );
      const pNom1 = limpiarNombrePersona(obtenerCampo(raw, encabezados, [(h) => h.includes("primer nom") || h.includes("primer_nom")]));
      const pNom2 = limpiarNombrePersona(obtenerCampo(raw, encabezados, [(h) => h.includes("segundo nom") || h.includes("segundo_nom")]));
      const pApe1 = limpiarNombrePersona(obtenerCampo(raw, encabezados, [(h) => h.includes("primer ape") || h.includes("primer_ape")]));
      const pApe2 = limpiarNombrePersona(obtenerCampo(raw, encabezados, [(h) => h.includes("segundo ape") || h.includes("segundo_ape")]));
      const pacienteNombre = pacDirecto || [pNom1, pNom2, pApe1, pApe2].filter(Boolean).join(" ");

      const pacienteTipoId = obtenerCampo(raw, encabezados, [(h) => h.includes("tipo id") || h.includes("tipo_id") || h === "tipoid"]).toUpperCase();
      const docRaw = obtenerCampo(raw, encabezados, [(h) => h.includes("num id") || h.includes("num_id") || h.includes("documento")]);
      const pacienteNumId = docRaw.replace(/\s+/g, "");

      const valorServicio = normalizarNumeroMoneda(
        obtenerCampo(raw, encabezados, [
          (h) => h.includes("vlr servicio") || h.includes("vlr_servicio") || h.includes("valor servicio") || h.includes("valor honorario") || h === "valor",
        ])
      );

      if (!empRaw && !cups && !pacienteNombre && !medico && valorServicio === 0) return;

      const obs = obtenerCampo(raw, encabezados, [(h) => h.includes("observacion")]);
      const facCol = obtenerCampo(raw, encabezados, [(h) => h.includes("factura")]);
      const facsObs = extraerFacturasFcoe(`${facCol} ${obs}`);
      const facturaAsociada = facsObs[0] || "";

      const responsable = homologarPersonaFacturacion(
        obtenerCampo(raw, encabezados, [
          (h) => h === "responsable" || h.includes("responsable facturacion"),
        ])
      );
      const autorizacion = obtenerCampo(raw, encabezados, [(h) => h.includes("autorizacion")]);
      const cantNum = normalizarNumeroMoneda(obtenerCampo(raw, encabezados, [(h) => h.includes("cantidad")]));
      const puntoAt = obtenerCampo(raw, encabezados, [(h) => h.includes("puntoatencion") || h.includes("punto atencion") || h === "sede"]);

      const estCol = obtenerCampo(raw, encabezados, [(h) => h === "estado"]).toUpperCase();
      const estado =
        estCol === "FACTURADO" || facturaAsociada || obs.toUpperCase().includes("FACTURADO")
          ? "FACTURADO"
          : estCol === "ANULADO" || estCol === "NO_FACTURABLE"
          ? estCol
          : "PENDIENTE";

      const empInfo = homologarEmpresaYOrigen({
        empresa: empRaw,
        contrato,
      });
      const atInfo = clasificarAtencionYSede({
        esMutual: puntoAt === "2" ? true : puntoAt === "1" ? false : empInfo.esMutual,
        cups,
        unidadFuncional: uf,
        descripcion,
        contrato,
      });

      pendientes.push({
        filaExcel,
        facturaAsociada,
        empresa: empInfo.empresaCorta !== "SIN ENTIDAD" ? empInfo.empresaCorta : empRaw.toUpperCase(),
        empresaOriginal: empRaw,
        empresaHomologada: empInfo.empresaHomologada,
        nit: empInfo.nit,
        deDondeEs: empInfo.deDondeEs,
        sede: atInfo.sede,
        tipoAtencion: atInfo.tipoAtencion,
        contrato,
        unidadFuncional: uf,
        cups,
        descripcion,
        fechaServicio,
        anio: fechaServicio ? fechaServicio.slice(0, 4) : "",
        pacienteTipoId,
        pacienteNumId,
        pacienteNombre,
        medico,
        autorizacion,
        cantidad: cantNum > 0 ? cantNum : 1,
        valorServicio,
        responsable,
        observaciones: obs || (facturaAsociada && !obs ? `FACTURADO ${facturaAsociada}` : ""),
        estado,
        datosOriginales: raw,
      });
      return;
    }

    if (destino === "anuladas") {
      const facRaw = obtenerCampo(raw, encabezados, [
        (h) => (h.includes("no factura") || h === "factura") && !h.includes("reemplaz") && !h.includes("reeemplaz"),
      ]);
      const factura = claveFacturaNorm(facRaw);
      if (!factura) return;

      const empRaw = obtenerCampo(raw, encabezados, [
        (h) => h === "empresa" || h.includes("empresa homologada") || h.includes("entidad"),
      ]);
      const periodo = obtenerCampo(raw, encabezados, [(h) => h.includes("periodo")]);
      const fFact = normalizarFechaExcel(
        obtenerCampo(raw, encabezados, [(h) => h.includes("fecha factura") || h.includes("elaboracion")]) || periodo
      );
      const fRad = normalizarFechaExcel(obtenerCampo(raw, encabezados, [(h) => h.includes("radicacion") && !h.includes("reemplaz")]));
      const fAnul = normalizarFechaExcel(obtenerCampo(raw, encabezados, [(h) => h.includes("fecha") && h.includes("anulacion"), (h) => h === "anulacion"]));
      const anioCol = obtenerCampo(raw, encabezados, [(h) => h.includes("ano") || h.includes("anio")]);
      const anio =
        /^\d{4}$/.test(anioCol) && Number(anioCol) >= 2000 && Number(anioCol) <= 2100
          ? anioCol
          : (fFact || fAnul || fRad).slice(0, 4);

      const valorRadicado = normalizarNumeroMoneda(
        obtenerCampo(raw, encabezados, [(h) => h.includes("valor radicado") || h.includes("valor facturado") || h === "valor"])
      );
      const copagos = normalizarNumeroMoneda(obtenerCampo(raw, encabezados, [(h) => h.includes("copago")]));
      const valorGlosaDevolucion = normalizarNumeroMoneda(
        obtenerCampo(raw, encabezados, [(h) => h.includes("valor glosa") || h.includes("glosa / devolucion")])
      );
      const motivo = obtenerCampo(raw, encabezados, [(h) => h.includes("motivo")]);
      const reempRaw = obtenerCampo(raw, encabezados, [(h) => h.includes("reemplaz") || h.includes("reeemplaz")]);
      const facsReemp = extraerFacturasFcoe(reempRaw);
      const facturaReemplaza = facsReemp[0] || (reempRaw.toUpperCase() !== "N/A" && reempRaw.toUpperCase() !== "NO APLICA" ? reempRaw : "");
      const rips = obtenerCampo(raw, encabezados, [(h) => h === "rips"]);
      const revisionFinanciera = obtenerCampo(raw, encabezados, [(h) => h.includes("revision financiera")]);
      const responsable = homologarPersonaFacturacion(
        obtenerCampo(raw, encabezados, [(h) => h.includes("responsable")])
      );
      const estCol = obtenerCampo(raw, encabezados, [(h) => h.includes("estado")]).toUpperCase();

      const estadoGestion: "ANULADA" | "REEMPLAZADA" | "LEGALIZADA" =
        hojaEsLegalizada || estCol.includes("LEGALIZ")
          ? "LEGALIZADA"
          : facturaReemplaza.toUpperCase().includes("FCOE") || estCol.includes("REEMPLAZ")
          ? "REEMPLAZADA"
          : "ANULADA";

      const empInfo = homologarEmpresaYOrigen({ empresa: empRaw });
      const atInfo = clasificarAtencionYSede({
        esMutual: empInfo.esMutual,
        motivoTexto: motivo,
      });

      anuladas.push({
        filaExcel,
        factura,
        empresa: empInfo.empresaCorta !== "SIN ENTIDAD" ? empInfo.empresaCorta : empRaw.toUpperCase(),
        empresaOriginal: empRaw,
        empresaHomologada: empInfo.empresaHomologada,
        nit: empInfo.nit,
        deDondeEs: empInfo.deDondeEs,
        sede: atInfo.sede,
        tipoAtencion: atInfo.tipoAtencion,
        periodo,
        anio,
        fechaFactura: fFact,
        fechaRadicacion: fRad,
        fechaAnulacion: fAnul,
        valorRadicado,
        copagos,
        valorGlosaDevolucion,
        motivo,
        facturaReemplaza,
        rips,
        revisionFinanciera,
        responsable,
        estadoGestion,
        datosOriginales: raw,
      });
    }
  });

  return { glosas, pendientes, anuladas };
}

function construirHojaDesdeMatriz(nombreHoja: string, matriz: string[][]): HojaExcelDetectada | null {
  if (matriz.length === 0) return null;

  let mejorFilaIdx = 0;
  let mejorPuntaje = -1;
  const maxScan = Math.min(matriz.length, 15);
  for (let r = 0; r < maxScan; r++) {
    const p = puntajeFilaEncabezado(matriz[r]);
    if (p > mejorPuntaje) {
      mejorPuntaje = p;
      mejorFilaIdx = r;
    }
  }

  const filaCab = matriz[mejorFilaIdx] || [];
  const encabezados: string[] = [];
  const usados = new Map<string, number>();
  for (let c = 0; c < filaCab.length; c++) {
    const base = limpiarTextoUtf8(filaCab[c]) || `Columna_${c + 1}`;
    const prev = usados.get(base) || 0;
    usados.set(base, prev + 1);
    encabezados.push(prev === 0 ? base : `${base}_${prev + 1}`);
  }

  const filasCrudas: Record<string, string>[] = [];
  for (let r = mejorFilaIdx + 1; r < matriz.length; r++) {
    const celdas = matriz[r];
    if (!celdas || celdas.every((v) => !v || v.trim() === "")) continue;
    const obj: Record<string, string> = {};
    let tieneAlgo = false;
    for (let c = 0; c < encabezados.length; c++) {
      const val = limpiarTextoUtf8(celdas[c] || "");
      if (val !== "") tieneAlgo = true;
      obj[encabezados[c]] = val;
    }
    if (tieneAlgo) filasCrudas.push(obj);
  }

  if (filasCrudas.length === 0) return null;

  const { destino, motivo } = detectarDestinoPorEncabezados(nombreHoja, encabezados);
  const mapeo = mapearFilasSegunDestino(nombreHoja, encabezados, filasCrudas, mejorFilaIdx + 1, destino);

  return {
    nombreHoja,
    encabezados,
    filasCrudas,
    filaEncabezado1Based: mejorFilaIdx + 1,
    destinoDetectado: destino,
    destinoSeleccionado: destino,
    motivoDeteccion: motivo,
    ...mapeo,
  };
}

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
      continue;
    }
    if (!enComillas && ch === sep) {
      res.push(actual.trim());
      actual = "";
      continue;
    }
    actual += ch;
  }
  res.push(actual.trim());
  return res;
}

export function leerTextoCsvOPegado(texto: string, nombreHoja = "Datos pegados / CSV"): HojaExcelDetectada[] {
  const limpio = texto.replace(/^\uFEFF/, "").trim();
  if (!limpio) return [];
  const lineas = limpio.split(/\r?\n/);
  if (lineas.length < 2) return [];

  const muestra = lineas.slice(0, 5).join("\n");
  const sep = muestra.includes("\t") ? "\t" : (muestra.match(/;/g)?.length || 0) >= (muestra.match(/,/g)?.length || 0) ? ";" : ",";
  const matriz = lineas.map((l) => dividirLineaCsv(l, sep));
  const hoja = construirHojaDesdeMatriz(nombreHoja, matriz);
  return hoja ? [hoja] : [];
}

export async function leerArchivoExcelOCsv(file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<HojaExcelDetectada[]> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const esZipXlsx =
    file.name.toLowerCase().endsWith(".xlsx") ||
    (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04);

  if (!esZipXlsx) {
    let texto = "";
    try {
      texto = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      texto = new TextDecoder("windows-1252").decode(buffer);
    }
    return leerTextoCsvOPegado(texto, file.name);
  }

  const entradas = await extraerEntradasZipXlsx(buffer);
  const sharedStrings = extraerSharedStrings(entradas["xl/sharedStrings.xml"]);
  const estilosFecha = extraerEstilosFechaXlsx(entradas["xl/styles.xml"]);

  const relsXml = entradas["xl/_rels/workbook.xml.rels"] || "";
  const targetPorRid = new Map<string, string>();
  const relRe = /<Relationship\b([^>]*)\/?>/g;
  let rm: RegExpExecArray | null;
  while ((rm = relRe.exec(relsXml)) !== null) {
    const idM = /\bId="([^"]+)"/.exec(rm[1]);
    const tgM = /\bTarget="([^"]+)"/.exec(rm[1]);
    if (idM && tgM) {
      let target = tgM[1].replace(/^\/+/, "");
      if (!target.startsWith("xl/")) target = `xl/${target}`;
      targetPorRid.set(idM[1], target);
    }
  }

  const wbXml = entradas["xl/workbook.xml"] || "";
  const hojasOrden: { nombre: string; xmlPath: string }[] = [];
  const sheetRe = /<sheet\b([^>]*)\/?>/g;
  let sm: RegExpExecArray | null;
  let idxFallback = 1;
  while ((sm = sheetRe.exec(wbXml)) !== null) {
    const attrs = sm[1];
    if (/\bstate="veryHidden"/.test(attrs)) continue;
    const nameM = /\bname="([^"]+)"/.exec(attrs);
    const ridM = /\br:id="([^"]+)"/.exec(attrs);
    const nombre = nameM ? decodeXmlEntities(nameM[1]) : `Hoja${idxFallback}`;
    const xmlPath = (ridM && targetPorRid.get(ridM[1])) || `xl/worksheets/sheet${idxFallback}.xml`;
    hojasOrden.push({ nombre, xmlPath });
    idxFallback++;
  }

  const resultado: HojaExcelDetectada[] = [];
  for (const h of hojasOrden) {
    const sheetXml = entradas[h.xmlPath];
    if (!sheetXml) continue;
    const matriz = parsearMatrizHojaXml(sheetXml, sharedStrings, estilosFecha);
    const detectada = construirHojaDesdeMatriz(h.nombre, matriz);
    if (detectada) resultado.push(detectada);
  }

  return resultado;
}
