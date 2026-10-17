import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  Folder,
  FolderKanban,
  LayoutList,
  ListTodo,
} from "lucide-react";
import { requireModuloAccess } from "@/lib/auth/session";
import { getArbol, getMisTareas } from "@/lib/proyectos/queries";
import { PRIORIDADES, estaVencida, etiquetaFecha, hoyISO } from "@/lib/proyectos/types";
import { BotonNuevoEspacio } from "@/components/proyectos/ModalesArbol";
import { IconoBandera } from "@/components/proyectos/Iconos";
import { ExecutiveHeader } from "@/components/ui/ExecutiveHeader";

export const dynamic = "force-dynamic";

export default async function ProyectosInicioPage() {
  const user = await requireModuloAccess("proyectos");
  const [arbol, tareas] = await Promise.all([
    getArbol(user.id, user.isAdmin),
    getMisTareas(user.id),
  ]);

  const hoy = hoyISO();
  const nombre = user.nombreCompleto.split(" ")[0] ?? user.nombreCompleto;

  const totalCarpetas = arbol.reduce((acc, e) => acc + e.carpetas.length, 0);
  const totalListas = arbol.reduce(
    (acc, e) =>
      acc +
      e.listas.length +
      e.carpetas.reduce((s, c) => s + c.listas.length, 0),
    0
  );
  const totalDocs = arbol.reduce(
    (acc, e) =>
      acc +
      e.documentos.length +
      e.carpetas.reduce((s, c) => s + (c.documentos?.length ?? 0), 0),
    0
  );
  const tareasVencidas = tareas.filter((t) =>
    estaVencida(t.fechaVencimiento, t.estadoCategoria)
  ).length;
  const tareasHoy = tareas.filter((t) => t.fechaVencimiento === hoy).length;

  return (
    <div className="mx-auto max-w-[1360px] space-y-6 px-6 pb-20 pt-6">
      <ExecutiveHeader
        overline="GESTIÓN ESTRATÉGICA · PROYECTOS E INICIATIVAS"
        title={`Hola, ${nombre}`}
        subtitle="Control ejecutivo de espacios de trabajo, listas operativas, tableros Kanban y entregas pendientes."
        variant="proyectos"
        rightControls={<BotonNuevoEspacio texto="Nuevo espacio" />}
      />

      {/* Fila Ejecutiva de 4 KPIs de Proyectos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
              Espacios Activos
            </p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">
              {arbol.length}
            </p>
            <span className="mt-2.5 inline-flex items-center rounded-md bg-[#EBF3FE] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
              Entornos estratégicos
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
              Listas Operativas
            </p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">
              {totalListas}
            </p>
            <span className="mt-2.5 inline-flex items-center rounded-md bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#6D28D9]">
              {totalCarpetas} carpetas · {totalDocs} docs
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#7C3AED]">
            <LayoutList className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
              Mis Tareas Pendientes
            </p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">
              {tareas.length}
            </p>
            <span className="mt-2.5 inline-flex items-center rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
              Asignadas a tu usuario
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
              Atención Prioritaria
            </p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">
              {tareasVencidas + tareasHoy}
            </p>
            <span
              className={`mt-2.5 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                tareasVencidas > 0
                  ? "bg-[#FEF2F2] text-[#DC2626]"
                  : "bg-[#FFFBEB] text-[#D97706]"
              }`}
            >
              {tareasVencidas} vencidas · {tareasHoy} para hoy
            </span>
          </div>
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              tareasVencidas > 0
                ? "bg-[#FEF2F2] text-[#DC2626]"
                : "bg-[#FFFBEB] text-[#D97706]"
            }`}
          >
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Sección 1: Espacios de Trabajo Ejecutivos */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6EEF8] pb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EBF3FE] text-[12px] font-extrabold text-[#1D4ED8]">
              01
            </span>
            <div>
              <h2 className="font-display text-[17px] font-bold tracking-tight text-[#0F172A]">
                Espacios de Trabajo
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Entornos organizacionales con sus carpetas, listas Kanban y documentos
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[11px] font-semibold text-[#475569]">
            {arbol.length} {arbol.length === 1 ? "espacio" : "espacios"}
          </span>
        </div>

        {arbol.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#CBD5E1] bg-white p-10 text-center shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <FolderKanban className="h-6 w-6" />
            </div>
            <p className="mt-3 text-[15px] font-bold text-[#0F172A]">
              Aún no hay espacios creados
            </p>
            <p className="mt-1 text-[12.5px] text-[#64748B]">
              Crea el primer espacio para organizar carpetas, listas y tareas del equipo.
            </p>
            <div className="mt-4 inline-flex">
              <BotonNuevoEspacio texto="Crear primer espacio" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {arbol.map((espacio) => {
              const listasCount =
                espacio.listas.length +
                espacio.carpetas.reduce((acc, c) => acc + c.listas.length, 0);
              const docsCount =
                espacio.documentos.length +
                espacio.carpetas.reduce((acc, c) => acc + (c.documentos?.length ?? 0), 0);

              return (
                <Link
                  key={espacio.id}
                  href={`/proyectos/espacios/${espacio.id}`}
                  style={{ borderLeftWidth: "4px", borderLeftColor: espacio.color }}
                  className="group flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_10px_28px_rgba(37,99,235,0.10)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[14px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: espacio.color }}
                        >
                          {espacio.inicial}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-[15.5px] font-bold text-[#0F172A] group-hover:text-[#1D4ED8]">
                            {espacio.nombre}
                          </h3>
                          <p className="truncate text-[12px] text-[#64748B]">
                            {espacio.descripcion || "Espacio operativo y gestión de entregas"}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-[#2563EB] opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                        Abrir <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3.5 text-[11.5px]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F8FAFC] px-2.5 py-1 font-semibold text-[#475569] ring-1 ring-[#E2E8F0]">
                        <Folder className="h-3.5 w-3.5 text-[#64748B]" />
                        {espacio.carpetas.length} {espacio.carpetas.length === 1 ? "carpeta" : "carpetas"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#EBF3FE] px-2.5 py-1 font-semibold text-[#1D4ED8]">
                        <ListTodo className="h-3.5 w-3.5 text-[#2563EB]" />
                        {listasCount} {listasCount === 1 ? "lista" : "listas"}
                      </span>
                    </div>
                    {docsCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F3FF] px-2 py-1 font-semibold text-[#6D28D9]">
                        <FileText className="h-3 w-3" />
                        {docsCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Sección 2: Mis Tareas Pendientes */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6EEF8] pb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#ECFDF5] text-[12px] font-extrabold text-[#047857]">
              02
            </span>
            <div>
              <h2 className="font-display text-[17px] font-bold tracking-tight text-[#0F172A]">
                Mis Tareas Pendientes
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Entregas activas asignadas a tu usuario ordenadas por prioridad y vencimiento
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[11px] font-semibold text-[#475569]">
            {tareas.length} {tareas.length === 1 ? "pendiente" : "pendientes"}
          </span>
        </div>

        {tareas.length === 0 ? (
          <div className="flex items-center gap-4 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#0F172A]">
                No tienes tareas pendientes asignadas
              </p>
              <p className="text-[12.5px] text-[#64748B]">
                Cuando te asignen una tarea en cualquier lista de proyectos, aparecerá aquí con su prioridad y fecha límite.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[16px] border border-[#E6EEF8] bg-white shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div className="divide-y divide-[#F1F5F9]">
              {tareas.slice(0, 15).map((t) => {
                const vencida = estaVencida(t.fechaVencimiento, t.estadoCategoria);
                const esHoy = t.fechaVencimiento === hoy;
                const prio = PRIORIDADES[t.prioridad];
                return (
                  <Link
                    key={t.id}
                    href={`/proyectos/listas/${t.listaId}?tarea=${t.id}`}
                    className="group flex items-center gap-3.5 px-5 py-3.5 text-[13px] transition hover:bg-[#F8FAFC]"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-1"
                      style={{ backgroundColor: t.estadoColor }}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold text-[#0F172A] group-hover:text-[#1D4ED8]">
                      {t.titulo}
                    </span>
                    <span className="hidden items-center gap-1.5 rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#475569] ring-1 ring-[#E2E8F0] sm:inline-flex">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: t.espacioColor }}
                      />
                      <span className="max-w-[130px] truncate">{t.espacioNombre}</span>
                      <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
                      <span className="max-w-[150px] truncate font-semibold text-[#1E293B]">
                        {t.listaNombre}
                      </span>
                    </span>
                    {t.prioridad !== "sin_prioridad" && (
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ color: prio.color, backgroundColor: prio.bg }}
                      >
                        <IconoBandera color={prio.color} className="h-3 w-3" />
                        <span className="hidden md:inline">{prio.etiqueta}</span>
                      </span>
                    )}
                    {t.fechaVencimiento && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                          vencida
                            ? "bg-[#FEF2F2] text-[#DC2626]"
                            : esHoy
                            ? "bg-[#FFFBEB] text-[#D97706]"
                            : "bg-[#F1F5F9] text-[#475569]"
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {etiquetaFecha(t.fechaVencimiento)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}