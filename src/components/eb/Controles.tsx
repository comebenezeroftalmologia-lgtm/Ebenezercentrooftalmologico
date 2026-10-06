import type { SedeFiltro } from "@/lib/ventaDelDia";

/**
 * Los controles de arriba: fecha y sede.
 *
 * Es una copia aparte, no una modificación del SingleDatePicker original. Esa
 * la usa la Venta del Día de siempre, y mientras las dos convivan no se puede
 * tocar: cambiarla cambiaría también la que está en producción.
 *
 * Qué cambia frente al original:
 *   · Esquinas de 4px en vez de 8. Lo redondito se ve amable; lo recto, serio.
 *   · Rótulos de 11px en mayúsculas espaciadas, como en Attio.
 *   · El botón "Ver" deja de ser azul sólido. En Attio el acento aparece dos
 *     veces en toda la pantalla; un botón de filtro no merece gastarlo. Queda
 *     en contorno, y el azul se reserva para el enlace a Frecuencias.
 *   · El interruptor de sede: la pastilla activa se mueve con la curva de
 *     Attio en 300 ms en vez de solo cambiar de color.
 *
 * Lo que NO se pudo arreglar: el calendario que se abre es el del navegador.
 * Es el control nativo <input type="date"> y su ventana no se puede estilizar.
 * Reemplazarlo exige un calendario propio, que es trabajo aparte; se puede
 * hacer, pero no se hace de contrabando dentro de un cambio de aspecto.
 */
export function Controles({
  fecha,
  sede = "todas",
}: {
  fecha: string;
  sede?: SedeFiltro;
}) {
  const opciones: { v: SedeFiltro; t: string }[] = [
    { v: "todas", t: "Todas" },
    { v: "1", t: "Sede 1" },
    { v: "2", t: "Sede 2" },
  ];
  return (
    <form method="get" className="flex flex-wrap items-end gap-2.5">
      <div className="flex flex-col">
        <label
          htmlFor="fecha"
          className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3"
        >
          Fecha
        </label>
        <input
          id="fecha"
          type="date"
          name="fecha"
          defaultValue={fecha}
          className="h-[34px] rounded-xs border border-line bg-white px-2.5 font-cifra text-[13px] tabular-nums text-ink transition-colors duration-micro ease-attio hover:border-navy-20 focus:border-navy focus:outline-none"
        />
      </div>

      <div className="flex flex-col">
        <label className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Sede
        </label>
        <div className="flex h-[34px] items-stretch rounded-xs border border-line bg-white p-[3px]">
          {opciones.map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-center rounded-[2px] px-2.5 text-[12.5px] transition-all duration-gesto ease-attio ${
                sede === o.v
                  ? "bg-ink font-medium text-white"
                  : "text-ink-3 hover:bg-ebbg hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="sede"
                value={o.v}
                defaultChecked={sede === o.v}
                className="sr-only"
              />
              {o.t}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="h-[34px] rounded-xs border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink-2 transition-all duration-micro ease-attio hover:border-navy-20 hover:bg-ebbg hover:text-ink"
      >
        Ver
      </button>
    </form>
  );
}
