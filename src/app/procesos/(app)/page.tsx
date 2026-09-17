import Link from "next/link";
import { Building2 } from "lucide-react";
import { getCurrentAppUser, getMisAsignaciones } from "@/lib/auth";
import { listAreas, listTodasLasAsignaciones } from "@/lib/procesos/queries";

export const dynamic = "force-dynamic";

export default async function ProcesosHomePage() {
  const user = await getCurrentAppUser();
  const [areas, asignaciones, misAsignaciones] = await Promise.all([
    listAreas(),
    listTodasLasAsignaciones(),
    user ? getMisAsignaciones(user.id) : Promise.resolve([]),
  ]);

  const liderPorArea = new Map<string, string>();
  const colaboradoresPorArea = new Map<string, number>();
  for (const a of asignaciones) {
    if (a.rol === "lider") liderPorArea.set(a.areaId, a.usuario.nombreCompleto);
    else colaboradoresPorArea.set(a.areaId, (colaboradoresPorArea.get(a.areaId) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-navy">Hola, {user?.nombreCompleto.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-3">
          {misAsignaciones.length > 0
            ? `Participas en: ${misAsignaciones.map((a) => `${a.areaNombre} (${a.rol === "lider" ? "líder" : "colaborador"})`).join(", ")}.`
            : "Aún no tienes un área asignada."}
        </p>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-navy">Áreas de la organización</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Link
            key={area.id}
            href={`/procesos/areas/${area.id}`}
            className="rounded-xl border border-line bg-white p-5 shadow-sm transition-colors duration-150 ease-eb-out hover:border-navy-20"
          >
            <div className="mb-2 flex items-center gap-2 text-navy">
              <Building2 className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
              <p className="text-sm font-semibold">{area.nombre}</p>
            </div>
            <p className="text-xs text-ink-3">
              Líder: {liderPorArea.get(area.id) ?? "Sin asignar"}
            </p>
            <p className="text-xs text-ink-3">
              {colaboradoresPorArea.get(area.id) ?? 0} colaborador(es)
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
