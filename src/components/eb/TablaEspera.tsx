import { formatNumber } from "@/lib/text";

/**
 * La tabla de espera, sin barras.
 *
 * Antes cada fila tenía una barrita verde o roja. Se veía de plantilla y
 * además engañaba: la barra se llenaba contra el plazo de esa fila, así que
 * dos barras del mismo largo querían decir cosas distintas.
 *
 * Attio y Stripe resuelven esto sin dibujar nada: el número a la derecha,
 * alineado por dígito, y el color SOLO cuando se pasó del plazo. Si todo está
 * bien, la tabla es gris y no grita. Cuando algo se sale, salta solo.
 *
 * Las filas se iluminan al pasar por encima en 150 ms, que es el tiempo de
 * Attio para que se sienta instantáneo.
 */
export function TablaEspera({
  filas,
}: {
  filas: { servicio: string; n: number; espera: number; limite: number }[];
}) {
  return (
    // Ancho tope. Sin esto la tabla se estira a 1.400px y el nombre del
    // servicio queda a un palmo de su número: hay que barrer la pantalla con
    // los ojos para juntarlos. Attio nunca deja una tabla llegar al borde.
    <table className="w-full max-w-[640px]">
      <tbody>
        {filas.map((x) => {
          const alerta = x.espera > x.limite;
          return (
            <tr
              key={x.servicio}
              className="group border-b border-line-2 transition-colors duration-micro ease-attio last:border-0 hover:bg-ebbg"
            >
              <td className="py-2 pr-4 text-[13px] leading-[18px] text-ink-2">
                {x.servicio.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </td>
              <td className="w-16 py-2 pr-7 text-right font-cifra text-[12px] tabular-nums text-ink-3">
                {formatNumber(x.n)}
              </td>
              <td className="w-28 whitespace-nowrap py-2 text-right">
                <span
                  className={`font-cifra text-[13.5px] font-medium tabular-nums ${
                    alerta ? "text-[#C0392B]" : "text-ink"
                  }`}
                >
                  {x.espera.toLocaleString("es-CO", { maximumFractionDigits: 1 })}
                </span>
                <span className="font-cifra text-[12px] tabular-nums text-ink-3">
                  {" / "}
                  {x.limite}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
