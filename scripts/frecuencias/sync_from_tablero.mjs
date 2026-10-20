import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const localFallbackHtml = path.join(repoRoot, "public", "Dashboard_Frecuencias.html");

const PAT = process.env.TABLERO_EBENEZER_PAT;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tablero-ebenezer-"));

try {
  let htmlPath = null;
  if (PAT) {
    try {
      const REMOTE = `https://${PAT}@github.com/pedroluisherrerabenitez5-design/tablero-ebenezer.git`;
      console.log("Clonando tablero-ebenezer (solo lectura, shallow)...");
      execFileSync(
        "git",
        ["clone", "--depth", "1", "--filter=blob:none", "--no-checkout", REMOTE, tmpDir],
        { stdio: ["ignore", "inherit", "inherit"] }
      );
      execFileSync("git", ["-C", tmpDir, "checkout", "main", "--", "Dashboard_Frecuencias.html"], {
        stdio: ["ignore", "inherit", "inherit"],
      });
      const clonedHtml = path.join(tmpDir, "Dashboard_Frecuencias.html");
      if (fs.existsSync(clonedHtml)) {
        htmlPath = clonedHtml;
      }
    } catch (err) {
      console.warn("Aviso: No se pudo clonar tablero-ebenezer en vivo, usando respaldo local en public/Dashboard_Frecuencias.html");
    }
  }

  if (!htmlPath && fs.existsSync(localFallbackHtml)) {
    console.log("Usando respaldo local:", localFallbackHtml);
    htmlPath = localFallbackHtml;
  }

  if (!htmlPath || !fs.existsSync(htmlPath)) {
    console.error("No se encontró Dashboard_Frecuencias.html ni en el repo remoto ni en public/.");
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const m = html.match(/const RAW\s*=\s*(\{[\s\S]*?\});/);
  if (!m) {
    console.error("No se encontró 'const RAW = {...};' en el HTML.");
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