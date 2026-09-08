import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
  href,
  active,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  active?: boolean;
  icon?: LucideIcon;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="eb-label text-[11px] text-ink-3">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />}
      </div>
      <p className="mt-1 font-heading text-3xl font-semibold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </>
  );

  const className = `rounded-xl border p-5 shadow-sm transition-colors duration-150 ease-eb-out ${
    active ? "border-blue bg-blue-10" : "border-line bg-white"
  } ${href ? "hover:border-navy-20" : ""}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
