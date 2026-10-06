/**
 * Las piezas de la plataforma.
 *
 * Un solo lenguaje para las ocho páginas. La regla es simple: si algo se
 * necesita en dos páginas, vive aquí; si se escribe a mano en cada una,
 * en un mes ya no se parecen.
 *
 * Lo que define el aspecto (colores, la tipografía de cifras, las curvas y
 * los tiempos del movimiento) está en tailwind.config.ts, no repartido por
 * los componentes.
 *
 * Los tres gestos del movimiento, y nada más:
 *   animate-entrar   el bloque sube 10px y se revela
 *   animate-crecer   la barra sale desde abajo
 *   duration-abrir   se despliega de izquierda a derecha
 *
 * Ninguno pasa de 800 ms. Y quien tenga activado "reducir movimiento" en su
 * computador no ve ninguno: hay gente a la que el movimiento le produce
 * mareo, y en salud eso importa.
 */
export { Cifra } from "./Cifra";
export { EncabezadoPagina } from "./EncabezadoPagina";
export { Segmentado } from "./Segmentado";
export { Titular } from "./Titular";
export { FilaApoyo } from "./FilaApoyo";
export { BarraComposicion } from "./BarraComposicion";
export { Tira } from "./Tira";
export { Seccion } from "./Seccion";
export { TablaEspera } from "./TablaEspera";
export { Controles } from "./Controles";
