import { AnalyticsSubMenu } from "@/components/AnalyticsSubMenu";
import { requireAppUser, getMisModulos } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);
  
  // Extraemos únicamente los tableros de Analytics a los que el usuario tiene permiso
  const tableros = MODULOS.filter((m) => modulos.has(m.slug) && m.grupo === "Analytics");

  return (
    <div className="flex h-full w-full bg-white overflow-hidden animate-asomar">
      <AnalyticsSubMenu tableros={tableros} />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {children}
      </div>
    </div>
  );
}
