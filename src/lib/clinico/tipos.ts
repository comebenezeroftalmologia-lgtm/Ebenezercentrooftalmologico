import { fechaLarga, horaLegible } from "./fechas";

export type Canal = "llamada" | "whatsapp";
export const CANALES: { valor: Canal; label: string }[] = [
  { valor: "whatsapp", label: "WhatsApp" },
  { valor: "llamada", label: "Llamada (agente de voz)" },
];

export type EstadoEnvio = "enviando" | "enviado" | "fallido" | "omitido" | "simulado";

/** Estados de cita que entrega SISMA en la agenda: P (pendiente) y CC (confirmada). */
export const ESTADOS_CITA: { valor: string; label: string }[] = [
  { valor: "P", label: "Pendiente" },
  { valor: "CC", label: "Confirmada" },
];

export interface CitaAgenda {
  id_cita: number;
  fecha: string;
  hora: string | null;
  fecha_hora: string | null;
  estado: string | null;
  estado_descripcion: string | null;
  asunto: string | null;
  id_sede: number | null;
  paciente_autoid: number | null;
  tipo_id: string | null;
  num_id: string | null;
  paciente_nombre: string | null;
  contrato_nombre: string | null;
  celular: string | null;
  cod_medico: number | null;
  medico_nombre: string | null;
  especialidad: string | null;
  vigente: boolean;
  sincronizada_at: string;
}

export interface ReglaRecordatorio {
  id: string;
  nombre: string;
  activa: boolean;
  canal: Canal;
  anticipacion_minutos: number;
  ventana_desde: string; // "07:00:00"
  ventana_hasta: string;
  dias_semana: number[];
  sedes: number[] | null;
  medicos: number[] | null;
  especialidades: string[] | null;
  asuntos: string[] | null;
  estados: string[];
  max_retraso_minutos: number;
  min_antelacion_minutos: number;
  max_intentos: number;
  reintento_minutos: number;
  plantilla: string;
  updated_at: string;
}

export interface EnvioRecordatorio {
  id: number;
  regla_id: string;
  id_cita: number;
  canal: string;
  intento: number;
  estado: EstadoEnvio;
  motivo: string | null;
  celular: string | null;
  programado_para: string | null;
  mensaje: string | null;
  resultado: string | null;
  created_at: string;
  enviado_at: string | null;
}

export const DIAS_SEMANA: { valor: number; corto: string }[] = [
  { valor: 1, corto: "Lun" },
  { valor: 2, corto: "Mar" },
  { valor: 3, corto: "Mié" },
  { valor: 4, corto: "Jue" },
  { valor: 5, corto: "Vie" },
  { valor: 6, corto: "Sáb" },
  { valor: 7, corto: "Dom" },
];

export const VARIABLES_PLANTILLA: { clave: string; ejemplo: string; descripcion: string }[] = [
  { clave: "nombre", ejemplo: "María Fernanda Pérez", descripcion: "Nombre completo" },
  { clave: "primer_nombre", ejemplo: "María", descripcion: "Primer nombre" },
  { clave: "fecha", ejemplo: "miércoles 11 de noviembre", descripcion: "Fecha de la cita" },
  { clave: "hora", ejemplo: "8:30 a. m.", descripcion: "Hora de la cita" },
  { clave: "medico", ejemplo: "Dr. Carlos Gómez", descripcion: "Médico" },
  { clave: "especialidad", ejemplo: "Oftalmología", descripcion: "Especialidad del médico" },
  { clave: "sede", ejemplo: "Sede 1", descripcion: "Sede de la cita" },
  { clave: "asunto", ejemplo: "Consulta de primera vez", descripcion: "Tipo de cita (código SISMA)" },
];

export function nombreSede(id: number | null): string {
  return id == null ? "—" : `Sede ${id}`;
}

/** "MARÍA FERNANDA" → "María Fernanda". */
export function titulo(v: string | null | undefined): string {
  return (v ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

export function valoresPlantilla(c: Pick<CitaAgenda, "paciente_nombre" | "fecha" | "hora" | "medico_nombre" | "especialidad" | "id_sede" | "asunto">): Record<string, string> {
  const nombre = titulo(c.paciente_nombre);
  return {
    nombre,
    primer_nombre: nombre.split(" ")[0] ?? "",
    fecha: fechaLarga(c.fecha),
    hora: horaLegible(c.hora),
    medico: titulo(c.medico_nombre),
    especialidad: titulo(c.especialidad),
    sede: nombreSede(c.id_sede),
    asunto: c.asunto ?? "",
  };
}

/** Reemplaza {variable} por su valor; lo desconocido se deja como está. */
export function renderPlantilla(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{(\w+)\}/g, (m, k: string) => (k in valores ? valores[k] : m));
}

/** Celular colombiano de 10 dígitos → "+57…". */
export function aE164(celular: string): string {
  return `+57${celular}`;
}

/** Oculta el medio de un número: 300 ••• 4567. */
export function celularEnmascarado(c: string | null): string {
  if (!c) return "—";
  return `${c.slice(0, 3)} ••• ${c.slice(-4)}`;
}
