import { requireAppUser } from "@/lib/auth";
import { traerDiasTipicos } from "@/lib/diaTipico";

/**
 * Cuánto cierra un día típico, según el motor de Frecuencias.
 *
 * La lógica vive en `@/lib/diaTipico` porque las páginas del servidor la
 * llaman directo, sin pasar por HTTP. Esta ruta existe para lo que corre en
 * el navegador (o para mirar el dato a mano); no duplica nada.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireAppUser();

  const datos = await traerDiasTipicos();
  if (!datos) {
    // Que falte el contexto no es grave: quien lo pide debe seguir
    // funcionando sin él. Por eso 200 con el dato vacío y no un error.
    return Response.json({
      dias: {},
      aviso: "No se pudo traer el dia tipico del repositorio del tablero.",
    });
  }

  // Si piden una fecha concreta se devuelve solo esa: no hace falta cargar
  // 180 días para pintar una tarjeta.
  const fecha = new URL(req.url).searchParams.get("fecha");
  if (fecha) {
    return Response.json({
      generado: datos.generado ?? null,
      fecha,
      dato: datos.dias?.[fecha] ?? null,
    });
  }

  return Response.json(datos);
}
