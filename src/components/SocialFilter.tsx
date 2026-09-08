"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export function SocialFilter({ platforms }: { platforms: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("red") ?? "";

  return (
    <select
      className="rounded-lg border border-line px-3 py-2 text-sm"
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set("red", e.target.value);
        else params.delete("red");
        router.push(`?${params.toString()}`);
      }}
    >
      <option value="">Todas las redes</option>
      {platforms.map((p) => (
        <option key={p} value={p}>
          {PLATFORM_LABELS[p] ?? p}
        </option>
      ))}
    </select>
  );
}
