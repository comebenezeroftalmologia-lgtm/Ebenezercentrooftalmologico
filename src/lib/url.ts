/** Construye un query string a partir de los parámetros actuales de la
 * URL más overrides puntuales (undefined = quitar ese parámetro). Se
 * usa para que los filtros (tarjetas de estado, rango de fechas, etc.)
 * naveguen preservando el resto de filtros activos. */
export function buildHref(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}
