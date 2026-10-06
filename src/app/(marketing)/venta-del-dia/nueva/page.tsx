import { requireModuloAccess } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";
import { SingleDatePicker } from "@/components/SingleDatePicker";
import { formatNumber } from "@/lib/text";
import {
  calcularVentaDelDia,
  mensajeClaro,
  LIMITE_SEDE1,
  type SedeFiltro,
} from "@/lib/ventaDelDia";
import {
  EncabezadoPagina,
  Titular,
  FilaApoyo,
  BarraComposicion,
} from "@/components/eb";

/**
 * Venta del Día — versión nueva, en paralelo.
 *
 * Vive en /venta-del-dia/nueva y la de siempre queda intacta en
 * /venta-del-dia. La idea es que Faber pueda abrir las dos, compararlas y
 * decidir; si esta no sirve, se borra y no pasó nada.
 *
 * Lo importante: los números NO se calculan aquí. Salen de
 * calcularVentaDelDia(), la misma función que usa la página de siempre. Por
 * construcción las dos tienen que dar lo mismo — un rediseño que cambie una
 * cifra no es un rediseño, es un daño.
 *
 * Lo que sí cambia:
 *   · una cifra manda y el resto queda en voz baja
 *   · las cifras se cuentan al entrar
 *   · sin cajitas: se separa con aire, no con bordes
 *   · el azul de Ebenezer solo donde significa algo
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Del más oscuro al más claro: la categoría más grande es la más oscura,
 *  así la barra se lee sola sin tener que mirar la leyenda. */
const TONOS = ["#0B1633", "#3B4F8D", "#7D88B0", "#AEB6CE", "#D5DAE6", "#EDEFF5"];

