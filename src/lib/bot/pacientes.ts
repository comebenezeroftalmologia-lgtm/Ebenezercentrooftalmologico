import { fonetico } from "./nombres";
import { sismaNodeJson } from "./sisma-citas";

// Alta de pacientes nuevos en SISMA para el bot de citas (afiliados de MutualSer que aún no existen
// como paciente) y regla de «primera vez o más de un año».

export type AfiliadoBase = {
  tipo_doc: string | null;
  primer_nombre: string | null;
  segundo_nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  regimen: string | null;
  cod_departamento: string | null;
  cod_municipio: string | null;
};

/** Dapta manda la palabra "undefined" (o "null") cuando una variable no existe. */
export function textoLimpio(v: unknown): string {
  const t = typeof v === "string" ? v.trim() : "";
  return /^(undefined|null)$/i.test(t) ? "" : t;
}

/** Celular colombiano: 10 dígitos que empiezan por 3 (acepta prefijo 57). */
export function celularValido(v: unknown): string | null {
  let d = textoLimpio(String(v ?? "")).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? d : null;
}

const NOMBRES_GENERICOS = ["NO ESPECIFICA", "NO REPORTA", "SIN INFORMACION", "NO INFORMA", "OTRO", "CENTRO"];

type Barrio = { codigo: string; nombre: string; zona?: string };

async function barriosDe(dep: string, mun: string, nombre?: string): Promise<Barrio[]> {
  const q = new URLSearchParams({ departamento: dep, municipio: mun, limite: "200" });
  if (nombre) q.set("nombre", nombre);
  try {
    const r = await sismaNodeJson<unknown>(`/api/catalogos/barrios?${q}`);
    return r.status === 200 && Array.isArray(r.data) ? (r.data as Barrio[]) : [];
  } catch {
    return [];
  }
}

/** Busca el código de barrio por lo que dijo la persona; si no lo encuentra usa uno genérico (y lo avisa). */
export async function resolverBarrio(dep: string, mun: string, dicho: string): Promise<{ codigo: string; zona: "U" | "R"; confirmado: boolean } | null> {
  const dichoF = fonetico(dicho);
  if (dichoF) {
    const palabras = [dicho, ...dichoF.split(" ").filter((p) => p.length >= 4)];
    for (const p of palabras) {
      const lista = await barriosDe(dep, mun, p);
      if (lista.length) {
        const exacto = lista.find((b) => fonetico(b.nombre) === dichoF) ?? lista[0];
        return { codigo: String(exacto.codigo), zona: exacto.zona === "R" ? "R" : "U", confirmado: true };
      }
    }
  }
  const todos = await barriosDe(dep, mun);
  if (!todos.length) return null;
  const generico = todos.find((b) => NOMBRES_GENERICOS.includes(b.nombre.toUpperCase().trim())) ?? todos[0];
  return { codigo: String(generico.codigo), zona: generico.zona === "R" ? "R" : "U", confirmado: false };
}

const REGIMEN_RIPS: Record<string, number> = { CONTRIBUTIVO: 1, SUBSIDIADO: 2 };

/** Contrato y empresa de MutualSer según el régimen (ajustables por variable de entorno). */
function contratoDe(regimen: string | null): { contrato: number; empresa: string } {
  const sub = (regimen ?? "").toUpperCase() === "SUBSIDIADO";
  const contrato = Number(sub ? process.env.SISMA_CONTRATO_MUTUAL_S : process.env.SISMA_CONTRATO_MUTUAL_C) || (sub ? 100345 : 100346);
  return { contrato, empresa: sub ? "ESS207" : "EPS048" };
}

export type ResultadoAlta = { ok: true; avisos: string[] } | { ok: false; motivo: string; detalle?: unknown };

export async function crearPacienteSisma(
  documento: string,
  a: AfiliadoBase,
  extra: { celular: string; direccion?: string; barrio?: string },
  idUsuario: number,
): Promise<ResultadoAlta> {
  const dep = (a.cod_departamento ?? "").trim();
  const mun = (a.cod_municipio ?? "").trim();
  if (!dep || !mun || !a.primer_nombre || !a.primer_apellido || (a.sexo !== "M" && a.sexo !== "F")) {
    return { ok: false, motivo: "datos_afiliado_incompletos" };
  }
  const avisos: string[] = ["correo", "tipo de sangre", "orientación sexual"];

  const direccion = textoLimpio(extra.direccion).slice(0, 100);
  if (!direccion) avisos.push("dirección");
  const dicho = textoLimpio(extra.barrio);
  const barrio = await resolverBarrio(dep, mun, dicho);
  if (!barrio) return { ok: false, motivo: "sin_barrios_para_el_municipio" };
  if (!barrio.confirmado) avisos.push("barrio");

  const { contrato, empresa } = contratoDe(a.regimen);
  const limpio = (s: string | null) => (s ?? "").trim().toUpperCase().slice(0, 50);
  const cuerpo: Record<string, unknown> = {
    tipoId: (a.tipo_doc ?? "CC").trim().toUpperCase(),
    numId: documento,
    primerNombre: limpio(a.primer_nombre),
    segundoNombre: limpio(a.segundo_nombre),
    primerApellido: limpio(a.primer_apellido),
    segundoApellido: limpio(a.segundo_apellido),
    sexo: a.sexo,
    celular: extra.celular,
    email: "noreporta@example.com",
    direccion: direccion || "NO REPORTA",
    zona: barrio.zona,
    tipoSangre: "No Aplica",
    codPais: "CO",
    codDepartamento: dep,
    codMunicipio: mun,
    barrio: barrio.codigo,
    nroHistoria: documento.slice(0, 20),
    discapacidad: "0",
    orientacionSexual: process.env.SISMA_ORIENTACION_DEFECTO || "1",
    regimenRips: REGIMEN_RIPS[(a.regimen ?? "").toUpperCase()] ?? 2,
    contrato,
    empresa,
    idUsuario,
  };
  if (a.fecha_nacimiento && /^\d{4}-\d{2}-\d{2}/.test(a.fecha_nacimiento)) cuerpo.fechaNacimiento = a.fecha_nacimiento.slice(0, 10);

  try {
    const r = await sismaNodeJson<unknown>("/api/pacientes", { method: "POST", body: cuerpo });
    if (r.status >= 200 && r.status < 300) return { ok: true, avisos };
    return { ok: false, motivo: "sisma_rechazo_alta", detalle: { status: r.status, respuesta: r.data } };
  } catch {
    return { ok: false, motivo: "error_alta_sisma" };
  }
}

/** ¿Tuvo una consulta atendida en el último año? null = no se pudo saber. */
export async function atendidoEnElUltimoAno(autoid: number): Promise<boolean | null> {
  const hoy = new Date();
  const hace = new Date(hoy.getTime() - 365 * 24 * 3600 * 1000);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  try {
    const r = await sismaNodeJson<unknown>(`/api/pacientes/${autoid}/citas?desde=${f(hace)}&hasta=${f(hoy)}&estado=A&limite=20`);
    if (r.status !== 200 || !Array.isArray(r.data)) return null;
    return (r.data as Record<string, unknown>[]).some((c) => String(c.estado ?? c.Estado ?? "").toUpperCase() === "A");
  } catch {
    return null;
  }
}
