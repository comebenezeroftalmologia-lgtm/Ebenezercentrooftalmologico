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
        <label htmlFor="desde" className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A92AD]">
          Inicio
        </label>
        <input
          id="desde"
          type="date"
          name="desde"
          defaultValue={from}
          className="h-[36px] rounded-[9px] border border-[#E1E4EC] bg-white px-3 text-[13px] font-medium text-navy transition hover:border-navy-90 focus:border-blue focus:outline-none"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="hasta" className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A92AD]">
          Fin
        </label>
        <input
          id="hasta"
          type="date"
          name="hasta"
          defaultValue={to}
          className="h-[36px] rounded-[9px] border border-[#E1E4EC] bg-white px-3 text-[13px] font-medium text-navy transition hover:border-navy-90 focus:border-blue focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="flex h-[36px] items-center gap-1.5 rounded-pill bg-blue px-4 text-[12px] font-bold uppercase tracking-[0.05em] text-white shadow-[0_4px_10px_rgba(15,47,243,0.22)] transition hover:bg-navy"
      >
        <CalendarRange className="h-3.5 w-3.5" strokeWidth={2} />
        Aplicar
      </button>
    </form>
  );
}