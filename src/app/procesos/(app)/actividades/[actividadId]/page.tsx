import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { getActividad, listAsignacionesPorArea, listTareasPorActividad } from "@/lib/procesos/queries";
import { RutaProceso } from "@/components/procesos/RutaProceso";
import { ESTADO_LABELS } from "@/lib/procesos/types";
import { MoverTareaButtons } from "./MoverTareaButtons";
import { CrearTareaForm } from "./CrearTareaForm";

export const dynamic = "force-dynamic";

const ESTADO_ICON = {
  pendiente: Circle,
  en_progreso: CircleDot,
  completada: CheckCircle2,
} as const;

export default async function ActividadDetailPage({ params }: { params: { actividadId: string } }) {
  const actividad = await getActividad(params.actividadId);
  if (!actividad) notFound();

  const [tareas, asignaciones] = await Promise.all([
    listTareasPorActividad(actividad.id),
    listAsignacionesPorArea(actividad.areaId),
  ]);
  const responsablesPosibles = asignaciones.map((a) => a.usuario);
  const siguienteOrden = tareas.length > 0 ? Math.max(...tareas.map((t) => t.orden)) + 1 : 0;

  return (
    <div>
      <RutaProceso
        segmentos={[
          { label: "Inicio", href: "/procesos" },
          { label: actividad.areaNombre, href: `/procesos/areas/${actividad.areaId}` },
          { label: actividad.procesoNombre, href: `/procesos/procesos/${actividad.procesoId}` },
          { label: actividad.nombre },
        ]}
      />
      <h1 className="mb-1 text-2xl font-semibold text-navy">{actividad.nombre}</h1>
      {actividad.descripcion && <p className="mb-6 text-sm text-ink-3">{actividad.descripcion}</p>}
      {!actividad.descripcion && <div className="mb-6" />}

      <h2 className="mb-3 text-lg font-semibold text-navy">Tareas</h2>
      <div className="mb-6 rounded-xl border border-line bg-white shadow-sm">
        {tareas.map((t, i) => {
          const Icon = ESTADO_ICON[t.estado];
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-5 py-4 text-sm ${
                i !== tareas.length - 1 ? "border-b border-line-2" : ""
              }`}
            >
              <MoverTareaButtons
                tareaId={t.id}
                actividadId={actividad.id}
                esPrimero={i === 0}
                esUltimo={i === tareas.length - 1}
              />
              <Link href={`/procesos/tareas/${t.id}`} className="flex flex-1 items-center gap-3">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    t.estado === "completada" ? "text-green" : "text-blue"
                  }`}
                  strokeWidth={1.75}
                />
                <div className="flex-1">
                  <p className="font-medium text-ink-2">{t.nombre}</p>
                  <p className="text-xs text-ink-3">
                    {t.responsable ? t.responsable.nombreCompleto : "Sin responsable"} ·{" "}
                    {ESTADO_LABELS[t.estado]}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
        {tareas.length === 0 && <p className="px-5 py-4 text-sm text-ink-3">Sin tareas creadas todavía.</p>}
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-navy">Crear tarea</h3>
        <CrearTareaForm
          actividadId={actividad.id}
          siguienteOrden={siguienteOrden}
          responsablesPosibles={responsablesPosibles}
        />
      </div>
    </div>
  );
}
