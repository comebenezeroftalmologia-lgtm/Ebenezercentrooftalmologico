import Link from "next/link";
import { BookOpen, GraduationCap, LifeBuoy, Bug } from "lucide-react";
import { requireAppUser } from "@/lib/auth";
import { IconoIA } from "@/components/IconoIA";

export const dynamic = "force-dynamic";

const TARJETAS = [
  {
    href: "/ayuda/conocimiento",
    titulo: "Centro de Conocimiento",
    texto: "Pregúntale a la IA de Ebenezer sobre procesos, políticas y formatos, y descarga los documentos vigentes.",
    Icono: BookOpen,
    estado: null,
    ia: true,
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
        {TARJETAS.map(({ href, titulo, texto, Icono, estado, ia }) => (
          <Link
            key={href}
            href={href}
            className={
              ia
                ? "group relative overflow-hidden rounded-[16px] border border-[#3B5BA8]/60 p-5 shadow-[0_6px_22px_rgba(8,26,58,0.25)] transition hover:-translate-y-0.5 hover:border-[#7DD3FC]/60 hover:shadow-[0_0_22px_rgba(96,165,250,0.4),0_0_34px_rgba(168,85,247,0.25)]"
                : "group rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition hover:-translate-y-0.5 hover:border-[#C9DDFB]"
            }
            style={ia ? { backgroundImage: "linear-gradient(135deg, #081A3A 0%, #0F2A5E 55%, #2A1B5C 100%)" } : undefined}
          >
            {ia && (
              <>
                <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#A78BFA]/25 blur-2xl" />
                <span className="pointer-events-none absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-[#22D3EE]/20 blur-2xl" />
              </>
            )}
            <div className="relative mb-3 flex items-center justify-between">
              {ia ? <IconoIA size={40} /> : <Icono className="h-5 w-5 text-[#1D58D8]" strokeWidth={1.75} />}
              {estado && (
                <span className="rounded-pill bg-[#FEF3E2] px-2 py-0.5 text-[11px] font-medium text-[#B54708]">{estado}</span>
              )}
            </div>
            <p className={`relative mb-1 font-semibold ${ia ? "text-white" : "text-navy"}`}>{titulo}</p>
            <p className={`relative text-sm ${ia ? "text-[#A5C8FF]" : "text-ink-3"}`}>{texto}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
