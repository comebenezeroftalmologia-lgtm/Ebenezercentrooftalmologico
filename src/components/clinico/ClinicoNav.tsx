import Link from "next/link";
import { CalendarDays, BellRing } from "lucide-react";

export function ClinicoNav({ activo, verAgenda, verRecordatorios }: { activo: "agenda" | "recordatorios"; verAgenda: boolean; verRecordatorios: boolean }) {
  const item = (href: string, texto: string, Icono: typeof CalendarDays, esActivo: boolean) => (
    <Link
      key={href}
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
        esActivo ? "bg-navy text-white" : "bg-white text-ink-2 ring-1 ring-line hover:bg-blue-10"
      }`}
    >
      <Icono className="h-4 w-4" strokeWidth={1.8} />
      {texto}
    </Link>
  );
  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Módulo clínico">
      {verAgenda && item("/clinico/agenda", "Agenda", CalendarDays, activo === "agenda")}
      {verRecordatorios && item("/clinico/recordatorios", "Recordatorios", BellRing, activo === "recordatorios")}
    </nav>
  );
}
