import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { listAreas, listTodasLasAsignaciones } from "@/lib/procesos/queries";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const [areas, asignaciones] = await Promise.all([listAreas(), listTodasLasAsignaciones()]);

  const liderPorArea = new Map<string, string>();
  for (const a of asignaciones) {
    if (a.rol === "lider") liderPorArea.set(a.areaId, a.usuario.nombreCompleto);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Áreas</h1>
      <p className="mb-6 text-sm text-ink-3">
        Las 12 áreas de la organización. Entra a una para ver su líder, su equipo y sus procesos.
      </p>

      <div className="rounded-xl border border-line bg-white shadow-sm">
        {areas.map((area, i) => (
          <Link
            key={area.id}
            href={`/procesos/areas/${area.id}`}
            className={`flex items-center justify-between px-5 py-4 text-sm transition-colors duration-150 ease-eb-out hover:bg-line-2 ${
              i !== areas.length - 1 ? "border-b border-line-2" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
              <div>
                <p className="font-medium text-ink-2">{area.nombre}</p>
                <p className="text-xs text-ink-3">
                  Líder: {liderPorArea.get(area.id) ?? "Sin asignar"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
          </Link>
        ))}
      </div>
    </div>
  );
}
