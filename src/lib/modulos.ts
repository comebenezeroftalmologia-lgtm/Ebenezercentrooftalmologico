/** Los módulos del dashboard de mercadeo — el admin decide, persona por
 * persona, a cuáles tiene acceso (tabla modulo_accesos). Un admin ve
 * todos sin necesidad de asignación explícita.
 *
 * `grupo` es solo agrupación de navegación/UI (el ícono "Analytics" en
 * el Sidebar y los encabezados en /usuarios) — el acceso sigue siendo
 * granular por cada slug individual, no por grupo. */
export type Modulo =
  | "leads"
  | "no_quirurgicos"
  | "quirurgicos"
  | "redes_sociales"
  | "frecuencias"
  | "venta_del_dia"
  | "procesos";

export type GrupoModulo = "Analytics" | "Procesos";

export const MODULOS: { slug: Modulo; label: string; href: string; grupo: GrupoModulo }[] = [
  { slug: "leads", label: "Generación de Clientes Potenciales", href: "/leads", grupo: "Analytics" },
  { slug: "no_quirurgicos", label: "Ordenamientos No Quirúrgicos", href: "/no-quirurgicos", grupo: "Analytics" },
  { slug: "quirurgicos", label: "Ordenamientos Quirúrgicos", href: "/quirurgicos", grupo: "Analytics" },
  { slug: "redes_sociales", label: "Redes Sociales", href: "/redes-sociales", grupo: "Analytics" },
  { slug: "frecuencias", label: "Frecuencias", href: "/frecuencias", grupo: "Analytics" },
  { slug: "venta_del_dia", label: "Venta del Día", href: "/venta-del-dia", grupo: "Analytics" },
  { slug: "procesos", label: "Procesos", href: "/procesos", grupo: "Procesos" },
];

export function moduloLabel(slug: Modulo): string {
  return MODULOS.find((m) => m.slug === slug)?.label ?? slug;
}

export function modulosPorGrupo(lista: typeof MODULOS = MODULOS): Record<GrupoModulo, typeof MODULOS> {
  return {
    Analytics: lista.filter((m) => m.grupo === "Analytics"),
    Procesos: lista.filter((m) => m.grupo === "Procesos"),
  };
}
