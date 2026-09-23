/** Normaliza texto para comparar nombres de etapa/campos sin depender de
 * mayusculas, acentos, guiones o espacios exactos (Clientify no siempre es
 * consistente — p.ej. "Asiste a Valoración - PTE Agendamiento" vs. la
 * etapa esperada sin el guion). Cualquier corrida de caracteres que no
 * sea letra/numero se colapsa a un solo espacio antes de comparar. */
export function normalizeStage(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function formatCOP(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
