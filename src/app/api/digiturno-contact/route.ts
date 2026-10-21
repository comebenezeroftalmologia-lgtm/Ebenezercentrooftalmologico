import { NextResponse } from 'next/server';
import rawData from '@/lib/digiturno-contact-data.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PBX_BASE = 'https://pbx.itmsas.com/sonata/service/v1/api';
const PBX_USER = process.env.PBX_USER || 'tic@ebenezeroftalmologia.com';
const PBX_PASS = process.env.PBX_PASSWORD || 'Eben3z3r25*!';

const QUEUE_META: Record<string, { id: string; q_key: string; name: string; isMutual: boolean }> = {
  '506012': { id: '506012', q_key: 'T57_Q506012', name: 'Mutual Subsidiado', isMutual: true },
  '506013': { id: '506013', q_key: 'T57_Q506013', name: 'Mutual Contributivo', isMutual: true },
  '506014': { id: '506014', q_key: 'T57_Q506014', name: 'PYP (Particular y Prepagada) y Ecopetrol', isMutual: false },
  '506015': { id: '506015', q_key: 'T57_Q506015', name: 'Cirugía Refractiva', isMutual: false },
};

const MONTH_NAMES = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function parseHmsToMin(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return Math.round((val / 60) * 10) / 10;
  const s = String(val).trim();
  const parts = s.split(':');
  if (parts.length === 3) {
    const m = Number(parts[0]) * 60 + Number(parts[1]) + Number(parts[2]) / 60;
    return Math.round(m * 10) / 10;
  }
  if (parts.length === 2) {
    const m = Number(parts[0]) + Number(parts[1]) / 60;
    return Math.round(m * 10) / 10;
  }
  return Math.round((Number(s) / 60) * 10) / 10 || 0;
}

function cleanAgentName(rawName: unknown): string {
  let s = String(rawName || '').trim();
  if (s.includes('-')) {
    s = s.split('-')[1].trim();
  }
  const words = s.split(/\s+/);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return s;
}

