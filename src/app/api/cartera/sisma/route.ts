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

    const t = edadesData.totales || {
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
    const carteraTotal = Math.round(t.saldo || carteraCorriente + carteraVencida);

    // Desglose por cuenta contable (Pendiente por radicar vs Radicada) y por EPS
    let facturasPendientesRadicar = 0;
    let carteraRadicada = 0;
    const mapaEmpresas = new Map<
      string,
      {
        nit: string;
        razonSocial: string;
        facturasCount: number;
        corriente: number;
        vencida: number;
        pendienteRadicar: number;
        total: number;
      }
    >();

    for (const item of edadesData.cartera || []) {
      const saldoItem = Number(item.saldo || 0);
      const esPendienteRad =
        item.cuenta === "1301250601" ||
        String(item.descripcion || "").toUpperCase().includes("PEND");
      if (esPendienteRad) {
        facturasPendientesRadicar += saldoItem;
      } else {
        carteraRadicada += saldoItem;
      }

      const corrItem =
        Number(item.porVencer || 0) +
        Number(item.d30 || 0) +
        Number(item.d60 || 0);
      const vencItem =
        Number(item.d90 || 0) +
        Number(item.d120 || 0) +
        Number(item.d180 || 0) +
        Number(item.d360 || 0) +
        Number(item.mas360 || 0);

      const key = item.razonSocial || item.numeroIdentificacion || "SIN ENTIDAD";
      const actual = mapaEmpresas.get(key) || {
        nit: item.numeroIdentificacion || "",
        razonSocial: key,
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
      mapaEmpresas.set(key, actual);
    }

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
        for (const a of terc.auxiliares || []) {
          for (const doc of a.documentos || []) {
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

    const topEmpresas = Array.from(mapaEmpresas.values())
      .map((e) => ({
        ...e,
        corriente: Math.round(e.corriente),
        vencida: Math.round(e.vencida),
        pendienteRadicar: Math.round(e.pendienteRadicar),
        total: Math.round(e.total),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    const [yyyy, mm, dd] = corte.split("-");
    const fechaCorteLabel = `${dd}/${mm}/${yyyy}`;

    return NextResponse.json({
      ok: true,
      fuente: "API SISMA Contabilidad en Vivo",
      corteISO: corte,
      fechaCorte: fechaCorteLabel,
      filasFacturas: edadesData.filas || 0,
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
