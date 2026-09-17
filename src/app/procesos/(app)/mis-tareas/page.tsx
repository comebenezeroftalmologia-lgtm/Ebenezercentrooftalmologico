import Link from "next/link";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { requireAppUser } from "@/lib/auth";
import { listMisTareas } from "@/lib/procesos/queries";
import { ESTADO_LABELS } from "@/lib/procesos/types";

export const dynamic = "force-dynamic";

const ESTADO_ICON = {
  pendiente: Circle,
  en_progreso: CircleDot,
  completada: CheckCircle2,
} as const;

export default async function MisTareasPage() {
  const user = await requireAppUser();
  const tareas = await listMisTareas(user.id);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Mis Tareas</h1>
      <p className="mb-6 text-sm text-ink-3">Tareas que tienes asignadas como responsable, en cualquier área.</p>

      <div className="rounded-xl border border-line bg-white shadow-sm">
        {tareas.map((t, i) => {
          const Icon = ESTADO_ICON[t.estado];
          return (
            <Link
              key={t.id}
              href={`/procesos/tareas/${t.id}`}
              className={`flex items-center gap-3 px-5 py-4 text-sm transition-colors duration-150 ease-eb-out hover:bg-line-2 ${
                i !== tareas.length - 1 ? "border-b border-line-2" : ""
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${t.estado === "completada" ? "text-green" : "text-blue"}`}
                strokeWidth={1.75}
              />
              <div className="flex-1">
                <p className="font-medium text-ink-2">{t.nombre}</p>
                <p className="text-xs text-ink-3">
                  {t.areaNombre} · {t.procesoNombre} · {t.actividadNombre}
                </p>
              </div>
              <span className="text-xs text-ink-3">{ESTADO_LABELS[t.estado]}</span>
            </Link>
          );
        })}
        {tareas.length === 0 && (
          <p className="px-5 py-4 text-sm text-ink-3">No tienes tareas asignadas todavía.</p>
        )}
      </div>
    </div>
  );
}
