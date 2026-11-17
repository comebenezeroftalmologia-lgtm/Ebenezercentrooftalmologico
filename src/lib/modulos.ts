/** Los módulos de la plataforma – el administrador o líder decide, persona por
 * persona, a cuáles tiene acceso cada usuario. Desarrolladores y administradores
 * ven todos los módulos automáticamente.
 *
 * Cada casilla tiene su propio `slug` único para que ningún tablero quede
 * pegado con otro al asignar o quitar permisos. */
export type Modulo =
  | "leads"
  | "no_quirurgicos"
  | "quirurgicos"
  | "redes_sociales"
  | "frecuencias"
  | "venta_del_dia"
  | "cartera_radicacion"
  | "digiturno_contact"
  | "talento_humano"
  | "cartera"
  | "procesos"
  | "proyectos";

export type GrupoModulo = "Analytics" | "Procesos";

export const MODULOS: { slug: Modulo; label: string; href: string; grupo: GrupoModulo }[] = [
  { slug: "leads", label: "Generación de Clientes Potenciales", href: "/leads", grupo: "Analytics" },
  { slug: "no_quirurgicos", label: "Ordenamientos No Quirúrgicos", href: "/no-quirurgicos", grupo: "Analytics" },
  { slug: "quirurgicos", label: "Ordenamientos Quirúrgicos", href: "/quirurgicos", grupo: "Analytics" },
  { slug: "redes_sociales", label: "Redes Sociales", href: "/redes-sociales", grupo: "Analytics" },
  { slug: "frecuencias", label: "Frecuencias", href: "/frecuencias", grupo: "Analytics" },
  { slug: "venta_del_dia", label: "Venta del Día", href: "/venta-del-dia", grupo: "Analytics" },
  { slug: "cartera_radicacion", label: "Cartera y Radicación", href: "/cartera", grupo: "Analytics" },
  { slug: "digiturno_contact", label: "Digiturno y Contact", href: "/digiturno-contact", grupo: "Analytics" },
  { slug: "talento_humano", label: "Talento Humano", href: "/talento-humano", grupo: "Analytics" },
  { slug: "cartera", label: "Cartera — Mesa de trabajo", href: "/workcenter/cartera", grupo: "Procesos" },
  { slug: "procesos", label: "Procesos", href: "/procesos", grupo: "Procesos" },
  { slug: "proyectos", label: "Tareas", href: "/proyectos", grupo: "Procesos" },
];

export const MODULOS_SLUGS = new Set<Modulo>(MODULOS.map((m) => m.slug));

/** Slugs incluidos en la restricción original 024 de `modulo_accesos`, usados como respaldo si la migración 033 aún no se ha corrido en Supabase. */
export const MODULOS_TABLA_CLASICA = new Set<Modulo>([
  "leads",
  "no_quirurgicos",
  "quirurgicos",
  "redes_sociales",
  "frecuencias",
  "venta_del_dia",
  "procesos",
  "proyectos",
  "talento_humano",
  "cartera",
]);

export const MODULOS_WORKCENTER: Modulo[] = ["proyectos", "cartera", "talento_humano"];

export function esModuloValido(valor: string): valor is Modulo {
  return MODULOS_SLUGS.has(valor as Modulo);
}

export function moduloLabel(slug: Modulo): string {
  return MODULOS.find((m) => m.slug === slug)?.label ?? slug;
}

export function modulosPorGrupo(lista: typeof MODULOS = MODULOS): Record<GrupoModulo, typeof MODULOS> {
  return {
    Analytics: lista.filter((m) => m.grupo === "Analytics"),
    Procesos: lista.filter((m) => m.grupo === "Procesos"),
  };
}
