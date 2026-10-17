import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { listAreas, listTodasLasAsignaciones } from "@/lib/procesos/queries";
import { agruparAreasPorCadenaDeValor } from "@/lib/procesos/ordenAreas";
import { requireAppUser } from "@/lib/auth";
import { CrearAreaForm } from "./CrearAreaForm";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const user = await requireAppUser();
  const [areas, asignaciones] = await Promise.all([listAreas(), listTodasLasAsignaciones()]);

  const liderPorArea = new Map<string, string>();
  for (const a of asignaciones) {
    if (a.rol === "lider") liderPorArea.set(a.areaId, a.usuario.nombreCompleto);
  }

  const bloques = agruparAreasPorCadenaDeValor(areas);

  return (
    <div className="max-w-[1080px] pb-12">
      <ExecutiveHeader overline="GOBIERNO ORGANIZACIONAL · PROCESOS" title="Áreas de la Organización" subtitle="Organizadas por cadena de valor. Entra a un área para ver su líder, su equipo y sus procesos." variant="procesos" />

      <div className="space-y-6">
        {bloques.map((bloque) => (
          <section key={bloque.id}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="rounded bg-navy px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-aqua">
                {bloque.numero}
              </span>
              <h2 className="text-sm font-semibold text-navy">{bloque.titulo}</h2>
            </div>
            <div className="rounded-xl border border-line bg-white shadow-xs">
              {bloque.areas.map((area, i) => (
                <Link
                  key={area.id}
                  href={`/procesos/areas/${area.id}`}
                  className={`flex items-center justify-between px-5 py-3.5 text-sm transition-colors duration-150 ease-eb-out hover:bg-line-2 ${
                    i !== bloque.areas.length - 1 ? "border-b border-line-2" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#1D58D8]"><Building2 className="h-4 w-4" strokeWidth={1.9} /></div>
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
          </section>
        ))}
      </div>

      {user.isAdmin && (
        <div className="mt-8 rounded-xl border border-line bg-white p-6 shadow-xs">
          <h3 className="mb-4 text-base font-semibold text-navy">Crear área</h3>
          <CrearAreaForm />
        </div>
      )}
    </div>
  );
}

