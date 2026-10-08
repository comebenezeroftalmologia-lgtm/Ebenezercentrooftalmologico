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

export default async function FrecuenciasPage({
  searchParams,
}: {
  searchParams?: { dia?: string };
}) {
  await requireModuloAccess("frecuencias");

  // Si se llega desde Venta del Día con ?dia=YYYY-MM-DD, se le pasa la fecha
  // al tablero para que abra ya filtrado por ese día. Se valida el formato
  // antes de reenviarlo: lo que venga en la URL no se mete tal cual.
  const dia =
    searchParams?.dia && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia)
      ? searchParams.dia
      : null;
  // panel=1 le avisa al tablero, desde la propia dirección, que la
  // plataforma va a mostrar sus pestañas en el panel de la izquierda. Al ir
  // en la dirección, el tablero lo sabe ANTES de dibujar y su fila de
  // pestañas nunca aparece. Si se avisara después, se verían un segundo y
  // al ocultarse el contenido brincaría 53px.
  const src = dia
    ? `/api/frecuencias/tablero?panel=1&dia=${dia}`
    : "/api/frecuencias/tablero?panel=1";

  return (
    // h-full, no un alto calculado a mano: el <main> del layout ya mide la
    // pantalla y tiene su padding. Antes se restaban 7rem fijos, de los
    // cuales 3rem no correspondían a nada del layout, y por eso sobraba
    // espacio abajo.
    <div className="flex h-full min-h-[560px] flex-col">
      {/* El título ya no se dibuja: está arriba del riel izquierdo y
          escribirlo dos veces solo quitaba alto a los números, que es lo
          que la gente viene a mirar.

          Pero sigue EXISTIENDO en el documento, oculto a la vista:
            · el riel lo lee de aquí para poner su propio encabezado
              (PanelSecciones busca el h1 de <main>);
            · quien usa lector de pantalla necesita saber en qué página
              está, y un <main> sin h1 lo deja sin esa referencia.
          Por eso va con sr-only y no borrado. */}
      <h1 className="sr-only">Frecuencias</h1>
      {dia && (
        <p className="mb-2 text-sm text-ink-3">
          Filtrado por el {dia}, desde Venta del Día.
        </p>
      )}
      <iframe
        src={src}
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
