import { CalendarRange } from "lucide-react";

export function DateRangePicker({
  from,
  to,
  otherParams = {},
}: {
  from: string;
  to: string;
  otherParams?: Record<string, string | undefined>;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      {Object.entries(otherParams).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null
      )}
      <div className="flex flex-col">
        <label htmlFor="desde" className="eb-label mb-1 text-[11px] text-ink-3">
          Inicio
        </label>
        <input
          id="desde"
          type="date"
          name="desde"
          defaultValue={from}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="hasta" className="eb-label mb-1 text-[11px] text-ink-3">
          Fin
        </label>
        <input
          id="hasta"
          type="date"
          name="hasta"
          defaultValue={to}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
        />
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90"
      >
        <CalendarRange className="h-4 w-4" strokeWidth={1.75} />
        Aplicar
      </button>
    </form>
  );
}
