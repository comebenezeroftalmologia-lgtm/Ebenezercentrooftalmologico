import type { ReactNode } from "react";

/**
 * El encabezado de todas las páginas.
 *
 * Hasta ahora cada página escribía el suyo a mano, con el mismo bloque
 * copiado ocho veces y con diferencias pequeñas entre una y otra —márgenes
 * distintos, unas con subtítulo y otras no, y Frecuencias directamente sin
 * título—. Por eso ninguna se veía igual a la siguiente.
 *
 * Esto es un solo sitio. Si mañana cambia el tamaño del título, cambia en
 * las ocho.
 */
export function EncabezadoPagina({
  titulo,
  seccion = "Tableros",
  bajada,
  acciones,
}: {
  titulo: string;
  /** La miga de pan de arriba. "Tableros · Operación", por ejemplo. */
  seccion?: string;
  bajada?: string;
  /** Filtros, selectores de fecha, botones: lo que va a la derecha. */
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 animate-entrar">
      <div>
        <div className="mb-1 text-[11px] tracking-overline text-ink-3">
          {seccion}
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-navy">
          {titulo}
        </h1>
        {bajada ? <p className="mt-1 text-sm text-ink-3">{bajada}</p> : null}
      </div>
      {acciones ? (
        <div className="flex flex-wrap items-center gap-2">{acciones}</div>
      ) : null}
    </div>
  );
}
