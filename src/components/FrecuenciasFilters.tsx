"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MESES_LABEL: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export function FrecuenciasFilters({
  years,
  selectedYear,
  monthsAvailable,
  selectedMonth,
}: {
  years: number[];
  selectedYear: number;
  monthsAvailable: number[];
  selectedMonth: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setParam("anio", String(y))}
            className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-eb-out ${
              y === selectedYear
                ? "border-blue bg-blue text-white"
                : "border-line bg-white text-ink hover:border-navy-20"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <select
        value={selectedMonth}
        onChange={(e) => setParam("mes", e.target.value)}
        className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
      >
        {monthsAvailable.map((m) => (
          <option key={m} value={m}>
            {MESES_LABEL[m]}
          </option>
        ))}
      </select>
    </div>
  );
}
