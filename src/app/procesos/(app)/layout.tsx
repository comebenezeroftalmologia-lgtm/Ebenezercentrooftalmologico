import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth";
import { ProcesosNav } from "@/components/procesos/ProcesosNav";

export default async function ProcesosAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  // El middleware ya exige sesión de Supabase Auth; esto cubre el caso
  // de una sesión válida sin fila en app_users (perfil no creado).
  if (!user) redirect("/login");
  if (!user.activo) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <ProcesosNav user={user} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
