"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Service } from "@/lib/types";

export function ServiceFilter({ services }: { services: Service[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("servicio") ?? "";

  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A92AD]">
        Servicio
      </label>
      <select
        className="h-[36px] rounded-[9px] border border-[#E1E4EC] bg-white px-3 text-[13px] font-medium text-navy transition hover:border-navy-90 focus:border-blue focus:outline-none"
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set("servicio", e.target.value);
          else params.delete("servicio");
          router.push(`?${params.toString()}`);
        }}
      >
        <option value="">Todos los servicios</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}