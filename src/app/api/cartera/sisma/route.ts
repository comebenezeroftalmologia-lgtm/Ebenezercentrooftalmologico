import { NextRequest, NextResponse } from "next/server";

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

function hoyColombia(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function normalizarEmpresaSisma(razonSocialRaw: string): string {
  const r = String(razonSocialRaw || "").toUpperCase().trim();
  if (r.includes("MUTUAL SER")) return "MUTUAL SER";
  if (r.includes("ECOPETROL")) return "ECOPETROL";
  if (r.includes("SEGUROS DE VIDA SURAMERICANA") || r.includes("SURA POLIZA")) return "SURA POLIZA";
  if (r.includes("SURAMERICANA") || r.includes("EPS SURA")) return "EPS SURA";
  if (r.includes("MEDPLUS")) return "MEDPLUS";
  if (r.includes("MEDISANITAS")) return "MEDISANITAS";
  if (r.includes("COLSANITAS")) return "COLSANITAS";
  if (r.includes("SANITAS")) return "SANITAS EPS";
  if (r.includes("COLMEDICA")) return "COLMEDICA";
  if (r.includes("COOMEVA")) return "COOMEVA";
  if (r.includes("BOLIVAR")) return "SEGUROS BOLIVAR";
  if (r.includes("ALLIANZ")) return "ALLIANZ";
  if (r.includes("COLPATRIA") || r.includes("AXA")) return "COLPATRIA";
  if (r.includes("HDI")) return "HDI SEGUROS";
  if (r.includes("COMFENALCO")) return "COMFENALCO CARTAGENA";
  if (r.includes("SALUD TOTAL")) return "SALUD TOTAL";
  if (r.includes("PAN AMERICAN")) return "PAN AMERICAN LIFE";
  if (r.includes("MEXICHEM")) return "MEXICHEM";
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

async function fetchSismaJson<T>(path: string): Promise<T> {
  const res = await fetch(`${SISMA_BASE_URL}${path}`, {
    headers: {
      "X-Api-Key": SISMA_API_KEY,
      Accept: "application/json",
      "User-Agent": "ebenezer-plataforma-cartera",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SISMA API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const corteParam = searchParams.get("corte") || hoyColombia();
    const corte = /^\d{4}-\d{2}-\d{2}$/.test(corteParam)
      ? corteParam
      : hoyColombia();
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
    const empresasParam = (searchParams.get("empresas") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const responsablesParam = (searchParams.get("responsables") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const mutualParam = searchParams.get("mutual");
    const incluirMutual = mutualParam !== "0" && mutualParam !== "false";
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
      (aniosParam.length > 0 && aniosParam.length < 6) ||
      mesesParam.length > 0 ||
      empresasParam.length > 0 ||
      responsablesParam.length > 0 ||
      Boolean(diasDesde) ||
      Boolean(diasHasta) ||
      diasSemParam.length > 0;

    // Consultamos en paralelo cartera-edades y las cuentas de giros por cruzar en auxiliar-abierto
    const [edadesData, aux1301, aux2501] = await Promise.all([
      fetchSismaJson<CarteraEdadesResponse>(
        `/api/contabilidad/cartera-edades?corte=${corte}&formato=json`
      ),
      fetchSismaJson<AuxiliarAbiertoResponse>(
        `/api/contabilidad/auxiliar-abierto?desde=${desde}&hasta=${corte}&cuentaDesde=1301250602&cuentaHasta=1301250602&formato=json`
      ).catch(() => null),
      fetchSismaJson<AuxiliarAbiertoResponse>(
        `/api/contabilidad/auxiliar-abierto?desde=${desde}&hasta=${corte}&cuentaDesde=2501010602&cuentaHasta=2501010607&formato=json`
      ).catch(() => null),
    ]);

    const cumpleFiltroEntidad = (razonSocial: string): boolean => {
      const empCorta = normalizarEmpresaSisma(razonSocial);
      const resp = normalizarResponsableSisma(empCorta, razonSocial);
      if (
        !incluirMutual &&
        (empCorta.includes("MUTUAL") ||
          String(razonSocial || "").toUpperCase().includes("MUTUAL"))
      ) {
        return false;
      }
      if (empresasParam.length > 0) {
        const rsUp = String(razonSocial || "").toUpperCase();
        const coincide = empresasParam.some(
          (e) => empCorta === e || rsUp.includes(e)
        );
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
        if (/^\d{4}/.test(f) && !aniosParam.includes(f.slice(0, 4))) {
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

    const mapaEmpresas = new Map<
      string,
      {
        nit: string;
        razonSocial: string;
        empresaCorta: string;
        responsable: string;
        facturasCount: number;
        corriente: number;
        vencida: number;
        pendienteRadicar: number;
        total: number;
      }
    >();

    for (const item of edadesData.cartera || []) {
      const razonSocial = item.razonSocial || item.numeroIdentificacion || "SIN ENTIDAD";
      if (!cumpleFiltroEntidad(razonSocial)) continue;
      if (!cumpleFiltroFecha(item.fechaRadicacion || item.fechaFactura)) continue;

      filasFiltradas += 1;
      const saldoItem = Number(item.saldo || 0);
      const pv = Number(item.porVencer || 0);
      const d30 = Number(item.d30 || 0);
      const d60 = Number(item.d60 || 0);
      const d90 = Number(item.d90 || 0);
      const d120 = Number(item.d120 || 0);
      const d180 = Number(item.d180 || 0);
      const d360 = Number(item.d360 || 0);
      const mas360 = Number(item.mas360 || 0);

      edadesAcum.saldo += saldoItem;
      edadesAcum.porVencer += pv;
      edadesAcum.d30 += d30;
      edadesAcum.d60 += d60;
      edadesAcum.d90 += d90;
      edadesAcum.d120 += d120;
      edadesAcum.d180 += d180;
      edadesAcum.d360 += d360;
      edadesAcum.mas360 += mas360;

      const esPendienteRad =
        item.cuenta === "1301250601" ||
        String(item.descripcion || "").toUpperCase().includes("PEND");
      if (esPendienteRad) {
        facturasPendientesRadicar += saldoItem;
      } else {
        carteraRadicada += saldoItem;
      }

      const corrItem = pv + d30 + d60;
      const vencItem = d90 + d120 + d180 + d360 + mas360;
      const empCorta = normalizarEmpresaSisma(razonSocial);
      const resp = normalizarResponsableSisma(empCorta, razonSocial);

      const actual = mapaEmpresas.get(razonSocial) || {
        nit: item.numeroIdentificacion || "",
        razonSocial,
        empresaCorta: empCorta,
        responsable: resp,
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
      mapaEmpresas.set(razonSocial, actual);
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
        if (!cumpleFiltroEntidad(terc.razonSocial || "")) continue;
        for (const a of terc.auxiliares || []) {
          for (const doc of a.documentos || []) {
            if (!cumpleFiltroFecha(doc.fecha)) continue;
            if (cuentasGirosMap[doc.cuenta]) {
              cuentasGirosMap[doc.cuenta].saldo += Number(doc.valor || 0);
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

    // Acumulación mensual real (Ene al mes de corte) para la gráfica de Tendencia por Mes
    const mesMaxCorte = Math.max(1, Math.min(12, Number(corte.slice(5, 7)) || 10));
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
      if (!cumpleFiltroEntidad(razonSocial)) continue;
      if (!cumpleFiltroFecha(item.fechaRadicacion || item.fechaFactura)) continue;

      const fIso = normalizarFechaISO(item.fechaRadicacion || item.fechaFactura);
      const yyyyItem = Number(fIso.slice(0, 4));
      const mmItem = Number(fIso.slice(5, 7));
      const anioCorteNum = Number(anio) || 2026;
      const saldoItem = Number(item.saldo || 0);
      const vencItem =
        Number(item.d90 || 0) +
        Number(item.d120 || 0) +
        Number(item.d180 || 0) +
        Number(item.d360 || 0) +
        Number(item.mas360 || 0);

      const idxInicio =
        !yyyyItem || yyyyItem < anioCorteNum
          ? 0
          : Math.max(0, Math.min(11, (mmItem || 1) - 1));
      for (let m = idxInicio; m < mesMaxCorte; m++) {
        acumuladoPorMesFacturas[m] += saldoItem;
        vencidaPorMesFacturas[m] += vencItem;
      }
    }

    const serieMensual = Array.from({ length: mesMaxCorte }, (_, idx) => {
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

    const topEmpresas = Array.from(mapaEmpresas.values())
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
      },
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
