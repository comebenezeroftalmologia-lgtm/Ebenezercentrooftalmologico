"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import type { SolicitudEliminacion } from "@/lib/procesos/queries";
import { aprobarSolicitudEliminacionAction, rechazarSolicitudEliminacionAction } from "@/lib/solicitudes/actions";

const TIPO_LABEL: Record<string, string> = {
  espacio: "Espacio",
  carpeta: "Carpeta",
  lista: "Lista",
  doc: "Documento",
  tarea: "Tarea",
};

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(iso));
}

export function SolicitudesEliminacion({ solicitudes }: { solicitudes: SolicitudEliminacion[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolver(id: string, accion: "aprobar" | "rechazar") {
    if (accion === "aprobar" && !confirm("Esto eliminará el elemento de forma definitiva. ¿Autorizar?")) return;
    setError(null);
    start(async () => {
      const r =
        accion === "aprobar"
          ? await aprobarSolicitudEliminacionAction(id)
          : await rechazarSolicitudEliminacionAction(id, "");
      if (!r.ok) setError(r.error);
    });
  }

  if (solicitudes.length === 0) return null;

  return (
    <div className="mb-8 rounded-[16px] border border-[#F5D9A8] bg-[#FFFAF0] p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
      <h2 className="mb-1 text-base font-semibold text-navy">Solicitudes de eliminación pendientes</h2>
      <p className="mb-4 text-xs text-ink-3">
        Estas personas pidieron eliminar algo y necesitan tu autorización. Al aprobar, se elimina de forma definitiva.
      </p>
      <ul className="flex flex-col gap-2">
        {solicitudes.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy">
                {TIPO_LABEL[s.tipo] ?? s.tipo}: {s.entidadNombre}
              </p>
              <p className="text-xs text-ink-3">
                Pedido por {s.solicitanteNombre} · {fechaCorta(s.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => resolver(s.id, "aprobar")}
                className="flex items-center gap-1 rounded-md bg-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-navy-90 disabled:opacity-60"
              >
                <Check className="h-3 w-3" strokeWidth={2} />
                Autorizar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => resolver(s.id, "rechazar")}
                className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-navy-20 disabled:opacity-60"
              >
                <X className="h-3 w-3" strokeWidth={2} />
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-xs text-[#B3261E]">{error}</p>}
    </div>
  );
}
