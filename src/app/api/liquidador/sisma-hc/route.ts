import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const SISMA_BASE = "https://api.centrooftalmologicoebenezer.com/node/api";
const SISMA_KEY = "ynrViZLIPJ6hrwhtTMbBvh7ecEmhkasc7UceX8O4s/A=";

function addDays(iso, days) {
  const d = new Date(iso + "T12:00:00Z");
  if (isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function detectarLadoHC(resTxt, plantilla, examen) {
  const T = norm(resTxt);
  if (!T) return { lado: null, nota: "Sin texto de resultado en HC" };

  // 1) Formato con secciones "| O . D:" y "| O . I:" (Campo Visual, OCT, Topografia Ojo Seco)
  const parts = T.split("|").map(x => x.trim());
  let odVal = null, oiVal = null;
  for (const p of parts) {
    const mD = p.match(/^(?:DIAMETRO DE PUPILA\s+)?O\s*\.?\s*D\s*:+\s*([\s\S]*)$/);
    if (mD && (odVal === null || /^O\s*\.?\s*D\s*:/.test(p))) odVal = mD[1].trim();
    const mI = p.match(/^(?:DIAMETRO DE PUPILA\s+)?O\s*\.?\s*I\s*:+\s*([\s\S]*)$/);
    if (mI && (oiVal === null || /^O\s*\.?\s*I\s*:/.test(p))) oiVal = mI[1].trim();
  }
  if (odVal !== null && oiVal !== null) {
    const naRe = /^(NO APLICA|N\/A|-|SIN DATO|NO SE REALIZA|NO VALORABLE|VACIO|)$/;
    const odNA = naRe.test(odVal) || /\bNO APLICA\b/.test(odVal);
    const oiNA = naRe.test(oiVal) || /\bNO APLICA\b/.test(oiVal);
    if (odNA && !oiNA) return { lado: "un", ojo: "OI", nota: "Solo OI (OD: NO APLICA)" };
    if (oiNA && !odNA) return { lado: "un", ojo: "OD", nota: "Solo OD (OI: NO APLICA)" };
    if (!odNA && !oiNA) return { lado: "ambos", ojo: "AO", nota: "Ambos ojos (OD y OI le?dos)" };
  }

  // 2) Formato con campos "OJO DERECHO:" y "OJO IZQUIERDO:" o "OD:" / "OI:"
  const mOD2 = T.match(/(?:LONGITUD AXIAL AL OJO DERECHO|DENSIDAD OJO DERECHO|K1 OJO DERECHO|MEDIA OD|FOTO COLOR OD|ENERGIA OD)\s*:\s*([^|\n]+)/);
  const mOI2 = T.match(/(?:LONGITUD AXIAL AL OJO IZQUIERDO|DENSIDAD OJO IZQUIERDO|K1 OJO IZQUIERDO|MEDIA OI|FOTO COLOR OI|ENERGIA OI)\s*:\s*([^|\n]+)/);
  if (mOD2 && mOI2) {
    const vD = mOD2[1].trim(), vI = mOI2[1].trim();
    const dEmpty = /^(-|NO APLICA|N\/A|0|SIN DATO|)$/.test(vD);
    const iEmpty = /^(-|NO APLICA|N\/A|0|SIN DATO|)$/.test(vI);
    if (dEmpty && !iEmpty) return { lado: "un", ojo: "OI", nota: "Solo OI registrado en HC" };
    if (iEmpty && !dEmpty) return { lado: "un", ojo: "OD", nota: "Solo OD registrado en HC" };
    if (!dEmpty && !iEmpty) return { lado: "ambos", ojo: "AO", nota: "Ambos ojos registrados en HC" };
  }

  // 3) Formato narrativo (Iridotomia, Capsulotomia, Fotocoagulacion, Plastia, Ecografia, Interferometria)
  if (/AMBOS OJOS|\bAO\b|\bODI\b|\(BILATERAL\)/.test(T)) {
    return { lado: "ambos", ojo: "AO", nota: "Ambos ojos en HC" };
  }
  const hasOD = /OJO DERECHO|\bOD\b/.test(T);
  const hasOI = /OJO IZQUIERDO|\bOI\b/.test(T);
  if (hasOD && hasOI) return { lado: "ambos", ojo: "AO", nota: "OD y OI descritos en HC" };
  if (hasOD && !hasOI) return { lado: "un", ojo: "OD", nota: "Solo Ojo Derecho en HC" };
  if (hasOI && !hasOD) return { lado: "un", ojo: "OI", nota: "Solo Ojo Izquierdo en HC" };

  return { lado: null, nota: "Registrado en HC" };
}

function srvTag(s) {
  const D = norm(s);
  if (/CAMPO VISUAL|CAMPIMETR/.test(D)) return "CV";
  if (/ANGIOTOMOGRAF|TOMOGRAF|\bOCT\b/.test(D)) return "OCT";
  if (/ANGIOGRAF/.test(D)) return "ANGIO";
  if (/FOTODISCO|FOTOGRAF/.test(D)) return "FOTO";
  if (/ECOGRAF/.test(D)) return "ECO";
  if (/BIOMETR/.test(D)) return "BIO";
  if (/PAQUIMETR/.test(D)) return "PAQ";
  if (/TOPOGRAF|PENTACAM|SIRIUS|OCULYZER/.test(D)) return "TOPO";
  if (/ENDOTELIAL/.test(D)) return "ENDO";
  if (/INTERFEROMETR/.test(D)) return "INTERF";
  if (/ABERROMETR/.test(D)) return "ABERR";
  if (/IRIDOTOM|IRIDOPLAST/.test(D)) return "IRIDO";
  if (/CAPSULOTOM/.test(D)) return "CAPSULO";
  if (/TRABECULOPLAST/.test(D)) return "TRABEC";
  if (/FOTOCOAGULAC|ABLACION/.test(D)) return "FOTOCOAG";
  if (/PLASTIA|PLUG|TAPON|PUNTO LAGRIMAL/.test(D)) return "PLASTIA";
  if (/TONOGRAF/.test(D)) return "TONO";
  if (/LUZ PULSADA|IURPL|FOTOBIOMOD|OJO SECO/.test(D)) return "IPL";
  if (/LENTE TERAPEUTICO|CUERPO EXTRA/.test(D)) return "LENTETER";
  return "OTRO";
}

function parseCsvSimple(txt) {
  const clean = String(txt || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const lines = clean.split("\n");
  const splitLine = (line) => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ";" && !inQ) {
        out.push(cur); cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const hdrs = splitLine(lines[0]).map(h => h.trim().toUpperCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitLine(lines[i]);
    const obj = {};
    for (let j = 0; j < hdrs.length; j++) obj[hdrs[j]] = (cols[j] || "").trim();
    rows.push(obj);
  }
  return rows;
}

async function buildSismaHcPayload(desde, hasta) {
  const hastaPlus = addDays(hasta, 6);
  const desdeOrd = addDays(desde, -75);
  const desdeQx = addDays(desde, -45);
  const headersJson = { "X-Api-Key": SISMA_KEY, "Accept": "application/json" };
  const headersCsv = { "X-Api-Key": SISMA_KEY, "Accept": "text/csv" };

  const [parRes, ordRes, qxRes] = await Promise.allSettled([
    fetch(`${SISMA_BASE}/informes/paraclinicos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hastaPlus)}&formato=json`, { headers: headersJson }),
    fetch(`${SISMA_BASE}/ordenamientos?desde=${encodeURIComponent(desdeOrd)}&hasta=${encodeURIComponent(hasta)}&tipo=detalle&formato=csv&separador=%3B`, { headers: headersCsv }),
    fetch(`${SISMA_BASE}/informes/programacion-qx?desde=${encodeURIComponent(desdeQx)}&hasta=${encodeURIComponent(hasta)}&estado=A&formato=csv&separador=%3B`, { headers: headersCsv })
  ]);

  const hc = {};
  const ord = {};
  const ivSet = new Set();

  if (parRes.status === "fulfilled" && parRes.value.ok) {
    const data = await parRes.value.json();
    const list = Array.isArray(data) ? data : (data.data || data.filas || data.rows || []);
    for (const r of list) {
      const ced = String(r.DOCUMENTO || "").replace(/\D/g, "");
      if (!ced) continue;
      const ex = String(r.EXAMEN || "");
      const pl = String(r.PLANTILLA || "");
      const resTxt = String(r.RESULTADO || "");
      const tag = srvTag(ex + " " + pl);
      const det = detectarLadoHC(resTxt, pl, ex);
      if (/INTRAVIT|AFLIBERCEPT|RANIBIZUMAB|BEVACIZUMAB|FARICIMAB|OZURDEX|ANTIANGIOG/i.test(ex + " " + resTxt)) {
        ivSet.add(ced);
      }
      if (!hc[ced]) hc[ced] = [];
      hc[ced].push({
        id: r.ID_PARACLINICO || "",
        f: String(r.FECHA || "").slice(0, 10),
        fr: String(r.FECHA_RESULTADO || "").slice(0, 16),
        cod: r.CODIGO || "",
        ex,
        pl,
        tag,
        med: r.MEDICO || r.REGISTRADO_POR || "",
        lado: det.lado,
        ojo: det.ojo || "",
        nota: det.nota,
        res: resTxt.slice(0, 1800)
      });
    }
  }

  if (ordRes.status === "fulfilled" && ordRes.value.ok) {
    const csvTxt = await ordRes.value.text();
    const rows = parseCsvSimple(csvTxt);
    for (const r of rows) {
      if (r.TIPO_REGISTRO && !/DETALLE/i.test(r.TIPO_REGISTRO)) continue;
      const mCed = String(r.IDENTIFICACION || "").match(/(\d{5,12})/);
      const ced = mCed ? mCed[1] : "";
      if (!ced) continue;
      const desc = String(r.DESCRIPCION || "");
      if (/INTRAVIT|AFLIBERCEPT|RANIBIZUMAB|BEVACIZUMAB|FARICIMAB|OZURDEX|ANTIANGIOG/i.test(desc)) {
        ivSet.add(ced);
      }
      const tag = srvTag(desc);
      if (tag === "OTRO" && !/BILATERAL|UNILATERAL|OJO/i.test(desc)) continue;
      const q = parseInt(r.CANTIDAD || "1", 10) || 1;
      const ladoOrd = /BILATERAL|AMBOS OJOS/i.test(desc) || q >= 2 ? "ambos" : (/UNILATERAL|OJO DERECHO|OJO IZQUIERDO/i.test(desc) ? "un" : null);
      if (!ord[ced]) ord[ced] = [];
      ord[ced].push({
        ord: r["NUMERO ORDENAMIENTO"] || "",
        f: String(r["FECHA ORDENAMIENTO"] || "").slice(0, 10),
        cups: r.CUPS || "",
        desc,
        q,
        med: r.MEDICO || "",
        tag,
        lado: ladoOrd
      });
    }
  }

  if (qxRes.status === "fulfilled" && qxRes.value.ok) {
    const csvTxt = await qxRes.value.text();
    const rows = parseCsvSimple(csvTxt);
    for (const r of rows) {
      const f = String(r.FECHA_PROGRAMADA || "").slice(0, 10);
      if (f < desde || f > hasta) continue;
      const proc = String(r.PROCEDIMIENTO || "");
      if (/INTRAVIT|AFLIBERCEPT|RANIBIZUMAB|BEVACIZUMAB|FARICIMAB|OZURDEX|ANTIANGIOG/i.test(proc)) {
        const ced = String(r.DOCUMENTO || "").replace(/\D/g, "");
        if (ced) ivSet.add(ced);
      }
    }
  }

  return { ok: true, desde, hasta, hc, ord, ivCeds: Array.from(ivSet) };
}

export async function GET(req: NextRequest) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde") || "2026-09-26";
    const hasta = searchParams.get("hasta") || "2026-10-25";
    const payload = await buildSismaHcPayload(desde, hasta);
    return NextResponse.json(payload, { headers: cors });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500, headers: cors });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
