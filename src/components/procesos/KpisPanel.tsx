import { AlertTriangle, CheckCircle2, Clock, ListChecks } from "lucide-react";
import type { KpisTareas } from "@/lib/procesos/types";

export function KpisPanel({ kpis }: { kpis: KpisTareas }) {
  const cards = [
    { label: "Total tareas", value: kpis.total, sub: `${kpis.pendientes} pendientes`, icon: ListChecks },
    { label: "En curso", value: kpis.enCurso, sub: `${kpis.bloqueadas} bloqueadas`, icon: Clock },
    { label: "Completadas", value: kpis.completadas, sub: `${kpis.porcentajeCumplimiento}% cumplimiento`, icon: CheckCircle2 },
    { label: "Vencidas", value: kpis.vencidas, sub: "Requieren atención", icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12.5px] font-medium text-[#64748B]">{c.label}</span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-[#0F172A]">
              {c.value}
            </p>
            <p className="mt-1.5 text-[11.5px] text-[#64748B]">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
}