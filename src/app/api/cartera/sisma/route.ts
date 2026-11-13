import { NextRequest, NextResponse } from "next/server";
import {
  homologarEmpresaYOrigen,
  clasificarAtencionYSede,
  limpiarTextoUtf8,
} from "@/lib/carteraCruces";

export const dynamic = "force-dynamic";

const RAW_BASE_URL = (
  process.env.SISMA_API_BASE_URL ||
  "https://api.centrooftalmologicoebenezer.com"
).replace(/\/+$/, "");

const SISMA_BASE_URL = RAW_BASE_URL.endsWith("/node")
  ? RAW_BASE_URL
  : `${RAW_BASE_URL}/node`;

const SISMA_API_KEY =
  process.env.SISMA_CONTABILIDAD_API_KEY ||
  "ynrViZLIPJ6hrwhtTMbBvh7ecEmhkasc7UceX8O4s/A=";

type CarteraEdadesItem = {
  numeroIdentificacion: string;
  razonSocial: string;
  cuenta: string;
  descripcion: string;
  numeroFactura: string;
  fechaFactura: string | null;
  fechaRadicacion: string | null;
  fechaVencimiento: string | null;
  dias: number;
  tipoFactura: string;
  saldo: number;
  porVencer: number;
  d30: number;
  d60: number;
  d90: number;
  d120: number;
  d180: number;
  d360: number;
  mas360: number;
};

type CarteraEdadesResponse = {
  desde: string;
  corte: string;
  filas: number;
  totales: {
    saldo: number;
    porVencer: number;
    d30: number;
    d60: number;
    d90: number;
    d120: number;
    d180: number;
    d360: number;
    mas360: number;
  };
  cartera: CarteraEdadesItem[];
};

type AuxiliarDocumento = {
  documento: string;
  fecha: string;
  descripcion: string;
  cuenta: string;
  nombreCuenta: string;
  valor: number;
};

type AuxiliarItem = {
  idAuxiliar: number;
  codigo: string;
  descripcion: string;
  total: number;
  documentos: AuxiliarDocumento[];
};

type AuxiliarTercero = {
  idTercero: number;
  nit: string;
  razonSocial: string;
  total: number;
  auxiliares: AuxiliarItem[];
};

type AuxiliarAbiertoResponse = {
  desde: string;
  hasta: string;
  documentos: number;
  total: number;
  terceros: AuxiliarTercero[];
};

