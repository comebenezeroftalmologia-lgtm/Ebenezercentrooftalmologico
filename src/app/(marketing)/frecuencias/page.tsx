import { requireModuloAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FrecuenciasPage({
  searchParams,
}: {
  searchParams?: { dia?: string };
}) {
  await requireModuloAccess("frecuencias");

  const dia =
    searchParams?.dia && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia)
      ? searchParams.dia
      : null;
  const src = dia ? `/api/frecuencias/tablero?dia=${dia}` : "/api/frecuencias/tablero";

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] w-[calc(100%+2rem)] flex-col overflow-hidden bg-white sm:-mx-7 sm:-my-5 sm:h-[calc(100%+2.5rem)] sm:w-[calc(100%+3.5rem)]">
      {dia && (
        <div className="border-b border-line bg-[#F8FAFC] px-5 py-1.5 text-xs text-ink-3">
          Filtrado por el <span className="font-medium text-navy">{dia}</span>, desde Venta del Día.
        </div>
      )}
      <iframe
        src={src}
        title="Tablero de Frecuencias — Centro Oftalmológico Ebenezer"
        className="min-h-0 w-full flex-1 border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
        loading="eager"
      />
    </div>
  );
}