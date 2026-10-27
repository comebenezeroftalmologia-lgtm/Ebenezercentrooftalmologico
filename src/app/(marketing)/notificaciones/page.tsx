import Link from "next/link";
import { Settings2 } from "lucide-react";
import { requireAppUser } from "@/lib/auth";
import { listNotificaciones } from "@/lib/notificaciones/queries";
import { ListaNotificaciones } from "./ListaNotificaciones";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const user = await requireAppUser();
  const notificaciones = await listNotificaciones(user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-navy">Notificaciones</h1>
        <Link
          href="/perfil#notificaciones"
          className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs text-ink-2 transition hover:border-navy-20"
        >
          <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          Preferencias
        </Link>
      </div>
      <p className="mb-6 text-sm text-ink-3">Asignaciones, menciones, cambios en tus tareas y otros avisos de la plataforma.</p>
      <ListaNotificaciones notificaciones={notificaciones} />
    </div>
  );
}
