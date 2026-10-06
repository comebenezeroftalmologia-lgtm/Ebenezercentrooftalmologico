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
 * ──────────────────────────────────────────────────────────────────────────
 * LO MÁS IMPORTANTE DE ESTE ARCHIVO NO ES LA ANIMACIÓN
 *
 * El número que se ve TIENE que ser el número correcto, pase lo que pase.
 * La animación es un adorno; el dato es el dato. Por eso aquí hay tres
 * defensas, y cada una tapa un hueco real que se vio fallando:
 *
 *   1. El valor ya viene puesto desde el servidor.
 *      Antes arrancaba en 0 y subía. Eso significaba que el HTML que manda
 *      el servidor decía 0: si el navegador tarda en arrancar el JavaScript
 *      —conexión mala, celular viejo— alguien podía leer 0 pacientes
 *      atendidos. Ahora el HTML ya trae 894 y el conteo, si corre, arranca
 *      desde 0 por su cuenta.
 *
 *   2. Si la pestaña está en segundo plano, no se anima: se pone y listo.
 *      El navegador CONGELA la animación cuando la pestaña no se está
 *      mirando. Se vio en pruebas quedando en 646 y en 737 cuando el valor
 *      real era 894 — y una vez, abriendo la página en segundo plano, en 0.
 *      Nadie se daría cuenta de que está leyendo mal.
 *
 *   3. Y aun así, un temporizador pone el valor final al terminar el tiempo.
 *      Cinturón y tirantes. Si por cualquier motivo la animación se queda a
 *      medias, a los 850 ms el número correcto aparece de todas formas.
 *
 * Respeta "reducir movimiento" del sistema: a quien lo tenga activado le
 * aparece el número puesto, sin animación. Hay gente a la que el movimiento
 * le produce mareo, y en salud eso importa.
 * ──────────────────────────────────────────────────────────────────────────
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
  // DEFENSA 1: arranca en el valor real, no en cero. Así el HTML del
  // servidor ya trae el número bueno y no hay ningún instante en que la
  // pantalla diga algo falso.
  const [visible, setVisible] = useState(valor);
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    const desde = anterior.current ?? 0;
    anterior.current = valor;

    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // DEFENSA 2: si nadie está mirando la pestaña, el navegador congela la
    // animación a mitad de camino. Entonces no se anima.
    const oculta = document.visibilityState === "hidden";

    if (quieto || oculta || desde === valor) {
      setVisible(valor);
      return;
    }

    setVisible(desde);

    let inicio: number | null = null;
    let cuadro = 0;
    const temporizador = window.setTimeout(() => {
      const paso = (t: number) => {
        if (inicio === null) inicio = t;
        const p = Math.min((t - inicio) / duracion, 1);
        const e = 1 - Math.pow(1 - p, 4); // frena suave
        setVisible(desde + (valor - desde) * e);
        if (p < 1) cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
    }, espera);

    // DEFENSA 3: pase lo que pase, al terminar el tiempo queda el valor final.
    const red = window.setTimeout(() => setVisible(valor), espera + duracion + 120);

    // Y si la pestaña se oculta en mitad del conteo, se salta al final de una.
    const alOcultar = () => {
      if (document.visibilityState === "hidden") setVisible(valor);
    };
    document.addEventListener("visibilitychange", alOcultar);

    return () => {
      window.clearTimeout(temporizador);
      window.clearTimeout(red);
      cancelAnimationFrame(cuadro);
      document.removeEventListener("visibilitychange", alOcultar);
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
