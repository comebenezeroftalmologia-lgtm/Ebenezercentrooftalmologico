import { notFound } from "next/navigation";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { getProceso, listActividadesPorProceso } from "@/lib/procesos/queries";
import { MoverActividadButtons } from "./MoverActividadButtons";
import { CrearActividadForm } from "./CrearActividadForm";

export const dynamic = "force-dynamic";

export default async function ProcesoDetailPage({ params }: { params: { procesoId: string } }) {
  const proceso = await getProceso(params.procesoId);
  if (!proceso) notFound();
  const actividades = await listActividadesPorProceso(proceso.id);

  const siguienteOrden = actividades.length > 0 ? Math.max(...actividades.map((a) => a.orden)) + 1 : 0;

  return (
    <div>
      <p className="mb-1 text-xs text-ink-3">
        <Link href={`/procesos/areas/${proceso.areaId}`} className="hover:underline">
          {proceso.areaNombre}
        </Link>
      </p>
      <h1 className="mb-1 text-2xl font-semibold text-navy">{proceso.nombre}</h1>
      {proceso.descripcion && <p className="mb-6 text-sm text-ink-3">{proceso.descripcion}</p>}
      {!proceso.descripcion && <div className="mb-6" />}

      <h2 className="mb-3 text-lg font-semibold text-navy">Actividades</h2>
      <div className="mb-6 rounded-xl border border-line bg-white shadow-sm">
        {actividades.map((act, i) => (
          <div
            key={act.id}
            className={`flex items-center gap-3 px-5 py-4 text-sm ${
              i !== actividades.length - 1 ? "border-b border-line-2" : ""
            }`}
          >
            <MoverActividadButtons
              actividadId={act.id}
              procesoId={proceso.id}
              esPrimero={i === 0}
              esUltimo={i === actividades.length - 1}
            />
            <Link href={`/procesos/actividades/${act.id}`} className="flex flex-1 items-center gap-3">
              <ListChecks className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
              <div>
                <p className="font-medium text-ink-2">{act.nombre}</p>
                {act.descripcion && <p className="text-xs text-ink-3">{act.descripcion}</p>}
              </div>
            </Link>
          </div>
        ))}
        {actividades.length === 0 && (
          <p className="px-5 py-4 text-sm text-ink-3">Sin actividades creadas todavía.</p>
        )}
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-navy">Crear actividad</h3>
        <CrearActividadForm procesoId={proceso.id} siguienteOrden={siguienteOrden} />
      </div>
    </div>
  );
}
