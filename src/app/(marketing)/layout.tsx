import { Sidebar } from "@/components/Sidebar";
import { requireAppUser, getMisModulos } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const modulos = await getMisModulos(user.id, user.isAdmin);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar modulos={Array.from(modulos)} isAdmin={user.isAdmin} />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#EAF2FC] via-[#F2F7FD] to-[#F8FAFE] p-4 sm:px-7 sm:py-5">
        {children}
      </main>
    </div>
  );
}
