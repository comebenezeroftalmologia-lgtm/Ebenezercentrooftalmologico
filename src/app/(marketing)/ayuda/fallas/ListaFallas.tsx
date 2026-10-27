import type { Falla } from "@/lib/ayuda/queries";

export const ESTADO_FALLA: Record<string, { texto: string; clase: string }> = {
  nuevo: { texto: "Recibido", clase: "bg-[#FEF3E2] text-[#B54708]" },
  en_revision: { texto: "En revisión", clase: "bg-[#E6F0FD] text-[#1D58D8]" },
  resuelto: { texto: "Resuelto", clase: "bg-green-10 text-green" },
  descartado: { texto: "Descartado", clase: "bg-line-2 text-ink-3" },
};

export function fechaFalla(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date(iso));
}

export function ListaFallas({ fallas }: { fallas: Falla[] }) {
  if (fallas.length === 0) {
    return <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">Aún no has reportado nada.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {fallas.map((f) => {
        const e = ESTADO_FALLA[f.estado];
        return (
          <li key={f.id} className="rounded-xl border border-line bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-navy">{f.titulo}</p>
              <span className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${e.clase}`}>{e.texto}</span>
            </div>
            <p className="mt-0.5 text-xs text-ink-3">
              {fechaFalla(f.createdAt)}
              {f.modulo ? ` · ${f.modulo}` : ""} · gravedad {f.gravedad}
            </p>
            {f.notaDesarrollador && (
              <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-xs text-ink-2">
                <span className="font-semibold text-navy">Respuesta del equipo: </span>
                {f.notaDesarrollador}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
