import type { Pipeline } from "@/lib/types";

// No existe una etapa literal "Ganada" en ninguno de los 3 pipelines de
// Clientify — el cierre exitoso real se identifica por status=Won O por
// llegar a la etapa de "programación" correspondiente (que es como
// operación registra la venta antes de marcar el deal como ganado).
//
// OJO: "Programación de Cirguía" (con el typo, sin la "a") es el nombre
// REAL de la etapa dentro del pipeline de Ordenamientos Quirúrgicos en la
// cuenta de Clientify de Ebenezer — no es un error de tipeo de este
// código, se preserva tal cual para que el filtro haga match.
export const VENTA_STAGES: Record<Pipeline, string[]> = {
  generacion_leads: ["Programación de Cirugía"],
  ordenamientos_qx: ["Programación de Cirguía"],
  ordenamientos_no_qx: ["Programación de Servicio"],
};

// Etapas que alimentan el indicador "Oportunidades con Probabilidad de
// Compra" — solo aplica al pipeline de Generación de Clientes
// Potenciales (Campañas).
export const PROBABILIDAD_COMPRA_STAGES = [
  "Servicio Agendado",
  "Asiste a Valoración Gratuita",
  "Asiste a Valoracion Pte Agendamiento",
  "Contacto de Cita sin Confirmar",
  "Contacto de Cita - Confirmado",
  "Agendamiento Prequirurgicos",
  "Control con Resultados",
  "Control Abierto",
];
