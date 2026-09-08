import type { Opportunity } from "@/lib/types";
import { formatCOP } from "@/lib/text";

export function DrillDownTable({
  opportunities,
  serviceNames,
  limit = 100,
}: {
  opportunities: Opportunity[];
  serviceNames: Map<number, string>;
  limit?: number;
}) {
  const rows = opportunities.slice(0, limit);

  if (rows.length === 0) {
    return <p className="text-sm text-ink-3">Sin oportunidades para este filtro.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-ink-3">
            <th className="eb-label px-3 py-2 text-[11px]">Nombre</th>
            <th className="eb-label px-3 py-2 text-[11px]">Etapa</th>
            <th className="eb-label px-3 py-2 text-[11px]">Servicio</th>
            <th className="eb-label px-3 py-2 text-right text-[11px]">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-line-2 last:border-0">
              <td className="px-3 py-2 text-ink">{o.contact_name ?? "—"}</td>
              <td className="px-3 py-2 text-ink-2">{o.stage}</td>
              <td className="px-3 py-2 text-ink-2">
                {o.service_id ? serviceNames.get(o.service_id) ?? "—" : "—"}
              </td>
              <td className="px-3 py-2 text-right text-ink">
                {o.value ? formatCOP(o.value) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {opportunities.length > limit && (
        <p className="mt-2 text-xs text-ink-3">
          Mostrando {limit} de {opportunities.length} resultados.
        </p>
      )}
    </div>
  );
}
