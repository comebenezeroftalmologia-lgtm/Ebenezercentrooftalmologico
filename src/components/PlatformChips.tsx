"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatNumber } from "@/lib/text";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
};

export function PlatformChips({
  followers,
}: {
  followers: { platform: string; count: number }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("red") ?? "";
  const total = followers.reduce((sum, f) => sum + f.count, 0);

  function go(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("red", value);
    else params.delete("red");
    router.push(`?${params.toString()}`);
  }

  const chip = (value: string, label: string, count: number, active: boolean) => (
    <button
      key={value || "todas"}
      type="button"
      onClick={() => go(value)}
      className={`flex items-center gap-2 rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-eb-out ${
        active
          ? "border-blue bg-blue text-white"
          : "border-line bg-white text-ink hover:border-navy-20"
      }`}
    >
      <span>{label}</span>
      <span className={active ? "text-aqua-50" : "text-ink-3"}>{formatNumber(count)}</span>
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {chip("", "Todas", total, current === "")}
      {followers.map((f) => chip(f.platform, PLATFORM_LABELS[f.platform] ?? f.platform, f.count, current === f.platform))}
    </div>
  );
}
