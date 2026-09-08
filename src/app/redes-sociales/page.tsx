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

function netChange(series: SocialStatPoint[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1].value - series[0].value;
}

export default async function RedesSocialesPage({
  searchParams,
}: {
  searchParams: { red?: string; desde?: string; hasta?: string };
}) {
  const defaults = defaultDateRange();
  const from = searchParams.desde ?? defaults.from;
  const to = searchParams.hasta ?? defaults.to;
  const selected = searchParams.red === "instagram" || searchParams.red === "facebook" ? searchParams.red : "";

  // Histórico de seguidores: ventana amplia (12 meses) para el gráfico
  // mensual, independiente del rango de fechas elegido para el resto de
  // la página. Hoy solo Instagram tiene histórico diario reconstruido
  // (30 días vía la API de Meta); Facebook acumula desde el día del
  // primer sync — por eso el gráfico se muestra siempre sobre Instagram.
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
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-navy">Redes Sociales</h1>
        <DateRangePicker from={from} to={to} otherParams={{ red: searchParams.red }} />
      </div>

      <div className="mb-6">
        <PlatformChips followers={chipsData} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          hint="Meta deprecó Impresiones — se usa Alcance en su lugar"
          icon={Eye}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Visitas al Perfil"
          value={formatNumber(profileViews)}
          hint="Instagram — dato adicional disponible vía Meta Graph API"
          icon={UserCheck}
        />
        <MetricCard
          label="Cuentas Alcanzadas"
          value={formatNumber(accountsEngaged)}
          hint="Instagram — cuentas únicas que interactuaron"
          icon={Zap}
        />
        <MetricCard
          label="Interacciones Totales"
          value={formatNumber(totalInteractions)}
          hint="Instagram — likes + comentarios + guardados + compartidos"
          icon={TrendingUp}
        />
      </div>

      <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold text-navy">Histórico de Seguidores — Instagram</h2>
        </div>
        <FollowerHistoryChart data={monthlyFollowers} />
        <p className="mt-3 text-xs text-ink-3">
          Facebook aún no tiene histórico diario reconstruido — se empezará a acumular a partir del
          primer día de sincronización real.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Top 5 Contenidos</h2>
        <TopContentList posts={posts} />
        {selected === "facebook" && (
          <p className="mt-3 text-xs text-ink-3">
            Aún no hay sincronización de publicaciones de Facebook — solo se sincroniza contenido de
            Instagram por ahora.
          </p>
        )}
      </div>
    </div>
  );
}
