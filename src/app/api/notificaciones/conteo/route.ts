import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { contarSinLeer } from "@/lib/notificaciones/queries";

// /api/** queda fuera del middleware: la sesión se valida aquí.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) return NextResponse.json({ sinLeer: 0 }, { status: 401 });
  return NextResponse.json({ sinLeer: await contarSinLeer(user.id) });
}
