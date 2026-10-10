"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** En el servidor no hay layout que medir; allá se comporta como useEffect. */
const useAntesDePintar =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Rutas donde se sabe de antemano que SÍ va a haber panel. En esas se
 *  reserva el ancho desde el primer dibujo, para que el contenido no se
 *  corra cuando el panel aparezca. Sin esto hay un brinco. */
const SIEMPRE_TIENE_PANEL = new Set(["/frecuencias"]);

/**
 * El panel de secciones, a la izquierda.
 *
 * LA REGLA QUE LO GOBIERNA: NO INVENTA NADA. Lee del propio contenido qué
 * secciones existen y las muestra; si no encuentra al menos dos, no se
 * dibuja. Un panel con enlaces que no llevan a ninguna parte es peor que
 * no tener panel.
 *
 * Dos formas de leer, según la página:
 *
 *   · FRECUENCIAS. El tablero vive dentro de un iframe y trae sus propias
 *     pestañas. El panel las lee de ahí —texto y estado activo— y al
 *     hacer clic pulsa el botón real del tablero. No duplica su lógica ni
 *     la reimplementa: la usa. Por eso no se puede desincronizar: si el
 *     motor agrega una pestaña mañana, aquí aparece sola.
 *
 *   · LAS DEMÁS. Se buscan los encabezados <h2> que ya tiene la página y
 *     se arma la lista con ellos. Al hacer clic, se desplaza hasta el
 *     encabezado. Tampoco hay lista escrita a mano en ningún lado.
 *
 * LO QUE SÍ SE DECIDE AQUÍ es cómo se agrupan y qué ícono lleva cada una.
 * Eso es presentación, no contenido: diez renglones seguidos no se leen,
 * cuatro bloques de dos o tres sí. Una sección que no esté en la tabla de
 * abajo igual aparece —al final, sin grupo y con un ícono neutro—, así
 * que agregar una pestaña nueva en el motor nunca la deja por fuera.
 */

type Seccion = { id: string; texto: string };

/** Para comparar sin que tilde o mayúscula dañe la coincidencia. */
const llave = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const GRUPOS = ["VISIÓN GENERAL", "ANÁLISIS", "SEGMENTACIÓN", "FACTURACIÓN"] as const;
type Grupo = (typeof GRUPOS)[number];

/** Dibujos de línea, del mismo trazo, para que el riel se lea parejo. */
const TRAZO: Record<string, JSX.Element> = {
  tabla: (
    <>
      <rect x="2.5" y="3" width="15" height="14" rx="2" />
      <path d="M2.5 8h15M8 8v9" />
    </>
  ),
  barras: <path d="M3 16V9M8 16V4M13 16v-5M18 16V7" />,
  linea: (
    <>
      <path d="M2.5 13.5l4.5-5 3.5 3 6.5-7.5" />
      <path d="M2.5 17h15" />
    </>
  ),
  rejilla: (
    <>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M2.5 8h15M2.5 12h15M11 8v8.5" />
    </>
  ),
  persona: (
    <>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M3.8 17c.6-3.3 3.1-5 6.2-5s5.6 1.7 6.2 5" />
    </>
  ),
  lupa: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2L17.5 17.5" />
    </>
  ),
  escudo: <path d="M10 2.5l7 3.2v4.6c0 3.8-2.9 6.4-7 7.2-4.1-.8-7-3.4-7-7.2V5.7z" />,
  diana: (
    <>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="2.6" />
    </>
  ),
  balanza: (
    <>
      <path d="M10 3v14M4 7h12" />
      <path d="M4 7l-2 5h4zM16 7l-2 5h4z" />
    </>
  ),
  hoja: (
    <>
      <path d="M5 2.5h7l3.5 3.5v11a1 1 0 01-1 1H5a1 1 0 01-1-1v-13a1 1 0 011-1z" />
      <path d="M11.5 2.5V6H15" />
      <path d="M7 11h6M7 14h4" />
    </>
  ),
  punto: <circle cx="10" cy="10" r="3.2" />,
};

/** Dónde va cada sección y con qué dibujo. Lo que no esté aquí no se
 *  pierde: cae al final, sin grupo y con un punto. */
const MAPA: Record<string, { grupo: Grupo; icono: keyof typeof TRAZO }> = {
  "resumen comparativo": { grupo: "VISIÓN GENERAL", icono: "tabla" },
  "comparativo anual": { grupo: "VISIÓN GENERAL", icono: "barras" },
  "tendencia mensual": { grupo: "VISIÓN GENERAL", icono: "linea" },
  "detalle por empresa": { grupo: "ANÁLISIS", icono: "rejilla" },
  medicos: { grupo: "ANÁLISIS", icono: "persona" },
  "buscar servicio": { grupo: "ANÁLISIS", icono: "lupa" },
  prepagadas: { grupo: "SEGMENTACIÓN", icono: "escudo" },
  "diagnostica y apoyo": { grupo: "SEGMENTACIÓN", icono: "diana" },
  "cobrable vs no": { grupo: "FACTURACIÓN", icono: "balanza" },
  "contrato mutual": { grupo: "FACTURACIÓN", icono: "hoja" },
};

