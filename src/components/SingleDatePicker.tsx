import { CalendarDays } from "lucide-react";

/** Sede 2 es Mutual; Sede 1 es todo lo demás (particular, Ecopetrol,
 *  prepagadas). No se lee de SISMA: se deduce de la empresa, igual que en
 *  el tablero de Frecuencias, para que las dos pantallas digan lo mismo. */
export type SedeFiltro = "todas" | "1" | "2";

export function SingleDatePicker({
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
    <form method="get" className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <label htmlFor="fecha" className="eb-label mb-1 text-[11px] text-ink-3">
          Fecha
        </label>
        <input
          id="fecha"
          type="date"
          name="fecha"
          defaultValue={fecha}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      {/* Mismo interruptor que el Mutual del tablero, pero nombrado por sede
          porque aquí es lo que significa: Sede 2 = Mutual. */}
      <div className="flex flex-col">
        <label className="eb-label mb-1 text-[11px] text-ink-3">Sede</label>
        <div className="flex rounded-lg border border-line bg-white p-0.5">
          {opciones.map((o) => (
            <label
              key={o.v}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
                sede === o.v
                  ? "bg-ebbg font-semibold text-navy"
                  : "text-ink-3 hover:text-navy"
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
        className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90"
      >
        <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
        Ver
      </button>
    </form>
  );
}
