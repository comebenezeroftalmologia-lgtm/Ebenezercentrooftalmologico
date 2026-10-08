import { BarraSuperior } from "@/components/BarraSuperior";
import { PanelSecciones } from "@/components/PanelSecciones";
import { requireAppUser, getMisModulos } from "@/lib/auth";

/**
 * El marco de todas las páginas.
 *
 * La navegación pasó de un riel vertical de 96px en azul oscuro a una
 * franja arriba, también en el azul de Ebenezer. El contenido gana ese
 * ancho completo, que es donde están los números.
 *
 * El componente anterior (Sidebar) se deja en el proyecto sin usar: si
 * esto no convence, volver atrás es cambiar dos líneas aquí.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BarraSuperior
        modulos={Array.from(modulos)}
        isAdmin={user.isAdmin}
        nombre={user.nombreCompleto}
      />
      <div className="flex min-h-0 flex-1">
        {/* El panel de secciones lee del propio contenido qué hay en la
            página. Si no encuentra al menos dos secciones, no se dibuja:
            así nunca aparece una columna vacía ni un enlace muerto. */}
        <PanelSecciones />
        {/* El relleno de 32px por lado se come 64px de ancho. En un
            escritorio no se siente; en un teléfono de 375px es una sexta
            parte de la pantalla. Por debajo de 640px baja a 16px; de ahí
            en adelante no cambia nada. */}
        {/* hoja-cuadriculada: el papel gris azulado con la textura. Está
            en globals.css, con la explicación de por qué no es blanco. */}
        <main className="hoja-cuadriculada min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
