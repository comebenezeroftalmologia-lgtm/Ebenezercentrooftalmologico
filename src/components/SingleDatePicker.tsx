import { CalendarDays } from "lucide-react";

export function SingleDatePicker({ fecha }: { fecha: string }) {
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