/** Último día cerrado en hora Colombia (día anterior), para congelar el corte sin fluctuación intradía. */
function ayerColombia(): string {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function esEntidadMutual(razonSocialRaw: string, nitRaw?: string): boolean {
  const r = String(razonSocialRaw || "").toUpperCase();
  const nitLimpio = String(nitRaw || "").replace(/\D/g, "");
  return r.includes("MUTUAL") || nitLimpio.startsWith("806008394");
}

function normalizarEmpresaSisma(razonSocialRaw: string, nitRaw?: string): string {
  const r = String(razonSocialRaw || "").toUpperCase().trim();
  if (esEntidadMutual(r, nitRaw)) return "MUTUAL SER";
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
}

function normalizarResponsableSisma(empresaCorta: string, razonSocialRaw: string): string {
  const emp = `${empresaCorta} ${razonSocialRaw}`.toUpperCase();
  if (emp.includes("SURA")) return "MARIA ALEJANDRA";
  if (emp.includes("MUTUAL")) return "ERIKA ALZATE";
  if (emp.includes("COLSANITAS") || emp.includes("SANITAS")) return "MARIA PAOLA";
  if (emp.includes("MEDPLUS") || emp.includes("ALLIANZ")) return "MARIA JOSE";
  return "YULEIBIS";
}

async function fetchSismaJson<T>(path: string, timeoutMs?: number): Promise<T> {
  const ctrl = timeoutMs ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${SISMA_BASE_URL}${path}`, {
      headers: {
        "X-Api-Key": SISMA_API_KEY,
        Accept: "application/json",
        "User-Agent": "ebenezer-plataforma-cartera",
      },
      signal: ctrl?.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SISMA API error ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ayerISO = ayerColombia();
    const corteParam = searchParams.get("corte") || ayerISO;
    const corte = /^\d{4}-\d{2}-\d{2}$/.test(corteParam)
      ? corteParam
      : ayerISO;
    const anio = corte.slice(0, 4);
    const desde = `${anio}-01-01`;

    // Parámetros opcionales de filtrado en vivo (Barra de Frecuencias)
    const aniosParam = (searchParams.get("anios") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const mesesParam = (searchParams.get("meses") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.padStart(2, "0"));
    const empresasParam = (
      searchParams.get("empresas") ||
      searchParams.get("entidad") ||
      ""
    )
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const sedeParam = (searchParams.get("sede") || "").trim().toUpperCase();
    const tipoAtencionParam = (searchParams.get("tipoAtencion") || "").trim().toUpperCase();
    const responsablesParam = (searchParams.get("responsables") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const mutualParam = searchParams.get("mutual");
    const pideMutualEnEmpresas = empresasParam.some((e) => e.includes("MUTUAL"));
    const incluirMutual =
      pideMutualEnEmpresas || (mutualParam !== "0" && mutualParam !== "false");

    const diasDesde = (searchParams.get("desde") || "").trim();
    const diasHasta = (searchParams.get("hasta") || "").trim();
    const diasSemParam = (searchParams.get("diasSem") || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((s) => Number(s))
      .filter((n) => !isNaN(n));

    const hayFiltroActivo =
      !incluirMutual ||
      Boolean(sedeParam && sedeParam !== "TODAS") ||
      Boolean(tipoAtencionParam && tipoAtencionParam !== "TODAS" && tipoAtencionParam !== "TODOS") ||
      (aniosParam.length > 0 && aniosParam.length < 6) ||
      mesesParam.length > 0 ||
      empresasParam.length > 0 ||
      responsablesParam.length > 0 ||
      Boolean(diasDesde) ||
      Boolean(diasHasta) ||
      diasSemParam.length > 0;

    /* ---------------------------------------------------------------
       GIROS POR CRUZAR: SI NO LLEGAN, SE DICE.
       Escrito el 08-11-2026.
       --------------------------------------------------------------- */
    const fallosGiros: string[] = [];
    let falloIngresos: string | null = null;

    // Consultamos en paralelo cartera-edades, giros por cruzar e ingresos contables (clase 41-43, con timeout aislado)
    const [edadesData, aux1301, aux2501, auxIngresos] = await Promise.all([
      fetchSismaJson<CarteraEdadesResponse>(
        `/api/contabilidad/cartera-edades?corte=${corte}&formato=json`
      ),
      fetchSismaJson<AuxiliarAbiertoResponse>(
        `/api/contabilidad/auxiliar-abierto?desde=${desde}&hasta=${corte}&cuentaDesde=1301250602&cuentaHasta=1301250602&formato=json`
      ).catch((e) => {
        fallosGiros.push(`cuenta 1301250602: ${e instanceof Error ? e.message : "no respondio"}`);
        return null;
      }),
      fetchSismaJson<AuxiliarAbiertoResponse>(
        `/api/contabilidad/auxiliar-abierto?desde=${desde}&hasta=${corte}&cuentaDesde=2501010602&cuentaHasta=2501010607&formato=json`
      ).catch((e) => {
        fallosGiros.push(`cuentas 2501010602-607: ${e instanceof Error ? e.message : "no respondio"}`);
        return null;
      }),
      fetchSismaJson<AuxiliarAbiertoResponse>(
        `/api/contabilidad/auxiliar-abierto?desde=${desde}&hasta=${corte}&cuentaDesde=4100000000&cuentaHasta=4399999999&formato=json`,
        8500
      ).catch((e) => {
        falloIngresos = e instanceof Error ? e.message : "no disponible";
        return null;
      }),
    ]);

    const cumpleFiltroEntidad = (razonSocial: string, nit?: string): boolean => {
      const empCorta = normalizarEmpresaSisma(razonSocial, nit);
      const resp = normalizarResponsableSisma(empCorta, razonSocial);
      const esMut = esEntidadMutual(razonSocial, nit);
      if (!incluirMutual && esMut) {
        return false;
      }
      if (empresasParam.length > 0) {
        const rsUp = String(razonSocial || "").toUpperCase();
        const coincide = empresasParam.some((e) => {
          if (e.includes("MUTUAL")) return esMut;
          return empCorta === e || rsUp.includes(e);
        });
        if (!coincide) return false;
      }
      if (responsablesParam.length > 0 && !responsablesParam.includes(resp)) {
        return false;
      }
      return true;
    };

    const normalizarFechaISO = (raw: string | null | undefined): string => {
      const s = String(raw || "").trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split("/");
        return `${y}-${m}-${d}`;
      }
      return s;
    };

    const cumpleFiltroFecha = (fechaStr: string | null | undefined): boolean => {
      const f = normalizarFechaISO(fechaStr);
      if (aniosParam.length > 0 && aniosParam.length < 6) {
        if (!/^\d{4}/.test(f) || !aniosParam.includes(f.slice(0, 4))) {
          return false;
        }
      }
      if (mesesParam.length > 0) {
        if (!/^\d{4}-\d{2}/.test(f)) return false;
        if (!mesesParam.includes(f.slice(5, 7))) return false;
      }
      if (diasDesde || diasHasta || diasSemParam.length > 0) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
        if (diasDesde && f < diasDesde) return false;
        if (diasHasta && f > diasHasta) return false;
        if (diasSemParam.length > 0) {
          const dt = new Date(`${f}T12:00:00`);
          if (!diasSemParam.includes(dt.getDay())) return false;
        }
      }
      return true;
    };

    // Desglose por cuenta contable (Pendiente por radicar vs Radicada) y por EPS
    let facturasPendientesRadicar = 0;
    let carteraRadicada = 0;
    let filasFiltradas = 0;

    const edadesAcum = {
      saldo: 0,
      porVencer: 0,
      d30: 0,
      d60: 0,
      d90: 0,
      d120: 0,
      d180: 0,
      d360: 0,
      mas360: 0,
    };

    // Desglose exacto Con Mutual / Sin Mutual / Solo Mutual sobre el período filtrado
    const acumUniv = {
      conMutual: { corriente: 0, vencida: 0, total: 0, pendRad: 0, facturas: 0, giros1301: 0, giros2502: 0, giros2507: 0 },
      sinMutual: { corriente: 0, vencida: 0, total: 0, pendRad: 0, facturas: 0, giros1301: 0, giros2502: 0, giros2507: 0 },
      soloMutual: { corriente: 0, vencida: 0, total: 0, pendRad: 0, facturas: 0, giros1301: 0, giros2502: 0, giros2507: 0 },
    };

    type ResumenEmpresaSisma = {
      nit: string;
      razonSocial: string;
      razonSocialOriginal: string;
      empresaCorta: string;
      nombreHomologado: string;
      deDondeEs: string;
      sede: string;
      sedeGrupo: string;
      responsable: string;
      esMutual: boolean;
      facturasCount: number;
      corriente: number;
      vencida: number;
      pendienteRadicar: number;
      total: number;
    };

    type FacturaAbiertaSisma = {
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

    const mapaEmpresas = new Map<string, ResumenEmpresaSisma>();
    const mapaCatalogoPeriodo = new Map<string, ResumenEmpresaSisma>();
    const listaFacturasAbiertas: FacturaAbiertaSisma[] = [];

    const resumenSedes = {
      SEDE_1: { etiqueta: "Sede 1 · Principal", facturas: 0, corriente: 0, vencida: 0, total: 0 },
      SEDE_2: { etiqueta: "Sede 2 · Consultorios (Mutual)", facturas: 0, corriente: 0, vencida: 0, total: 0 },
    };
    const resumenAtencion = {
      CONSULTA: { etiqueta: "Consulta", facturas: 0, total: 0 },
      CIRUGIA: { etiqueta: "Cirugía", facturas: 0, total: 0 },
      AYUDA_DX: { etiqueta: "Ayuda Dx / Proc.", facturas: 0, total: 0 },
      SIN_DETALLE: { etiqueta: "Sin CUPS en factura", facturas: 0, total: 0 },
    };

    // Facturación abierta en cartera agrupada por mes real de emisión
    const saldoAbiertoEmitidoPorMes = new Array<number>(12).fill(0);
    const corrienteEmitidoPorMes = new Array<number>(12).fill(0);
    const vencidaEmitidoPorMes = new Array<number>(12).fill(0);
    const facturasAbiertasPorMes = new Array<number>(12).fill(0);

    for (const item of edadesData.cartera || []) {
      const razonSocial = limpiarTextoUtf8(item.razonSocial || item.numeroIdentificacion || "SIN ENTIDAD");
      const nit = String(item.numeroIdentificacion || "").trim();
      const fechaItem = item.fechaFactura || item.fechaRadicacion || item.fechaVencimiento;
      if (!cumpleFiltroFecha(fechaItem)) continue;

      const saldoItem = Number(item.saldo || 0);
      const pv = Number(item.porVencer || 0);
      const d30 = Number(item.d30 || 0);
      const d60 = Number(item.d60 || 0);
      const d90 = Number(item.d90 || 0);
      const d120 = Number(item.d120 || 0);
      const d180 = Number(item.d180 || 0);
      const d360 = Number(item.d360 || 0);
      const mas360 = Number(item.mas360 || 0);

      const esPendienteRad =
        item.cuenta === "1301250601" ||
        String(item.descripcion || "").toUpperCase().includes("PEND");
      const corrItem = pv + d30 + d60;
      const vencItem = d90 + d120 + d180 + d360 + mas360;
      const empInfo = homologarEmpresaYOrigen({
        empresa: razonSocial,
        nit,
        descripcionCuenta: item.descripcion,
        tipoFactura: item.tipoFactura,
      });
      const atencionInfo = clasificarAtencionYSede({
        esMutual: empInfo.esMutual,
        cuentaContable: item.cuenta,
        descripcionCuenta: item.descripcion,
        tipoFactura: item.tipoFactura,
      });
      const empCorta = normalizarEmpresaSisma(razonSocial, nit);
      const resp = normalizarResponsableSisma(empCorta, razonSocial);
      const esMut = empInfo.esMutual || esEntidadMutual(razonSocial, nit);
      const claveEntidad = empInfo.empresaCorta || empCorta || razonSocial;

      // Acumulado exacto universo Con Mutual / Sin Mutual / Solo Mutual
      acumUniv.conMutual.corriente += corrItem;
      acumUniv.conMutual.vencida += vencItem;
      acumUniv.conMutual.total += saldoItem;
      if (esPendienteRad) acumUniv.conMutual.pendRad += saldoItem;
      acumUniv.conMutual.facturas += 1;

      const bucketMut = esMut ? acumUniv.soloMutual : acumUniv.sinMutual;
      bucketMut.corriente += corrItem;
      bucketMut.vencida += vencItem;
      bucketMut.total += saldoItem;
      if (esPendienteRad) bucketMut.pendRad += saldoItem;
      bucketMut.facturas += 1;

      const catActual = mapaCatalogoPeriodo.get(claveEntidad) || {
        nit: empInfo.nit || nit,
        razonSocial: empInfo.empresaHomologada || razonSocial,
        razonSocialOriginal: razonSocial,
        empresaCorta: empCorta,
        nombreHomologado: empInfo.empresaHomologada,
        deDondeEs: empInfo.deDondeEs,
        sede: esMut ? "Sede 2 · Consultorios" : "Sede 1 · Principal",
        sedeGrupo: atencionInfo.sedeGrupo,
        responsable: resp,
        esMutual: esMut,
        facturasCount: 0,
        corriente: 0,
        vencida: 0,
        pendienteRadicar: 0,
        total: 0,
      };
      catActual.facturasCount += 1;
      catActual.corriente += corrItem;
      catActual.vencida += vencItem;
      if (esPendienteRad) catActual.pendienteRadicar += saldoItem;
      catActual.total += saldoItem;
      mapaCatalogoPeriodo.set(claveEntidad, catActual);

      if (!cumpleFiltroEntidad(razonSocial, nit)) continue;
      if (sedeParam && sedeParam !== "TODAS" && atencionInfo.sedeGrupo !== sedeParam) continue;
      if (
        tipoAtencionParam &&
        tipoAtencionParam !== "TODAS" &&
        tipoAtencionParam !== "TODOS" &&
        atencionInfo.tipoGrupo !== tipoAtencionParam
      ) {
        continue;
      }

      filasFiltradas += 1;
      edadesAcum.saldo += saldoItem;
      edadesAcum.porVencer += pv;
      edadesAcum.d30 += d30;
      edadesAcum.d60 += d60;
      edadesAcum.d90 += d90;
      edadesAcum.d120 += d120;
      edadesAcum.d180 += d180;
      edadesAcum.d360 += d360;
      edadesAcum.mas360 += mas360;

      const bSede = resumenSedes[atencionInfo.sedeGrupo];
      bSede.facturas += 1;
      bSede.corriente += corrItem;
      bSede.vencida += vencItem;
      bSede.total += saldoItem;

      const bAt = resumenAtencion[atencionInfo.tipoGrupo];
      bAt.facturas += 1;
      bAt.total += saldoItem;

      const fIsoMes = normalizarFechaISO(fechaItem);
      if (/^\d{4}-\d{2}/.test(fIsoMes) && fIsoMes.slice(0, 4) === anio) {
        const mIdx = Number(fIsoMes.slice(5, 7)) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          saldoAbiertoEmitidoPorMes[mIdx] += saldoItem;
          corrienteEmitidoPorMes[mIdx] += corrItem;
          vencidaEmitidoPorMes[mIdx] += vencItem;
          facturasAbiertasPorMes[mIdx] += 1;
        }
      }

      if (esPendienteRad) {
        facturasPendientesRadicar += saldoItem;
      } else {
        carteraRadicada += saldoItem;
      }

      const actual = mapaEmpresas.get(claveEntidad) || {
        nit: empInfo.nit || nit,
        razonSocial: empInfo.empresaHomologada || razonSocial,
        razonSocialOriginal: razonSocial,
        empresaCorta: empCorta,
        nombreHomologado: empInfo.empresaHomologada,
        deDondeEs: empInfo.deDondeEs,
        sede: esMut ? "Sede 2 · Consultorios" : "Sede 1 · Principal",
        sedeGrupo: atencionInfo.sedeGrupo,
        responsable: resp,
        esMutual: esMut,
        facturasCount: 0,
        corriente: 0,
        vencida: 0,
        pendienteRadicar: 0,
        total: 0,
      };
      actual.facturasCount += 1;
      actual.corriente += corrItem;
      actual.vencida += vencItem;
      if (esPendienteRad) actual.pendienteRadicar += saldoItem;
      actual.total += saldoItem;
      mapaEmpresas.set(claveEntidad, actual);

      const esPersonaParticular =
        empInfo.esParticular &&
        !razonSocial.toUpperCase().includes("PARTICULAR") &&
        razonSocial !== "SIN ENTIDAD";

      listaFacturasAbiertas.push({
        factura: limpiarTextoUtf8(item.numeroFactura || ""),
        fechaFactura: normalizarFechaISO(item.fechaFactura),
        fechaRadicacion: normalizarFechaISO(item.fechaRadicacion),
        fechaVencimiento: normalizarFechaISO(item.fechaVencimiento),
        dias: Number(item.dias || 0),
        nit: empInfo.nit || nit,
        empresaCorta: empCorta,
        empresaHomologada: empInfo.empresaHomologada,
        razonSocialOriginal: razonSocial,
        esMutual: esMut,
        deDondeEs: empInfo.deDondeEs,
        sede: atencionInfo.sede,
        sedeGrupo: atencionInfo.sedeGrupo,
        tipoAtencion: atencionInfo.tipoAtencion,
        tipoGrupo: atencionInfo.tipoGrupo,
        cuenta: String(item.cuenta || ""),
        descripcionCuenta: limpiarTextoUtf8(item.descripcion || ""),
        tipoFactura: limpiarTextoUtf8(item.tipoFactura || ""),
        pacienteNombre: esPersonaParticular ? razonSocial : "",
        pacienteDoc: esPersonaParticular ? nit : "",
        responsable: resp,
        esPendienteRadicar: esPendienteRad,
        corriente: Math.round(corrItem),
        vencida: Math.round(vencItem),
        saldo: Math.round(saldoItem),
      });
    }

    const t = hayFiltroActivo
      ? edadesAcum
      : edadesData.totales || edadesAcum;

    const carteraCorriente = Math.round(
      (t.porVencer || 0) + (t.d30 || 0) + (t.d60 || 0)
    );
    const carteraVencida = Math.round(
      (t.d90 || 0) +
        (t.d120 || 0) +
        (t.d180 || 0) +
        (t.d360 || 0) +
        (t.mas360 || 0)
    );
    const carteraTotal = Math.round(
      t.saldo || carteraCorriente + carteraVencida
    );

    // Cálculo de Giros por Cruzar en las 3 cuentas oficiales (1301250602, 2501010602, 2501010607)
    const cuentasGirosMap: Record<
      string,
      { codigo: string; nombre: string; saldo: number; documentos: number }
    > = {
      "1301250602": {
        codigo: "1301250602",
        nombre: "GIROS POR APLICAR A CARTERA NO IDENTIFIC",
        saldo: 0,
        documentos: 0,
      },
      "2501010602": {
        codigo: "2501010602",
        nombre: "GIROS PARA ABONO DE CARTERA PENDIENTE",
        saldo: 0,
        documentos: 0,
      },
      "2501010607": {
        codigo: "2501010607",
        nombre: "GIROS DE CARTERA PENDIENTE POR APLICAR",
        saldo: 0,
        documentos: 0,
      },
    };

    const procesarAuxiliar = (aux: AuxiliarAbiertoResponse | null) => {
      if (!aux || !Array.isArray(aux.terceros)) return;
      for (const terc of aux.terceros) {
        const esMut = esEntidadMutual(terc.razonSocial || "", terc.nit || "");
        const pasaEntidad = cumpleFiltroEntidad(terc.razonSocial || "", terc.nit || "");
        for (const a of terc.auxiliares || []) {
          for (const doc of a.documentos || []) {
            if (!cumpleFiltroFecha(doc.fecha)) continue;
            const v = Number(doc.valor || 0);
            if (doc.cuenta === "1301250602") {
              acumUniv.conMutual.giros1301 += v;
              if (esMut) acumUniv.soloMutual.giros1301 += v;
              else acumUniv.sinMutual.giros1301 += v;
            } else if (doc.cuenta === "2501010602") {
              acumUniv.conMutual.giros2502 += v;
              if (esMut) acumUniv.soloMutual.giros2502 += v;
              else acumUniv.sinMutual.giros2502 += v;
            } else if (doc.cuenta === "2501010607") {
              acumUniv.conMutual.giros2507 += v;
              if (esMut) acumUniv.soloMutual.giros2507 += v;
              else acumUniv.sinMutual.giros2507 += v;
            }
            if (pasaEntidad && cuentasGirosMap[doc.cuenta]) {
              cuentasGirosMap[doc.cuenta].saldo += v;
              cuentasGirosMap[doc.cuenta].documentos += 1;
            }
          }
        }
      }
    };

    procesarAuxiliar(aux1301);
    procesarAuxiliar(aux2501);

    const cuentasGirosDetalle = Object.values(cuentasGirosMap).map((c) => ({
      ...c,
      saldoAbsoluto: Math.round(Math.abs(c.saldo)),
    }));

    const sumaGirosCuentas = cuentasGirosDetalle.reduce(
      (acc, c) => acc + c.saldoAbsoluto,
      0
    );

    const anticiposPorCruzar = sumaGirosCuentas;
    const totalCarteraReal = Math.round(carteraTotal - anticiposPorCruzar);

    const cerrarBucketUniv = (b: typeof acumUniv.conMutual) => {
      const giros = Math.round(
        Math.abs(b.giros1301) + Math.abs(b.giros2502) + Math.abs(b.giros2507)
      );
      const tot = Math.round(b.total);
      return {
        carteraCorriente: Math.round(b.corriente),
        carteraVencida: Math.round(b.vencida),
        carteraTotal: tot,
        facturasPendientesRadicar: Math.round(b.pendRad),
        anticiposPorCruzar: giros,
        totalCarteraReal: Math.round(tot - giros),
        facturasCount: b.facturas,
      };
    };

    const desgloseUniverso = {
      conMutual: cerrarBucketUniv(acumUniv.conMutual),
      sinMutual: cerrarBucketUniv(acumUniv.sinMutual),
      soloMutual: cerrarBucketUniv(acumUniv.soloMutual),
    };

    // Procesamiento real de Ingresos / Venta Facturada Contable (clases 41-43 si SISMA auxiliar-abierto los entrega)
    const ventaContableMesRaw = new Array<number>(12).fill(0);
    const cuentasIngresosMap = new Map<string, { codigo: string; nombre: string; saldo: number }>();
    let docsIngresosContables = 0;

    if (auxIngresos && Array.isArray(auxIngresos.terceros)) {
      for (const terc of auxIngresos.terceros) {
        if (!cumpleFiltroEntidad(terc.razonSocial || "", terc.nit || "")) continue;
        for (const a of terc.auxiliares || []) {
          for (const doc of a.documentos || []) {
            if (!cumpleFiltroFecha(doc.fecha)) continue;
            const cta = String(doc.cuenta || "").trim();
            if (!cta.startsWith("41") && !cta.startsWith("42") && !cta.startsWith("43")) continue;
            const v = Number(doc.valor || 0);
            if (!v) continue;
            docsIngresosContables += 1;
            const prevCta = cuentasIngresosMap.get(cta) || {
              codigo: cta,
              nombre: String(doc.nombreCuenta || a.descripcion || "INGRESOS SERVICIOS DE SALUD"),
              saldo: 0,
            };
            prevCta.saldo += v;
            cuentasIngresosMap.set(cta, prevCta);

            const fIso = normalizarFechaISO(doc.fecha);
            if (/^\d{4}-\d{2}/.test(fIso) && fIso.slice(0, 4) === anio) {
              const mIdx = Number(fIso.slice(5, 7)) - 1;
              if (mIdx >= 0 && mIdx < 12) {
                ventaContableMesRaw[mIdx] += v;
              }
            }
          }
        }
      }
    }

    const girosIncompletos = fallosGiros.length > 0;
    if (girosIncompletos) {
      console.error("CARTERA: no llegaron los giros por cruzar ->", fallosGiros.join(" | "));
    }

    const incluyeAnioActual =
      aniosParam.length === 0 ||
      aniosParam.length >= 6 ||
      aniosParam.includes(anio);
    const mesMaxCorte = incluyeAnioActual
      ? Math.max(1, Math.min(12, Number(corte.slice(5, 7)) || 10))
      : 12;

    const nombresMesesCortos = [
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
    const acumuladoPorMesFacturas = new Array<number>(12).fill(0);
    const vencidaPorMesFacturas = new Array<number>(12).fill(0);

    for (const item of edadesData.cartera || []) {
      const razonSocial =
        item.razonSocial || item.numeroIdentificacion || "SIN ENTIDAD";
      if (!cumpleFiltroEntidad(razonSocial, item.numeroIdentificacion || "")) continue;
      const fechaItem =
        item.fechaFactura || item.fechaRadicacion || item.fechaVencimiento;
      if (!cumpleFiltroFecha(fechaItem)) continue;

      const fIso = normalizarFechaISO(fechaItem);
      const mmItem = Number(fIso.slice(5, 7));
      const saldoItem = Number(item.saldo || 0);
      const vencItem =
        Number(item.d90 || 0) +
        Number(item.d120 || 0) +
        Number(item.d180 || 0) +
        Number(item.d360 || 0) +
        Number(item.mas360 || 0);

      const idxInicio = Math.max(0, Math.min(11, (mmItem || 1) - 1));
      for (let m = idxInicio; m < mesMaxCorte; m++) {
        acumuladoPorMesFacturas[m] += saldoItem;
        vencidaPorMesFacturas[m] += vencItem;
      }
    }

    const serieMensualCompleta = Array.from({ length: mesMaxCorte }, (_, idx) => {
      const mmStr = String(idx + 1).padStart(2, "0");
      const totMes = Math.round(acumuladoPorMesFacturas[idx]);
      const propGiros =
        carteraTotal > 0 ? Math.min(1, totMes / carteraTotal) : 0;
      const girosMes = Math.round(anticiposPorCruzar * propGiros);
      return {
        mes: mmStr,
        etiqueta: nombresMesesCortos[idx],
        carteraTotal: totMes,
        totalCarteraReal: Math.round(totMes - girosMes),
        carteraVencida: Math.round(vencidaPorMesFacturas[idx]),
      };
    });

    const serieMensual =
      mesesParam.length > 0
        ? serieMensualCompleta.filter((s) => mesesParam.includes(s.mes))
        : serieMensualCompleta;

    const ventaContableDisponible = docsIngresosContables > 0;
    const cuentasIngresos = Array.from(cuentasIngresosMap.values())
      .map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        total: Math.round(Math.abs(c.saldo)),
      }))
      .sort((a, b) => b.total - a.total);

    const sumaVentaContableBruta = Array.from(cuentasIngresosMap.values()).reduce(
      (acc, c) => acc + c.saldo,
      0
    );
    const ventaContableTotal = ventaContableDisponible
      ? Math.round(Math.abs(sumaVentaContableBruta))
      : null;

    const facturacionPorMesCompleta = Array.from({ length: mesMaxCorte }, (_, idx) => {
      const mmStr = String(idx + 1).padStart(2, "0");
      return {
        mes: mmStr,
        etiqueta: nombresMesesCortos[idx],
        ventaContable: ventaContableDisponible
          ? Math.round(Math.abs(ventaContableMesRaw[idx]))
          : null,
        saldoAbiertoEmitidoMes: Math.round(saldoAbiertoEmitidoPorMes[idx]),
        corrienteEmitidoMes: Math.round(corrienteEmitidoPorMes[idx]),
        vencidaEmitidoMes: Math.round(vencidaEmitidoPorMes[idx]),
        facturasAbiertasMes: facturasAbiertasPorMes[idx],
      };
    });

    const facturacionSisma = {
      ventaContableDisponible,
      ventaContableTotal,
      ventaContableNota: ventaContableDisponible
        ? null
        : falloIngresos
        ? `Auxiliar abierto solo entrega cuentas de balance (${falloIngresos})`
        : "El endpoint contable auxiliar-abierto expone cuentas de balance (1301/2501); no registra movimientos abiertos en cuentas de resultado (41-43).",
      cuentasIngresos,
      porMes:
        mesesParam.length > 0
          ? facturacionPorMesCompleta.filter((m) => mesesParam.includes(m.mes))
          : facturacionPorMesCompleta,
    };

    const topEmpresas = Array.from(mapaEmpresas.values())
      .map((e) => ({
        ...e,
        corriente: Math.round(e.corriente),
        vencida: Math.round(e.vencida),
        pendienteRadicar: Math.round(e.pendienteRadicar),
        total: Math.round(e.total),
      }))
      .sort((a, b) => b.total - a.total);

    const catalogoEmpresasPeriodo = Array.from(mapaCatalogoPeriodo.values())
      .map((e) => ({
        ...e,
        corriente: Math.round(e.corriente),
        vencida: Math.round(e.vencida),
        pendienteRadicar: Math.round(e.pendienteRadicar),
        total: Math.round(e.total),
      }))
      .sort((a, b) => b.total - a.total);

    const [yyyy, mm, dd] = corte.split("-");
    const fechaCorteLabel = `${dd}/${mm}/${yyyy}`;

    return NextResponse.json({
      ok: true,
      fuente: "API SISMA Contabilidad en Vivo",
      corteISO: corte,
      ayerISO,
      corteCongeladoAyer: corte === ayerISO,
      fechaCorte: fechaCorteLabel,
      filasFacturas: hayFiltroActivo ? filasFiltradas : edadesData.filas || filasFiltradas,
      resumenCorte: {
        fechaCorte: fechaCorteLabel,
        modalidad: "Todas las Empresas",
        carteraCorriente,
        carteraVencida,
        carteraTotal,
        facturasPendientesRadicar: Math.round(facturasPendientesRadicar),
        carteraRadicada: Math.round(carteraRadicada),
        glosasPendientesGestionar: 0,
        anticiposPorCruzar,
        totalCarteraReal,
        girosIncompletos,
        girosMotivo: girosIncompletos ? fallosGiros.join(" | ") : null,
      },
      desgloseUniverso,
      facturacionSisma,
      girosIncompletos,
      girosMotivo: girosIncompletos ? fallosGiros.join(" | ") : null,
      edades: {
        porVencer: Math.round(t.porVencer || 0),
        d30: Math.round(t.d30 || 0),
        d60: Math.round(t.d60 || 0),
        d90: Math.round(t.d90 || 0),
        d120: Math.round(t.d120 || 0),
        d180: Math.round(t.d180 || 0),
        d360: Math.round(t.d360 || 0),
        mas360: Math.round(t.mas360 || 0),
        saldoTotal: carteraTotal,
      },
      cuentasGirosDetalle,
      topEmpresas,
      catalogoEmpresasPeriodo,
      resumenSedes: {
        SEDE_1: {
          ...resumenSedes.SEDE_1,
          corriente: Math.round(resumenSedes.SEDE_1.corriente),
          vencida: Math.round(resumenSedes.SEDE_1.vencida),
          total: Math.round(resumenSedes.SEDE_1.total),
        },
        SEDE_2: {
          ...resumenSedes.SEDE_2,
          corriente: Math.round(resumenSedes.SEDE_2.corriente),
          vencida: Math.round(resumenSedes.SEDE_2.vencida),
          total: Math.round(resumenSedes.SEDE_2.total),
        },
      },
      resumenAtencion: {
        CONSULTA: { ...resumenAtencion.CONSULTA, total: Math.round(resumenAtencion.CONSULTA.total) },
        CIRUGIA: { ...resumenAtencion.CIRUGIA, total: Math.round(resumenAtencion.CIRUGIA.total) },
        AYUDA_DX: { ...resumenAtencion.AYUDA_DX, total: Math.round(resumenAtencion.AYUDA_DX.total) },
        SIN_DETALLE: { ...resumenAtencion.SIN_DETALLE, total: Math.round(resumenAtencion.SIN_DETALLE.total) },
      },
      totalFacturasAbiertas: listaFacturasAbiertas.length,
      facturasAbiertas: listaFacturasAbiertas
        .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo))
        .slice(0, 900),
      serieMensual,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
