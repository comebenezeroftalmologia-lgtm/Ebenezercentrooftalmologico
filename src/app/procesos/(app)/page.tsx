import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { getCurrentAppUser, getMisAsignaciones } from "@/lib/auth";
import { listAreas, listTodasLasAsignaciones } from "@/lib/procesos/queries";
import { agruparAreasPorCadenaDeValor } from "@/lib/procesos/ordenAreas";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
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
  const primerNombre = user?.nombreCompleto ? user.nombreCompleto.split(" ")[0] : "Pedro";

  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <ExecutiveHeader
        overline={`GOBIERNO ORGANIZACIONAL · ${areas.length} ÁREAS ACTIVAS`}
        title={`Hola, ${primerNombre}`}
        subtitle={
          misAsignaciones.length > 0
            ? `Participas en: ${misAsignaciones
                .map((a) => `${a.areaNombre} (${a.rol === "lider" ? "líder" : "colaborador"})`)
                .join(", ")}.`
            : "Selecciona un área en la bandeja izquierda o en el mapa funcional para gestionar sus procesos y tareas."
        }
        variant="procesos"
      />

      <div className="space-y-6">
        {bloques.map((bloque) => (
          <section
            key={bloque.id}
            className="rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]"
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EEF2F8] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="rounded-[6px] bg-[#E6F0FD] px-2 py-0.5 text-[11px] font-bold tracking-wider text-[#1D58D8]">
                  {bloque.numero}
                </span>
                <h2 className="text-[16px] font-bold tracking-[-0.015em] text-[#0E245E]">
                  {bloque.titulo}
                </h2>
              </div>
              <p className="text-[12.5px] text-[#64748B]">{bloque.subtitulo}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    className={`group flex flex-col justify-between rounded-[14px] border p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BFD4F4] hover:bg-white hover:shadow-[0_6px_18px_rgba(14,36,94,0.06)] ${
                      esSiau
                        ? "border-[#93B8F2] bg-[#F4F8FE]"
                        : "border-[#E6EEF8] bg-[#FBFDFF]"
                    }`}
                  >
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 text-[#0E245E]">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#1D58D8]">
                            <Building2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                          </span>
                          <p className="text-[14px] font-bold leading-snug group-hover:text-[#1D58D8]">
                            {area.nombre}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {esSiau && (
                            <span className="rounded-full bg-[#E6F0FD] px-2 py-0.5 text-[10px] font-bold text-[#1D58D8]">
                              SIAU
                            </span>
                          )}
                          <ArrowRight
                            className="h-4 w-4 text-[#64748B] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#1D58D8]"
                            strokeWidth={2}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-[#EEF2F8] pt-2.5 text-[12px] text-[#64748B]">
                      <span className="truncate">
                        Líder:{" "}
                        <strong className="font-semibold text-[#0E245E]">
                          {lider ?? "Sin asignar"}
                        </strong>
                      </span>
                      <span className="shrink-0 font-medium">{colabs} colab.</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {user?.isAdmin && (
        <div className="mt-6 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <h3 className="mb-4 text-[15px] font-bold text-[#0E245E]">Crear nueva área</h3>
          <CrearAreaForm />
        </div>
      )}
    </div>
  );
}