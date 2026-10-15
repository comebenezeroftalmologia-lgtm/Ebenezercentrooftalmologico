import type { Area } from "./types";

export interface BloqueAreas {
  id: "atencion" | "direccion" | "soporte";
  numero: string;
  titulo: string;
  subtitulo: string;
  areas: Area[];
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function clasificarBloqueArea(nombre: string): "atencion" | "direccion" | "soporte" {
  const n = normalizar(nombre);
  if (
    n.includes("siau") ||
    n.includes("atencion al usuario") ||
    n.includes("call center") ||
    n.includes("experiencia") ||
    n.includes("mercadeo") ||
    n.includes("comercial")
  ) {
    return "atencion";
  }
  if (n.includes("gerencia") || n.includes("calidad") || n.includes("direccion")) {
    return "direccion";
  }
  return "soporte";
}

function prioridadEnBloque(nombre: string): number {
  const n = normalizar(nombre);
  if (n.includes("siau") || n.includes("atencion al usuario")) return 1;
  if (n.includes("experiencia")) return 2;
  if (n.includes("call center")) return 3;
  if (n.includes("mercadeo")) return 4;
  if (n.includes("gerencia")) return 1;
  if (n.includes("calidad")) return 2;
  return 10;
}

export function agruparAreasPorCadenaDeValor(areas: Area[]): BloqueAreas[] {
  const atencion: Area[] = [];
  const direccion: Area[] = [];
  const soporte: Area[] = [];

  for (const area of areas) {
    const tipo = clasificarBloqueArea(area.nombre);
    if (tipo === "atencion") atencion.push(area);
    else if (tipo === "direccion") direccion.push(area);
    else soporte.push(area);
  }

  const ordenar = (a: Area, b: Area) => {
    const pa = prioridadEnBloque(a.nombre);
    const pb = prioridadEnBloque(b.nombre);
    if (pa !== pb) return pa - pb;
    return a.nombre.localeCompare(b.nombre, "es");
  };

  atencion.sort(ordenar);
  direccion.sort(ordenar);
  soporte.sort(ordenar);

  return [
    {
      id: "atencion",
      numero: "01",
      titulo: "Atención al Paciente y Frente Comercial",
      subtitulo: "Contacto directo, orientación al usuario (SIAU), agendamiento y captación.",
      areas: atencion,
    },
    {
      id: "direccion",
      numero: "02",
      titulo: "Dirección y Gobierno Clínico",
      subtitulo: "Estrategia institucional, habilitación, auditoría y mejoramiento continuo.",
      areas: direccion,
    },
    {
      id: "soporte",
      numero: "03",
      titulo: "Soporte Clínico, Administrativo y Financiero",
      subtitulo: "Respaldo asistencial, facturación, suministro, talento humano y tecnología.",
      areas: soporte,
    },
  ].filter((b) => b.areas.length > 0);
}
