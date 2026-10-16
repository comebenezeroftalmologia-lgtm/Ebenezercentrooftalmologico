import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  Layers,
} from "lucide-react";
import { getCurrentAppUser } from "@/lib/auth/permissions";
import {
  agruparAreasPorCadenaDeValor,
  getMisAsignaciones,
  listAreas,
  listTodasLasAsignaciones,
} from "@/lib/procesos/queries";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { CrearAreaForm } from "./areas/CrearAreaForm";

export default async function ProcesosHomePage() {
  const user = await getCurrentAppUser();
  const [areas, todasAsignaciones, misAsignaciones] = await Promise.all([
    listAreas(),
    listTodasLasAsignaciones(),
    user ? getMisAsignaciones(user.id) : Promise.resolve([]),
  ]);

  const misAreaIds = new Set(misAsignaciones.map((a) => a.areaId));
  const lideresPorArea = new Map<string, string[]>();
  for (const a of todasAsignaciones) {
    if (a.rol === "lider" && a.userNombre) {
      const prev = lideresPorArea.get(a.areaId) ?? [];
      prev.push(a.userNombre);
      lideresPorArea.set(a.areaId, prev);
    }
  }

  const totalProcesos = areas.reduce((s, a) => s + (a.totalProcesos ?? 0), 0);
  const totalSubprocesos = areas.reduce(
    (s, a) => s + (a.totalSubprocesos ?? 0),
    0
  );
  const cadena = agruparAreasPorCadenaDeValor(areas);

  return (
    <div className="space-y-5">
      <ExecutiveHeader
        title="Procesos y Áreas"
        subtitle=" Cadena de valor y estructura operativa · Centro Oftalmológico Ebenezer"
        variant="procesos"
        rightContent={user?.isAdmin ? <CrearAreaForm /> : undefined}
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[12.5px] font-medium text-[#64748B]">
              Áreas operativas
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-[#0F172A]">
            {areas.length}
          </p>
          <p className="mt-1.5 text-[11.5px] text-[#64748B]">
            5 eslabones de la cadena de valor
          </p>
        </div>

        <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[12.5px] font-medium text-[#64748B]">
              Procesos publicados
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <GitBranch className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-[#0F172A]">
            {totalProcesos}
          </p>
          <p className="mt-1.5 text-[11.5px] text-[#64748B]">
            Procesos L2 activos
          </p>
        </div>

        <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[12.5px] font-medium text-[#64748B]">
              Sub-procesos (L3)
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-[#0F172A]">
            {totalSubprocesos}
          </p>
          <p className="mt-1.5 text-[11.5px] text-[#64748B]">
            Actividades estandarizadas
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {cadena.map((eslabon) => (
          <section
            key={eslabon.id}
            className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E6F0FD] text-[12px] font-bold text-[#1D58D8]">
                  {eslabon.orden}
                </span>
                <div>
                  <h2 className="text-[15px] font-bold text-[#0F172A]">
                    {eslabon.nombre}
                  </h2>
                  <p className="text-[12px] text-[#64748B]">
                    {eslabon.descripcion}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">
                {eslabon.areas.length}{" "}
                {eslabon.areas.length === 1 ? "área" : "áreas"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {eslabon.areas.map((area) => {
                const esMiArea = misAreaIds.has(area.id);
                const lideres = lideresPorArea.get(area.id) ?? [];
                return (
                  <Link
                    key={area.id}
                    href={`/procesos/areas/${area.id}`}
                    className="group flex flex-col justify-between rounded-[14px] border border-[#E6EBF2] bg-[#FAFBFD] p-4 transition-all hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:bg-white hover:shadow-[0_6px_18px_rgba(37,99,235,0.08)]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
                            <FolderKanban className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-[14px] font-bold text-[#0F172A] group-hover:text-[#1D58D8]">
                              {area.nombre}
                            </h3>
                            <span className="text-[11px] font-medium text-[#94A3B8]">
                              {area.codigo}
                            </span>
                          </div>
                        </div>
                        {esMiArea && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F0FD] px-2 py-0.5 text-[10.5px] font-semibold text-[#1D58D8]">
                            <CheckCircle2 className="h-3 w-3" /> Tu área
                          </span>
                        )}
                      </div>

                      {area.descripcion && (
                        <p className="mt-2.5 line-clamp-2 text-[12px] text-[#64748B]">
                          {area.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#EEF2F6] pt-3 text-[11.5px] text-[#64748B]">
                      <div className="flex items-center gap-3">
                        <span>
                          <strong className="font-semibold text-[#0F172A]">
                            {area.totalProcesos ?? 0}
                          </strong>{" "}
                          procesos
                        </span>
                        <span>
                          <strong className="font-semibold text-[#0F172A]">
                            {area.totalSubprocesos ?? 0}
                          </strong>{" "}
                          sub
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1D58D8]">
                        Abrir <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    {lideres.length > 0 && (
                      <p className="mt-1.5 truncate text-[11px] text-[#94A3B8]">
                        Líder: {lideres.join(", ")}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}