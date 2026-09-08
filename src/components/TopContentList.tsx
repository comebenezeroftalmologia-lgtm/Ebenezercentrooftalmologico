import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import type { SocialPost } from "@/lib/types";
import { formatNumber } from "@/lib/text";

export function TopContentList({ posts }: { posts: SocialPost[] }) {
  const top = [...posts]
    .sort((a, b) => b.total_interactions - a.total_interactions)
    .slice(0, 5);

  if (top.length === 0) {
    return <p className="text-sm text-ink-3">Sin contenido publicado en este rango.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {top.map((post, i) => (
        <a
          key={post.media_id}
          href={post.permalink ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-3 rounded-lg border border-line-2 p-3 transition-colors duration-150 ease-eb-out hover:border-navy-20"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-aqua-20 text-xs font-semibold text-navy">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">{post.caption ?? "(sin descripción)"}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-3">
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" strokeWidth={1.75} /> {formatNumber(post.likes)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} /> {formatNumber(post.comments)}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} /> {formatNumber(post.shares)}
              </span>
              <span className="flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5" strokeWidth={1.75} /> {formatNumber(post.saved)}
              </span>
              <span>Alcance: {formatNumber(post.reach)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
