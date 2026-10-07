import { Sidebar } from "@/components/Sidebar";
import { requireAppUser, getMisModulos } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar modulos={Array.from(modulos)} isAdmin={user.isAdmin} />
      {/* El relleno de 32px por lado se come 64px de ancho. En un escritorio
          no se siente; en un telefono de 375px es una sexta parte de la
          pantalla. Por debajo de 640px baja a 16px. De 640 en adelante no
          cambia nada: el escritorio se ve exactamente igual que antes. */}
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-4 sm:p-8">{children}</main>
    </div>
  );
}
