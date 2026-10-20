import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import carteraDataStatic from "@/lib/cartera-data.json";

const SISMA_API_BASE = "https://api.centrooftalmologicoebenezer.com/node/api";
const SISMA_API_KEY = process.env.SISMA_API_KEY || "4YlaXqPrHpJmvTtH/ik8np4l6kr6bjv3OcofgdTK3dI=";

function getLocalJsonPath() {
  return path.join(process.cwd(), "src", "lib", "cartera-data.json");
}

function readCurrentData() {
  try {
    const p = getLocalJsonPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // Fallback to static bundle in serverless read-only environments
  }
  return carteraDataStatic;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fechaCorte = searchParams.get("fecha_corte") || "2026-09-30";
  const fechaInicio = searchParams.get("fecha_inicio") || "2026-01-01";

  const baseData = readCurrentData();
  let sismaBackLive = null;
  let conexionSismaBackActiva = false;
  let mensajeConexion = "Pendiente habilitación de endpoints SISMA Back con Faber (/api/informes/sisma-back/analisis-vencimiento y /auxiliar-giros)";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const [vencRes, girosRes] = await Promise.all([
      fetch(`${SISMA_API_BASE}/informes/sisma-back/analisis-vencimiento?fecha_corte=${encodeURIComponent(fechaCorte)}`, {
        headers: { "X-API-Key": SISMA_API_KEY, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      }),
      fetch(`${SISMA_API_BASE}/informes/sisma-back/auxiliar-giros?fecha_inicio=${encodeURIComponent(fechaInicio)}&fecha_corte=${encodeURIComponent(fechaCorte)}`, {
        headers: { "X-API-Key": SISMA_API_KEY, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      }),
    ]);

    clearTimeout(timeout);

    if (vencRes.ok && girosRes.ok) {
      const vencJson = await vencRes.json();
      const girosJson = await girosRes.json();
      sismaBackLive = { vencimiento: vencJson, giros: girosJson };
      conexionSismaBackActiva = true;
      mensajeConexion = "Conectado en tiempo real a SISMA Back vía API Ebenezer";
    }
  } catch {
    // Endpoints will be enabled with Faber; serve verified SISMA Back cuts and real operational database
  }

  return NextResponse.json({
    ok: true,
    conexionSismaBackActiva,
    mensajeConexion,
    sismaBackLive,
    data: baseData,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, seccion, item, corteModalidad, nuevoCorte } = body;
    const current = readCurrentData();

    if (action === "update_row" && seccion && item && item.id) {
      const list = current[seccion];
      if (Array.isArray(list)) {
        const idx = list.findIndex((r: { id: string }) => r.id === item.id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...item };
        }
      }
    } else if (action === "create_row" && seccion && item) {
      const list = current[seccion];
      if (Array.isArray(list)) {
        list.unshift(item);
      }
    } else if (action === "add_corte_sisma_back" && corteModalidad && nuevoCorte) {
      if (current.sismaBack && current.sismaBack.cortes && Array.isArray(current.sismaBack.cortes[corteModalidad])) {
        const arr = current.sismaBack.cortes[corteModalidad];
        const existingIdx = arr.findIndex((c: { fechaCorte: string }) => c.fechaCorte === nuevoCorte.fechaCorte);
        if (existingIdx !== -1) {
          arr[existingIdx] = nuevoCorte;
        } else {
          arr.push(nuevoCorte);
        }
      }
    }

    current.ultimaActualizacion = new Date().toISOString().slice(0, 10);

    try {
      fs.writeFileSync(getLocalJsonPath(), JSON.stringify(current, null, 2), "utf-8");
    } catch {
      // In serverless read-only filesystem, client-side state & localStorage keep changes active
    }

    return NextResponse.json({ ok: true, data: current });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error procesando actualización" },
      { status: 400 }
    );
  }
}
