import type { ReactNode } from "react";
import { Cifra } from "./Cifra";

/**
 * La cifra que manda en la pantalla.
 *
 * El problema de hoy no es que la plataforma esté fea: es que todo pesa lo
 * mismo. Tres números del mismo tamaño compitiendo hacen que uno no sepa
 * cuál mirar primero. Aquí una manda —grande, en voz alta— y el resto queda
 * alrededor en voz baja.
 *
 * No es quitar información, es ordenarla por importancia.
 */
export function Titular({
  rotulo,
  valor,
  unidad,
  detalle,
  derecha,
}: {
  rotulo: string;
  valor: number;
  /** "pacientes atendidos", "días", lo que sea. Va debajo, pequeño. */
  unidad?: string;
  detalle?: ReactNode;
  /** Lo que va a la derecha: una chispa de días, un contexto, un %. */
  derecha?: ReactNode;
}) {
  return (
    <div className="mb-3.5 rounded-md border border-line bg-white p-6 shadow-eb-1 animate-entrar">
      <div className="flex flex-wrap items-start justify-between gap-10">
        <div>
          <div className="mb-2.5 text-[11px] tracking-overline text-ink-3">
            {rotulo}
          </div>
          <Cifra valor={valor} espera={60} className="text-[52px] font-medium leading-none" />
          {unidad ? (
            <span className="ml-2 text-sm text-ink-3">{unidad}</span>
          ) : null}
          {detalle ? (
            <div className="mt-2 text-[13.5px] text-ink-2">{detalle}</div>
          ) : null}
        </div>
        {derecha}
      </div>
    </div>
  );
}
