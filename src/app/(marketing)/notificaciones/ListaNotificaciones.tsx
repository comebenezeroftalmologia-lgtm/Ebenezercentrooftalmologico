"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Bell,
  Bug,
  CalendarClock,
  CheckCheck,
  MessageSquare,
  RefreshCw,
  Share2,
  Trash2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Notificacion } from "@/lib/notificaciones/queries";
import type { TipoNotificacion } from "@/lib/notificaciones/tipos";
import { marcarLeidaAction, marcarTodasLeidasAction } from "@/lib/notificaciones/actions";

const ICONO: Record<TipoNotificacion, LucideIcon> = {
  tarea_asignada: UserPlus,
  mencion: AtSign,
  comentario_tarea: MessageSquare,
  cambio_tarea: RefreshCw,
  fecha_limite: CalendarClock,
  espacio_compartido: Share2,
  eliminacion_solicitud: Trash2,
  eliminacion_resuelta: CheckCheck,
  falla_nueva: Bug,
  falla_actualizada: Bug,
};

function hace(iso: string): string {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return "ahora";
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 7 * 86400) return `hace ${Math.floor(seg / 86400)} d`;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(iso));
}

export function ListaNotificaciones({ notificaciones }: { notificaciones: Notificacion[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [filtro, setFiltro] = useState<"todas" | "sin_leer">("todas");
  const [leidas, setLeidas] = useState<Set<string>>(new Set());

  const esLeida = (n: Notificacion) => n.leida || leidas.has(n.id);
  const lista = filtro === "sin_leer" ? notificaciones.filter((n) => !esLeida(n)) : notificaciones;
  const sinLeer = notificaciones.filter((n) => !esLeida(n)).length;

  function abrir(n: Notificacion) {
    if (!esLeida(n)) {
      setLeidas((prev) => new Set(prev).add(n.id));
      void marcarLeidaAction(n.id).then(() => window.dispatchEvent(new Event("eb:notificaciones")));
    }
    if (n.url) router.push(n.url);
  }

  function marcarTodas() {
    setLeidas(new Set(notificaciones.map((n) => n.id)));
    start(async () => {
      await marcarTodasLeidasAction();
      window.dispatchEvent(new Event("eb:notificaciones"));
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-line bg-white p-0.5 text-xs">
          {(
            [
              ["todas", "Todas"],
              ["sin_leer", `Sin leer${sinLeer > 0 ? ` (${sinLeer})` : ""}`],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`rounded-md px-3 py-1.5 transition ${filtro === valor ? "bg-[#E6F0FD] font-semibold text-navy" : "text-ink-3 hover:text-navy"}`}
            >
              {texto}
            </button>
          ))}
        </div>
        {sinLeer > 0 && (
          <button type="button" onClick={marcarTodas} className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-navy">
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white py-14 text-center">
          <Bell className="mb-2 h-6 w-6 text-[#94A3B8]" strokeWidth={1.5} />
          <p className="text-sm text-ink-3">{filtro === "sin_leer" ? "No tienes avisos sin leer." : "Aún no tienes notificaciones."}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lista.map((n) => {
            const Icono = ICONO[n.tipo] ?? Bell;
            const leida = esLeida(n);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => abrir(n)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition hover:border-[#C9DDFB] ${
                    leida ? "border-line bg-white" : "border-[#C9DDFB] bg-[#F3F8FF]"
                  }`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${leida ? "bg-line-2 text-ink-3" : "bg-[#E6F0FD] text-[#1D58D8]"}`}>
                    <Icono className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${leida ? "text-ink-2" : "font-semibold text-navy"}`}>
                      {n.titulo}
                      {n.contador > 1 && <span className="ml-1.5 rounded-pill bg-[#E6F0FD] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D58D8]">{n.contador}</span>}
                    </span>
                    {n.cuerpo && <span className="mt-0.5 block whitespace-pre-line break-words text-xs text-ink-3">{n.cuerpo}</span>}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-3">{hace(n.createdAt)}</span>
                  {!leida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" aria-label="Sin leer" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
