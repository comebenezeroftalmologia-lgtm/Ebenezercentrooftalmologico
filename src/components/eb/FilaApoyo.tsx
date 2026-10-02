import { Cifra } from "./Cifra";

/**
 * Las cifras de apoyo: las que acompañan al titular.
 *
 * Van juntas en una sola caja, separadas por una línea finísima, no en
 * tarjetas sueltas cada una con su borde. Marcos dentro de marcos es lo que
 * hace que una pantalla se vea de plantilla; lo caro se separa con aire.
 *
 * Las cifras entran escalonadas, con 60 ms entre una y otra. Todas al mismo
 * tiempo se siente a interruptor; escalonadas se siente a que algo está
 * pasando.
 */
export function FilaApoyo({
  datos,
}: {
  datos: { rotulo: string; valor: number; decimales?: number; sufijo?: string; pie?: string }[];
}) {
  return (
    <div
      className="mb-5 grid overflow-hidden rounded-md border border-line bg-white animate-entrar"
      style={{ gridTemplateColumns: `repeat(${datos.length}, minmax(0,1fr))` }}
    >
      {datos.map((d, i) => (
        <div
          key={d.rotulo}
          className={`p-4 transition-colors duration-200 hover:bg-ebbg ${
            i > 0 ? "border-l border-line" : ""
          }`}
        >
          <div className="mb-2.5 text-[11px] tracking-overline text-ink-3">
            {d.rotulo}
          </div>
          <Cifra
            valor={d.valor}
            decimales={d.decimales}
            sufijo={d.sufijo}
            espera={140 + i * 60}
            className="text-[25px] font-medium leading-none"
          />
          {d.pie ? <div className="mt-2 text-[12.5px] text-ink-2">{d.pie}</div> : null}
        </div>
      ))}
    </div>
  );
}
