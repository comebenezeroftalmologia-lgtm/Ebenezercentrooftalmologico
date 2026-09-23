import { requireModuloAccess } from "@/lib/auth";

/**
 * Módulo de Frecuencias.
 *
 * Muestra el tablero completo que genera el motor en Python (10
 * pestañas, 7 filtros, cierre del día, meta y proyección), servido por
 * /api/frecuencias/tablero.
 *
 * Antes este módulo reconstruía el tablero con componentes propios.
 * Esa copia quedó siempre por detrás del original —dos pestañas sin
 * contenido, solo dos de los siete filtros, y una comparación anual
 * equivocada— porque cada mejora del motor había que replicarla a mano.
 * Ahora hay una sola fuente: lo que se ve aquí es exactamente lo que
 * genera el motor, sin intermediarios que se puedan desincronizar.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FrecuenciasPage() {
  await requireModuloAccess("frecuencias");

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col">
      <iframe
        src="/api/frecuencias/tablero"
        title="Tablero de Frecuencias — Centro Oftalmológico Ebenezer"
        className="h-full w-full rounded-lg border border-line bg-white shadow-eb-2"
        // El tablero trae su propio JavaScript (filtros y gráficas) y
        // viene de nuestro mismo origen, así que no necesita permisos
        // extra ni acceso a nada de fuera.
        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
        loading="eager"
      />
    </div>
  );
}
