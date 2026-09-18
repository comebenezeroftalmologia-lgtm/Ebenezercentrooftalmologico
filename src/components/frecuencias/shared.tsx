// Piezas compartidas entre las pestañas del módulo nativo "Frecuencias"
// (reconstrucción del tablero de Pedro Herrera): formato de meses,
// colores, el toggle Mutual (filtro de cliente por nombre de grupo) y
// celdas de tabla reutilizables (Dif./%Var).

import { formatCOP, formatNumber } from "@/lib/text";

export const MES_ORDEN = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
export const MES_CORTO: Record<string, string> = {
  enero: "Ene",
  febrero: "Feb",
  marzo: "Mar",
  abril: "Abr",
  mayo: "May",
  junio: "Jun",
  julio: "Jul",
  agosto: "Ago",
  septiembre: "Sep",
  octubre: "Oct",
  noviembre: "Nov",
  diciembre: "Dic",
};
export const MES_LARGO: Record<string, string> = {
  enero: "Enero",
  febrero: "Febrero",
  marzo: "Marzo",
  abril: "Abril",
  mayo: "Mayo",
  junio: "Junio",
  julio: "Julio",
  agosto: "Agosto",
  septiembre: "Septiembre",
  octubre: "Octubre",
  noviembre: "Noviembre",
  diciembre: "Diciembre",
};

/** Un grupo/empresa se considera "Mutual" si su nombre contiene esta
 * palabra — igual que `grpList()` en el tablero original. El toggle
 * Incluir/Excluir Mutual es puramente un filtro de cliente sobre datos
 * ya agregados, no una consulta distinta. */
export const MUTUAL_RE = /MUTUAL/i;

export const YEAR_COLORS = ["#B0C0D3", "#0F2FF3", "#21814B", "#F2994A", "#9B51E0"];
export const GREEN = "#059669";
export const RED = "#DC2626";

export type Mode = "freq" | "val";

export function fmtVal(mode: Mode, v: number): string {
  return mode === "val" ? formatCOP(v) : formatNumber(v);
}

export function DeltaCell({ value, mode }: { value: number; mode: Mode }) {
  const color = value >= 0 ? GREEN : RED;
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color }}>
      {value >= 0 ? "+" : ""}
      {fmtVal(mode, value)}
    </td>
  );
}

/** Celda de % de variación entre dos valores — replica `pillHTML` /
 * `pctTd` del tablero original: "Nuevo" cuando no había base, "0%"
 * cuando ambos son cero. */
export function PctCell({ before, after }: { before: number; after: number }) {
  if (!before) {
    return (
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color: after ? GREEN : "#94A3B8" }}>
        {after ? "Nuevo" : "0%"}
      </td>
    );
  }
  const pct = ((after - before) / before) * 100;
  const color = pct >= 0 ? GREEN : RED;
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold" style={{ color }}>
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </td>
  );
}

/** Solo el texto "+12.3%" / "Nuevo" / "0%" (sin <td>), para usar dentro
 * de una celda que ya trae su propio wrapper — replica `pillHTML`. */
export function pctPill(before: number, after: number): { text: string; color: string } {
  if (before === 0 && after === 0) return { text: "0%", color: "#94A3B8" };
  if (before === 0) return { text: "Nuevo", color: GREEN };
  const pct = ((after - before) / before) * 100;
  const color = pct >= 0 ? GREEN : RED;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, color };
}
