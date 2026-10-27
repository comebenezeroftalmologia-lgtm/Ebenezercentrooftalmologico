import { GraduationCap } from "lucide-react";
import { requireAppUser } from "@/lib/auth";

export default async function AcademiaPage() {
  await requireAppUser();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua-20 text-navy">
        <GraduationCap className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <span className="mb-3 rounded-pill bg-[#FEF3E2] px-2.5 py-0.5 text-xs font-medium text-[#B54708]">Próximamente</span>
      <h1 className="mb-2 text-2xl font-semibold text-navy">Academia Ebenezer</h1>
      <p className="text-sm text-ink-3">
        Aquí vivirán los cursos y capacitaciones del equipo. Estamos preparándola; mientras tanto, resuelve tus dudas en el
        Centro de Conocimiento.
      </p>
    </div>
  );
}
