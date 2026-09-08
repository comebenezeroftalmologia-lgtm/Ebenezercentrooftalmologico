/** Normaliza texto para comparar nombres de etapa/campos sin depender de
 * mayusculas o acentos exactos (Clientify no siempre es consistente). */
export function normalizeStage(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
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