async function fetchLiveCurrentMonthPbx() {
  const loginRes = await fetch(`${PBX_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: PBX_USER, password: PBX_PASS }),
    cache: 'no-store',
  });
  if (!loginRes.ok) return null;
  const loginJson = await loginRes.json();
  const token = loginJson?.access_token;
  if (!token) return null;

  const now = new Date();
  const yr = now.getFullYear();
  const m = now.getMonth() + 1;
  const lastDay = new Date(yr, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');

  const qList = ['T57_Q506012', 'T57_Q506013', 'T57_Q506014', 'T57_Q506015'];
  const aExt = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '109', '113', '1018'];

  const basePayload = {
    start_date: `${yr}-${mm}-01 00:00:00`,
    end_date: `${yr}-${mm}-${dd} 23:59:59`,
    queues: qList,
    agents: aExt,
    call_type: 'answered',
    call_wait_limit: 0,
    call_talk_limit: 0,
    initial_period: 10,
    interval: 10,
    max_period: 60,
    summary: 1,
    shift: null,
    tenant_id: '57',
    servicelevel: JSON.stringify(qList.map((q) => ({ name: q, servicelevel: 60 }))),
  };

  const pbxHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const qResp = await fetch(`${PBX_BASE}/calls-by-queue`, {
    method: 'POST',
    headers: pbxHeaders,
    body: JSON.stringify(basePayload),
    cache: 'no-store',
  });
  if (!qResp.ok) return null;
  const qData = await qResp.json();
  const rows: Array<Record<string, unknown>> = (qData?.data || []).filter(
    (r: Record<string, unknown>) => Boolean(r.queue)
  );
  const totOff = rows.reduce((acc, r) => acc + Number(r.offered_calls || 0), 0);
  if (totOff === 0) return null;

  const rowsByCode: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const code = String(r.queue || '').split('-')[0].trim();
    rowsByCode[code] = r;
  }

  // Fetch per-queue agents in parallel directly from Sonata PBX cloud
  const codes = ['506012', '506013', '506014', '506015'];
  const perQueueAgentResults = await Promise.all(
    codes.map(async (code) => {
      const meta = QUEUE_META[code];
      const singlePayload = {
        ...basePayload,
        queues: [meta.q_key],
        servicelevel: JSON.stringify([{ name: meta.q_key, servicelevel: 60 }]),
      };
      const aResp = await fetch(`${PBX_BASE}/agents-on-queue`, {
        method: 'POST',
        headers: pbxHeaders,
        body: JSON.stringify(singlePayload),
        cache: 'no-store',
      });
      if (!aResp.ok) return { code, agents: [] };
      const aJson = await aResp.json();
      return { code, agents: (aJson?.data || []) as Array<Record<string, unknown>> };
    })
  );

  const agentsByCode: Record<string, Array<Record<string, unknown>>> = {};
  for (const item of perQueueAgentResults) {
    agentsByCode[item.code] = item.agents;
  }

  const linesOut = [];
  const monthAgentsMap: Record<
    string,
    { id: string; name: string; timbradas: number; contestadas: number; perdidas: number; durW: number }
  > = {};

  for (const code of codes) {
    const r = rowsByCode[code];
    if (!r) continue;
    const meta = QUEUE_META[code];
    const rec = Number(r.offered_calls || 0);
    const con = Number(r.answered_calls || 0);
    const per = Number(r.abandoned_calls || 0);
    const esp = parseHmsToMin(r.avg_call_waiting_time);
    const sla = parseFloat(String(r.service_level || '0').replace('%', '')) || 0;

    const qAgents = [];
    for (const ag of agentsByCode[code] || []) {
      const ext = String(ag.extension || '');
      const agName = cleanAgentName(ag.agent);
      const agCon = Number(ag.answered_calls || 0);
      const agLost = Number(ag.lost_calls || 0);
      const agTimb = agCon + agLost;
      const agDur = parseHmsToMin(ag.avg_call_time);
      if (agTimb > 0) {
        qAgents.push({
          id: ext,
          name: agName,
          timbradas: agTimb,
          contestadas: agCon,
          perdidas: agLost,
          duracionMin: agDur,
        });
        if (!monthAgentsMap[ext]) {
          monthAgentsMap[ext] = {
            id: ext,
            name: agName,
            timbradas: 0,
            contestadas: 0,
            perdidas: 0,
            durW: 0,
          };
        }
        monthAgentsMap[ext].timbradas += agTimb;
        monthAgentsMap[ext].contestadas += agCon;
        monthAgentsMap[ext].perdidas += agLost;
        monthAgentsMap[ext].durW += agDur * Math.max(1, agCon);
      }
    }
    qAgents.sort((a, b) => b.contestadas - a.contestadas);

    linesOut.push({
      id: code,
      name: meta.name,
      isMutual: meta.isMutual,
      recibidas: rec,
      contestadas: con,
      perdidas: per,
      esperaMin: esp,
      slaPct: sla,
      agents: qAgents,
    });
  }

  const agentsOut = Object.values(monthAgentsMap)
    .map((a) => ({
      id: a.id,
      name: a.name,
      timbradas: a.timbradas,
      contestadas: a.contestadas,
      perdidas: a.perdidas,
      duracionMin: Math.round((a.durW / Math.max(1, a.contestadas)) * 10) / 10,
    }))
    .sort((a, b) => b.contestadas - a.contestadas);

  return {
    year: yr,
    monthNum: m,
    month: MONTH_NAMES[m],
    lines: linesOut,
    agents: agentsOut,
  };
}

export async function GET() {
  try {
    const liveMonth = await fetchLiveCurrentMonthPbx();
    const baseMonths = [...(rawData.contactCenterMonthly || [])];
    if (liveMonth) {
      const idx = baseMonths.findIndex(
        (item) => item.year === liveMonth.year && item.monthNum === liveMonth.monthNum
      );
      if (idx >= 0) {
        baseMonths[idx] = liveMonth;
      } else {
        baseMonths.push(liveMonth);
      }
    }
    return NextResponse.json({
      ...rawData,
      updatedAt: new Date().toISOString(),
      liveCloudSync: Boolean(liveMonth),
      contactCenterMonthly: baseMonths,
    });
  } catch {
    return NextResponse.json(rawData);
  }
}
