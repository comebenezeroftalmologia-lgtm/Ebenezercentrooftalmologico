import Link from "next/link";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";
import { requireAppUser } from "@/lib/auth/permissions";
import { listMisTareas } from "@/lib/procesos/queries";
import { ESTADO_LABELS } from "@/lib/procesos/types";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";

export default async function MisTareasPage() {
  const user = await requireAppUser();
  const tareas = await listMisTareas(user.id);

  const pendientes = tareas.filter((t) => t.estado === "pendiente");
  const enCurso = tareas.filter((t) => t.estado === "en_curso");
  const completadas = tareas.filter((t) => t.estado === "completada");

  return (
    <div className="space-y-5">
      <ExecutiveHeader
        title="Mis Tareas"
        subtitle=" Seguimiento operativo asignado · Centro Oftalmológico Ebenezer"
        variant="procesos"
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <span className="text-[12.5px] font-medium text-[#64748B]">Pendientes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <ListTodo className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-[28px] font-bold leading-none text-[#0F172A]">{pendientes.length}</p>
        </div>

        <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <span className="text-[12.5px] font-medium text-[#64748B]">En curso</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-[28px] font-bold leading-none text-[#1D58D8]">{enCurso.length}</p>
        </div>

        <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between">
            <span className="text-[12.5px] font-medium text-[#64748B]">Completadas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-[28px] font-bold leading-none text-[#10B981]">{completadas.length}</p>
        </div>
      </div>

      {tareas.length === 0 ? (
        <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-10 text-center text-[13px] text-[#64748B] shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          No tienes tareas asignadas en este momento.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-[#E6EBF2] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="divide-y divide-[#F1F5F9]">
            {tareas.map((t) => (
              <Link
                key={t.id}
                href={`/procesos/procesos/${t.procesoId}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-[#F8FAFC]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-[#0F172A]">
                    {t.titulo}
                  </p>
                  {t.descripcion && (
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-[#64748B]">
                      {t.descripcion}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-[#E6F0FD] px-2.5 py-1 text-[11px] font-semibold text-[#1D58D8]">
                  {ESTADO_LABELS[t.estado]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}