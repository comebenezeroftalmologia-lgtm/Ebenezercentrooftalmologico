import type { ReactNode } from "react";

/**
 * Una sección. Sin caja.
 *
 * Esto es lo que más cambia el aspecto de la pantalla. Antes cada bloque era
 * un recuadro blanco con borde y esquinas redondeadas sobre fondo gris: la
 * firma visual de un tablero genérico. Attio y Mercury no dibujan casi
 * ningún borde — separan con una línea de 1px y con aire, y dejan que el
 * tamaño de la letra haga el agrupamiento.
 *
 * El rótulo va diminuto, en mayúsculas y espaciado, y la sección respira
 * arriba. Nada más.
 */
export function Seccion({
  titulo,
  derecha,
  children,
  retraso = 0,
  sinLinea = false,
}: {
  titulo?: string;
  /** Lo que va alineado a la derecha del rótulo: una regla, un enlace. */
  derecha?: ReactNode;
  children: ReactNode;
  /** Milisegundos de retraso en la entrada, para escalonar las secciones. */
  retraso?: number;
  sinLinea?: boolean;
}) {
  return (
    <section
      className={`animate-asomar ${sinLinea ? "pt-7" : "border-t border-line-2 pt-7"} pb-1`}
      style={{ animationDelay: `${retraso}ms` }}
    >
      {titulo ? (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
            {titulo}
          </h2>
          {derecha ? <div className="text-[12px] text-ink-3">{derecha}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
