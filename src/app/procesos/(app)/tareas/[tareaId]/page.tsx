import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentAppUser, getMisAsignaciones } from "@/lib/auth";
import { getTarea, listAsignacionesPorArea, listRelacionesDeTarea } from "@/lib/procesos/queries";
import { RutaProceso } from "@/components/procesos/RutaProceso";
import { ESTADO_LABELS } from "@/lib/procesos/types";
import { EditarTareaForm } from "./EditarTareaForm";
import { MiTareaForm } from "./MiTareaForm";
import { RelacionesTarea } from "./RelacionesTarea";

export const dynamic = "force-dynamic";

export default async function TareaDetailPage({ params }: { params: { tareaId: string } }) {
  const user = await getCurrentAppUser();
  const tarea = await getTarea(params.tareaId);
  if (!tarea || !user) notFound();

  const [misAsignaciones, asignacionesArea, relaciones] = await Promise.all([
    getMisAsignaciones(user.id),
    listAsignacionesPorArea(tarea.areaId),
    listRelacionesDeTarea(tarea.id),
  ]);

  const esLiderDeEstaArea = misAsignaciones.some((a) => a.areaId === tarea.areaId && a.rol === "lider");
  const puedeEditarTodo = user.isAdmin || esLiderDeEstaArea;
  const esResponsable = tarea.responsableUserId === user.id;
  const responsablesPosibles = asignacionesArea.map((a) => a.usuario);

  return (
    <div>
      <RutaProceso
        segmentos={[
          { label: "Inicio", href: "/procesos" },
          { label: tarea.areaNombre, href: `/procesos/areas/${tarea.areaId}` },
          { label: tarea.procesoNombre, href: `/procesos/procesos/${tarea.procesoId}` },
          { label: tarea.actividadNombre, href: `/procesos/actividades/${tarea.actividadId}` },
          { label: tarea.nombre },
        ]}
      />
      <h1 className="mb-1 text-2xl font-semibold text-navy">{tarea.nombre}</h1>
      <p className="mb-6 text-sm text-ink-3">
        {tarea.responsable ? tarea.responsable.nombreCompleto : "Sin responsable"} · {ESTADO_LABELS[tarea.estado]}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          {puedeEditarTodo ? (
            <EditarTareaForm tarea={tarea} responsablesPosibles={responsablesPosibles} />
          ) : esResponsable ? (
            <MiTareaForm tarea={tarea} />
          ) : (
            <div className="flex flex-col gap-3 text-sm text-ink-2">
              {tarea.descripcion && <p>{tarea.descripcion}</p>}
              <p>
                <span className="font-medium">Resultado esperado: </span>
                {tarea.resultado || "—"}
              </p>
              <p>
                <span className="font-medium">Impacto al paciente: </span>
                {tarea.impactoPaciente || "—"}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <RelacionesTarea tareaId={tarea.id} relacionesIniciales={relaciones} />
        </div>
      </div>
    </div>
  );
}
