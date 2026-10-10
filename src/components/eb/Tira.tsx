import { Cifra } from "./Cifra";

/**
 * La tira de cifras. Reemplaza a las tarjetas.
 *
 * Por qué: cuatro tarjetas con borde y sombra para mostrar cuatro números es
 * lo que delata un tablero hecho a las carreras. Mercury y Attio ponen los
 * mismos cuatro números en una línea —rótulo diminuto arriba, cifra grande
 * debajo— sin una sola caja. Ocupa un tercio del espacio y se lee más rápido.
 *
 * La primera cifra pesa más que las demás a propósito: una manda, el resto
 * acompaña.
 *
 * Las cifras entran escalonadas de a 60 ms. No es adorno: el ojo sigue el
 * orden en que aparecen, y ese orden es el de importancia.
 */
export function Tira({
  datos,
}: {
  datos: { rotulo: string; valor: number; decimales?: number; sufijo?: string; pie?: string }[];
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
      {datos.map((d, i) => (
        <div
          key={d.rotulo}
          className="animate-asomar"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
            {d.rotulo}
          </div>
          {/* Sin espacio entre la cifra y el %: "89,1 %" se ve suelto, "89,1%"
              se ve escrito por alguien. */}
          <div className="flex items-baseline">
            <Cifra
              valor={d.valor}
              decimales={d.decimales ?? 0}
              espera={i * 60}
              mono={false}
              className={
                i === 0
                  ? "text-[40px] font-medium leading-none tracking-[-0.025em] text-ink"
                  : "text-[25px] font-medium leading-none tracking-[-0.02em] text-ink-2"
              }
            />
            {d.sufijo ? (
              <span
                className={
                  i === 0
                    ? "text-[24px] font-medium leading-none tracking-[-0.02em] text-ink-3"
                    : "text-[17px] font-medium leading-none text-ink-3"
                }
              >
                {d.sufijo}
              </span>
            ) : null}
          </div>
          {d.pie ? (
            <div className="mt-1.5 text-[12px] leading-[18px] text-ink-3">{d.pie}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
