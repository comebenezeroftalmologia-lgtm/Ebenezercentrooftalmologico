"use client";

import { useState, useEffect } from "react";
import rawCarteraData from "@/lib/cartera-data.json";

type MutualMode = "ALL" | "NO_MUTUAL" | "ONLY_MUTUAL";
type CorteKey = "2026-09-30" | "2026-09-23" | "2026-09-09";
type ModuleKey = "pendientes" | "glosas" | "vencimiento" | "giros";
type PendSubtab = "anuladas" | "admisiones";
type GlosaSubtab = "consolidado" | "defensa" | "sisma" | "mutual";

interface FacturaAnulada {
  id?: string;
  no_factura?: string;
  factura?: string;
  fecha_elab?: string;
  fecha_factura?: string;
  empresa?: string;
  valor?: number;
  valor_glosa?: number;
  causal?: string;
  motivo?: string;
  responsable?: string;
  factura_reemplaza?: string;
  factura_actual?: string;
  estado?: string;
  es_pendiente_radicar?: boolean;
  is_mutual?: boolean;
}

interface AdmisionPendiente {
  id?: string;
  estudio?: string;
  ingreso?: string;
  fecha_ingreso?: string;
  fecha?: string;
  empresa?: string;
  contrato?: string;
  paciente?: string;
  procedimiento?: string;
  servicio?: string;
  facturador?: string;
  responsable?: string;
  observacion?: string;
  estado?: string;
  is_mutual?: boolean;
}

interface GlosaRecord {
  id?: string;
  factura?: string;
  no_factura?: string;
  empresa?: string;
  eps?: string;
  valor_factura?: number;
  valor?: number;
  valor_glosa?: number;
  valor_aceptado?: number;
  nota_credito_alfanet?: string;
  nota_credito?: string;
  observacion?: string;
  concepto?: string;
  autorizacion?: string;
  estado?: string;
  aplicada_sisma?: string;
  is_mutual?: boolean;
}

interface CarteraDataset {
  facturas_anuladas: FacturaAnulada[];
  admisiones_pendientes: AdmisionPendiente[];
  glosas_consolidado: GlosaRecord[];
  glosas_defensa: GlosaRecord[];
  glosas_pendientes_sisma: GlosaRecord[];
  glosas_mutual: GlosaRecord[];
}

const INITIAL_DATA = rawCarteraData as unknown as CarteraDataset;

const CORTES_SUMMARY: Record<MutualMode, {
  title: string;
  "2026-09-09": { corriente: number; vencida: number; total: number; anticipos: number; real: number };
  "2026-09-23": { corriente: number; vencida: number; total: number; anticipos: number; real: number };
  "2026-09-30": { corriente: number; vencida: number; total: number; anticipos: number; real: number };
}> = {
  ALL: {
    title: "TODAS LAS EMPRESAS (Incluyendo Mutual Ser)",
    "2026-09-09": { corriente: 3008819655, vencida: 1126877351, total: 4135697006, anticipos: 1216144405, real: 2919552601 },
    "2026-09-23": { corriente: 2777030392, vencida: 1117777685, total: 3894808077, anticipos: 1599425440, real: 3413352337 },
    "2026-09-30": { corriente: 2852888197, vencida: 1207909707, total: 4060797904, anticipos: 1670178968, real: 3598528643 }
  },
  NO_MUTUAL: {
    title: "PYP — EXCLUYENDO A MUTUAL SER",
    "2026-09-09": { corriente: 1388005477, vencida: 318075869, total: 1706081346, anticipos: 168077781, real: 1538003565 },
    "2026-09-23": { corriente: 1121433172, vencida: 257692616, total: 1379125788, anticipos: 171176165, real: 1207949623 },
    "2026-09-30": { corriente: 1217276982, vencida: 225848632, total: 1443125614, anticipos: 167129693, real: 1275995921 }
  },
  ONLY_MUTUAL: {
    title: "SOLO MUTUAL SER EPS",
    "2026-09-09": { corriente: 1620814178, vencida: 808801482, total: 2429615660, anticipos: 1048066624, real: 1381549036 },
    "2026-09-23": { corriente: 1655597220, vencida: 860085069, total: 2515682289, anticipos: 1428249275, real: 2205402714 },
    "2026-09-30": { corriente: 1635611215, vencida: 982061075, total: 2617672290, anticipos: 1503049275, real: 2322532722 }
  }
};

const EDADES_ENTIDAD = [
  { entidad: "MUTUAL SER EPS", d0_30: 985410200, d31_60: 650201015, d61_90: 412500300, d91_180: 318420500, d181_360: 164890275, d360: 86250000, isMutual: true },
  { entidad: "NUEVA EPS S.A.", d0_30: 312400100, d31_60: 192180400, d61_90: 54200100, d91_180: 31400200, d181_360: 14120000, d360: 5200000, isMutual: false },
  { entidad: "COOSALUD EPS S.A.", d0_30: 218450200, d31_60: 134200300, d61_90: 38100400, d91_180: 21900100, d181_360: 8400000, d360: 3100000, isMutual: false },
  { entidad: "SALUD TOTAL EPS-S S.A.", d0_30: 164200100, d31_60: 98900200, d61_90: 26500100, d91_180: 14300000, d181_360: 4800000, d360: 1900000, isMutual: false },
  { entidad: "FOMAG / FIDUPREVISORA", d0_30: 92300000, d31_60: 44120000, d61_90: 14200000, d91_180: 6800000, d181_360: 2100000, d360: 0, isMutual: false },
  { entidad: "CAJACOPI / OTRAS EPS PYP", d0_30: 35526182, d31_60: 24999500, d61_90: 11928132, d91_180: 5999700, d181_360: 2000000, d360: 0, isMutual: false }
];

