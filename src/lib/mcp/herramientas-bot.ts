import { agendarCita, consultarCupos, validarAfiliado } from "@/lib/bot/acciones";
import type { Herramienta } from "./tipos";

// Herramientas del bot de citas (MutualSer subsidiado + SISMA). Misma lógica que los endpoints /api/bot/**.
export const herramientasBot: Herramienta[] = [
  {
    name: "validar_afiliado",
    description:
      "Valida si una persona es afiliada activa de MutualSer subsidiado, por número de documento. Devuelve afiliado, activo, nombre de pila, régimen, municipio de afiliación, en_cobertura y accion_sugerida (continuar, no_aplica o derivar_humano). Consulta la base sincronizada desde el Google Sheet.",
    inputSchema: {
      type: "object",
      properties: { documento: { type: "string", description: "Número de documento, solo dígitos, sin puntos." } },
      required: ["documento"],
      additionalProperties: false,
    },
    annotations: { title: "Validar afiliado MutualSer", readOnlyHint: true, openWorldHint: false },
    run: (a) => validarAfiliado(a.documento, "mcp"),
  },
  {
    name: "consultar_cupos",
    description:
      "Consulta en SISMA los cupos de agenda para una fecha (consulta de oftalmología general primera vez, asunto 10). Devuelve médicos y horarios en formato 24 horas; solo los horarios con libre=true se pueden agendar. Solo lectura.",
    inputSchema: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "Fecha en formato aaaa-mm-dd." },
        codMedico: { type: "integer", description: "Opcional: código de un médico para filtrar." },
        idEspecialidad: { type: "integer", description: "Opcional: id de especialidad para filtrar." },
      },
      required: ["fecha"],
      additionalProperties: false,
    },
    annotations: { title: "Consultar cupos SISMA", readOnlyHint: true, openWorldHint: true },
    run: (a) =>
      consultarCupos({
        fecha: String(a.fecha ?? ""),
        codMedico: a.codMedico as number | string | undefined,
        idEspecialidad: a.idEspecialidad as number | string | undefined,
      }),
  },
  {
    name: "agendar_cita",
    description:
      "CREA UNA CITA REAL en SISMA para un paciente que ya existe (no crea pacientes). Usar solo después de que la persona haya confirmado expresamente día, hora y médico, y de haber consultado los cupos. Si ya tiene una cita pendiente ese día no agenda otra. Debe enviarse confirmado=true.",
    inputSchema: {
      type: "object",
      properties: {
        documento: { type: "string", description: "Documento del paciente, solo dígitos." },
        codMedico: { type: "integer", description: "Código del médico del cupo elegido (campo medico.codigo)." },
        fecha: { type: "string", description: "Fecha aaaa-mm-dd del cupo elegido." },
        hora: { type: "string", description: "Hora HH:mm en 24 horas del cupo elegido." },
        idAsunto: { type: "integer", description: "Asunto de la cita. Por defecto 10 (consulta general primera vez)." },
        observacion: { type: "string", description: "Opcional: nota para la cita (máx. 200 caracteres)." },
        confirmado: { type: "boolean", description: "Debe ser true: indica que la persona confirmó la cita." },
      },
      required: ["documento", "codMedico", "fecha", "hora", "confirmado"],
      additionalProperties: false,
    },
    annotations: { title: "Agendar cita en SISMA", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    habilitada: () => process.env.MCP_PERMITIR_AGENDAR === "true",
    run: async (a) => {
      if (a.confirmado !== true) {
        return { status: 400, body: { error: "Falta confirmado=true: la persona debe confirmar la cita antes de agendarla." } };
      }
      return agendarCita({
        documento: String(a.documento ?? ""),
        codMedico: a.codMedico as number | string | undefined,
        idAsunto: a.idAsunto as number | string | undefined,
        fecha: String(a.fecha ?? ""),
        hora: String(a.hora ?? ""),
        observacion: typeof a.observacion === "string" ? a.observacion : undefined,
        canal: "mcp",
      });
    },
  },
];
