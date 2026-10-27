/** Extracción de texto de los documentos que sube Calidad, y partición en
 * fragmentos para la búsqueda. Todo corre en el servidor. */

export const EXTENSIONES_PERMITIDAS = ["pdf", "docx", "txt", "md", "csv", "xlsx", "xls", "doc", "pptx", "png", "jpg", "jpeg"];
export const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024;

export function extensionDe(nombre: string): string {
  const i = nombre.lastIndexOf(".");
  return i === -1 ? "" : nombre.slice(i + 1).toLowerCase();
}

/** Devuelve el texto del archivo, o "" si el formato no permite extraerlo
 * (planillas, imágenes, etc.: quedan como descargables y se buscan por título/descripción). */
export async function extraerTexto(buf: Buffer, nombreArchivo: string): Promise<string> {
  const ext = extensionDe(nombreArchivo);
  try {
    if (ext === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: true });
      return String(text ?? "");
    }
    if (ext === "docx") {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      return r.value ?? "";
    }
    if (ext === "txt" || ext === "md" || ext === "csv") {
      return buf.toString("utf8");
    }
  } catch {
    return "";
  }
  return "";
}

/** Parte el texto en fragmentos de ~1100 caracteres respetando párrafos. */
export function partirEnFragmentos(texto: string, max = 1100): string[] {
  const limpio = texto
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!limpio) return [];

  const parrafos = limpio.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  const fragmentos: string[] = [];
  let actual = "";

  const empujar = () => {
    if (actual.trim()) fragmentos.push(actual.trim());
    actual = "";
  };

  for (const p of parrafos) {
    if (p.length > max) {
      empujar();
      // Párrafo largo: cortar por oraciones.
      const oraciones = p.split(/(?<=[.;:!?])\s+/);
      for (const o of oraciones) {
        if ((actual + " " + o).length > max) empujar();
        actual += (actual ? " " : "") + o;
        if (actual.length > max * 1.5) empujar();
      }
      empujar();
      continue;
    }
    if ((actual + "\n" + p).length > max) empujar();
    actual += (actual ? "\n" : "") + p;
  }
  empujar();
  return fragmentos;
}
