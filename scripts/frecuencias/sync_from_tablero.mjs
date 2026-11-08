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

/* ---------------------------------------------------------------------
   POR QUE ESTE ARCHIVO CAMBIO (08-11-2026)

   Aqui habia un respaldo silencioso. Si el clon del tablero fallaba, se
   imprimia un "Aviso:" y se seguia con la copia local de
   public/Dashboard_Frecuencias.html, que es del 13-10-2026 09:35 y ahi
   se quedo congelada.

   Resultado: desde el 18 de octubre, el token TABLERO_EBENEZER_PAT dejo
   de servir, TODAS las corridas cayeron al respaldo y cada una volvio a
   cargar en Supabase la misma foto del 13 de octubre. Las 104 corridas
   salieron en VERDE. Nadie se entero hasta que, tres semanas despues,
   alguien fue a armar el informe de octubre y encontro que:
     - no habia datos del 18 al 31 de octubre
     - el 13 de octubre quedaba incompleto y se reescribia cada vez
     - frecuencias_mensual y frecuencias_conteos no avanzaban
     - Apoyo Terapeutico daba 31 en una tabla y 33 en otra

   Un respaldo callado no protege: cambia una falla visible por datos
   viejos que parecen nuevos, que es mucho peor. Si no se puede traer el
   tablero de verdad, esta corrida no carga NADA y sale en rojo.
   --------------------------------------------------------------------- */

const PERMITIR_RESPALDO = process.env.PERMITIR_RESPALDO_LOCAL === "1";

try {
  let htmlPath = null;
  let motivoFallo = null;

  if (!PAT) {
    motivoFallo = "Falta el secreto TABLERO_EBENEZER_PAT.";
  } else {
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
      } else {
        motivoFallo = "El clon funciono pero no trajo Dashboard_Frecuencias.html.";
      }
    } catch (err) {
      motivoFallo =
        "No se pudo clonar tablero-ebenezer. Lo mas probable es que el token " +
        "TABLERO_EBENEZER_PAT este vencido o revocado.";
    }
  }

  if (!htmlPath) {
    if (PERMITIR_RESPALDO && fs.existsSync(localFallbackHtml)) {
      // Solo a mano, y diciendo de cuando es la foto que se va a cargar.
      console.warn("!! RESPALDO LOCAL ACTIVADO A PROPOSITO (PERMITIR_RESPALDO_LOCAL=1)");
      console.warn("   Se va a cargar una foto vieja:", localFallbackHtml);
      htmlPath = localFallbackHtml;
    } else {
      console.error("");
      console.error("=== NO SE CARGO NADA ===");
      console.error(motivoFallo);
      console.error("");
      console.error("NO se usa la copia local de public/Dashboard_Frecuencias.html:");
      console.error("esta congelada y cargarla sobreescribe Supabase con datos viejos");
      console.error("que despues nadie distingue de los buenos. Eso ya paso: del");
      console.error("18-oct al 8-nov de 2026 se recargo 40 veces la foto del 13-oct.");
      console.error("");
      console.error("Que hacer: renovar el secreto TABLERO_EBENEZER_PAT en");
      console.error("Settings > Secrets and variables > Actions, y volver a correr.");
      console.error("Las tablas quedan como estaban; no se toco ninguna.");
      process.exit(1);
    }
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