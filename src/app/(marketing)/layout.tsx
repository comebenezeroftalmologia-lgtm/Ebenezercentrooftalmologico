import { Sidebar } from "@/components/Sidebar";
import { requireAppUser, getMisModulos } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <div className="flex min-h-screen">
      <Sidebar modulos={Array.from(modulos)} isAdmin={user.isAdmin} />
      <main className="flex-1 min-w-0 overflow-x-hidden p-8">{children}</main>
    </div>
  );
}
