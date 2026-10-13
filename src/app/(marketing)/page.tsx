import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";

/**
 * LA PORTADA.
 *
 * Vuelve a ser una pantalla, no una redirección. Durante unos días fue
 * solo `redirect("/procesos")`, y eso tenía dos problemas:
 *
 *   · Dejaba gente afuera. Quien no tuviera el módulo de Procesos era
 *     devuelto a "/", que lo mandaba otra vez a /procesos: un bucle del
 *     que no se salía. No se notaba porque los administradores pasan
 *     siempre.
 *   · Y quitaba el punto de partida: entrar a la plataforma llevaba
 *     directo a un módulo, sin ver qué más hay.
 *
 * El título va en serif —es lo único nuevo frente a como estaba— y el
 * fondo cuadriculado lo pone el marco, no esta página.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const disponibles = MODULOS.filter((m) => modulos.has(m.slug) && m.grupo === "Analytics");
  const tieneProcesos = modulos.has("procesos");

  return (
    <div>
      <h1 className="mb-1 font-titulo text-[30px] font-medium leading-tight tracking-[-0.015em] text-navy">
        Hola, {user.nombreCompleto.split(" ")[0]}
      </h1>
      <p className="mb-7 text-sm text-ink-3">
        Elige un módulo en la barra lateral, o entra directo desde aquí.
      </p>

      {disponibles.length === 0 && !tieneProcesos ? (
        <p className="text-sm leading-relaxed text-ink-3">
          Todavía no tienes acceso a ningún módulo. Pídele a un administrador que te
          asigne uno desde <span className="font-medium">Usuarios</span>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disponibles.map((m) => (
            <Link
              key={m.slug}
              href={m.href}
              className="rounded-lg border border-line bg-white p-5 shadow-eb-1 transition-colors duration-150 ease-eb-out hover:border-navy-20"
            >
              <p className="font-semibold text-navy">{m.label}</p>
            </Link>
          ))}
        </div>
      )}

      {tieneProcesos && (
        <div className="mt-8">
          <Link
            href="/procesos"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-4 text-sm font-semibold text-navy shadow-eb-1 transition-colors duration-150 ease-eb-out hover:border-navy-20"
          >
            <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
            Ir a Procesos
          </Link>
        </div>
      )}
    </div>
  );
}
