import { Sidebar } from "@/components/Sidebar";
import { requireAppUser, getMisModulos } from "@/lib/auth";

/**
 * El marco de todas las páginas.
 *
 * Vuelve la navegación que la plataforma ya tenía: el riel de 96px en
 * azul Ebenezer con Inicio, Analytics y Procesos, y Analytics abriendo
 * su panel con los seis tableros, cada uno con su nombre completo.
 *
 * Durante unas horas esto fue una franja de módulos arriba. Fue un
 * error mío: aplanaba en una sola fila dos niveles que el sistema ya
 * distinguía —lo general (Analytics, Procesos) y lo que sale de cada
 * uno (los tableros)— y esa distinción está escrita en lib/modulos.ts,
 * que es la misma fuente que usa la pantalla de permisos. Cambiarla en
 * la navegación dejaba la plataforma diciendo una cosa y el sistema de
 * accesos otra.
 *
 * Los componentes de esa versión (BarraSuperior, PanelSecciones) quedan
 * en el proyecto sin usar, por si alguna pieza sirve después.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar modulos={Array.from(modulos)} isAdmin={user.isAdmin} />
      {/* hoja-cuadriculada: el papel gris azulado con la textura fina.
          Está en globals.css, con la explicación de por qué no es blanco.

          El relleno de 32px por lado se come 64px de ancho. En un
          escritorio no se siente; en un teléfono de 375px es una sexta
          parte de la pantalla. Por debajo de 640px baja a 16px. */}
      {/* El relleno vuelve. Se había quitado, y ninguna de las páginas de
          este grupo pone el suyo: el contenido quedaba pegado al riel y en
          Analytics el texto se cortaba contra el borde azul. Verificado
          página por página antes de devolverlo, para no ponerlo dos veces. */}
      <main className="hoja-cuadriculada min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}
