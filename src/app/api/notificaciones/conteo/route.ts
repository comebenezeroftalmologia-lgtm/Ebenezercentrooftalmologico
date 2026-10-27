import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { contarSinLeer } from "@/lib/notificaciones/queries";
import { contarNovedadesAyuda, getAvatarVersion } from "@/lib/perfil/avatar";

// /api/** queda fuera del middleware: la sesión se valida aquí.
// Devuelve lo que necesita el riel lateral: avisos sin leer, novedades de Ayuda y foto de perfil.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || !user.activo) return NextResponse.json({ sinLeer: 0 }, { status: 401 });
  const [sinLeer, ayudaNuevas, avatar] = await Promise.all([
    contarSinLeer(user.id),
    contarNovedadesAyuda(user.id).catch(() => 0),
    getAvatarVersion(user.id).catch(() => null),
  ]);
  return NextResponse.json({ sinLeer, ayudaNuevas, avatar, userId: user.id, nombre: user.nombreCompleto });
}
