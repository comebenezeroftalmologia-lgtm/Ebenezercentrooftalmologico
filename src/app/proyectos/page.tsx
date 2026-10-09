import Link from "next/link";
import { FolderKanban, Lock } from "lucide-react";
import { requireModuloAccess } from "@/lib/auth";
import { getArbol, getMisTareas } from "@/lib/proyectos/queries";
import { PRIORIDADES } from "@/lib/proyectos/types";
import { estaVencida, etiquetaFecha, hoyISO } from "@/lib/proyectos/utils";
import { BotonNuevoEspacio } from "@/components/proyectos/InicioAcciones";
import { IconoBandera } from "@/components/proyectos/ui";

export default async function InicioProyectos() {
  const user = await requireModuloAccess("proyectos");
  const [arbol, tareas] = await Promise.all([getArbol(user.id, user.isAdmin), getMisTareas(user.id)]);
  const hoy = hoyISO();
  const nombre = user.nombreCompleto.split(" ")[0];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] px-6 pb-24 pt-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Hola, {nombre}</h1>
            <p className="mt-1 text-sm text-ink-3">Tus espacios y tareas pendientes en un solo lugar.</p>
          </div>
          <BotonNuevoEspacio texto="Nuevo espacio" />
        </div>

        {arbol.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-10 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-ink-3" />
            <h2 className="mt-3 text-base font-semibold text-ink">Aún no hay espacios</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">
              Un espacio agrupa las carpetas, listas y documentos de un área. Crea el primero para empezar a organizar el trabajo.
            </p>
            <div className="mt-4 flex justify-center">
              <BotonNuevoEspacio />
            </div>
          </div>
        ) : (
          <>
            <section aria-label="Mis tareas" className="mb-10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-overline text-ink-3">Mis tareas pendientes</h2>
              {tareas.length === 0 ? (
                <p className="rounded-md border border-line px-4 py-5 text-sm text-ink-3">No tienes tareas pendientes asignadas.</p>
              ) : (
                <ul className="divide-y divide-line-2 rounded-md border border-line">
                  {tareas.slice(0, 15).map((t) => {
                    const prio = PRIORIDADES.find((p) => p.value === t.prioridad);
                    const vencida = estaVencida(t.fechaLimite, false, hoy);
                    return (
                      <li key={t.id}>
                        <Link href={`/proyectos/tarea/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ebbg">
                          <span
                            className="shrink-0 rounded-xs px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                            style={{ background: t.estado.color }}
                          >
                            {t.estado.nombre}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.nombre}</span>
                          <span className="hidden shrink-0 truncate text-xs text-ink-3 sm:block">
                            {t.espacio?.nombre} / {t.lista.nombre}
                          </span>
                          {t.fechaLimite && (
                            <span className={`shrink-0 text-xs ${vencida ? "font-medium text-[#D92D20]" : "text-ink-3"}`}>
                              {etiquetaFecha(t.fechaLimite, hoy)}
                            </span>
                          )}
                          {prio && <IconoBandera color={prio.color} />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {tareas.length > 15 && <p className="mt-2 text-xs text-ink-3">Mostrando 15 de {tareas.length}.</p>}
            </section>

            <section aria-label="Espacios">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-overline text-ink-3">Espacios</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {arbol.map(({ espacio, carpetas, listas, docs }) => {
                  const nListas = listas.length + carpetas.reduce((n, c) => n + c.listas.length, 0);
                  const nDocs = docs.length + carpetas.reduce((n, c) => n + c.docs.length, 0);
                  return (
                    <li key={espacio.id}>
                      <Link
                        href={`/proyectos/espacio/${espacio.id}`}
                        className="flex items-center gap-3 rounded-md border border-line p-4 transition-shadow hover:shadow-eb-2"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-lg font-bold text-white"
                          style={{ background: espacio.color }}
                        >
                          {espacio.nombre[0]?.toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            <span className="truncate">{espacio.nombre}</span>
                            {espacio.privado && <Lock className="h-3 w-3 shrink-0 text-ink-3" aria-label="Privado" />}
                          </span>
                          <span className="block text-xs text-ink-3">
                            {carpetas.length} carpeta{carpetas.length === 1 ? "" : "s"} · {nListas} lista{nListas === 1 ? "" : "s"} · {nDocs} doc.
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
