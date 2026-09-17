import { Sidebar } from "@/components/Sidebar";
import { requireAppUser, getMisModulos } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <div className="flex min-h-screen">
      <Sidebar modulos={Array.from(modulos)} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
