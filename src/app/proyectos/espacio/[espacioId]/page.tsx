import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Folder, List as ListIcon, Lock, Globe } from "lucide-react";
import { requireModuloAccess } from "@/lib/auth";
import { getArbol } from "@/lib/proyectos/queries";
import { ROLES } from "@/lib/proyectos/types";
import { BotonCompartirEspacio } from "@/components/proyectos/InicioAcciones";

const UUID = /^[0-9a-fA-F-]{36}$/;

export default async function PaginaEspacio({ params }: { params: { espacioId: string } }) {
  const user = await requireModuloAccess("proyectos");
  if (!UUID.test(params.espacioId)) notFound();
  const arbol = await getArbol(user.id, user.isAdmin);
  const nodo = arbol.find((e) => e.espacio.id === params.espacioId);
  if (!nodo) notFound();
  const { espacio, carpetas, listas, docs } = nodo;
  const rol = ROLES.find((r) => r.value === espacio.rol)?.label;

  const fila = "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-ink hover:bg-ebbg";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[900px] px-6 pb-24 pt-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-md text-2xl font-bold text-white"
              style={{ background: espacio.color }}
            >
              {espacio.nombre[0]?.toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink">{espacio.nombre}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-3">
                {espacio.privado ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {espacio.privado ? "Privado" : "Abierto"} · Tu rol: {rol}
              </p>
            </div>
          </div>
          <BotonCompartirEspacio espacio={espacio} yoId={user.id} />
        </div>

        {carpetas.length === 0 && listas.length === 0 && docs.length === 0 && (
          <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            {espacio.rol === "lector"
              ? "Este espacio está vacío."
              : "Este espacio está vacío. Usa el botón «+» junto a su nombre en la barra lateral para crear una lista, carpeta o documento."}
          </p>
        )}

        {carpetas.map((c) => (
          <section key={c.id} className="mb-6" aria-label={`Carpeta ${c.nombre}`}>
            <h2 className="mb-1 flex items-center gap-2 px-3 text-sm font-semibold text-ink">
              <Folder className="h-4 w-4 text-ink-3" /> {c.nombre}
            </h2>
            <ul className="rounded-md border border-line">
              {c.listas.map((l) => (
                <li key={l.id} className="border-b border-line-2 last:border-0">
                  <Link href={`/proyectos/lista/${l.id}`} className={fila}>
                    <ListIcon className="h-4 w-4 text-ink-3" /> <span className="flex-1 truncate">{l.nombre}</span>
                    <span className="text-xs text-ink-3">{l.abiertas} abiertas</span>
                  </Link>
                </li>
              ))}
              {c.docs.map((d) => (
                <li key={d.id} className="border-b border-line-2 last:border-0">
                  <Link href={`/proyectos/doc/${d.id}`} className={fila}>
                    <FileText className="h-4 w-4 text-ink-3" /> <span className="flex-1 truncate">{d.nombre}</span>
                  </Link>
                </li>
              ))}
              {c.listas.length === 0 && c.docs.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">Carpeta vacía.</li>}
            </ul>
          </section>
        ))}

        {(listas.length > 0 || docs.length > 0) && (
          <section aria-label="Listas y documentos" className="mb-6">
            {carpetas.length > 0 && <h2 className="mb-1 px-3 text-sm font-semibold text-ink">Sin carpeta</h2>}
            <ul className="rounded-md border border-line">
              {listas.map((l) => (
                <li key={l.id} className="border-b border-line-2 last:border-0">
                  <Link href={`/proyectos/lista/${l.id}`} className={fila}>
                    <ListIcon className="h-4 w-4 text-ink-3" /> <span className="flex-1 truncate">{l.nombre}</span>
                    <span className="text-xs text-ink-3">{l.abiertas} abiertas</span>
                  </Link>
                </li>
              ))}
              {docs.map((d) => (
                <li key={d.id} className="border-b border-line-2 last:border-0">
                  <Link href={`/proyectos/doc/${d.id}`} className={fila}>
                    <FileText className="h-4 w-4 text-ink-3" /> <span className="flex-1 truncate">{d.nombre}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
