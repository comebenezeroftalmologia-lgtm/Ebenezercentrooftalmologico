import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { getCurrentAppUser, getMisAsignaciones } from "@/lib/auth";
import { listAreas, listTodasLasAsignaciones } from "@/lib/procesos/queries";
import { agruparAreasPorCadenaDeValor } from "@/lib/procesos/ordenAreas";
import { CrearAreaForm } from "./areas/CrearAreaForm";

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

  const bloques = agruparAreasPorCadenaDeValor(areas);

  return (
    <div className="max-w-[1080px] pb-12">
      <header className="mb-7">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Gobierno Organizacional · {areas.length} áreas activas
        </div>
        <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-navy">
          Hola, {user?.nombreCompleto.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-ink-3">
          {misAsignaciones.length > 0
            ? `Participas en: ${misAsignaciones
                .map((a) => `${a.areaNombre} (${a.rol === "lider" ? "líder" : "colaborador"})`)
                .join(", ")}.`
            : "Selecciona un área en la bandeja izquierda o en el mapa funcional para gestionar sus procesos y tareas."}
        </p>
      </header>

      <div className="space-y-8">
        {bloques.map((bloque) => (
          <section key={bloque.id}>
            <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="rounded bg-navy px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-aqua">
                  {bloque.numero}
                </span>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-navy">
                  {bloque.titulo}
                </h2>
              </div>
              <p className="text-xs text-ink-3">{bloque.subtitulo}</p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {bloque.areas.map((area) => {
                const esSiau =
                  area.nombre.toLowerCase().includes("siau") ||
                  area.nombre.toLowerCase().includes("atención al usuario");
                const lider = liderPorArea.get(area.id);
                const colabs = colaboradoresPorArea.get(area.id) ?? 0;

                return (
                  <Link
                    key={area.id}
                    href={`/procesos/areas/${area.id}`}
                    className={`group flex flex-col justify-between rounded-xl border bg-white p-4 shadow-xs transition-all duration-150 ease-eb-out hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-sm ${
                      esSiau ? "border-blue/30 ring-1 ring-blue/10" : "border-line"
                    }`}
                  >
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-navy">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] transition-colors group-hover:bg-blue/10">
                            <Building2 className="h-4 w-4 text-blue" strokeWidth={1.75} />
                          </span>
                          <p className="text-[14px] font-semibold leading-snug group-hover:text-blue">
                            {area.nombre}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {esSiau && (
                            <span className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-semibold text-blue">
                              SIAU
                            </span>
                          )}
                          <ArrowRight
                            className="h-4 w-4 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-blue"
                            strokeWidth={1.75}
                          />
                        </div>
                      </div>
                      {area.descripcion && (
                        <p className="mb-2 line-clamp-2 text-xs text-ink-3">{area.descripcion}</p>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2.5 text-xs text-ink-3">
                      <span className="truncate">
                        Líder:{" "}
                        <strong className="font-medium text-ink-2">
                          {lider ?? "Sin asignar"}
                        </strong>
                      </span>
                      <span className="shrink-0">{colabs} colab.</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {user?.isAdmin && (
        <div className="mt-8 rounded-xl border border-line bg-white p-6 shadow-xs">
          <h3 className="mb-4 text-base font-semibold text-navy">Crear nueva área</h3>
          <CrearAreaForm />
        </div>
      )}
    </div>
  );
}