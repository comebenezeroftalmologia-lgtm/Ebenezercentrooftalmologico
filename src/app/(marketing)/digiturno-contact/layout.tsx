import { requireModuloAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DigiturnoContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuloAccess("digiturno_contact");
  return <>{children}</>;
}