export default async function VentaDelDiaNueva({
  searchParams,
}: {
  searchParams: { fecha?: string; sede?: string };
}) {
  await requireModuloAccess("venta_del_dia");

  const fecha = searchParams.fecha ?? hoyISO();
  const sede: SedeFiltro =
    searchParams.sede === "1" || searchParams.sede === "2" ? searchParams.sede : "todas";

  const d = await calcularVentaDelDia({ fecha, sede });

  const encabezado = (
    <EncabezadoPagina
      seccion="Tableros · Operación"
      titulo="Venta del Día"
      acciones={<SingleDatePicker fecha={fecha} sede={sede} />}
    />
  );

  if (d.fetchError) {
    return (
      <div>
        {encabezado}
        <div className="flex items-start gap-3 rounded-sm border border-[#F2C744] bg-[#FEF8E7] p-4 text-sm text-[#8A6D00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>No se pudo consultar SISMA para el {fecha}: {d.fetchError}</span>
        </div>
      </div>
    );
  }

  const partes = d.porCategoria.map((c, i) => ({
    nombre: c.stage,
    valor: c.count,
    color: TONOS[i % TONOS.length],
  }));

  return (
    <div>
      {encabezado}

      <Titular
        rotulo="Pacientes atendidos hoy"
        valor={d.asistidas}
        detalle={
          d.hayAgendado ? (
            <>
              de <b className="font-cifra tabular-nums text-ink">{formatNumber(d.agendaDia)}</b>{" "}
              agendadas · {formatNumber(d.programadas)} quedaron sin atender
              {d.pctAgenda !== null ? (
                <span className="ml-2 inline-flex rounded-xs bg-blue-10 px-2 py-0.5 text-[12.5px] font-semibold text-blue">
                  {d.pctAgenda}% atendido
                </span>
              ) : null}
            </>
          ) : sede === "2" ? (
            "Mutual · Sede 2. Lo agendado no se puede separar por sede: SISMA no manda ese dato."
          ) : (
            "Particular, Ecopetrol y prepagadas · Sede 1. Lo agendado no se puede separar por sede."
          )
        }
      />

      <FilaApoyo
        datos={[
          {
            rotulo: "Primera vez",
            valor: d.porCategoria.find((c) => c.stage === "Primera Vez")?.count ?? 0,
            pie: `${Math.round(((d.porCategoria.find((c) => c.stage === "Primera Vez")?.count ?? 0) / Math.max(1, d.asistidas)) * 100)}% de lo atendido`,
          },
          {
            rotulo: "Control",
            valor: d.porCategoria.find((c) => c.stage === "Control")?.count ?? 0,
            pie: `${Math.round(((d.porCategoria.find((c) => c.stage === "Control")?.count ?? 0) / Math.max(1, d.asistidas)) * 100)}% de lo atendido`,
          },
          {
            rotulo: "Pre y pos-quirúrgicas",
            valor: d.preQuirurgicas + d.posQuirurgicos,
            pie: `${d.preQuirurgicas} antes · ${d.posQuirurgicos} después`,
          },
        ]}
      />

      {/* El cierre de Frecuencias va aparte y rotulado: es otra fuente
          midiendo otra cosa. Juntarlo con el número de arriba confundía. */}
      {d.diaTipico && d.pctTipico !== null && d.hayAgendado ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-5 rounded-sm border border-line border-l-[3px] border-l-blue bg-white px-4 py-3 text-[13.5px] text-ink-2 animate-entrar">
          <div>
            En <b className="text-ink">Frecuencias</b>, el cierre facturado de hoy es de{" "}
            <b className="font-cifra tabular-nums text-ink">{formatNumber(d.diaTipico.total)}</b>{" "}
            atenciones. Un {d.nombreDia} típico cierra en{" "}
            <b className="font-cifra tabular-nums text-ink">{formatNumber(d.diaTipico.tipico ?? 0)}</b>{" "}
            —{" "}
            <b className={d.pctTipico >= 100 ? "text-green" : "text-[#B3541E]"}>
              {d.pctTipico}%
            </b>
            .
          </div>
          <a
            href={`/frecuencias?dia=${fecha}`}
            className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-blue transition-[gap] duration-gesto ease-eb-entrada hover:gap-2.5"
          >
            Ver el detalle <span>→</span>
          </a>
        </div>
      ) : null}

      {d.asistenciaError ? (
        <div className="mb-5 flex items-start gap-3 rounded-sm border border-[#F2C744] bg-[#FEF8E7] p-4 text-sm text-[#8A6D00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{mensajeClaro(d.asistenciaError, "la asistencia del día")}</span>
        </div>
      ) : null}

      {partes.length > 0 ? (
        <section className="mb-6 rounded-md border border-line bg-white p-5 animate-entrar">
          <h2 className="mb-3.5 text-[12px] font-semibold tracking-overline text-ink-3">
            EN QUÉ SE ATENDIÓ
          </h2>
          <BarraComposicion partes={partes} />
        </section>
      ) : null}

      {/* La espera, dicha como una frase: "mediana" es jerga. */}
      {d.oportunidad !== null ? (
        <div className="mb-5 rounded-sm border border-line bg-white px-4 py-3 text-sm text-ink-2 animate-entrar">
          Hoy se atendieron{" "}
          <b className="font-cifra tabular-nums text-ink">{formatNumber(d.diasPrimera.length)}</b>{" "}
          pacientes <b className="text-ink">por primera vez</b>. La mitad de ellos esperó más
          de <b className="font-cifra tabular-nums text-ink">{d.oportunidad}</b>{" "}
          {d.oportunidad === 1 ? "día" : "días"} entre que pidió la cita y lo atendieron, y la
          otra mitad esperó menos.{" "}
          {d.mismoDia > 0 ? (
            <>
              A <b className="font-cifra tabular-nums text-ink">{formatNumber(d.mismoDia)}</b> lo
              atendieron el mismo día que pidió.
            </>
          ) : (
            <>A ninguno lo atendieron el mismo día que pidió.</>
          )}
          {sede === "1" && d.oportunidad > LIMITE_SEDE1 ? (
            <span className="font-semibold text-[#C0392B]"> Eso es más de 3 semanas.</span>
          ) : null}
          {/* Sin esta aclaración el número de arriba engaña: con las dos sedes
              juntas, Mutual —que tiene plazos de 50 y 90 días por contrato—
              arrastra el promedio y hace ver mal a la Sede 1, que va en 5. */}
          {sede === "todas" ? (
            <span className="text-ink-3">
              {" "}
              Mezcla las dos sedes; abajo va cada una con su propio plazo.
            </span>
          ) : null}
        </div>
      ) : null}

      {d.bloques.map((b) => (
        <section
          key={b.titulo}
          className="mb-5 overflow-hidden rounded-md border border-line bg-white animate-entrar"
        >
          <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-navy">
            Cuánto espera un paciente nuevo · {b.titulo}
            <span className="ml-2 font-normal text-ink-3">{b.regla}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {b.filas.map((x) => {
                // La barra se mide contra el límite de esa fila, no contra la
                // espera más larga: así "llena" significa "en el límite", y se
                // pueden comparar servicios con plazos distintos.
                const alerta = x.espera > x.limite;
                const ancho = Math.max(2, Math.min(100, Math.round((x.espera / x.limite) * 100)));
                return (
                  <tr
                    key={x.servicio}
                    className="border-t border-line-2 transition-colors duration-200 hover:bg-ebbg"
                  >
                    <td className="px-4 py-2 text-ink-2">{x.servicio}</td>
                    <td className="w-20 px-2 py-2 text-right font-cifra text-[12.5px] tabular-nums text-ink-3">
                      {formatNumber(x.n)}
                    </td>
                    <td className="w-48 px-2 py-2">
                      <div className="h-2 w-full rounded-pill bg-ebbg">
                        <div
                          className={`h-2 rounded-pill transition-[width] duration-abrir ease-eb-entrada ${
                            alerta ? "bg-[#C0392B]" : "bg-green"
                          }`}
                          style={{ width: `${ancho}%` }}
                        />
                      </div>
                    </td>
                    <td
                      className={`w-36 whitespace-nowrap px-4 py-2 text-right font-cifra font-semibold tabular-nums ${
                        alerta ? "text-[#C0392B]" : "text-green"
                      }`}
                    >
                      {x.espera} {x.espera === 1 ? "día" : "días"}
                      <span className="ml-1 font-normal text-ink-3">de {x.limite}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-line px-4 py-2 text-xs text-ink-3">
            Solo consultas de primera vez; los controles no cuentan porque se agendan lejos a
            propósito. La cifra es la espera de la mitad de los pacientes de ese servicio, y al
            lado el plazo con el que se compara. No se muestran los servicios con menos de 3
            pacientes en el día.
          </div>
        </section>
      ))}

      {d.cirugiaError ? (
        <div className="mb-5 flex items-start gap-3 rounded-sm border border-[#F2C744] bg-[#FEF8E7] p-4 text-sm text-[#8A6D00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{mensajeClaro(d.cirugiaError, "la programación de cirugía")}</span>
        </div>
      ) : (
        <section className="mb-5 rounded-md border border-line bg-white p-5 animate-entrar">
          <h2 className="mb-3.5 text-[12px] font-semibold tracking-overline text-ink-3">
            CIRUGÍA
          </h2>
          <div className="flex flex-wrap items-baseline gap-9">
            <span className="font-cifra text-[25px] font-medium tabular-nums">
              {formatNumber(d.cirugiaTotal)}
            </span>
            <div className="flex flex-wrap gap-6 text-[13px] text-ink-2">
              {d.estadosCirugia.map(([estado, n]) => (
                <span key={estado}>
                  <b className="font-cifra tabular-nums text-ink">{n}</b>{" "}
                  {estado.toLowerCase()}
                </span>
              ))}
              {d.autoCanceladas > 0 ? (
                <span className="text-ink-3">
                  {d.autoCanceladas} canceladas automáticamente, no cuentan
                </span>
              ) : null}
            </div>
          </div>
          {d.cirugiaAviso ? (
            <p className="mt-3 text-xs text-ink-3">{d.cirugiaAviso}</p>
          ) : null}
        </section>
      )}
    </div>
  );
}
