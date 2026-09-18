import { Sidebar } from "@/components/Sidebar";
import { requireAppUser, getMisModulos } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar modulos={Array.from(modulos)} isAdmin={user.isAdmin} />
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-8">{children}</main>
    </div>
  );
}
