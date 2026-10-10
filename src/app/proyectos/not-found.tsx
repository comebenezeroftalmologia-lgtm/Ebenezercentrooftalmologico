import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-bold text-ink">No encontramos esto</h1>
      <p className="max-w-sm text-sm text-ink-3">
        Puede que se haya eliminado o que no tengas acceso al espacio donde estaba.
      </p>
      <Link href="/proyectos" className="rounded-sm bg-blue px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#0B25C9]">
        Ir al inicio de Proyectos
      </Link>
    </div>
  );
}
