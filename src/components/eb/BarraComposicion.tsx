"use client";

import { useEffect, useState } from "react";

/**
 * Una sola barra con la leyenda al lado, en vez de seis barras horizontales.
 *
 * Seis categorías dibujadas como seis barras ocupan media pantalla y dicen
 * exactamente lo mismo que una línea de 7 píxeles. Y la línea deja ver de un
 * golpe qué proporción es cada cosa, que es justo lo que uno quiere saber.
 *
 * Se abre de izquierda a derecha al entrar, y se vuelve a abrir cuando
 * cambian los datos: así se nota que la pantalla respondió al filtro.
 */
export function BarraComposicion({
  partes,
}: {
  partes: { nombre: string; valor: number; color: string }[];
}) {
  const [abierta, setAbierta] = useState(false);
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;

  // La llave de las partes entra en las dependencias para que al cambiar de
  // sede la barra se cierre y se vuelva a abrir, en vez de saltar al valor
  // nuevo sin que nadie lo note.
  const llave = partes.map((p) => `${p.nombre}:${p.valor}`).join("|");
  useEffect(() => {
    setAbierta(false);
    const t = window.setTimeout(() => setAbierta(true), 60);
    return () => window.clearTimeout(t);
  }, [llave]);

  return (
    <div>
      <div className="mb-3.5 flex h-[6px] gap-[2px] overflow-hidden">
        {partes.map((p, i) => (
          <i
            key={p.nombre}
            title={`${p.nombre}: ${p.valor.toLocaleString("es-CO")}`}
            className="block h-full rounded-[1px] transition-[width] duration-abrir ease-attio hover:brightness-110"
            style={{
              width: abierta ? `${(p.valor / total) * 100}%` : "0%",
              background: p.color,
              transitionDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {partes.map((p) => (
          <div
            key={p.nombre}
            className="-mx-1.5 flex items-center gap-2 rounded-[2px] px-1.5 py-1 text-[12.5px] text-ink-2 transition-colors duration-micro ease-attio hover:bg-ebbg"
          >
            <span
              className="h-[6px] w-[6px] shrink-0 rounded-[1px]"
              style={{ background: p.color }}
            />
            {p.nombre}
            <span className="ml-auto font-cifra text-[12.5px] font-medium tabular-nums text-ink">
              {p.valor.toLocaleString("es-CO")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
