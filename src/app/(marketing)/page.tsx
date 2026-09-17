import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const disponibles = MODULOS.filter((m) => modulos.has(m.slug));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-navy">
        Hola, {user.nombreCompleto.split(" ")[0]}
      </h1>
      <p className="mb-6 text-slate-600">
        Elige un módulo en la barra lateral, o entra directo desde aquí.
      </p>

      {disponibles.length === 0 ? (
        <p className="mb-6 text-sm text-ink-3">
          Todavía no tienes acceso a ningún tablero. Pídele a un administrador que te asigne
          un módulo desde <span className="font-medium">Procesos → Usuarios</span>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disponibles.map((m) => (
            <Link
              key={m.slug}
              href={m.href}
              className="rounded-xl border border-line bg-white p-5 shadow-sm transition-colors duration-150 ease-eb-out hover:border-navy-20"
            >
              <p className="font-semibold text-navy">{m.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/procesos"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-4 text-sm font-semibold text-navy shadow-sm transition-colors duration-150 ease-eb-out hover:border-navy-20"
        >
          <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
          Ir a Procesos
        </Link>
      </div>
    </div>
  );
}
