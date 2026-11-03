// Reglas compartidas de la base de afiliados de MutualSer (validación y sincronización).

/** Documento comparable: solo letras y números, en mayúsculas (cubre CC, TI, RC, CE, PT, pasaportes). */
export function normalizarDocumento(v: unknown): string {
  return String(v ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

/**
 * Los 11 municipios de afiliación que Ebenezer atiende por MutualSer
 * (regla definida por Ebenezer el 13-oct-2026), con su código DANE (departamento 13 = Bolívar).
 */
export const MUNICIPIO_POR_CODIGO: Record<string, string> = {
  "001": "Cartagena",
  "836": "Turbaco",
  "052": "Arjona",
  "442": "María la Baja",
  "838": "Turbaná",
  "620": "San Cristóbal",
  "873": "Villanueva",
  "683": "Santa Rosa",
  "647": "San Estanislao",
  "433": "Mahates",
  "760": "Soplaviento",
};

export const MUNICIPIOS_ATENDIDOS = new Set(Object.values(MUNICIPIO_POR_CODIGO));
