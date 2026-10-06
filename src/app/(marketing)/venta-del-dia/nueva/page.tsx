import { requireModuloAccess } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";
import { formatNumber } from "@/lib/text";
import {
  calcularVentaDelDia,
  mensajeClaro,
  LIMITE_SEDE1,
  type SedeFiltro,
} from "@/lib/ventaDelDia";
import { Tira, Seccion, TablaEspera, BarraComposicion, Controles } from "@/components/eb";

/**
 * Venta del Día — en paralelo. La de siempre sigue intacta en /venta-del-dia.
 *
 * Los números NO se calculan aquí: salen de calcularVentaDelDia(), la misma
 * función que usa la de siempre. Por construcción las dos dan lo mismo.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * DE DÓNDE SALE ESTE ASPECTO
 *
 * Faber escogió Attio como referencia ("me gusta, y más cómo se mueven"), así
 * que el 06-10-2026 se midió attio.com directamente —no se copió de memoria—
 * y de ahí salieron estas reglas:
 *
 *   · NO HAY CAJAS. Attio casi no dibuja bordes: separa con una línea de 1px
 *     y con aire. Las cuatro tarjetas con sombra que había antes eran lo que
 *     hacía ver la pantalla "de plantilla".
 *   · Rótulos de 11px en mayúsculas espaciadas; cifras de 24-40px con
 *     interletrado negativo. Attio usa -0,01em en lo grande: apretar la letra
 *     es lo que hace que se vea caro.
 *   · Esquinas de 4px, no de 12. Lo redondito se ve amable; lo recto, serio.
 *   · El color solo cuando significa. En Attio el acento aparece dos veces en
 *     toda la pantalla. Aquí el azul de Ebenezer queda en el enlace y poco
 *     más, y el rojo únicamente cuando un servicio se pasó del plazo.
 *   · Movimiento: curva cubic-bezier(0.2,0,0,1) —la de ellos—, 150 ms para lo
 *     micro, 300 ms para lo normal. Los bloques suben 8px, no 10 ni 20: poca
 *     distancia y frenada larga. Se siente que el producto responde, no que
 *     la página se está armando.
 *   · Cero párrafos explicando. Lo que antes era prosa ahora es rótulo, y la
 *     letra menuda va UNA vez al pie, no repetida debajo de cada tabla.
 * ──────────────────────────────────────────────────────────────────────────
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Del más oscuro al más claro: la categoría más grande es la más oscura, así
 *  la barra se lee sola sin mirar la leyenda. */
const TONOS = ["#0B1633", "#3B4F8D", "#7D88B0", "#AEB6CE", "#D5DAE6", "#EDEFF5"];

