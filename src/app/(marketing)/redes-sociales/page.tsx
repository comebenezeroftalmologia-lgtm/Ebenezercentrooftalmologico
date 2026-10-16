import { requireModuloAccess } from "@/lib/auth";
import { Eye, Image as ImageIcon, TrendingUp, UserCheck, Users, Zap } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FollowerHistoryChart } from "@/components/FollowerHistoryChart";
import { MetricCard } from "@/components/MetricCard";
import { PlatformChips } from "@/components/PlatformChips";
import { TopContentList } from "@/components/TopContentList";
import { defaultDateRange } from "@/lib/dashboard";
import {
  getLatestSocialStat,
  getSocialPosts,
  getSocialStatsSeries,
  getSocialStatsSum,
  toMonthlySeries,
} from "@/lib/queries";
import { formatNumber } from "@/lib/text";
import type { SocialStatPoint } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

function netChange(series: SocialStatPoint[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1].value - series[0].value;
}

export default async function RedesSocialesPage({
  searchParams,
}: {
  searchParams: { red?: string; desde?: string; hasta?: string };
}) {
  await requireModuloAccess("redes_sociales");
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? defaults.from;
  const to = searchParams.hasta ?? defaults.to;
  const selected = searchParams.red === "instagram" || searchParams.red === "facebook" ? searchParams.red : "";

  const followerHistoryFrom = new Date(Date.now() - 365 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const [
    igFollowersSeries,
    fbFollowersSeries,
    igFollowersLatest,
    fbFollowersLatest,
    igFollowerHistoryRaw,
    reachSeries,
    posts,
    profileViews,
    accountsEngaged,
    totalInteractions,
  ] = await Promise.all([
    getSocialStatsSeries({ platform: "instagram", metric: "followers", from, to }),
    getSocialStatsSeries({ platform: "facebook", metric: "followers", from, to }),
    getLatestSocialStat({ platform: "instagram", metric: "followers" }),
    getLatestSocialStat({ platform: "facebook", metric: "followers" }),
    getSocialStatsSeries({ platform: "instagram", metric: "followers", from: followerHistoryFrom, to }),
    getSocialStatsSeries({ platform: "instagram", metric: "reach", from, to }),
    getSocialPosts({ platform: selected || undefined, from, to }),
    getSocialStatsSum({ platform: "instagram", metric: "profile_views", from, to }),
    getSocialStatsSum({ platform: "instagram", metric: "accounts_engaged", from, to }),
    getSocialStatsSum({ platform: "instagram", metric: "total_interactions", from, to }),
  ]);

  const igCurrent = igFollowersLatest?.value ?? 0;
  const fbCurrent = fbFollowersLatest?.value ?? 0;
  const igDelta = netChange(igFollowersSeries);
  const fbDelta = netChange(fbFollowersSeries);

  const chipsData = [
    { platform: "instagram", count: igCurrent },
    { platform: "facebook", count: fbCurrent },
  ];

  let followersValue: number;
  let followersDelta: number | null;
  if (selected === "instagram") {
    followersValue = igCurrent;
    followersDelta = igDelta;
  } else if (selected === "facebook") {
    followersValue = fbCurrent;
    followersDelta = fbDelta;
  } else {
    followersValue = igCurrent + fbCurrent;
    followersDelta = (igDelta ?? 0) + (fbDelta ?? 0);
  }

  const monthlyFollowers = toMonthlySeries(igFollowerHistoryRaw);
  const totalReach = reachSeries.reduce((sum, r) => sum + r.value, 0);

  const platformLabel = selected === "instagram" ? "Instagram" : selected === "facebook" ? "Facebook" : "todas las redes";

  return (
    <div className="pb-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#E7E9F2] pb-5">
        <div>
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
            Tableros · Embudo Comercial
          </div>
          <h1 className="text-[26px] font-medium leading-none tracking-[-0.02em] text-navy">
            Redes Sociales
          </h1>
        </div>
        <DateRangePicker from={from} to={to} otherParams={{ red: searchParams.red }} />
      </header>

      <div className="mb-6">
        <PlatformChips followers={chipsData} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Seguidores"
          value={formatNumber(followersValue)}
          icon={Users}
          delta={followersDelta}
        />
        <MetricCard
          label="Contenidos Publicados"
          value={formatNumber(posts.length)}
          hint={`${platformLabel} — ${from} a ${to}`}
          icon={ImageIcon}
        />
        <MetricCard
          label="Alcance (Instagram)"
          value={formatNumber(totalReach)}
          hint="Cuentas únicas alcanzadas en el período"
          icon={Eye}
        />
      </div>

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Visitas al Perfil"
          value={formatNumber(profileViews)}
          hint="Instagram — período seleccionado"
          icon={UserCheck}
        />
        <MetricCard
          label="Cuentas que Interactuaron"
          value={formatNumber(accountsEngaged)}
          hint="Instagram — cuentas únicas con interacción"
          icon={Zap}
        />
        <MetricCard
          label="Interacciones Totales"
          value={formatNumber(totalInteractions)}
          hint="Likes, comentarios, guardados y compartidos"
          icon={TrendingUp}
        />
      </div>

      <div className="mb-6 rounded-[15px] border border-[#E7E9F2] bg-white shadow-eb-1">
        <div className="border-b border-[#F0F1F7] px-6 py-4">
          <h2 className="font-titulo text-[17px] font-medium tracking-[-0.012em] text-navy">
            Histórico de Seguidores — Instagram
          </h2>
        </div>
        <div className="p-6">
          <FollowerHistoryChart data={monthlyFollowers} />
          <p className="mt-3 text-[11.5px] text-[#949BB4]">
            Facebook acumula histórico diario a partir del primer día de sincronización.
          </p>
        </div>
      </div>

      <div className="rounded-[15px] border border-[#E7E9F2] bg-white shadow-eb-1">
        <div className="border-b border-[#F0F1F7] px-6 py-4">
          <h2 className="font-titulo text-[17px] font-medium tracking-[-0.012em] text-navy">
            Top 5 Contenidos del Período
          </h2>
        </div>
        <div className="p-6">
          <TopContentList posts={posts} />
          {selected === "facebook" && (
            <p className="mt-3 text-[11.5px] text-[#949BB4]">
              Aún no hay sincronización de publicaciones individuales de Facebook.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}