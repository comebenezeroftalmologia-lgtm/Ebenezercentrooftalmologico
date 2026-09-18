import { requireModuloAccess } from "@/lib/auth";
import { ResumenComparativo } from "@/components/frecuencias/ResumenComparativo";
import { getFrecuenciasConteos } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const TABS = [
  { key: "resumen", label: "Resumen Comparativo", enabled: true },
  { key: "anual", label: "Comparativo Anual", enabled: false },
  { key: "tendencia", label: "Tendencia Mensual", enabled: false },
  { key: "detalle", label: "Detalle por Empresa", enabled: false },
  { key: "prep", label: "Prepagadas", enabled: false },
  { key: "dxapoyo", label: "Diagnóstica y Apoyo", enabled: false },
  { key: "medicos", label: "Médicos", enabled: false },
  { key: "cobrable", label: "Cobrable vs No", enabled: false },
  { key: "mutual", label: "Contrato Mutual", enabled: false },
  { key: "servicio", label: "Buscar Servicio", enabled: false },
] as const;

export default async function FrecuenciasPage() {
  await requireModuloAccess("frecuencias");
  const rows = await getFrecuenciasConteos();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-navy">Frecuencias</h1>
        <p className="mt-1 text-sm text-ink-3">
          Utilización real por Unidad Funcional y Empresa — fuente: SISMA, procesado por el motor
          de Pedro Herrera y sincronizado automáticamente hacia esta plataforma.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-line pb-3">
        {TABS.map((tab) =>
          tab.enabled ? (
            <span
              key={tab.key}
              className="rounded-pill border border-blue bg-blue px-4 py-2 text-sm font-medium text-white"
            >
              {tab.label}
            </span>
          ) : (
            <span
              key={tab.key}
              title="Próximamente"
              className="cursor-not-allowed rounded-pill border border-line bg-line-2 px-4 py-2 text-sm font-medium text-ink-3"
            >
              {tab.label}
            </span>
          ),
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-6 text-sm text-ink-3 shadow-sm">
          Todavía no hay datos sincronizados en <code>frecuencias_conteos</code>. El pipeline
          automático corre dos veces al día; puedes disparar una sincronización manual desde
          GitHub Actions ("Sincronizar Frecuencias" → Run workflow).
        </div>
      ) : (
        <ResumenComparativo rows={rows} />
      )}
    </div>
  );
}
