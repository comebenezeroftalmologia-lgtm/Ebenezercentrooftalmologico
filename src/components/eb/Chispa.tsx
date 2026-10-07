"use client";

import { useEffect, useState } from "react";

/**
 * Las últimas dos semanas de cierres, en barras finas.
 *
 * Por qué existe: la portada tenía un solo número y media pantalla vacía.
 * Un número suelto no dice si el día fue bueno; catorce días seguidos sí:
 * de un vistazo se ve el ritmo de la semana, los sábados cortos, y si algo
 * se salió de lo normal.
 *
 * Sale del mismo archivo que ya lee la portada, así que no cuesta nada:
 * ni una consulta más a SISMA ni un segundo más de carga.
 *
 * La barra se compara contra lo que cierra un día igual de la semana, no
 * contra el máximo del periodo. Así un sábado corto no se ve como un
 * desastre al lado de un miércoles: cada día se mide contra su propio
 * patrón, que es como hay que leerlo.
 *
 * Las barras crecen escalonadas de a 35 ms con la curva de Attio. Es el
 * único movimiento de la pantalla y dura menos de un segundo.
 */
export function Chispa({
  dias,
}: {
  dias: { fecha: string; total: number; tipico: number | null; etiqueta: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setAbierto(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  // El alto se reparte contra el día típico de cada uno. Se deja techo en
  // 140% para que un día excepcional no aplaste visualmente a los demás.
  const alto = (d: { total: number; tipico: number | null }) => {
    if (!d.tipico || d.tipico <= 0) return 0;
    return Math.max(4, Math.min(100, (d.total / d.tipico) * 71));
  };

  return (
    <div className="flex items-end gap-[6px]" style={{ height: 74 }}>
      {dias.map((d, i) => {
        const pct = d.tipico && d.tipico > 0 ? Math.round((d.total / d.tipico) * 100) : null;
        const bajo = pct !== null && pct < 85;
        return (
          <div
            key={d.fecha}
            className="group relative flex flex-1 flex-col justify-end"
            title={`${d.etiqueta}: ${d.total.toLocaleString("es-CO")} atenciones${
              pct !== null ? ` · ${pct}% de un día igual` : ""
            }`}
          >
            <div
              className={`w-full rounded-[2px] transition-[height,background-color] duration-mover ease-attio ${
                bajo ? "bg-[#D9A69A] group-hover:bg-[#C0392B]" : "bg-navy-20 group-hover:bg-navy"
              }`}
              style={{
                height: abierto ? `${alto(d)}%` : "0%",
                transitionDelay: `${i * 35}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
