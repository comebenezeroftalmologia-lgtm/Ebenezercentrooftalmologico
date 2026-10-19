import { NextResponse } from "next/server";

export async function GET() {
  const sismaUrl = process.env.SISMA_API_URL || process.env.NEXT_PUBLIC_SISMA_API_URL || "https://ebenezerback.sismacorporation.com/BackOficce";
  return NextResponse.json({
    ok: true,
    source: sismaUrl,
    syncedAt: new Date().toISOString(),
    cuentasGirosSisma: ["1301250602", "2501010602", "2501010607"],
  });
}