export function PanelSecciones() {
  const pathname = usePathname();
  const [secs, setSecs] = useState<Seccion[]>([]);
  const [activa, setActiva] = useState<string>("");
  const [titulo, setTitulo] = useState<string>("");

  useAntesDePintar(() => {
    setSecs([]);
    setActiva("");
    let vivo = true;
    let t: number | undefined;

    const leerIframe = (): boolean => {
      const f = document.querySelector("iframe");
      if (!f) return false;
      let d: Document | null = null;
      try {
        d = f.contentDocument;
      } catch {
        return false; // otro dominio: no se puede leer, y está bien
      }
      const btns = d ? Array.from(d.querySelectorAll<HTMLElement>(".tabs button")) : [];
      if (btns.length < 2) return false;
      if (!vivo) return true;
      setSecs(btns.map((b, i) => ({ id: String(i), texto: (b.textContent || "").trim() })));
      const i = btns.findIndex((b) => b.classList.contains("active"));
      setActiva(String(i < 0 ? 0 : i));
      // Recién ahora, con las pestañas ya leídas y funcionando, se le avisa
      // al tablero que puede apagar su propia fila: estaba saliendo dos
      // veces. El aviso va DESPUÉS de leerlas a propósito — si esto fallara,
      // la clase nunca se pone y el tablero conserva sus pestañas.
      d?.documentElement.classList.add("con-panel");
      return true;
    };

    const leerEncabezados = (): boolean => {
      const hs = Array.from(document.querySelectorAll<HTMLElement>("main h2")).filter(
        (h) => (h.textContent || "").trim().length > 1,
      );
      if (hs.length < 2) return false;
      if (!vivo) return true;
      setSecs(
        hs.map((h, i) => {
          if (!h.id) h.id = `sec-${i}`;
          return { id: h.id, texto: (h.textContent || "").trim() };
        }),
      );
      return true;
    };

    // El tablero tarda en cargar: se reintenta un rato y luego se deja.
    // Los primeros intentos van rápido (80 ms) para alcanzar a apagar las
    // pestañas de adentro antes de que el ojo las vea; si no aparecen
    // pronto, se espacia para no gastar en vano.
    let intentos = 0;
    const probar = () => {
      if (!vivo) return;
      const ok = pathname === "/frecuencias" ? leerIframe() : leerEncabezados();
      if (!ok && intentos < 60) {
        intentos++;
        t = window.setTimeout(probar, intentos < 20 ? 80 : 400);
      }
    };
    probar();

    // Y además se engancha al momento exacto en que el iframe termina de
    // cargar, que es cuando sus pestañas existen por primera vez.
    const f = document.querySelector("iframe");
    const alCargar = () => leerIframe();
    if (f && pathname === "/frecuencias") f.addEventListener("load", alCargar);

    return () => {
      vivo = false;
      if (t) window.clearTimeout(t);
      if (f) f.removeEventListener("load", alCargar);
      try {
        document
          .querySelector("iframe")
          ?.contentDocument?.documentElement.classList.remove("con-panel");
      } catch {
        /* ya no está: nada que devolver */
      }
    };
  }, [pathname]);

  // Mientras el tablero esté abierto se vigila cuál pestaña está activa,
  // para que el panel siga a la verdad aunque se cambie desde adentro.
  useEffect(() => {
    if (pathname !== "/frecuencias" || secs.length === 0) return;
    const id = window.setInterval(() => {
      try {
        const d = document.querySelector("iframe")?.contentDocument;
        const btns = d ? Array.from(d.querySelectorAll(".tabs button")) : [];
        const i = btns.findIndex((b) => b.classList.contains("active"));
        if (i >= 0) setActiva((a) => (a === String(i) ? a : String(i)));
      } catch {
        /* sin acceso: se deja como está */
      }
    }, 600);
    return () => window.clearInterval(id);
  }, [pathname, secs.length]);

  useAntesDePintar(() => {
    const h1 = document.querySelector("main h1");
    setTitulo((h1?.textContent || "").trim());
  }, [pathname, secs.length]);

  const reservar = SIEMPRE_TIENE_PANEL.has(pathname);
  if (secs.length < 2 && !reservar) return null;

  const ir = (s: Seccion, i: number) => {
    if (pathname === "/frecuencias") {
      try {
        const d = document.querySelector("iframe")?.contentDocument;
        const b = d?.querySelectorAll<HTMLElement>(".tabs button")[i];
        b?.click();
        setActiva(String(i));
      } catch {
        /* nada: si no se puede, no pasa nada */
      }
      return;
    }
    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiva(s.id);
  };

  // ¿Se agrupa o se lista?
  //
  // Agrupar es para cuando la lista es tan larga que deja de leerse. Las
  // diez secciones de Frecuencias lo necesitan; las tres de Clientes
  // Potenciales, no — ahí los rótulos serían más renglones que secciones.
  //
  // Y se agrupa solo si TODAS caben en un grupo de verdad. Antes bastaba
  // con que una cupiera: las demás iban a un cajón llamado "OTRAS", que no
  // le dice nada a quien abre la página y además encabezaba el riel entero
  // en los módulos que no estaban contemplados.
  //
  // Con esta regla, un módulo nuevo nunca sale mal: o entra completo en
  // grupos, o se lista limpio. Nunca a medias.
  const MINIMO_PARA_AGRUPAR = 6;
  const porGrupo = new Map<string, { s: Seccion; i: number }[]>();
  const sueltas: { s: Seccion; i: number }[] = [];
  secs.forEach((s, i) => {
    const m = MAPA[llave(s.texto)];
    if (!m) {
      sueltas.push({ s, i });
      return;
    }
    const lista = porGrupo.get(m.grupo) ?? [];
    lista.push({ s, i });
    porGrupo.set(m.grupo, lista);
  });
  const agrupar = secs.length >= MINIMO_PARA_AGRUPAR && sueltas.length === 0;
  if (!agrupar) {
    porGrupo.clear();
    sueltas.length = 0;
    secs.forEach((s, i) => sueltas.push({ s, i }));
  }

  const renglon = ({ s, i }: { s: Seccion; i: number }) => {
    const on = activa === s.id || (pathname === "/frecuencias" && activa === String(i));
    const icono = MAPA[llave(s.texto)]?.icono ?? "punto";
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => ir(s, i)}
        aria-current={on ? "true" : undefined}
        className={`group relative flex w-full items-center gap-[11px] rounded-sm px-2.5 py-[9px] text-left text-[13px] leading-[1.35] transition-colors duration-micro ease-attio ${
          on
            ? "bg-blue-10 font-semibold text-blue"
            : "text-ink-2 hover:bg-[#F4F6FC] hover:text-navy"
        }`}
      >
        {on ? (
          <span className="absolute left-0 top-1/2 h-[19px] w-[3px] -translate-y-1/2 rounded-r-sm bg-blue" />
        ) : null}
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-[17px] w-[17px] flex-none fill-none stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round] transition-colors duration-micro ease-attio ${
            on ? "stroke-blue" : "stroke-[#A6ADC4] group-hover:stroke-navy"
          }`}
        >
          {TRAZO[icono]}
        </svg>
        {s.texto}
      </button>
    );
  };

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col border-r border-line bg-white px-3.5 py-4 lg:flex">
      {titulo ? (
        <div className="mb-1.5 flex items-center gap-2.5 border-b border-line px-2.5 pb-3.5">
          {/* El ojo: es lo de la casa, y al ser del mismo trazo que los
              demás dibujos no desentona con el resto del riel. */}
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="h-[19px] w-[19px] flex-none fill-none stroke-navy stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
          >
            <path d="M1.5 10S4.8 4.5 10 4.5 18.5 10 18.5 10 15.2 15.5 10 15.5 1.5 10 1.5 10z" />
            <circle cx="10" cy="10" r="2.6" />
          </svg>
          <span className="font-titulo text-[17px] font-medium tracking-[-0.012em] text-navy">
            {titulo}
          </span>
          {/* Los tres punticos, en los colores de Ebenezer. Adorno y nada
              más: no son botones ni indican estado. */}
          <span className="ml-auto flex gap-1" aria-hidden="true">
            <s className="h-1.5 w-1.5 rounded-full bg-navy no-underline" />
            <s className="h-1.5 w-1.5 rounded-full bg-blue no-underline" />
            <s className="h-1.5 w-1.5 rounded-full bg-[#5BE3DC] no-underline" />
          </span>
        </div>
      ) : null}

      <nav className="overflow-y-auto">
        {GRUPOS.map((g, gi) => {
          const lista = porGrupo.get(g);
          if (!lista || lista.length === 0) return null;
          const ultimo = GRUPOS.slice(gi + 1).every((x) => !porGrupo.get(x)?.length);
          return (
            <div key={g}>
              <div className="px-2.5 pb-[7px] pt-4 text-[10px] font-bold tracking-[0.15em] text-[#A2A9C0]">
                {g}
              </div>
              {lista.map(renglon)}
              {/* La línea separa un bloque del siguiente; después del
                  último no hay nada que separar. */}
              {ultimo ? null : <div className="mx-2.5 mt-2.5 h-px bg-line" />}
            </div>
          );
        })}
        {/* La lista limpia: cuando no se agrupa, van todas aquí, en el
            mismo orden en que el módulo las trae. Sin rótulos inventados. */}
        {sueltas.length > 0 ? <div className="pt-1">{sueltas.map(renglon)}</div> : null}
      </nav>
    </aside>
  );
}
