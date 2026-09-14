/**
 * Categoriza el "asunto" (tipo de consulta) de una cita de SISMA, por
 * el NOMBRE del asunto — SISMA no expone un campo de categoría ni un
 * vínculo entre una cita y la que "resultó" de ella, así que esto es
 * una clasificación por patrón de texto, no un dato exacto de origen.
 * Confirmado contra el catálogo real de ~90 tipos de consulta
 * (2026-09-13): los controles y posquirúrgicos SÍ se nombran de forma
 * consistente ("... CONTROL", "POSQUIRURGICO..."), lo que hace este
 * patrón confiable para ese caso puntual — pero sigue siendo inferido
 * por nombre, nunca lo mostramos como si fuera un vínculo garantizado.
 */

export type SismaCategoria =
  | "primera_vez"
  | "control"
  | "posquirurgico"
  | "prequirurgico"
  | "diagnostico"
  | "otro";

export const SISMA_CATEGORIA_LABELS: Record<SismaCategoria, string> = {
  primera_vez: "Primera Vez",
  control: "Control",
  posquirurgico: "Posquirúrgico",
  prequirurgico: "Prequirúrgico",
  diagnostico: "Diagnóstico / Procedimiento",
  otro: "Otro",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const DIAGNOSTICO_KEYWORDS = [
  "tomografia",
  "biometria",
  "topografia",
  "campo visual",
  "angiografia",
  "angiotomografia",
  "paquimetria",
  "fotografia",
  "tonometria",
  "tonografia",
  "interferometria",
  "aberrometria",
  "citologia",
  "recuento endot",
  "test de",
];

export function categorizeAsunto(nombre: string | null | undefined): SismaCategoria {
  if (!nombre) return "otro";
  const n = normalize(nombre);
  if (n.includes("posquirurg") || n.includes("posqx") || n.includes("pos qx")) return "posquirurgico";
  if (n.includes("pre - quirurg") || n.includes("prequirurg") || n.includes("pre quirurg")) {
    return "prequirurgico";
  }
  if (n.includes("control")) return "control";
  if (n.includes("primera vez") || n.includes("primer vez")) return "primera_vez";
  if (DIAGNOSTICO_KEYWORDS.some((k) => n.includes(k))) return "diagnostico";
  return "otro";
}
