import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { puedeGestionarConocimiento, requireAppUser } from "@/lib/auth";
import { ACCION_LABEL, type AccionHistorial } from "@/lib/ayuda/historial";
import { listHistorialConocimiento } from "@/lib/ayuda/queries";

export const dynamic = "force-dynamic";

const CAMPO_LABEL: Record<string, string> = {
  titulo: "Título",
  descripcion: "Descripción",
  proceso: "Proceso",
  codigo: "Código",
  version: "Versión",
  es_formato: "Es formato",
};

function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

const valor = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "boolean" ? (v ? "sí" : "no") : String(v));

export default async function HistorialPage() {
  const user = await requireAppUser();
  if (!puedeGestionarConocimiento(user)) redirect("/ayuda/conocimiento");
  const eventos = await listHistorialConocimiento();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/ayuda/conocimiento/gestionar" className="mb-3 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-navy">
        <ArrowLeft className="h-3 w-3" /> Volver a Gestionar documentos
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Historial de cambios</h1>
      <p className="mb-6 flex items-center gap-1.5 text-sm text-ink-3">
        <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
        Registro de solo lectura: nadie puede editarlo ni borrarlo. Muestra los últimos {eventos.length} movimientos.
      </p>

      {eventos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">Aún no hay movimientos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {eventos.map((e) => {
            const cambios = e.detalle?.cambios as Record<string, { de: unknown; a: unknown }> | undefined;
            return (
              <li key={e.id} className="rounded-xl border border-line bg-white px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-navy">
                    <span className="font-semibold">{e.usuarioNombre}</span>{" "}
                    <span className="text-ink-2">{ACCION_LABEL[e.accion as AccionHistorial] ?? e.accion}</span>
                  </p>
                  <span className="text-xs text-ink-3">{fechaHora(e.createdAt)}</span>
                </div>
                {e.documentoTitulo && (
                  <p className="mt-0.5 text-xs text-ink-3">
                    {e.documentoTitulo}
                    {e.documentoCodigo ? ` · ${e.documentoCodigo}${e.documentoVersion ? ` v${e.documentoVersion}` : ""}` : ""}
                  </p>
                )}
                {e.detalle?.usuario_afectado && (
                  <p className="mt-0.5 text-xs text-ink-3">Persona: {String(e.detalle.usuario_afectado)}</p>
                )}
                {e.detalle?.de && e.detalle?.a && (
                  <p className="mt-0.5 text-xs text-ink-3">
                    {String(e.detalle.de)} → {String(e.detalle.a)}
                  </p>
                )}
                {cambios && (
                  <ul className="mt-2 space-y-1 rounded-lg bg-paper px-3 py-2 text-xs text-ink-2">
                    {Object.entries(cambios).map(([campo, c]) => (
                      <li key={campo}>
                        <span className="font-semibold text-navy">{CAMPO_LABEL[campo] ?? campo}:</span> {valor(c.de)} → {valor(c.a)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
