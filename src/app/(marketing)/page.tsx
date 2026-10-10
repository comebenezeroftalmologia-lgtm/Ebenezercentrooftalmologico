import Link from "next/link";
import { LayoutGrid, FolderKanban, KanbanSquare } from "lucide-react";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const disponibles = MODULOS.filter((m) => modulos.has(m.slug));

  const analyticsAllowed = disponibles.filter(m => m.grupo === "Analytics");
  const procesosAllowed = modulos.has("procesos");
  const proyectosAllowed = modulos.has("proyectos");

  return (
    <div className="max-w-[1040px]">
      <header className="animate-asomar mb-12">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Centro Oftalmológico Ebenezer
        </div>
        <h1 className="text-[32px] font-medium leading-none tracking-[-0.02em] text-ink">
          Hola, {user.nombreCompleto.split(" ")[0]}
        </h1>
        <p className="mt-3 text-[15px] text-ink-3 max-w-[500px]">
          Bienvenido a la plataforma operativa. Selecciona el módulo al que deseas ingresar para continuar con tu jornada.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-asomar" style={{ animationDelay: "60ms" }}>
        
        {analyticsAllowed.length > 0 && (
          <Link href="/analytics" className="group flex flex-col rounded-2xl border border-line bg-white p-7 shadow-sm transition-all duration-300 ease-eb-out hover:-translate-y-1 hover:border-navy-20 hover:shadow-eb-4">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-aqua-20 text-navy transition-colors duration-300 group-hover:bg-aqua">
              <LayoutGrid className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-semibold text-navy">Analytics</h2>
            <p className="mt-2 text-sm text-ink-3 leading-relaxed">
              Tableros comerciales, frecuencias, embudos y métricas operativas consolidadas.
            </p>
          </Link>
        )}

        {procesosAllowed && (
          <Link href="/procesos" className="group flex flex-col rounded-2xl border border-line bg-white p-7 shadow-sm transition-all duration-300 ease-eb-out hover:-translate-y-1 hover:border-navy-20 hover:shadow-eb-4">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-aqua-20 text-navy transition-colors duration-300 group-hover:bg-aqua">
              <FolderKanban className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-semibold text-navy">Procesos</h2>
            <p className="mt-2 text-sm text-ink-3 leading-relaxed">
              Gestión de tareas, SLAs, administración de áreas y flujos de trabajo diarios.
            </p>
          </Link>
        )}

        {proyectosAllowed && (
          <Link href="/proyectos" className="group flex flex-col rounded-2xl border border-line bg-white p-7 shadow-sm transition-all duration-300 ease-eb-out hover:-translate-y-1 hover:border-navy-20 hover:shadow-eb-4">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-aqua-20 text-navy transition-colors duration-300 group-hover:bg-aqua">
              <KanbanSquare className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-semibold text-navy">Proyectos</h2>
            <p className="mt-2 text-sm text-ink-3 leading-relaxed">
              Seguimiento estructurado de iniciativas estratégicas y documentación interna.
            </p>
          </Link>
        )}
      </section>
    </div>
  );
}
