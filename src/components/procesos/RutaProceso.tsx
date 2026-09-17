import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface SegmentoRuta {
  label: string;
  href?: string;
}

/** Ruta/breadcrumb del módulo de Procesos: siempre arranca en "Inicio"
 * (/procesos) y baja hasta donde esté parado el usuario (Área >
 * Proceso > Actividad > Tarea), con cada nivel como su propio link —
 * para que en cualquier pantalla se vea claro de qué proceso se está
 * hablando y se pueda subir un nivel sin usar el back del navegador. */
export function RutaProceso({ segmentos }: { segmentos: SegmentoRuta[] }) {
  return (
    <nav aria-label="Ruta" className="mb-3 flex flex-wrap items-center gap-1 text-xs">
      {segmentos.map((s, i) => {
        const esUltimo = i === segmentos.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-ink-3/60" strokeWidth={1.75} />}
            {s.href && !esUltimo ? (
              <Link href={s.href} className="text-ink-3 hover:text-blue hover:underline">
                {s.label}
              </Link>
            ) : (
              <span className={esUltimo ? "font-medium text-ink-2" : "text-ink-3"}>{s.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
