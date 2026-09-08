"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Service } from "@/lib/types";

export function ServiceFilter({ services }: { services: Service[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("servicio") ?? "";

  return (
    <select
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
  );
}
