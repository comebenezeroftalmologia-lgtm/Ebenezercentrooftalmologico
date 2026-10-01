import { requireAppUser } from "@/lib/auth";
import { sismaFetch, sismaNodeFetch } from "@/lib/integrations/sisma";

/**
 * Qué campos manda SISMA de verdad.
 *
 * El código de la plataforma declara unos campos (`SismaCitaDia` tiene
 * idCita, fecha, hora, estado, asunto, idSede, paciente, medico), pero esa
 * declaración no recorta nada en tiempo de ejecución: el objeto conserva
 * todo lo que vino. Así que el API puede estar mandando la empresa sin que
 * nadie la lea.
 *
 * Esto responde la pregunta con evidencia en vez de con suposiciones:
 * devuelve los NOMBRES de los campos y, solo para los que suenan a sede,
 * empresa o contrato, los valores distintos. No devuelve pacientes, ni
 * médicos, ni nada identificable.
 *
 * Es temporal: una vez se sepa qué trae cada endpoint, este archivo se
 * borra.
 */

export const dynamic = "force-dynamic";

function resumir(filas: unknown[]) {
  if (!filas.length) return { filas: 0 };
  const campos = new Set<string>();
  for (const f of filas) {
    if (f && typeof f === "object") {
      for (const k of Object.keys(f as object)) campos.add(k);
    }
  }
  const interesantes: Record<string, Record<string, number>> = {};
  for (const c of campos) {
    if (!/sede|empresa|contrato/i.test(c)) continue;
    const cuenta: Record<string, number> = {};
    for (const f of filas) {
      let v = (f as Record<string, unknown>)[c];
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        v = o.nombre ?? o.descripcion ?? JSON.stringify(v).slice(0, 40);
      }
      const k = String(v);
      cuenta[k] = (cuenta[k] ?? 0) + 1;
    }
    interesantes[c] = cuenta;
  }
  return { filas: filas.length, campos: [...campos].sort(), interesantes };
}

export async function GET(req: Request) {
  await requireAppUser();

  const fecha =
    new URL(req.url).searchParams.get("fecha") ??
    new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const salida: Record<string, unknown> = { fecha };

  // Se piden CRUDAS, sin pasar por fetchCitasDia/fetchCitasAtendidas, porque
  // esas funciones arman un objeto con los campos que la plataforma decidió
  // leer y botan el resto. Justamente lo que hay que averiguar es qué hay en
  // "el resto".
  try {
    const filas = await sismaFetch<unknown[]>(`/api/citas/dia?fecha=${fecha}`);
    salida.citasDia = resumir(filas);
  } catch (e) {
    salida.citasDia = { error: e instanceof Error ? e.message : "error" };
  }

  try {
    const { filas } = await sismaNodeFetch(
      `/api/informes/citas-atendidas?desde=${fecha}&hasta=${fecha}`,
    );
    salida.citasAtendidas = resumir(filas as unknown[]);
  } catch (e) {
    salida.citasAtendidas = { error: e instanceof Error ? e.message : "error" };
  }

  return Response.json(salida);
}
