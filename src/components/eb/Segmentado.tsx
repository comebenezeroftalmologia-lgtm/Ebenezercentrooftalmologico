"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * El interruptor de varias opciones, con la pastilla que se desliza.
 *
 * Que la pastilla se deslice en vez de saltar es la diferencia entre un
 * control y un gesto. Cuesta veinte líneas y es de lo que más se siente.
 *
 * Reemplaza a los "Incluir / Excluir" y "Sede 1 / Sede 2" que hoy están
 * escritos a mano en cada página con dos botones y una clase condicional.
 */
export function Segmentado<T extends string>({
  valor,
  opciones,
  onCambio,
  etiqueta,
}: {
  valor: T;
  opciones: { v: T; t: string }[];
  onCambio: (v: T) => void;
  etiqueta?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [pastilla, setPastilla] = useState({ x: 0, w: 0 });

  // Se mide después de pintar, no antes: si se mide antes, el ancho del
  // texto todavía no existe y la pastilla arranca descuadrada.
  useLayoutEffect(() => {
    const c = caja.current;
    if (!c) return;
    const activo = c.querySelector<HTMLButtonElement>("[data-on='si']");
    if (activo) setPastilla({ x: activo.offsetLeft - 2, w: activo.offsetWidth });
  }, [valor, opciones]);

  return (
    <div className="flex flex-col gap-1">
      {etiqueta ? (
        <span className="text-[11px] tracking-overline text-ink-3">{etiqueta}</span>
      ) : null}
      <div
        ref={caja}
        className="relative flex rounded-sm bg-line-2 p-0.5"
        role="tablist"
      >
        <div
          className="absolute top-0.5 left-0.5 rounded-xs bg-white shadow-eb-1 transition-[transform,width] duration-gesto ease-eb-entrada"
          style={{
            height: "calc(100% - 4px)",
            width: pastilla.w,
            transform: `translateX(${pastilla.x}px)`,
          }}
        />
        {opciones.map((o) => (
          <button
            key={o.v}
            type="button"
            role="tab"
            data-on={o.v === valor ? "si" : "no"}
            aria-selected={o.v === valor}
            onClick={() => onCambio(o.v)}
            className={`relative z-10 rounded-xs px-3 py-1.5 text-[12.5px] transition-colors duration-200 ${
              o.v === valor ? "font-semibold text-navy" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}
