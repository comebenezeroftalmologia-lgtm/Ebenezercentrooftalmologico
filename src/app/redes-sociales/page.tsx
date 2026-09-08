import { Eye, Image as ImageIcon, TrendingUp, Users } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FollowerHistoryChart } from "@/components/FollowerHistoryChart";
import { KpiCard } from "@/components/KpiCard";
import { SocialFilter } from "@/components/SocialFilter";
import { TopContentList } from "@/components/TopContentList";
import { defaultDateRange } from "@/lib/dashboard";
import {
  getSocialPlatforms,
  getSocialPosts,
  getSocialStatsSeries,
  toMonthlySeries,
} from "@/lib/queries";
import { formatNumber } from "@/lib/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RedesSocialesPage({
  searchParams,
}: {
  searchParams: { red?: string; desde?: string; hasta?: string };
}) {
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? defaults.from;
  const to = searchParams.hasta ?? defaults.to;
  const platform = searchParams.red || "instagram";

  // Histórico de seguidores: ventana amplia (12 meses) para el gráfico
  // mensual, independiente del rango de fechas elegido para el resto
  // de la página.
  const followerHistoryFrom = new Date(Date.now() - 365 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const [platforms, followerSeries, followerHistoryRaw, reachSeries, posts] = await Promise.all([
    getSocialPlatforms(),
    getSocialStatsSeries({ platform, metric: "followers", from, to }),
    getSocialStatsSeries({ platform, metric: "followers", from: followerHistoryFrom, to }),
    getSocialStatsSeries({ platform, metric: "reach", from, to }),
    getSocialPosts({ platform, from, to }),
  ]);

  const monthlyFollowers = toMonthlySeries(followerHistoryRaw);
  const currentFollowers =
    followerSeries.length > 0 ? followerSeries[followerSeries.length - 1].value : null;
  const totalReach = reachSeries.reduce((sum, r) => sum + r.value, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-navy">Redes Sociales</h1>
        <div className="flex flex-wrap items-end gap-3">
          <SocialFilter platforms={platforms.length > 0 ? platforms : ["instagram"]} />
          <DateRangePicker from={from} to={to} otherParams={{ red: searchParams.red }} />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Contenidos Publicados"
          value={formatNumber(posts.length)}
          hint={`${from} — ${to}`}
          icon={ImageIcon}
        />
        <KpiCard
          label="Seguidores"
          value={currentFollowers !== null ? formatNumber(currentFollowers) : "—"}
          hint="Conteo más reciente del período"
          icon={Users}
        />
        <KpiCard
          label="Alcance"
          value={formatNumber(totalReach)}
          hint="Meta deprecó Impresiones — se usa Alcance en su lugar"
          icon={Eye}
        />
      </div>

      <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold text-navy">Histórico de Seguidores</h2>
        </div>
        <FollowerHistoryChart data={monthlyFollowers} />
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Top 5 Contenidos</h2>
        <TopContentList posts={posts} />
      </div>
    </div>
  );
}
