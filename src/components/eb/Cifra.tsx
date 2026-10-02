"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Una cifra que se cuenta hasta su valor.
 *
 * Por qué: ver subir un número hace que uno lo lea; verlo ya puesto hace que
 * uno lo pase por alto. Es el gesto que más cambia la sensación de la
 * pantalla y el más barato de todos.
 *
 * Arranca rápido y frena al final. Un conteo lineal se siente de máquina
 * registradora; este se siente de producto.
 *
 * Respeta "reducir movimiento" del sistema: a quien lo tenga activado le
 * aparece el número puesto, sin animación. Hay gente a la que el movimiento
 * le produce mareo, y en salud eso importa.
 */
export function Cifra({
  valor,
  espera = 0,
  duracion = 850,
  decimales = 0,
  sufijo,
  className = "",
}: {
  valor: number;
  /** Milisegundos antes de arrancar. Sirve para escalonar varias cifras. */
  espera?: number;
  duracion?: number;
  decimales?: number;
  sufijo?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto) {
      setVisible(valor);
      anterior.current = valor;
      return;
    }

    const desde = anterior.current;
    let inicio: number | null = null;
    let cuadro = 0;
    const temporizador = window.setTimeout(() => {
      const paso = (t: number) => {
        if (inicio === null) inicio = t;
        const p = Math.min((t - inicio) / duracion, 1);
        const e = 1 - Math.pow(1 - p, 4); // frena suave
        setVisible(desde + (valor - desde) * e);
        if (p < 1) cuadro = requestAnimationFrame(paso);
        else anterior.current = valor;
      };
      cuadro = requestAnimationFrame(paso);
    }, espera);

    return () => {
      window.clearTimeout(temporizador);
      cancelAnimationFrame(cuadro);
    };
  }, [valor, espera, duracion]);

  const texto = visible.toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

  return (
    <span className={`font-cifra tabular-nums tracking-tight ${className}`}>
      {texto}
      {sufijo ? <span className="text-ink-3">{sufijo}</span> : null}
    </span>
  );
}
