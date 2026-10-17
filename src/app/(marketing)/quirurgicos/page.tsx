import { requireModuloAccess } from "@/lib/auth";
import { defaultDateRange, isVendida } from "@/lib/dashboard";
import { getOpportunities, listServices } from "@/lib/queries";
import { OrdenamientosSede1View } from "@/components/OrdenamientosSede1View";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export default async function QuirurgicosPage({
  searchParams,
}: {
  searchParams: { servicio?: string; desde?: string; hasta?: string; estado?: string };
}) {
  await requireModuloAccess("quirurgicos");
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? "2026-05-01";
  const to = searchParams.hasta ?? defaults.to;

  const [services, allOpportunities] = await Promise.all([
    listServices(),
    getOpportunities({ pipeline: "ordenamientos_qx", from, to, serviceId: null }),
  ]);

  const items = allOpportunities.map((o) => ({
    createdAt: String(o.created_at),
    closedAt: o.closed_at ? String(o.closed_at) : null,
    realizada: isVendida(o),
    abierta: o.status === "open",
    serviceId: o.service_id ?? null,
  }));

  return <OrdenamientosSede1View items={items} services={services} tipo="quirurgicos" />;
}