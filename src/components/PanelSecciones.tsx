"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * El panel de secciones, a la izquierda.
 *
 * La regla que lo gobierna: NO INVENTA NADA. Lee del propio contenido qué
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
 * El tablero se sirve desde /api/frecuencias/tablero, o sea del mismo
 * dominio, así que se puede leer su contenido directamente. Si algún día
 * dejara de serlo, el bloque try lo absorbe y el panel simplemente no
 * aparece: la página sigue funcionando igual.
 */

type Seccion = { id: string; texto: string };

export function PanelSecciones() {
  const pathname = usePathname();
  const [secs, setSecs] = useState<Seccion[]>([]);
  const [activa, setActiva] = useState<string>("");
  const [titulo, setTitulo] = useState<string>("");

  useEffect(() => {
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
      const hs = Array.from(document.querySelectorAll<HTMLElement>("main h2"))
        .filter((h) => (h.textContent || "").trim().length > 1);
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
    let intentos = 0;
    const probar = () => {
      if (!vivo) return;
      const ok = pathname === "/frecuencias" ? leerIframe() : leerEncabezados();
      if (!ok && intentos++ < 25) t = window.setTimeout(probar, 400);
    };
    probar();

    return () => {
      vivo = false;
      if (t) window.clearTimeout(t);
      // Al salir de la página se le devuelven las pestañas al tablero.
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

  useEffect(() => {
    const h1 = document.querySelector("main h1");
    setTitulo((h1?.textContent || "").trim());
  }, [pathname, secs.length]);

  if (secs.length < 2) return null;

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

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line-2 bg-[#FCFCFD] px-2.5 py-3 lg:flex">
      {titulo ? (
        <div className="mb-1.5 border-b border-line-2 px-2.5 pb-2.5 text-[13px] font-medium tracking-[-0.01em] text-ink">
          {titulo}
        </div>
      ) : null}
      <nav className="overflow-y-auto">
        {secs.map((s, i) => {
          const on = activa === s.id || (pathname === "/frecuencias" && activa === String(i));
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => ir(s, i)}
              aria-current={on ? "true" : undefined}
              className={`relative block w-full rounded-xs px-2.5 py-[7px] text-left text-[12.5px] leading-[1.35] transition-colors duration-micro ease-attio ${
                on
                  ? "bg-blue-10 font-medium text-blue"
                  : "text-ink-2 hover:bg-line-2 hover:text-ink"
              }`}
            >
              {on ? (
                <span className="absolute left-0 top-1/2 h-[15px] w-[2px] -translate-y-1/2 rounded-pill bg-blue" />
              ) : null}
              {s.texto}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
