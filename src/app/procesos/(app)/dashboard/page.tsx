import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAppUser, getMisAsignaciones } from "@/lib/auth";
import { getKpisPorTodasLasAreas, listAreas } from "@/lib/procesos/queries";
import { RutaProceso } from "@/components/procesos/RutaProceso";
import { KpisPanel } from "@/components/procesos/KpisPanel";

export const dynamic = "force-dynamic";

export default async function DashboardGeneralPage() {
  const user = await requireAppUser();
  const misAsignaciones = await getMisAsignaciones(user.id);
  const areasLiderId = new Set(misAsignaciones.filter((a) => a.rol === "lider").map((a) => a.areaId));

  // Gerencia (admin) ve todas las áreas; un líder ve solo las suyas.
  // Un colaborador sin liderazgo no tiene nada que ver aquí todavía.
  if (!user.isAdmin && areasLiderId.size === 0) redirect("/procesos");

  const [areas, kpisPorArea] = await Promise.all([listAreas(), getKpisPorTodasLasAreas()]);
  const areasVisibles = user.isAdmin ? areas : areas.filter((a) => areasLiderId.has(a.id));

  const kpisGlobales = getKpisAgregados(areasVisibles.map((a) => kpisPorArea.get(a.id)!));

  return (
    <div>
      <RutaProceso segmentos={[{ label: "Inicio", href: "/procesos" }, { label: "Dashboard general" }]} />
      <h1 className="mb-1 text-2xl font-semibold text-navy">Dashboard general</h1>
      <p className="mb-6 text-sm text-ink-3">
        {user.isAdmin
          ? "Consolidado de todas las áreas de la organización."
          : "Consolidado de las áreas donde eres líder."}
      </p>

      <h2 className="mb-3 text-sm font-semibold text-navy">Todas las áreas</h2>
      <div className="mb-8">
        <KpisPanel kpis={kpisGlobales} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-navy">Por área</h2>
      <div className="flex flex-col gap-4">
        {areasVisibles.map((area) => {
          const kpis = kpisPorArea.get(area.id)!;
          return (
            <div key={area.id} className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <Link href={`/procesos/areas/${area.id}`} className="text-sm font-semibold text-navy hover:underline">
                  {area.nombre}
                </Link>
                <span className="text-xs text-ink-3">{kpis.totalTareas} tarea(s)</span>
              </div>
              <KpisPanel kpis={kpis} />
            </div>
          );
        })}
        {areasVisibles.length === 0 && (
          <p className="rounded-xl border border-line bg-white px-5 py-4 text-sm text-ink-3">
            No hay áreas para mostrar.
          </p>
        )}
      </div>
    </div>
  );
}

function getKpisAgregados(lista: import("@/lib/procesos/types").KpisTareas[]) {
  const suma = (f: (k: (typeof lista)[number]) => number) => lista.reduce((acc, k) => acc + f(k), 0);
  const totalTareas = suma((k) => k.totalTareas);
  const altoRiesgoTotal = suma((k) => k.altoRiesgoTotal);
  const altoRiesgoMitigado = suma((k) => k.altoRiesgoMitigado);
  const conSla = suma((k) => k.conSla);
  const cumplenSla = suma((k) => k.cumplenSla);
  const rechazadas = suma((k) => k.rechazadas);
  const totalConCiclo = suma((k) => k.conCiclo);
  // Promedio ponderado por cuántas tareas aportó cada área a su
  // propio promedio (no un promedio simple de promedios).
  const sumaHorasCiclo = lista.reduce(
    (acc, k) => acc + (k.tiempoCicloPromedioHoras !== null ? k.tiempoCicloPromedioHoras * k.conCiclo : 0),
    0
  );

  return {
    totalTareas,
    activas: suma((k) => k.activas),
    completadas: suma((k) => k.completadas),
    rechazadas,
    altoRiesgoTotal,
    altoRiesgoMitigado,
    pctAltoRiesgoMitigado: altoRiesgoTotal > 0 ? (altoRiesgoMitigado / altoRiesgoTotal) * 100 : null,
    conSla,
    cumplenSla,
    pctCumplimientoSla: conSla > 0 ? (cumplenSla / conSla) * 100 : null,
    tasaRetrabajo: totalTareas > 0 ? (rechazadas / totalTareas) * 100 : null,
    conCiclo: totalConCiclo,
    tiempoCicloPromedioHoras: totalConCiclo > 0 ? sumaHorasCiclo / totalConCiclo : null,
  };
}
