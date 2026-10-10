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
  // SIN panel=1.
  //
  // Ese aviso le decía al tablero: "no dibujes tu fila de pestañas, que
  // la plataforma las muestra en un panel a la izquierda". Ese panel ya
  // no existe —volvió el riel de Analytics, que lista TABLEROS, no las
  // secciones de uno—, así que si se siguiera avisando, Frecuencias se
  // quedaría sin ninguna forma de cambiar de pestaña.
  const src = dia ? `/api/frecuencias/tablero?dia=${dia}` : "/api/frecuencias/tablero";

  return (
    // h-full, no un alto calculado a mano: el <main> del layout ya mide la
    // pantalla y tiene su padding. Antes se restaban 7rem fijos, de los
    // cuales 3rem no correspondían a nada del layout, y por eso sobraba
    // espacio abajo.
    <div className="flex h-full min-h-[560px] flex-col">
      {/* El título vuelve a verse: el riel de la izquierda lista tableros,
          no secciones, así que aquí ya no se repetía con nada.
          En serif, que es lo único que cambia frente a como estaba: le da
          aire de documento en vez de etiqueta de interfaz. */}
      <div className="mb-4">
        <h1 className="font-titulo text-[30px] font-medium leading-tight tracking-[-0.015em] text-navy">
          Frecuencias
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Producción asistencial por unidad funcional, empresa y médico.
        </p>
      </div>
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
