// Sincroniza el módulo "Frecuencias" con el tablero de Pedro Luis Herrera
// (repo privado tablero-ebenezer, motor en Python + API SISMA).
//
// Qué hace:
//   1. Clona (shallow) tablero-ebenezer usando TABLERO_EBENEZER_PAT
//      (token fine-grained, Contents: Read-only, solo ese repo).
//   2. Extrae el objeto `RAW` embebido en Dashboard_Frecuencias.html
//      (el mismo dato que ya cargábamos a mano — ver ingest.mjs).
//   3. Guarda una copia en scripts/frecuencias/data/frecuencias_raw.json.
//   4. Llama a ingest.mjs para cargarlo en Supabase (upsert, no destructivo).
//
// No modifica el repo de Pedro en absoluto (solo lectura). Pensado para
// correr en un cron de GitHub Actions de ESTE repo (Ebenezer Marketing_Platform).
//
// Uso: TABLERO_EBENEZER_PAT=... node scripts/frecuencias/sync_from_tablero.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const PAT = process.env.TABLERO_EBENEZER_PAT;
if (!PAT) {
  console.error("Falta TABLERO_EBENEZER_PAT en el entorno.");
  process.exit(1);
}

const REMOTE = `https://${PAT}@github.com/pedroluisherrerabenitez5-design/tablero-ebenezer.git`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tablero-ebenezer-"));

try {
  console.log("Clonando tablero-ebenezer (solo lectura, shallow)...");
  execFileSync(
    "git",
    ["clone", "--depth", "1", "--filter=blob:none", "--no-checkout", REMOTE, tmpDir],
    { stdio: ["ignore", "inherit", "inherit"] }
  );
  execFileSync("git", ["-C", tmpDir, "checkout", "main", "--", "Dashboard_Frecuencias.html"], {
    stdio: ["ignore", "inherit", "inherit"],
  });

  const htmlPath = path.join(tmpDir, "Dashboard_Frecuencias.html");
  if (!fs.existsSync(htmlPath)) {
    console.error("No se encontró Dashboard_Frecuencias.html en el repo clonado.");
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const m = html.match(/const RAW\s*=\s*(\{[\s\S]*?\});/);
  if (!m) {
    console.error("No se encontró 'const RAW = {...};' en el HTML — ¿cambió el formato del template?");
    process.exit(1);
  }

  const raw = JSON.parse(m[1]);
  console.log(`RAW extraído. Snapshot fuente: ${raw.file ?? "(sin nombre)"}`);

  const outDir = path.join(repoRoot, "scripts", "frecuencias", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "frecuencias_raw.json");
  fs.writeFileSync(outPath, JSON.stringify(raw));
  console.log(`Guardado en ${path.relative(repoRoot, outPath)} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);

  console.log("Cargando a Supabase (ingest.mjs)...");
  execFileSync("node", [path.join(__dirname, "ingest.mjs"), outPath], {
    stdio: "inherit",
    cwd: repoRoot,
  });

  console.log("Sincronización completa.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
