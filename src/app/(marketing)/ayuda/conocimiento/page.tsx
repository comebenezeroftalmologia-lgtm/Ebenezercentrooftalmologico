import Link from "next/link";
import { Settings2 } from "lucide-react";
import { puedeGestionarConocimiento, requireAppUser } from "@/lib/auth";
import { listFormatosPublicados } from "@/lib/ayuda/queries";
import { ConocimientoChat } from "./ConocimientoChat";

export const dynamic = "force-dynamic";

export default async function ConocimientoPage() {
  const user = await requireAppUser();
  const formatos = await listFormatosPublicados();
  return (
    <div className="mx-auto max-w-3xl">
      {puedeGestionarConocimiento(user) && (
        <div className="mb-2 flex justify-end">
          <Link
            href="/ayuda/conocimiento/gestionar"
            className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs text-ink-2 transition hover:border-navy-20"
          >
            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Gestionar documentos
          </Link>
        </div>
      )}
      <ConocimientoChat nombre={user.nombreCompleto.split(" ")[0]} formatos={formatos} />
    </div>
  );
}
