import { requireModuloAccess } from "@/lib/auth";
import { FrecuenciasModule } from "@/components/frecuencias/FrecuenciasModule";
import { getFrecuenciasConteos, getFrecuenciasMetaDetalle, getFrecuenciasMetaPorUF } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export default async function FrecuenciasPage() {
  await requireModuloAccess("frecuencias");
  const [rows, metaRows, metaDetalleRows] = await Promise.all([
    getFrecuenciasConteos(),
    getFrecuenciasMetaPorUF(),
    getFrecuenciasMetaDetalle(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-navy">Frecuencias</h1>
        <p className="mt-1 text-sm text-ink-3">
          Utilización real por Unidad Funcional y Empresa — fuente: SISMA, procesado por el motor
          de Pedro Herrera y sincronizado automáticamente hacia esta plataforma.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-6 text-sm text-ink-3 shadow-sm">
          Todavía no hay datos sincronizados en <code>frecuencias_conteos</code>. El pipeline
          automático corre dos veces al día; puedes disparar una sincronización manual desde
          GitHub Actions ("Sincronizar Frecuencias" → Run workflow).
        </div>
      ) : (
        <FrecuenciasModule rows={rows} metaRows={metaRows} metaDetalleRows={metaDetalleRows} />
      )}
    </div>
  );
}
