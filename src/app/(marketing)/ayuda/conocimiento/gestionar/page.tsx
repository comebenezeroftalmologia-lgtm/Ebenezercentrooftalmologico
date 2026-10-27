import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { puedeGestionarConocimiento, requireAppUser } from "@/lib/auth";
import { listDocumentosConocimiento, listPreguntasSinRespuesta } from "@/lib/ayuda/queries";
import { redirect } from "next/navigation";
import { GestorDocumentos } from "./GestorDocumentos";

export const dynamic = "force-dynamic";
// La indexación de un PDF grande (extraer texto) corre en una server action de esta página.
export const maxDuration = 60;

export default async function GestionarConocimientoPage() {
  const user = await requireAppUser();
  if (!puedeGestionarConocimiento(user)) redirect("/ayuda/conocimiento");
  const [documentos, sinRespuesta] = await Promise.all([listDocumentosConocimiento(), listPreguntasSinRespuesta()]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/ayuda/conocimiento" className="mb-3 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-navy">
        <ArrowLeft className="h-3 w-3" /> Volver al Centro de Conocimiento
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Gestionar documentos</h1>
      <p className="mb-6 text-sm text-ink-3">
        Sube los documentos oficiales. Quedan en <strong>borrador</strong> hasta que los publiques; solo los publicados los usa la IA
        y los ve el equipo. Al publicar una versión nueva con el mismo código, la anterior pasa a obsoleta.
      </p>
      <GestorDocumentos documentos={documentos} sinRespuesta={sinRespuesta} />
    </div>
  );
}
