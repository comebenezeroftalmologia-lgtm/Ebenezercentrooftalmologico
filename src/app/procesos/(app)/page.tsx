import Link from "next/link";
import { getCurrentAppUser } from "@/lib/auth";
import {
  getKpisPorTodasLasAreas,
  listAreas,
  listTodasLasAsignaciones,
} from "@/lib/procesos/queries";
import { KpiResumen } from "@/components/procesos/KpiStrip";
import { CrearAreaForm } from "./areas/CrearAreaForm";

export const dynamic = "force-dynamic";

export default async function ProcesosHomePage() {
  const user = await getCurrentAppUser();
  const [areas, asignaciones, kpisPorArea] = await Promise.all([
    listAreas(),
    listTodasLasAsignaciones(),
    getKpisPorTodasLasAreas(),
  ]);

  const misAreaIds = new Set(
    asignaciones.filter((a) => a.userId === user?.id).map((a) => a.areaId)
  );

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold">
          Ebenezer Â· GestiÃ³n por procesos
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-brand-navy">
          Ãreas de la organizaciÃ³n
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Cada Ã¡rea reÃºne sus procesos, actividades y tareas, con su lÃ­der y su
          equipo de colaboradores. Entra a cualquier Ã¡rea para ver cÃ³mo trabaja.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => {
          const delArea = asignaciones.filter((a) => a.areaId === area.id);
          const lideres = delArea.filter((a) => a.rol === "lider");
          const colaboradores = delArea.filter((a) => a.rol === "colaborador");
          const esMia = misAreaIds.has(area.id);
          const kpis = kpisPorArea.get(area.id);

          return (
            <Link
              key={area.id}
              href={`/procesos/areas/${area.id}`}
              className={`group flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-teal/40 hover:shadow-card-hover ${
                esMia ? "border-brand-teal/40 ring-1 ring-brand-teal/20" : "border-slate-200/80"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-brand-navy group-hover:text-brand-teal">
                    {area.nombre}
                  </h2>
                  {esMia && (
                    <span className="shrink-0 rounded-full bg-brand-teal-soft px-2.5 py-0.5 text-[11px] font-medium text-brand-teal">
                      Mi Ã¡rea
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div>
                    <span className="font-medium uppercase tracking-wider text-slate-400">
                      LÃ­der:{" "}
                    </span>
                    {lideres.length === 0 ? (
                      <span className="italic text-slate-400">Sin asignar</span>
                    ) : (
                      <span className="font-medium text-slate-700">
                        {lideres.map((l) => l.usuario.nombreCompleto).join(", ")}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium uppercase tracking-wider text-slate-400">
                      Equipo:{" "}
                    </span>
                    <span className="text-slate-600">
                      {colaboradores.length === 0
                        ? "Sin colaboradores"
                        : `${colaboradores.length} colaborador${
                            colaboradores.length === 1 ? "" : "es"
                          }`}
                    </span>
                  </div>
                </div>

                {kpis && <KpiResumen kpis={kpis} />}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-brand-teal">
                <span>Ver procesos del Ã¡rea</span>
                <span className="transition group-hover:translate-x-0.5">â†’</span>
              </div>
            </Link>
          );
        })}
      </div>

      {user?.isAdmin && (
        <div className="mt-8">
          <CrearAreaForm />
        </div>
      )}
    </div>
  );
}