import { redirect } from "next/navigation";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";

/**
 * LA PUERTA DE ENTRADA.
 *
 * Antes esto era una sola línea: redirect("/procesos"). Y eso dejaba
 * gente por fuera, en un bucle del que no se podía salir:
 *
 *     /          -> redirect("/procesos")
 *     /procesos  -> requireModuloAccess("procesos")
 *                   si no tiene acceso -> redirect("/")
 *     /          -> redirect("/procesos")   ... y vuelve a empezar
 *
 * Cualquiera que no tuviera el módulo de Procesos —alguien de mercadeo
 * con acceso solo a tableros, por ejemplo— entraba a la plataforma y
 * quedaba dando vueltas hasta que el navegador cortaba con un error.
 * No se notaba porque los administradores pasan siempre.
 *
 * Ahora la entrada mira qué tiene cada quien antes de mandarlo a
 * ninguna parte. El orden respeta lo que ya hacía: quien tenga Procesos
 * sigue entrando ahí, como hasta hoy.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  // 1. Procesos, si lo tiene. Es lo que venía pasando y no se cambia.
  if (modulos.has("procesos")) redirect("/procesos");

  // 2. Si no, sus tableros.
  const tieneAnalytics = MODULOS.some(
    (m) => m.grupo === "Analytics" && modulos.has(m.slug),
  );
  if (tieneAnalytics) redirect("/analytics");

  // 3. Y si no tiene nada, se le dice — en vez de dejarlo girando.
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="mb-2 text-2xl font-semibold text-navy">
        Hola, {user.nombreCompleto.split(" ")[0]}
      </h1>
      <p className="text-sm leading-relaxed text-ink-3">
        Todavía no tienes acceso a ningún módulo. Pídele a un administrador que
        te asigne uno desde <span className="font-medium">Usuarios</span>.
      </p>
    </div>
  );
}
