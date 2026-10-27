import Link from "next/link";
import { BookOpen, GraduationCap, LifeBuoy, Bug } from "lucide-react";
import { requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TARJETAS = [
  {
    href: "/ayuda/conocimiento",
    titulo: "Centro de Conocimiento",
    texto: "Pregúntale a la IA de Ebenezer sobre procesos, políticas y formatos, y descarga los documentos vigentes.",
    Icono: BookOpen,
    estado: null,
  },
  {
    href: "/ayuda/academia",
    titulo: "Academia",
    texto: "Cursos y capacitaciones para el equipo.",
    Icono: GraduationCap,
    estado: "Próximamente",
  },
  {
    href: "/ayuda/fallas",
    titulo: "Reporte de Fallas",
    texto: "¿Algo no funciona en la plataforma? Cuéntanos y lo revisamos.",
    Icono: Bug,
    estado: null,
  },
];

export default async function AyudaPage() {
  await requireAppUser();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aqua-20 text-navy">
          <LifeBuoy className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Ayuda</h1>
          <p className="text-sm text-ink-3">Todo lo que necesitas para resolver dudas y reportar problemas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TARJETAS.map(({ href, titulo, texto, Icono, estado }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition hover:-translate-y-0.5 hover:border-[#C9DDFB]"
          >
            <div className="mb-3 flex items-center justify-between">
              <Icono className="h-5 w-5 text-[#1D58D8]" strokeWidth={1.75} />
              {estado && (
                <span className="rounded-pill bg-[#FEF3E2] px-2 py-0.5 text-[11px] font-medium text-[#B54708]">{estado}</span>
              )}
            </div>
            <p className="mb-1 font-semibold text-navy">{titulo}</p>
            <p className="text-sm text-ink-3">{texto}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
