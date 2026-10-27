import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { BUCKET_AVATARES } from "@/lib/perfil/avatar";

// /api/** queda fuera del middleware: la sesión se valida aquí.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentAppUser();
  if (!me || !me.activo) return new NextResponse(null, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse(null, { status: 404 });

  const admin = createServiceClient();
  const { data: u } = await admin.from("app_users").select("avatar_path").eq("id", params.id).maybeSingle();
  if (!u?.avatar_path) return new NextResponse(null, { status: 404 });

  const { data, error } = await admin.storage.from(BUCKET_AVATARES).download(u.avatar_path);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "image/jpeg",
      // La URL lleva ?v=<versión>, así que puede cachearse sin riesgo de ver una foto vieja.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
