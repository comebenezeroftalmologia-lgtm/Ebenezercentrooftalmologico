import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckSquare,
  Crown,
  Layers,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { getCurrentAppUser, getMisAsignaciones } from "@/lib/auth";
import { listAreas, listTodasLasAsignaciones } from "@/lib/procesos/queries";
import { agruparAreasPorCadenaDeValor } from "@/lib/procesos/ordenAreas";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { CrearAreaForm } from "./areas/CrearAreaForm";

export const dynamic = "force-dynamic";

const BLOQUE_THEMES: Record<string, { border: string; badgeBg: string; badgeText: string; iconBg: string; iconColor: string }> = {
  "01": {
    border: "border-l-[#2563EB]",
    badgeBg: "bg-[#EBF3FE]",
    badgeText: "text-[#1D4ED8]",
    iconBg: "bg-[#EBF3FE]",
    iconColor: "text-[#2563EB]",
  },
  "02": {
    border: "border-l-[#10B981]",
    badgeBg: "bg-[#ECFDF5]",
    badgeText: "text-[#047857]",
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#059669]",
  },
  "03": {
    border: "border-l-[#8B5CF6]",
    badgeBg: "bg-[#F5F3FF]",
    badgeText: "text-[#6D28D9]",
    iconBg: "bg-[#F5F3FF]",
    iconColor: "text-[#7C3AED]",
  },
};

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

  const totalColaboradores = Array.from(colaboradoresPorArea.values()).reduce((acc, v) => acc + v, 0);
  const coberturaLideres = areas.length > 0 ? Math.round((liderPorArea.size / areas.length) * 100) : 0;
  const bloques = agruparAreasPorCadenaDeValor(areas);
  const primerNombre = user?.nombreCompleto ? user.nombreCompleto.split(" ")[0] : "Equipo";

  return (
    <div className="mx-auto max-w-[1360px] space-y-6 pb-12">
      <ExecutiveHeader
        overline={`GOBIERNO ORGANIZACIONAL · ${areas.length} ÁREAS ACTIVAS`}
        title={`Hola, ${primerNombre}`}
        subtitle="Mapa ejecutivo de procesos y cadena de valor institucional. Selecciona un área para gestionar su hoja de ruta, equipo y tareas."
        variant="procesos"
        rightControls={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/procesos/mis-tareas"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3.5 py-2 text-[12px] font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Mis tareas
            </Link>
            <Link
              href="/procesos/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#334155] transition hover:border-[#BFDBFE] hover:text-[#1D4ED8]"
            >
              <Layers className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        }
      />

      {/* Fila Ejecutiva de 4 KPIs de Procesos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Áreas Institucionales</p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">{areas.length}</p>
            <span className="mt-2.5 inline-flex items-center rounded-md bg-[#EBF3FE] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
              {bloques.length} macroprocesos activos
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Líderes Asignados</p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">{liderPorArea.size}</p>
            <span className="mt-2.5 inline-flex items-center rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
              {coberturaLideres}% de cobertura
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Equipo Vinculado</p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">{totalColaboradores}</p>
            <span className="mt-2.5 inline-flex items-center rounded-md bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#6D28D9]">
              Colaboradores en áreas
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#7C3AED]">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <Link
          href="/procesos/mis-tareas"
          className="group flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)]"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Mi Participación</p>
            <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">{misAsignaciones.length}</p>
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
              Ver mis tareas <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Link>
      </div>

      {/* Accesos rápidos a las áreas asignadas al usuario */}
      {misAsignaciones.length > 0 && (
        <div className="rounded-[16px] border border-[#DBEAFE] bg-gradient-to-r from-[#EFF6FF]/90 via-white to-[#F8FAFC] p-4 shadow-[0_2px_10px_rgba(37,99,235,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-[#0F172A]">Tus Áreas Asignadas</p>
                <p className="text-[11px] text-[#64748B]">Acceso directo a las áreas donde participas</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {misAsignaciones.map((asig) => (
                <Link
                  key={`${asig.areaId}-${asig.rol}`}
                  href={`/procesos/areas/${asig.areaId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1E3A8A] shadow-sm transition hover:border-[#2563EB] hover:bg-[#EFF6FF]"
                >
                  <span>{asig.areaNombre}</span>
                  <span className="rounded-full bg-[#EBF3FE] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1D4ED8]">
                    {asig.rol === "lider" ? "Líder" : "Colaborador"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bloques de la Cadena de Valor */}
      <div className="space-y-8">
        {bloques.map((bloque) => {
          const theme = BLOQUE_THEMES[bloque.numero] ?? BLOQUE_THEMES["01"];
          return (
            <section key={bloque.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6EEF8] pb-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[12px] font-extrabold ${theme.badgeBg} ${theme.badgeText}`}>
                    {bloque.numero}
                  </span>
                  <div>
                    <h2 className="font-display text-[17px] font-bold tracking-tight text-[#0F172A]">
                      {bloque.titulo}
                    </h2>
                    <p className="text-[12px] text-[#64748B]">{bloque.subtitulo}</p>
                  </div>
                </div>
                <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[11px] font-semibold text-[#475569]">
                  {bloque.areas.length} {bloque.areas.length === 1 ? "área" : "áreas"}
                </span>
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
                      className={`group flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] border-l-[4px] ${theme.border} bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_10px_28px_rgba(37,99,235,0.10)]`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${theme.iconBg} ${theme.iconColor}`}>
                              <Building2 className="h-4 w-4" />
                            </span>
                            {esSiau && (
                              <span className="rounded-full bg-[#EBF3FE] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1D4ED8]">
                                SIAU
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#2563EB] opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                            Abrir <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>

                        <h3 className="mt-3.5 font-display text-[15.5px] font-bold leading-snug text-[#0F172A] group-hover:text-[#1D4ED8]">
                          {area.nombre}
                        </h3>

                        <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748B]">
                          Hoja de ruta, manual de funciones, subprocesos y seguimiento del equipo.
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3.5 text-[11.5px]">
                        <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium text-[#334155]">
                          <Crown className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                          {lider ? (
                            <span className="truncate">{lider}</span>
                          ) : (
                            <span className="italic text-[#94A3B8]">Sin líder asignado</span>
                          )}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F8FAFC] px-2.5 py-0.5 font-semibold text-[#475569] ring-1 ring-[#E2E8F0]">
                          <Users className="h-3 w-3 text-[#64748B]" />
                          {colabs} colab.
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {user?.isAdmin && (
        <div className="rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
          <h3 className="mb-4 font-display text-[15px] font-bold text-[#0F172A]">Crear nueva área</h3>
          <CrearAreaForm />
        </div>
      )}
    </div>
  );
}