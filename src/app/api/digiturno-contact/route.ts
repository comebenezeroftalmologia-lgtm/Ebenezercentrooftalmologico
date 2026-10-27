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

async function fetchLatestCloudJson(): Promise<typeof rawData> {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/comebenezeroftalmologia-lgtm/Ebenezercentrooftalmologico/main/src/lib/digiturno-contact-data.json',
      { cache: 'no-store', signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.digiturnoMonthly) && Array.isArray(data.contactCenterMonthly)) {
        return data;
      }
    }
  } catch {}
  return rawData;
}

function cleanAgentName(raw: unknown): string {
  const s = String(raw || '').trim();
  const parts = s.includes(' - ') ? s.split(' - ').slice(1).join(' - ').trim() : s;
  const words = parts.split(/\s+/).filter(Boolean);
  const short = words.slice(0, 2).join(' ');
  return short
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

async function fetchLiveCurrentMonthQueues(existingMonth?: (typeof rawData.contactCenterMonthly)[number]) {
  try {
    const loginRes = await fetch(`${PBX_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: PBX_USER, password: PBX_PASS }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
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

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const qResp = await fetch(`${PBX_BASE}/calls-by-queue`, {
      method: 'POST',
      headers,
      body: JSON.stringify(basePayload),
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
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

    const codes = ['506012', '506013', '506014', '506015'];
    const agentPromises = codes.map(async (code) => {
      const meta = QUEUE_META[code];
      try {
        const singlePayload = {
          ...basePayload,
          queues: [meta.q_key],
          servicelevel: JSON.stringify([{ name: meta.q_key, servicelevel: 60 }]),
        };
        const aResp = await fetch(`${PBX_BASE}/agents-on-queue`, {
          method: 'POST',
          headers,
          body: JSON.stringify(singlePayload),
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!aResp.ok) return { code, agents: null };
        const aData = await aResp.json();
        const qAgents = [];
        for (const ag of aData?.data || []) {
          const ext = String(ag.extension || '');
          const name = cleanAgentName(ag.agent);
          const con = Number(ag.answered_calls || 0);
          const lost = Number(ag.lost_calls || 0);
          const timb = con + lost;
          const dur = parseHmsToMin(ag.avg_call_time);
          if (timb > 0) {
            qAgents.push({
              id: ext,
              name,
              timbradas: timb,
              contestadas: con,
              perdidas: lost,
              duracionMin: dur,
            });
          }
        }
        qAgents.sort((a, b) => b.contestadas - a.contestadas || b.timbradas - a.timbradas);
        return { code, agents: qAgents };
      } catch {
        return { code, agents: null };
      }
    });

    const agentResults = await Promise.all(agentPromises);
    const agentsByCode: Record<string, typeof existingMonth extends undefined ? never : NonNullable<(typeof rawData.contactCenterMonthly)[number]['lines'][number]['agents']>> = {};
    for (const item of agentResults) {
      if (item.agents && item.agents.length > 0) {
        agentsByCode[item.code] = item.agents;
      }
    }

    const linesOut = [];
    const monthAgentsMap: Record<
      string,
      { id: string; name: string; timbradas: number; contestadas: number; perdidas: number; duracionWeighted: number }
    > = {};

    for (const code of codes) {
      const r = rowsByCode[code];
      if (!r) continue;
      const meta = QUEUE_META[code];
      const existingLine = existingMonth?.lines?.find((l) => l.id === code);
      const lineAgents = agentsByCode[code] || existingLine?.agents || [];
      for (const qa of lineAgents) {
        if (!monthAgentsMap[qa.id]) {
          monthAgentsMap[qa.id] = {
            id: qa.id,
            name: qa.name,
            timbradas: 0,
            contestadas: 0,
            perdidas: 0,
            duracionWeighted: 0,
          };
        }
        monthAgentsMap[qa.id].timbradas += qa.timbradas;
        monthAgentsMap[qa.id].contestadas += qa.contestadas;
        monthAgentsMap[qa.id].perdidas += qa.perdidas;
        monthAgentsMap[qa.id].duracionWeighted += qa.duracionMin * Math.max(1, qa.contestadas);
      }

      linesOut.push({
        id: code,
        name: meta.name,
        isMutual: meta.isMutual,
        recibidas: Number(r.offered_calls || 0),
        contestadas: Number(r.answered_calls || 0),
        perdidas: Number(r.abandoned_calls || 0),
        esperaMin: parseHmsToMin(r.avg_call_waiting_time),
        slaPct: parseFloat(String(r.service_level || '0').replace('%', '')) || 0,
        agents: lineAgents,
      });
    }

    const agentsOut = Object.values(monthAgentsMap)
      .map((a) => ({
        id: a.id,
        name: a.name,
        timbradas: a.timbradas,
        contestadas: a.contestadas,
        perdidas: a.perdidas,
        duracionMin: Math.round((a.duracionWeighted / Math.max(1, a.contestadas)) * 10) / 10,
      }))
      .sort((a, b) => b.contestadas - a.contestadas || b.timbradas - a.timbradas);

    return {
      year: yr,
      monthNum: m,
      month: MONTH_NAMES[m],
      lines: linesOut,
      agents: agentsOut.length > 0 ? agentsOut : existingMonth?.agents || [],
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const latestJson = await fetchLatestCloudJson();
    const baseMonths = [...(latestJson.contactCenterMonthly || [])];
    const now = new Date();
    const curYr = now.getFullYear();
    const curM = now.getMonth() + 1;
    const existingIdx = baseMonths.findIndex((item) => item.year === curYr && item.monthNum === curM);
    const existingMonth = existingIdx >= 0 ? baseMonths[existingIdx] : undefined;

    const liveMonth = await fetchLiveCurrentMonthQueues(existingMonth);
    if (liveMonth) {
      if (existingIdx >= 0) {
        baseMonths[existingIdx] = liveMonth;
      } else {
        baseMonths.push(liveMonth);
      }
    }
    return NextResponse.json({
      ...latestJson,
      updatedAt: liveMonth ? new Date().toISOString() : latestJson.updatedAt,
      liveCloudSync: Boolean(liveMonth),
      contactCenterMonthly: baseMonths,
    });
  } catch {
    return NextResponse.json(rawData);
  }
}