/** Decimales con coma, como se escribe en Colombia. Antes salía "58.5 días". */
const conComa = (n: number) =>
  n.toLocaleString("es-CO", { maximumFractionDigits: 1 });

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
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5 pb-6">
      <div className="animate-asomar">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">
          Tableros · Operación
        </div>
        <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-ink">
          Venta del Día
        </h1>
      </div>
      <div className="animate-asomar" style={{ animationDelay: "60ms" }}>
        <Controles fecha={fecha} sede={sede} />
      </div>
    </header>
  );

  if (d.fetchError) {
    return (
      <div>
        {encabezado}
        <div className="flex items-start gap-3 rounded-xs border border-[#F2C744] bg-[#FEF8E7] p-4 text-[13px] text-[#8A6D00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>No se pudo consultar SISMA para el {fecha}: {d.fetchError}</span>
        </div>
      </div>
    );
  }

  const cat = (nombre: string) =>
    d.porCategoria.find((c) => c.stage === nombre)?.count ?? 0;

  const partes = d.porCategoria.map((c, i) => ({
    nombre: c.stage,
    valor: c.count,
    color: TONOS[i % TONOS.length],
  }));

  return (
    <div className="pb-16">
      {encabezado}

      {/* La tira. Antes esto eran cuatro tarjetas con borde y sombra. */}
      <Tira
        datos={[
          {
            rotulo: "Atendidos hoy",
            valor: d.asistidas,
            pie: d.hayAgendado
              ? `${formatNumber(d.agendaDia)} agendados`
              : sede === "2"
                ? "Mutual · Sede 2"
                : "Particular, Ecopetrol y prepagadas",
          },
          ...(d.hayAgendado
            ? [
                { rotulo: "Sin atender", valor: d.programadas, pie: "del agendamiento del día" },
                ...(d.pctAgenda !== null
                  ? [
                      {
                        rotulo: "Asistencia",
                        valor: d.pctAgenda,
                        decimales: 1,
                        sufijo: "%",
                        pie: "de lo agendado",
                      },
                    ]
                  : []),
              ]
            : []),
          {
            rotulo: "Primera vez",
            valor: cat("Primera Vez"),
            pie: `${Math.round((cat("Primera Vez") / Math.max(1, d.asistidas)) * 100)}% de lo atendido`,
          },
          {
            rotulo: "Control",
            valor: cat("Control"),
            pie: `${Math.round((cat("Control") / Math.max(1, d.asistidas)) * 100)}% de lo atendido`,
          },
          {
            rotulo: "Pre y pos-qx",
            valor: d.preQuirurgicas + d.posQuirurgicos,
            pie: `${d.preQuirurgicas} antes · ${d.posQuirurgicos} después`,
          },
        ]}
      />

      <div className="mt-9">
        {/* El cierre de Frecuencias: una línea, no una tarjeta con borde azul. */}
        {d.diaTipico && d.pctTipico !== null && d.hayAgendado ? (
          <Seccion titulo="Cierre en Frecuencias" retraso={180}>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="flex flex-wrap items-baseline gap-x-2 text-[13.5px] text-ink-2">
                <span className="font-cifra text-[20px] font-medium tabular-nums tracking-[-0.015em] text-ink">
                  {formatNumber(d.diaTipico.total)}
                </span>
                <span>
                  atenciones facturadas · un {d.nombreDia} típico cierra en{" "}
                  <span className="font-cifra tabular-nums text-ink">
                    {formatNumber(d.diaTipico.tipico ?? 0)}
                  </span>
                </span>
                <span
                  className={`font-cifra font-medium tabular-nums ${
                    d.pctTipico >= 100 ? "text-green" : "text-[#B3541E]"
                  }`}
                >
                  {d.pctTipico}%
                </span>
              </div>
              <a
                href={`/frecuencias?dia=${fecha}`}
                className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-blue transition-[gap] duration-gesto ease-attio hover:gap-2.5"
              >
                Ver el detalle
                <span>→</span>
              </a>
            </div>
          </Seccion>
        ) : null}

        {d.asistenciaError ? (
          <Seccion retraso={200}>
            <div className="flex items-start gap-3 rounded-xs border border-[#F2C744] bg-[#FEF8E7] p-4 text-[13px] text-[#8A6D00]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>{mensajeClaro(d.asistenciaError, "la asistencia del día")}</span>
            </div>
          </Seccion>
        ) : null}

        {partes.length > 0 ? (
          <Seccion titulo="En qué se atendió" retraso={240}>
            <BarraComposicion partes={partes} />
          </Seccion>
        ) : null}

        {/* Las dos tablas bajo UN solo rótulo y UNA sola letra menuda.
            Antes el mismo párrafo iba repetido palabra por palabra debajo de
            cada una. */}
        {d.bloques.length > 0 ? (
          <Seccion titulo="Cuánto espera un paciente nuevo" retraso={300}>
            {d.bloques.map((b, i) => (
              // Mismo ancho tope que la tabla, para que el rótulo de la sede y
              // la regla queden encima de sus propias columnas y no flotando
              // al otro extremo de la pantalla.
              <div key={b.titulo} className={`max-w-[640px] ${i > 0 ? "mt-7" : ""}`}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">{b.titulo}</span>
                  <span className="text-[11.5px] text-ink-3">{b.regla}</span>
                </div>
                <TablaEspera filas={b.filas} />
              </div>
            ))}

            <p className="mt-5 max-w-[640px] text-[12px] leading-[18px] text-ink-3">
              {d.oportunidad !== null ? (
                <>
                  De los{" "}
                  <span className="font-cifra tabular-nums">
                    {formatNumber(d.diasPrimera.length)}
                  </span>{" "}
                  pacientes de primera vez de hoy, la mitad esperó más de{" "}
                  <span className="font-cifra tabular-nums">{conComa(d.oportunidad)}</span> días y
                  la otra mitad menos
                  {d.mismoDia > 0 ? (
                    <>
                      ; a <span className="font-cifra tabular-nums">{formatNumber(d.mismoDia)}</span>{" "}
                      lo atendieron el mismo día que pidió
                    </>
                  ) : null}
                  {sede === "1" && d.oportunidad > LIMITE_SEDE1 ? (
                    <span className="text-[#C0392B]"> — más de 3 semanas</span>
                  ) : null}
                  {sede === "todas" ? ", mezclando las dos sedes" : ""}.{" "}
                </>
              ) : null}
              Solo consultas de primera vez: los controles se agendan lejos a propósito. No se
              muestran los servicios con menos de 3 pacientes en el día.
            </p>
          </Seccion>
        ) : null}

        {d.cirugiaError ? (
          <Seccion titulo="Cirugía" retraso={360}>
            <div className="flex items-start gap-3 rounded-xs border border-[#F2C744] bg-[#FEF8E7] p-4 text-[13px] text-[#8A6D00]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>{mensajeClaro(d.cirugiaError, "la programación de cirugía")}</span>
            </div>
          </Seccion>
        ) : (
          <Seccion titulo="Cirugía" retraso={360}>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <span className="font-cifra text-[24px] font-medium tabular-nums tracking-[-0.015em] text-ink">
                {formatNumber(d.cirugiaTotal)}
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-2">
                {d.estadosCirugia.map(([estado, n]) => (
                  <span key={estado}>
                    <span className="font-cifra tabular-nums text-ink">{n}</span>{" "}
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
              <p className="mt-3 max-w-3xl text-[12px] leading-[18px] text-ink-3">
                {d.cirugiaAviso}
              </p>
            ) : null}
          </Seccion>
        )}
      </div>
    </div>
  );
}
