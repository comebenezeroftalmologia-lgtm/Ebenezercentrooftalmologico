import { createServiceClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------------
   DE CUANDO SON LOS DATOS DE CADA PANTALLA
   Escrito el 08-11-2026.

   POR QUE EXISTE

   El 18-10-2026 dejo de servir un token y la carga a Supabase empezo a
   recargar, corrida tras corrida, la misma foto del 13 de octubre. Las
   104 corridas salieron en verde. Nadie se entero hasta tres semanas
   despues, cuando alguien fue a armar el informe de octubre.

   La razon de fondo de que nadie se enterara no fue el token: fue que
   NINGUNA pantalla decia de cuando eran sus datos. Una cifra vieja con
   cara de cifra de hoy no se distingue de una buena mirandola.

   Esto no automatiza nada ni vigila nada. Solo va a la fuente y pregunta
   "cual es el dato mas reciente que tienes". El componente FechaDelDato
   se encarga de pintarlo y de ponerse rojo cuando ya pasaron los dias.

   REGLA: si no se puede saber, se devuelve null y la pantalla lo dice.
   Nunca se devuelve la fecha de hoy como relleno -- eso convertiria el
   aviso en la mentira que vino a destapar.
   --------------------------------------------------------------------- */

/** Devuelve el valor maximo de una columna de fecha, o null si no se pudo. */
async function ultimaFecha(tabla: string, columna: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from(tabla)
      .select(columna)
      .order(columna, { ascending: false })
      .limit(1);
    if (error) {
      // No se tumba la pantalla por no poder fechar el dato: se calla el
      // valor y FechaDelDato muestra "sin fecha de actualizacion", que es
      // la verdad.
      console.warn(`frescura(${tabla}.${columna}):`, error.message);
      return null;
    }
    const fila = (data ?? [])[0] as Record<string, unknown> | undefined;
    const v = fila?.[columna];
    return typeof v === "string" && v.trim() ? v : null;
  } catch (e) {
    console.warn(`frescura(${tabla}.${columna}):`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Clientes Potenciales: ultima oportunidad que entro del CRM. */
export function ultimoDatoOportunidades(): Promise<string | null> {
  return ultimaFecha("opportunities", "created_at");
}

/** Redes Sociales: ultimo dia con metricas cargadas. */
export function ultimoDatoRedes(): Promise<string | null> {
  return ultimaFecha("social_stats", "date");
}

/** Frecuencias en Supabase: ultimo dia del detalle diario. */
export function ultimoDatoFrecuencias(): Promise<string | null> {
  return ultimaFecha("frecuencias_dias", "fecha");
}
