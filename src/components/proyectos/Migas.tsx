import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Migas({ items }: { items: { texto: string; href?: string; color?: string }[] }) {
  return (
    <nav aria-label="Ubicación" className="flex flex-wrap items-center gap-1 text-xs text-ink-3">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {it.color && (
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-xs text-[9px] font-bold text-white"
              style={{ background: it.color }}
            >
              {it.texto[0]?.toUpperCase()}
            </span>
          )}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink hover:underline">
              {it.texto}
            </Link>
          ) : (
            <span>{it.texto}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
