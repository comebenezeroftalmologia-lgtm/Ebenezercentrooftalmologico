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
    // h-full, no un alto calculado a mano: el <main> del layout ya mide la
    // pantalla y tiene su padding. Antes se restaban 7rem fijos, de los
    // cuales 3rem no correspondían a nada del layout, y por eso sobraba
    // espacio abajo.
    <div className="flex h-full min-h-[560px] flex-col">
      {/* Encabezado propio, igual al del resto de módulos. Sin esto la
          página no tenía título y el tablero se veía como una tarjeta
          flotando, sin que uno supiera que seguía dentro de la plataforma. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Frecuencias</h1>
          <p className="mt-1 text-sm text-ink-3">
            Producción asistencial por unidad funcional, empresa y médico.
          </p>
        </div>
      </div>
      <iframe
        src="/api/frecuencias/tablero"
        title="Tablero de Frecuencias — Centro Oftalmológico Ebenezer"
        // Sin borde, sin sombra y sin esquinas redondeadas: con eso el
        // tablero deja de parecer un recuadro pegado encima de la página y
        // se lee como parte del módulo. El tablero, por su lado, detecta
        // que va dentro de un iframe y apaga su propio encabezado azul,
        // que duplicaba el logo y el título.
        className="min-h-0 w-full flex-1 bg-white"
        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
        loading="eager"
      />
    </div>
  );
}
