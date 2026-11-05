import type { Resultado } from "@/lib/bot/acciones";

export type Contexto = { origen: string };

/** Una herramienta del servidor MCP. `habilitada` permite apagarla con una variable de entorno. */
export type Herramienta = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  habilitada?: () => boolean;
  run: (args: Record<string, unknown>, ctx: Contexto) => Promise<Resultado>;
};