const GIROS_SISMA = [
  { codigo: "1301250602", nombre: "GIROS POR APLICAR A CARTERA NO IDENTIFIC", estado: "AUXILIAR ABIERTO", total: 248650120, pyp: 62140120, mutual: 186510000 },
  { codigo: "2501010602", nombre: "GIROS PARA ABONO DE CARTERA PENDIENTE", estado: "AUXILIAR ABIERTO", total: 894318448, pyp: 68420173, mutual: 825898275 },
  { codigo: "2501010607", nombre: "GIROS DE CARTERA PENDIENTE POR APLICAR", estado: "AUXILIAR ABIERTO", total: 527210400, pyp: 36569400, mutual: 490641000 }
];

function fmt(n: number): string {
  return "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");
}

function fmtMillions(n: number): string {
  const m = (Number(n) || 0) / 1000000;
  return "$" + m.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "M";
}

export default function TableroCarteraAnalytics() {
  const [mode, setMode] = useState<MutualMode>("ALL");
  const [corte, setCorte] = useState<CorteKey>("2026-09-30");
  const [activeModule, setActiveModule] = useState<ModuleKey>("pendientes");
  const [pendSubtab, setPendSubtab] = useState<PendSubtab>("anuladas");
  const [glosaSubtab, setGlosaSubtab] = useState<GlosaSubtab>("consolidado");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [respFilter, setRespFilter] = useState<string>("ALL");
  const [apiStatus, setApiStatus] = useState<string>("SISMA API: Conectado");

  useEffect(() => {
    let active = true;
    fetch("/api/cartera")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (active && payload && payload.ok) {
          setApiStatus("SISMA BackOffice: En línea");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const ds = CORTES_SUMMARY[mode];
  const cur = ds[corte];
  const pctCorr = ((cur.corriente / cur.total) * 100).toFixed(1);
  const pctVenc = ((cur.vencida / cur.total) * 100).toFixed(1);

  const pendVal = mode === "NO_MUTUAL" ? 167264467 : mode === "ONLY_MUTUAL" ? 3479042 : 170743509;
  const glosaVal = mode === "NO_MUTUAL" ? 63843314 : mode === "ONLY_MUTUAL" ? 51456692 : 115300006;
  const giroVal = cur.anticipos;

  const isRowAllowed = (empName?: string, isMutFlag?: boolean): boolean => {
    const emp = String(empName || "").toUpperCase();
    const isMut = Boolean(isMutFlag) || emp.includes("MUTUAL");
    if (mode === "NO_MUTUAL" && isMut) return false;
    if (mode === "ONLY_MUTUAL" && !isMut) return false;
    return true;
  };

  const listAnuladas = (INITIAL_DATA.facturas_anuladas || []).filter((r) => {
    if (!isRowAllowed(r.empresa, r.is_mutual)) return false;
    if (respFilter !== "ALL" && !String(r.responsable || "").toUpperCase().includes(respFilter)) return false;
    if (!searchQuery) return true;
    return JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const listAdm = (INITIAL_DATA.admisiones_pendientes || []).filter((r) => {
    if (!isRowAllowed(r.empresa || r.contrato, r.is_mutual)) return false;
    if (respFilter !== "ALL" && !String(r.facturador || r.responsable || "").toUpperCase().includes(respFilter)) return false;
    if (!searchQuery) return true;
    return JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const glosaSource: GlosaRecord[] =
    glosaSubtab === "consolidado"
      ? INITIAL_DATA.glosas_consolidado || []
      : glosaSubtab === "defensa"
      ? INITIAL_DATA.glosas_defensa || []
      : glosaSubtab === "sisma"
      ? INITIAL_DATA.glosas_pendientes_sisma || []
      : INITIAL_DATA.glosas_mutual || [];

  const listGlosas = glosaSource.filter((r) => {
    if (!isRowAllowed(r.empresa || r.eps || (glosaSubtab === "mutual" ? "MUTUAL SER EPS" : ""), r.is_mutual)) return false;
    if (!searchQuery) return true;
    return JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const listEdades = EDADES_ENTIDAD.filter((r) => isRowAllowed(r.entidad, r.isMutual));

  const maxVal = mode === "NO_MUTUAL" ? 1800000000 : 3400000000;
  const chartH = 205;
  const baseY = 230;
  const dates: { key: CorteKey; label: string; gx: number }[] = [
    { key: "2026-09-09", label: "09 Sep", gx: 210 },
    { key: "2026-09-23", label: "23 Sep", gx: 540 },
    { key: "2026-09-30", label: "30 Sep", gx: 870 }
  ];

  const linePts = dates
    .map((d) => {
      const item = ds[d.key];
      const yReal = baseY - Math.max(12, Math.round((item.real / (maxVal * 1.15)) * chartH));
      return `${d.gx + 95},${yReal}`;
    })
    .join(" ");

  const dAll = CORTES_SUMMARY.ALL[corte];
  const dPyp = CORTES_SUMMARY.NO_MUTUAL[corte];

  return (
    <section
      id="tablero-cartera"
      className="mt-6 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)] space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF2F8] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-[6px] bg-[#E6F0FD] px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-[#1D58D8]">
              03 · FINANCIERO &amp; SISMA
            </span>
            <h2 className="text-[18px] font-bold tracking-[-0.015em] text-[#0E245E]">
              Tablero de Cartera, Radicación, Glosas y Giros SISMA
            </h2>
          </div>
          <p className="mt-1 text-[12.5px] text-[#64748B]">
            Control financiero de cartera corriente (&lt; 60 días), vencida (&ge; 60 días), facturación pendiente por radicar y conciliación Alfanet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6EEF8] bg-[#FBFDFF] px-3 py-1 text-[11.5px] font-semibold text-[#0E245E]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {apiStatus}
          </span>

          <select
            value={corte}
            onChange={(e) => setCorte(e.target.value as CorteKey)}
            className="rounded-[10px] border border-[#E6EEF8] bg-[#FBFDFF] px-3 py-1.5 text-[12px] font-bold text-[#0E245E] outline-none focus:border-[#1D58D8]"
          >
            <option value="2026-09-30">Corte: 30 Sep 2026</option>
            <option value="2026-09-23">Corte: 23 Sep 2026</option>
            <option value="2026-09-09">Corte: 09 Sep 2026</option>
          </select>

          <div className="flex items-center gap-1.5 rounded-full border border-[#E6EEF8] bg-[#FBFDFF] p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMode(mode === "ALL" ? "NO_MUTUAL" : "ALL")}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                mode === "NO_MUTUAL" ? "bg-[#D97706]" : "bg-[#059669]"
              }`}
              title="Alternar Incluir / Excluir Mutual Ser"
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                  mode === "NO_MUTUAL" ? "left-1" : "left-6"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => setMode("ALL")}
              className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${
                mode === "ALL" ? "bg-[#0E245E] text-white" : "text-[#64748B] hover:text-[#0E245E]"
              }`}
            >
              Incluir Mutual Ser
            </button>
            <span className="text-[#CBD5E1]">|</span>
            <button
              type="button"
              onClick={() => setMode("NO_MUTUAL")}
              className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${
                mode === "NO_MUTUAL" ? "bg-[#0E245E] text-white" : "text-[#64748B] hover:text-[#0E245E]"
              }`}
            >
              Excluir Mutual Ser (PYP)
            </button>
            <span className="text-[#CBD5E1]">|</span>
            <button
              type="button"
              onClick={() => setMode("ONLY_MUTUAL")}
              className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${
                mode === "ONLY_MUTUAL" ? "bg-[#0E245E] text-white" : "text-[#64748B] hover:text-[#0E245E]"
              }`}
            >
              Solo Mutual
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E6EEF8] bg-[#FBFDFF] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13.5px] font-bold uppercase tracking-wide text-[#0E245E]">
              GRÁFICA DE EVOLUCIÓN Y COMPOSICIÓN DE CARTERA — {ds.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[12px] font-semibold text-[#475569]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-[#0E245E]" />
                Cartera Corriente ({fmtMillions(cur.corriente)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-[#D97706]" />
                Cartera Vencida ({fmtMillions(cur.vencida)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-[#059669]" />
                Anticipos por Cruzar ({fmtMillions(cur.anticipos)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-[#2563EB]" />
                Línea Cartera Real ({fmtMillions(cur.real)})
              </span>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 1160 265" className="h-auto max-h-[275px] w-full">
            <line x1="70" y1="35" x2="1120" y2="35" stroke="#E2E8F0" strokeDasharray="4 4" />
            <line x1="70" y1="100" x2="1120" y2="100" stroke="#E2E8F0" strokeDasharray="4 4" />
            <line x1="70" y1="165" x2="1120" y2="165" stroke="#E2E8F0" strokeDasharray="4 4" />
            <line x1="70" y1="230" x2="1120" y2="230" stroke="#CBD5E1" strokeWidth="1.5" />

            <text x="60" y="39" textAnchor="end" fontSize="11" fontWeight="600" fill="#64748B">{fmtMillions(maxVal)}</text>
            <text x="60" y="104" textAnchor="end" fontSize="11" fontWeight="600" fill="#64748B">{fmtMillions(maxVal * 0.66)}</text>
            <text x="60" y="169" textAnchor="end" fontSize="11" fontWeight="600" fill="#64748B">{fmtMillions(maxVal * 0.33)}</text>
            <text x="60" y="234" textAnchor="end" fontSize="11" fontWeight="600" fill="#64748B">$0M</text>

            {dates.map((d) => {
              const item = ds[d.key];
              const hCorr = Math.max(8, Math.round((item.corriente / maxVal) * chartH));
              const hVenc = Math.max(8, Math.round((item.vencida / maxVal) * chartH));
              const hAnt = Math.max(8, Math.round((item.anticipos / maxVal) * chartH));
              return (
                <g key={d.key}>
                  <rect x={d.gx} y={baseY - hCorr} width="56" height={hCorr} rx="4" fill="#0E245E" />
                  <text x={d.gx + 28} y={baseY - hCorr - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0E245E">
                    {fmtMillions(item.corriente)}
                  </text>

                  <rect x={d.gx + 68} y={baseY - hVenc} width="56" height={hVenc} rx="4" fill="#D97706" />
                  <text x={d.gx + 96} y={baseY - hVenc - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill="#B45309">
                    {fmtMillions(item.vencida)}
                  </text>

                  <rect x={d.gx + 136} y={baseY - hAnt} width="56" height={hAnt} rx="4" fill="#059669" />
                  <text x={d.gx + 164} y={baseY - hAnt - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill="#047857">
                    {fmtMillions(item.anticipos)}
                  </text>

                  <text x={d.gx + 96} y={baseY + 22} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0E245E">
                    {d.label}
                  </text>
                </g>
              );
            })}

            <polyline fill="none" stroke="#2563EB" strokeWidth="3" points={linePts} />
            {dates.map((d) => {
              const item = ds[d.key];
              const yReal = baseY - Math.max(12, Math.round((item.real / (maxVal * 1.15)) * chartH));
              return <circle key={d.key + "-pt"} cx={d.gx + 95} cy={yReal} r="5.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />;
            })}
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-11">
        <div className="lg:col-span-3 rounded-[14px] bg-gradient-to-br from-[#1D58D8] to-[#0E245E] p-5 text-center text-white shadow-[0_6px_18px_rgba(14,36,94,0.12)]">
          <div className="text-[13px] font-bold uppercase tracking-wider">CARTERA CORRIENTE</div>
          <div className="mt-0.5 text-[11.5px] opacity-90">(Radicada &lt; 60 días)</div>
          <div className="mt-2 text-2xl font-extrabold xl:text-[26px]">{fmt(cur.corriente)}</div>
          <div className="mt-2 border-t border-white/20 pt-2 text-[11.5px] opacity-90">{pctCorr}% de la Cartera Total</div>
        </div>

        <div className="lg:col-span-1 text-center text-3xl font-extrabold text-[#0E245E]">+</div>

        <div className="lg:col-span-3 rounded-[14px] bg-gradient-to-br from-[#D97706] to-[#B45309] p-5 text-center text-white shadow-[0_6px_18px_rgba(217,119,6,0.15)]">
          <div className="text-[13px] font-bold uppercase tracking-wider">CARTERA VENCIDA</div>
          <div className="mt-0.5 text-[11.5px] opacity-90">(Radicada &ge; 60 días)</div>
          <div className="mt-2 text-2xl font-extrabold xl:text-[26px]">{fmt(cur.vencida)}</div>
          <div className="mt-2 border-t border-white/20 pt-2 text-[11.5px] opacity-90">{pctVenc}% de la Cartera Total</div>
        </div>

        <div className="lg:col-span-1 text-center text-3xl font-extrabold text-[#0E245E]">=</div>

        <div className="lg:col-span-3 rounded-[14px] bg-gradient-to-br from-[#059669] to-[#047857] p-5 text-center text-white shadow-[0_6px_18px_rgba(5,150,105,0.15)]">
          <div className="text-[13px] font-bold uppercase tracking-wider">CARTERA TOTAL</div>
          <div className="mt-0.5 text-[11.5px] opacity-90">
            ({mode === "NO_MUTUAL" ? "Excluyendo Mutual Ser - PYP" : mode === "ONLY_MUTUAL" ? "Solo Mutual Ser" : "Todas las Empresas"})
          </div>
          <div className="mt-2 text-2xl font-extrabold xl:text-[26px]">{fmt(cur.total)}</div>
          <div className="mt-2 border-t border-white/20 pt-2 text-[11.5px] opacity-95">
            Total Cartera Real (neto giros): <strong>{fmt(cur.real)}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => { setActiveModule("pendientes"); setSearchQuery(""); }}
          className={`group flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] border-l-[3.5px] border-l-[#2563EB] p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:bg-white hover:shadow-[0_6px_18px_rgba(14,36,94,0.06)] ${
            activeModule === "pendientes" ? "bg-white ring-2 ring-[#2563EB]/20 shadow-[0_6px_18px_rgba(14,36,94,0.06)]" : "bg-[#FBFDFF]"
          }`}
        >
          <div>
            <span className="rounded-[6px] bg-[#E6F0FD] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#1D58D8]">
              01 · RADICACIÓN
            </span>
            <p className="mt-2 text-[14.5px] font-bold text-[#0E245E] group-hover:text-[#1D58D8]">
              Facturas Pendientes por Radicar
            </p>
            <p className="mt-1 text-[20px] font-extrabold text-[#1D58D8]">
              {fmtMillions(pendVal)}
            </p>
          </div>
          <p className="mt-2 text-[12px] text-[#64748B]">
            {fmt(pendVal)} · 614 registros
          </p>
        </button>

        <button
          type="button"
          onClick={() => { setActiveModule("glosas"); setSearchQuery(""); }}
          className={`group flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] border-l-[3.5px] border-l-[#D97706] p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:bg-white hover:shadow-[0_6px_18px_rgba(14,36,94,0.06)] ${
            activeModule === "glosas" ? "bg-white ring-2 ring-[#D97706]/20 shadow-[0_6px_18px_rgba(14,36,94,0.06)]" : "bg-[#FBFDFF]"
          }`}
        >
          <div>
            <span className="rounded-[6px] bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#B45309]">
              02 · AUDITORÍA &amp; ALFANET
            </span>
            <p className="mt-2 text-[14.5px] font-bold text-[#0E245E] group-hover:text-[#B45309]">
              Cuadro de Glosas
            </p>
            <p className="mt-1 text-[20px] font-extrabold text-[#D97706]">
              {fmtMillions(glosaVal)}
            </p>
          </div>
          <p className="mt-2 text-[12px] text-[#64748B]">
            {fmt(glosaVal)} · 4 tableros
          </p>
        </button>

        <button
          type="button"
          onClick={() => { setActiveModule("vencimiento"); setSearchQuery(""); }}
          className={`group flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] border-l-[3.5px] border-l-[#059669] p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:bg-white hover:shadow-[0_6px_18px_rgba(14,36,94,0.06)] ${
            activeModule === "vencimiento" ? "bg-white ring-2 ring-[#059669]/20 shadow-[0_6px_18px_rgba(14,36,94,0.06)]" : "bg-[#FBFDFF]"
          }`}
        >
          <div>
            <span className="rounded-[6px] bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#047857]">
              03 · EDADES DE CARTERA
            </span>
            <p className="mt-2 text-[14.5px] font-bold text-[#0E245E] group-hover:text-[#047857]">
              Informe de Vencimiento de Cartera
            </p>
            <p className="mt-1 text-[20px] font-extrabold text-[#059669]">
              &lt; 60d vs &ge; 60d
            </p>
          </div>
          <p className="mt-2 text-[12px] text-[#64748B]">
            Edades por EPS y Matriz de Cortes
          </p>
        </button>

        <button
          type="button"
          onClick={() => { setActiveModule("giros"); setSearchQuery(""); }}
          className={`group flex flex-col justify-between rounded-[14px] border border-[#E6EEF8] border-l-[3.5px] border-l-[#1D58D8] p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:bg-white hover:shadow-[0_6px_18px_rgba(14,36,94,0.06)] ${
            activeModule === "giros" ? "bg-white ring-2 ring-[#1D58D8]/20 shadow-[0_6px_18px_rgba(14,36,94,0.06)]" : "bg-[#FBFDFF]"
          }`}
        >
          <div>
            <span className="rounded-[6px] bg-[#E6F0FD] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#1D58D8]">
              04 · CONTABILIDAD SISMA
            </span>
            <p className="mt-2 text-[14.5px] font-bold text-[#0E245E] group-hover:text-[#1D58D8]">
              Giros Pendientes por Aplicar
            </p>
            <p className="mt-1 text-[20px] font-extrabold text-[#0E245E]">
              {fmtMillions(giroVal)}
            </p>
          </div>
          <p className="mt-2 text-[12px] text-[#64748B]">
            {fmt(giroVal)} · 3 auxiliares SISMA
          </p>
        </button>
      </div>

      <div className="rounded-[14px] border border-[#E6EEF8] bg-[#FBFDFF] p-5">
        {activeModule === "pendientes" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2F8] pb-3.5">
              <div>
                <h4 className="text-[15px] font-bold text-[#0E245E]">
                  Facturas Pendientes por Radicar / Refacturar e Ingresos sin Facturar
                </h4>
                <p className="text-[12px] text-[#64748B]">
                  Mostrando {listAnuladas.length} facturas devueltas/anuladas y {listAdm.length} admisiones pendientes según filtro Mutual Ser
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPendSubtab("anuladas")}
                  className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition ${
                    pendSubtab === "anuladas"
                      ? "border-[#0E245E] bg-[#0E245E] text-white"
                      : "border-[#E6EEF8] bg-white text-[#0E245E] hover:border-[#BFD4F4]"
                  }`}
                >
                  Facturas Anuladas / Refacturación ({listAnuladas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendSubtab("admisiones")}
                  className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition ${
                    pendSubtab === "admisiones"
                      ? "border-[#0E245E] bg-[#0E245E] text-white"
                      : "border-[#E6EEF8] bg-white text-[#0E245E] hover:border-[#BFD4F4]"
                  }`}
                >
                  Admisiones sin Facturar ({listAdm.length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Buscar por factura, EPS, causal, paciente o responsable..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-72 rounded-[10px] border border-[#E6EEF8] bg-white px-3 py-1.5 text-[12px] text-[#0E245E] outline-none focus:border-[#1D58D8]"
              />
              <select
                value={respFilter}
                onChange={(e) => setRespFilter(e.target.value)}
                className="rounded-[10px] border border-[#E6EEF8] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0E245E] outline-none focus:border-[#1D58D8]"
              >
                <option value="ALL">Todos los Responsables</option>
                <option value="MARIA ALEJANDRA">MARIA ALEJANDRA</option>
                <option value="MARIA PAOLA">MARIA PAOLA</option>
                <option value="MAYERLIS">MAYERLIS</option>
                <option value="KELLYS">KELLYS</option>
                <option value="KEYLA">KEYLA</option>
                <option value="MARYURIS">MARYURIS</option>
                <option value="VALENTINA">VALENTINA</option>
              </select>
            </div>

            <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-[10px] border border-[#E6EEF8] bg-white">
              {pendSubtab === "anuladas" ? (
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#E6EEF8] bg-[#F8FAFC] text-left text-[#0E245E]">
                      <th className="p-2.5 font-bold">Factura</th>
                      <th className="p-2.5 font-bold">Fecha</th>
                      <th className="p-2.5 font-bold">EPS / Aseguradora</th>
                      <th className="p-2.5 text-right font-bold">Valor</th>
                      <th className="p-2.5 font-bold">Causal de Anulación / Devolución</th>
                      <th className="p-2.5 font-bold">Responsable</th>
                      <th className="p-2.5 font-bold">Factura Reemplaza / Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listAnuladas.slice(0, 180).map((r, idx) => {
                      const fac = r.no_factura || r.factura || "-";
                      const fec = r.fecha_elab || r.fecha_factura || "-";
                      const est = r.estado || r.factura_actual || (r.es_pendiente_radicar ? "PENDIENTE RADICAR" : "GESTIONADA");
                      const isPend = String(est).toUpperCase().includes("PENDIENTE") || Boolean(r.es_pendiente_radicar);
                      return (
                        <tr key={fac + "-" + idx} className="border-b border-[#EEF2F8] hover:bg-[#FBFDFF]">
                          <td className="p-2.5 font-bold text-[#1D58D8]">{fac}</td>
                          <td className="p-2.5 text-[#475569]">{fec}</td>
                          <td className="p-2.5 font-medium text-[#0E245E]">{r.empresa}</td>
                          <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(r.valor || r.valor_glosa || 0)}</td>
                          <td className="p-2.5 text-[#475569]">{r.causal || r.motivo}</td>
                          <td className="p-2.5 font-semibold text-[#0E245E]">{r.responsable}</td>
                          <td className="p-2.5">
                            <span className={`rounded-[6px] px-2 py-0.5 text-[11px] font-bold ${
                              isPend ? "bg-amber-500/15 text-[#B45309]" : "bg-emerald-500/15 text-[#047857]"
                            }`}>
                              {r.factura_reemplaza && r.factura_reemplaza !== "NO APLICA" ? `${r.factura_reemplaza} · ${est}` : est}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#E6EEF8] bg-[#F8FAFC] text-left text-[#0E245E]">
                      <th className="p-2.5 font-bold">Estudio / Ingreso</th>
                      <th className="p-2.5 font-bold">Fecha Ingreso</th>
                      <th className="p-2.5 font-bold">EPS / Contrato</th>
                      <th className="p-2.5 font-bold">Paciente</th>
                      <th className="p-2.5 font-bold">Procedimiento / Servicio</th>
                      <th className="p-2.5 font-bold">Facturador</th>
                      <th className="p-2.5 font-bold">Estado / Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listAdm.map((r, idx) => (
                      <tr key={(r.estudio || r.ingreso || "a") + "-" + idx} className="border-b border-[#EEF2F8] hover:bg-[#FBFDFF]">
                        <td className="p-2.5 font-bold text-[#1D58D8]">{r.estudio || r.ingreso || r.id}</td>
                        <td className="p-2.5 text-[#475569]">{r.fecha_ingreso || r.fecha}</td>
                        <td className="p-2.5 font-medium text-[#0E245E]">{r.empresa || r.contrato}</td>
                        <td className="p-2.5 text-[#0E245E]">{r.paciente}</td>
                        <td className="p-2.5 text-[#475569]">{r.procedimiento || r.servicio}</td>
                        <td className="p-2.5 font-semibold text-[#0E245E]">{r.facturador || r.responsable}</td>
                        <td className="p-2.5">
                          <span className="rounded-[6px] bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-[#B45309]">
                            {r.observacion || r.estado || "PENDIENTE FACTURAR"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeModule === "glosas" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2F8] pb-3.5">
              <div>
                <h4 className="text-[15px] font-bold text-[#0E245E]">
                  Cuadro General de Glosas, Conciliaciones Alfanet y Notas Crédito SISMA
                </h4>
                <p className="text-[12px] text-[#64748B]">
                  Mostrando {listGlosas.length} registros según el filtro Mutual Ser seleccionado
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGlosaSubtab("consolidado")}
                  className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition ${
                    glosaSubtab === "consolidado"
                      ? "border-[#0E245E] bg-[#0E245E] text-white"
                      : "border-[#E6EEF8] bg-white text-[#0E245E] hover:border-[#BFD4F4]"
                  }`}
                >
                  Consolidado Alfanet
                </button>
                <button
                  type="button"
                  onClick={() => setGlosaSubtab("defensa")}
                  className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition ${
                    glosaSubtab === "defensa"
                      ? "border-[#0E245E] bg-[#0E245E] text-white"
                      : "border-[#E6EEF8] bg-white text-[#0E245E] hover:border-[#BFD4F4]"
                  }`}
                >
                  Defendidas / No Aceptadas
                </button>
                <button
                  type="button"
                  onClick={() => setGlosaSubtab("sisma")}
                  className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition ${
                    glosaSubtab === "sisma"
                      ? "border-[#0E245E] bg-[#0E245E] text-white"
                      : "border-[#E6EEF8] bg-white text-[#0E245E] hover:border-[#BFD4F4]"
                  }`}
                >
                  Aceptadas / Pendientes SISMA
                </button>
                <button
                  type="button"
                  onClick={() => setGlosaSubtab("mutual")}
                  className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition ${
                    glosaSubtab === "mutual"
                      ? "border-[#0E245E] bg-[#0E245E] text-white"
                      : "border-[#E6EEF8] bg-white text-[#0E245E] hover:border-[#BFD4F4]"
                  }`}
                >
                  Respuestas Mutual Ser
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-[10px] border border-[#E6EEF8] bg-white">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#E6EEF8] bg-[#F8FAFC] text-left text-[#0E245E]">
                    <th className="p-2.5 font-bold">Factura</th>
                    <th className="p-2.5 font-bold">EPS / Aseguradora</th>
                    <th className="p-2.5 text-right font-bold">Valor Factura</th>
                    <th className="p-2.5 text-right font-bold">Valor Glosa</th>
                    <th className="p-2.5 text-right font-bold">Valor Aceptado</th>
                    <th className="p-2.5 font-bold">Nota Crédito Alfanet / Observación</th>
                    <th className="p-2.5 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {listGlosas.map((r, idx) => (
                    <tr key={(r.factura || r.no_factura || "g") + "-" + idx} className="border-b border-[#EEF2F8] hover:bg-[#FBFDFF]">
                      <td className="p-2.5 font-bold text-[#D97706]">{r.factura || r.no_factura}</td>
                      <td className="p-2.5 font-medium text-[#0E245E]">{r.empresa || r.eps || "MUTUAL SER EPS"}</td>
                      <td className="p-2.5 text-right text-[#475569]">{fmt(r.valor_factura || r.valor || 0)}</td>
                      <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(r.valor_glosa || r.valor_aceptado || 0)}</td>
                      <td className="p-2.5 text-right text-[#475569]">{fmt(r.valor_aceptado || 0)}</td>
                      <td className="p-2.5 text-[#475569]">{r.nota_credito_alfanet || r.nota_credito || r.observacion || r.concepto || r.autorizacion || "-"}</td>
                      <td className="p-2.5">
                        <span className="rounded-[6px] bg-[#E6F0FD] px-2 py-0.5 text-[11px] font-bold text-[#1D58D8]">
                          {r.estado || r.aplicada_sisma || "EN GESTIÓN"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeModule === "vencimiento" && (
          <div className="space-y-5">
            <div>
              <h4 className="text-[15px] font-bold text-[#0E245E]">
                Informe de Vencimiento de la Cartera por Edades y Matriz Comparativa ({corte})
              </h4>
              <p className="text-[12px] text-[#64748B]">
                Separación exacta: Cartera Corriente (&lt; 60 días) vs Cartera Vencida (&ge; 60 días)
              </p>
            </div>

            <div className="overflow-x-auto rounded-[10px] border border-[#E6EEF8] bg-white">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#E6EEF8] bg-[#F8FAFC] text-left text-[#0E245E]">
                    <th className="p-2.5 font-bold">EPS / Aseguradora</th>
                    <th className="p-2.5 text-right font-bold">0 - 30 días</th>
                    <th className="p-2.5 text-right font-bold">31 - 60 días</th>
                    <th className="p-2.5 text-right font-extrabold text-[#1D58D8]">Subtotal Corriente (&lt;60d)</th>
                    <th className="p-2.5 text-right font-bold">61 - 90 días</th>
                    <th className="p-2.5 text-right font-bold">91 - 180 días</th>
                    <th className="p-2.5 text-right font-bold">&gt; 180 días</th>
                    <th className="p-2.5 text-right font-extrabold text-[#D97706]">Subtotal Vencida (&ge;60d)</th>
                    <th className="p-2.5 text-right font-extrabold text-[#059669]">Cartera Total</th>
                  </tr>
                </thead>
                <tbody>
                  {listEdades.map((r) => {
                    const corr = r.d0_30 + r.d31_60;
                    const venc = r.d61_90 + r.d91_180 + r.d181_360 + r.d360;
                    return (
                      <tr key={r.entidad} className="border-b border-[#EEF2F8] hover:bg-[#FBFDFF]">
                        <td className="p-2.5 font-bold text-[#0E245E]">{r.entidad}</td>
                        <td className="p-2.5 text-right text-[#475569]">{fmt(r.d0_30)}</td>
                        <td className="p-2.5 text-right text-[#475569]">{fmt(r.d31_60)}</td>
                        <td className="p-2.5 text-right font-bold text-[#1D58D8]">{fmt(corr)}</td>
                        <td className="p-2.5 text-right text-[#475569]">{fmt(r.d61_90)}</td>
                        <td className="p-2.5 text-right text-[#475569]">{fmt(r.d91_180)}</td>
                        <td className="p-2.5 text-right text-[#475569]">{fmt(r.d181_360 + r.d360)}</td>
                        <td className="p-2.5 text-right font-bold text-[#D97706]">{fmt(venc)}</td>
                        <td className="p-2.5 text-right font-extrabold text-[#059669]">{fmt(corr + venc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-[10px] border border-[#E6EEF8] bg-white">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#E6EEF8] bg-[#F8FAFC] text-left text-[#0E245E]">
                    <th className="p-2.5 font-bold">Concepto (Presentación Oficial de Cartera)</th>
                    <th className="p-2.5 text-right font-bold">Todas las Empresas (Con Mutual Ser)</th>
                    <th className="p-2.5 text-right font-bold">PYP (Excluyendo Mutual Ser)</th>
                    <th className="p-2.5 text-right font-bold">Diferencia (Solo Mutual Ser)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#EEF2F8]">
                    <td className="p-2.5 font-medium text-[#0E245E]">Cartera corriente (Radicada &lt; 60 días)</td>
                    <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(dAll.corriente)}</td>
                    <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(dPyp.corriente)}</td>
                    <td className="p-2.5 text-right text-[#475569]">{fmt(dAll.corriente - dPyp.corriente)}</td>
                  </tr>
                  <tr className="border-b border-[#EEF2F8]">
                    <td className="p-2.5 font-medium text-[#0E245E]">Cartera vencida (Radicada &ge; 60 días)</td>
                    <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(dAll.vencida)}</td>
                    <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(dPyp.vencida)}</td>
                    <td className="p-2.5 text-right text-[#475569]">{fmt(dAll.vencida - dPyp.vencida)}</td>
                  </tr>
                  <tr className="border-b border-[#EEF2F8] bg-emerald-500/10 font-extrabold">
                    <td className="p-2.5 text-[#0E245E]">Cartera total</td>
                    <td className="p-2.5 text-right text-[#059669]">{fmt(dAll.total)}</td>
                    <td className="p-2.5 text-right text-[#059669]">{fmt(dPyp.total)}</td>
                    <td className="p-2.5 text-right text-[#059669]">{fmt(dAll.total - dPyp.total)}</td>
                  </tr>
                  <tr className="border-b border-[#EEF2F8]">
                    <td className="p-2.5 font-medium text-[#0E245E]">Facturas pendientes por radicar</td>
                    <td className="p-2.5 text-right font-bold text-[#1D58D8]">{fmt(170743509)}</td>
                    <td className="p-2.5 text-right font-bold text-[#1D58D8]">{fmt(167264467)}</td>
                    <td className="p-2.5 text-right text-[#475569]">{fmt(3479042)}</td>
                  </tr>
                  <tr className="border-b border-[#EEF2F8]">
                    <td className="p-2.5 font-medium text-[#0E245E]">Glosas pendientes por gestionar</td>
                    <td className="p-2.5 text-right font-bold text-[#D97706]">{fmt(115300006)}</td>
                    <td className="p-2.5 text-right font-bold text-[#D97706]">{fmt(63843314)}</td>
                    <td className="p-2.5 text-right text-[#475569]">{fmt(51456692)}</td>
                  </tr>
                  <tr className="border-b border-[#EEF2F8]">
                    <td className="p-2.5 font-medium text-[#0E245E]">Anticipos por cruzar (Giros pendientes por aplicar)</td>
                    <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(dAll.anticipos)}</td>
                    <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(dPyp.anticipos)}</td>
                    <td className="p-2.5 text-right text-[#475569]">{fmt(dAll.anticipos - dPyp.anticipos)}</td>
                  </tr>
                  <tr className="bg-[#E6F0FD]/60 font-extrabold">
                    <td className="p-2.5 text-[#0E245E]">Total cartera real</td>
                    <td className="p-2.5 text-right text-[#1D58D8]">{fmt(dAll.real)}</td>
                    <td className="p-2.5 text-right text-[#1D58D8]">{fmt(dPyp.real)}</td>
                    <td className="p-2.5 text-right text-[#1D58D8]">{fmt(dAll.real - dPyp.real)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeModule === "giros" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[15px] font-bold text-[#0E245E]">
                Giros Pendientes por Aplicar — Auxiliares Abiertos en SISMA Contabilidad (BackOffice)
              </h4>
              <p className="text-[12px] text-[#64748B]">
                Cuentas contables de anticipos y giros pendientes parametrizadas en SISMA
              </p>
            </div>

            <div className="overflow-x-auto rounded-[10px] border border-[#E6EEF8] bg-white">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#E6EEF8] bg-[#F8FAFC] text-left text-[#0E245E]">
                    <th className="p-2.5 font-bold">Código Cuenta SISMA</th>
                    <th className="p-2.5 font-bold">Nombre del Auxiliar Contable</th>
                    <th className="p-2.5 font-bold">Estado en SISMA</th>
                    <th className="p-2.5 text-right font-bold">Todas las Empresas</th>
                    <th className="p-2.5 text-right font-bold">PYP (Sin Mutual Ser)</th>
                    <th className="p-2.5 text-right font-bold">Solo Mutual Ser</th>
                  </tr>
                </thead>
                <tbody>
                  {GIROS_SISMA.map((g) => (
                    <tr key={g.codigo} className="border-b border-[#EEF2F8] hover:bg-[#FBFDFF]">
                      <td className="p-2.5 font-mono font-bold text-[#1D58D8]">{g.codigo}</td>
                      <td className="p-2.5 font-bold text-[#0E245E]">{g.nombre}</td>
                      <td className="p-2.5">
                        <span className="rounded-[6px] bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-[#047857]">
                          ● {g.estado}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(g.total)}</td>
                      <td className="p-2.5 text-right font-bold text-[#0E245E]">{fmt(g.pyp)}</td>
                      <td className="p-2.5 text-right text-[#475569]">{fmt(g.mutual)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#E6F0FD]/60 font-extrabold">
                    <td className="p-2.5 text-[#0E245E]" colSpan={3}>TOTAL GIROS / ANTICIPOS PENDIENTES POR APLICAR (Corte 30/09/2026)</td>
                    <td className="p-2.5 text-right text-[#1D58D8]">{fmt(1670178968)}</td>
                    <td className="p-2.5 text-right text-[#1D58D8]">{fmt(167129693)}</td>
                    <td className="p-2.5 text-right text-[#1D58D8]">{fmt(1503049275)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
