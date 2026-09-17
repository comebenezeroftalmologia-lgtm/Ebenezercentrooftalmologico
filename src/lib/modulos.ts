/** Los módulos del dashboard de mercadeo — el admin decide, persona por
 * persona, a cuáles tiene acceso (tabla modulo_accesos). Un admin ve
 * todos sin necesidad de asignación explícita. */
export type Modulo =
  | "leads"
  | "no_quirurgicos"
  | "quirurgicos"
  | "redes_sociales"
  | "frecuencias"
  | "venta_del_dia";

export const MODULOS: { slug: Modulo; label: string; href: string }[] = [
  { slug: "leads", label: "Generación de Clientes Potenciales", href: "/leads" },
  { slug: "no_quirurgicos", label: "Ordenamientos No Quirúrgicos", href: "/no-quirurgicos" },
  { slug: "quirurgicos", label: "Ordenamientos Quirúrgicos", href: "/quirurgicos" },
  { slug: "redes_sociales", label: "Redes Sociales", href: "/redes-sociales" },
  { slug: "frecuencias", label: "Frecuencias", href: "/frecuencias" },
  { slug: "venta_del_dia", label: "Venta del Día", href: "/venta-del-dia" },
];

export function moduloLabel(slug: Modulo): string {
  return MODULOS.find((m) => m.slug === slug)?.label ?? slug;
}
