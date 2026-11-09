"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Plus, Search, X } from "lucide-react";

/* ---------------------------------------------------------------------
   MESA DE TRABAJO DE CARTERA — GLOSAS Y DEVOLUCIONES

   POR QUE ES UNA CUADRICULA Y NO UNA FICHA

   Facturacion viene de un Excel. Alli uno se para en una celda, escribe,
   da Enter y sigue; no abre un formulario por cada fila. La version
   anterior de esta pantalla era lista-a-la-izquierda y ficha-a-la-derecha,
   que es comodo para revisar de a una y pesimo para diligenciar cien.
   Aqui se diligencia. Por eso manda la cuadricula.

   La ficha no desaparece: se abre con doble clic sobre una fila, que es
   cuando de verdad hace falta — ver una factura completa con todas sus
   glosas y lo que suman.

   LO QUE LA PANTALLA HACE Y EL EXCEL NO

   1. VALOR ACEPTADO. El Excel no tiene esa columna, asi que hoy nadie
      puede responder cuanto nos aceptaron de lo glosado, ni distinguir
      una aceptacion parcial de una total. Aqui es una celda mas, y
      parcial/total se calcula solo comparandola con lo glosado.

   2. GUARDA SOLO. Se escribe en la celda y al salir de ella se guarda,
      con el nombre de quien lo hizo y la fecha, en la base compartida.
      No hay boton "guardar todo" ni archivo que alguien tenga que volver
      a subir.

   3. AVISA, NO CORRIGE. Si lo glosado de una factura supera lo radicado,
      o si el valor aceptado supera lo glosado, lo marca y deja el dato
      como lo escribio quien sabe del tema.
   --------------------------------------------------------------------- */

type Glosa = {
  id: string;
  factura: string;
  empresa: string;
  empresaOriginal: string;
  fechaFactura: string;
  fechaRadicacion: string;
  valorRadicado: number;
  valorGlosado: number;
  valorAceptado: number | null;
  motivoGlosa: string;
  observacionInterna: string;
  notaCredito: string;
  facturador: string;
  responsableAceptacion: string;
  tipoGlosa: string;
  /** PARCIAL, TOTAL o "" cuando nadie lo ha definido todavia. */
  alcance: string;
  estado: string;
};

type Catalogos = { empresas: string[]; responsables: string[]; motivos: string[] };

/* Las tres categorias con las que trabaja Facturacion. Son la combinacion de
   dos campos de la base (tipo y alcance), pero en la pantalla es un solo
   desplegable, que es como se piensa el problema. */
const CLASES = [
  { id: "", etiqueta: "— sin definir —", tipo: "GLOSA", alcance: "" },
  { id: "GLOSA|PARCIAL", etiqueta: "Glosa parcial", tipo: "GLOSA", alcance: "PARCIAL" },
  { id: "GLOSA|TOTAL", etiqueta: "Glosa total", tipo: "GLOSA", alcance: "TOTAL" },
  { id: "DEVOLUCION|TOTAL", etiqueta: "Devolución", tipo: "DEVOLUCION", alcance: "TOTAL" },
];

const claseDe = (g: { tipoGlosa: string; alcance: string }) => {
  if (g.tipoGlosa === "DEVOLUCION") return "DEVOLUCION|TOTAL";
  return g.alcance ? `GLOSA|${g.alcance}` : "";
};

const ESTADOS = [
  { id: "PENDIENTE", etiqueta: "Pendiente" },
  { id: "RESPONDIDA", etiqueta: "Respondida" },
  { id: "ACEPTADA", etiqueta: "Aceptada" },
  { id: "NO_ACEPTADA", etiqueta: "No aceptada" },
  { id: "LEGALIZADA", etiqueta: "Legalizada" },
];

const ETIQUETA: Record<string, string> = Object.fromEntries(
  ESTADOS.map((e) => [e.id, e.etiqueta]),
);

/* Pastillas de estado en la paleta de la plataforma: navy para lo que
   falta, verde de marca para lo aceptado, azul para lo no aceptado.
   Se distinguen por claridad ademas de por tono, no solo por color. */
const PASTILLA: Record<string, string> = {
  PENDIENTE: "border-[#DCE8FA] bg-[#EEF4FD] text-[#1A3174]",
  RESPONDIDA: "border-[#C7CDE0] bg-[#F4F6FB] text-[#3B4F8D]",
  ACEPTADA: "border-[#BFE0CC] bg-[#DCEEE3] text-[#146138]",
  NO_ACEPTADA: "border-[#BBD2F0] bg-[#E7ECFE] text-[#13359B]",
  LEGALIZADA: "border-[#D8DEE9] bg-[#F1F3F7] text-[#47597A]",
};

const pesos = (n: number) => "$" + Math.round(n || 0).toLocaleString("es-CO");

const soloNumero = (s: string) => {
  const n = Number(String(s).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Parcial, total o nada — deducido, nunca un campo aparte que se contradiga. */
function clasePago(g: Glosa): { texto: string; clase: string } | null {
  if (g.valorAceptado === null || g.valorAceptado === undefined) return null;
  if (g.valorAceptado <= 0) return { texto: "nada", clase: "text-[#64748B]" };
  if (g.valorGlosado > 0 && g.valorAceptado >= g.valorGlosado)
    return { texto: "total", clase: "text-[#146138]" };
  return { texto: "parcial", clase: "text-[#B45309]" };
}

export function CarteraWorkspace({
  usuario,
}: {
  usuario: { id: string; nombre: string; esAdmin: boolean };
}) {
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogos>({
    empresas: [],
    responsables: [],
    motivos: [],
  });
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "SIN_RESOLVER" | string>(
    "SIN_RESOLVER",
  );
  const [guardando, setGuardando] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [fichaDe, setFichaDe] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const traer = useCallback(async () => {
    setCargando(true);
    setFallo("");
    try {
      const r = await fetch("/api/cartera/registros", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setGlosas((j.glosas || []) as Glosa[]);
      if (j.catalogos) setCatalogos(j.catalogos as Catalogos);
    } catch (e) {
      // Una lista vacia por fallo se lee como "no hay registros", que es otra
      // cosa. Por eso el fallo se dice con todas las letras.
      setFallo(e instanceof Error ? e.message : "Sin conexion con la base.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void traer();
  }, [traer]);

  const avisar = (m: string) => {
    setAviso(m);
    window.setTimeout(() => setAviso(""), 3500);
  };

  /** Guarda una fila completa. Devuelve true solo si la base confirmo. */
  const guardar = useCallback(
    async (fila: Partial<Glosa>, accion: "CREAR" | "EDITAR") => {
      const marca = String(fila.id ?? "nueva");
      setGuardando(marca);
      try {
        const r = await fetch("/api/cartera/registros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entidad: "glosas", accion, fila }),
        });
        const j = await r.json();
        if (!r.ok || !j.ok) {
          avisar("NO SE GUARDO: " + (j?.error || r.statusText));
          return false;
        }
        await traer();
        setGuardado(marca);
        window.setTimeout(() => setGuardado(null), 1800);
        return true;
      } catch {
        avisar("NO SE GUARDO: sin conexion.");
        return false;
      } finally {
        setGuardando(null);
      }
    },
    [traer],
  );

  /* ---- cifras del encabezado ---- */
  const cifras = useMemo(() => {
    let sinResolver = 0;
    let valorSinResolver = 0;
    let glosado = 0;
    let aceptado = 0;
    for (const g of glosas) {
      glosado += g.valorGlosado || 0;
      if (g.estado === "PENDIENTE") {
        sinResolver += 1;
        valorSinResolver += g.valorGlosado || 0;
      }
      if (g.valorAceptado !== null && g.valorAceptado !== undefined) {
        aceptado += g.valorAceptado;
      }
    }
    return { sinResolver, valorSinResolver, glosado, aceptado };
  }, [glosas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return glosas.filter((g) => {
      if (filtroEstado === "SIN_RESOLVER" && g.estado !== "PENDIENTE") return false;
      if (filtroEstado !== "TODAS" && filtroEstado !== "SIN_RESOLVER" && g.estado !== filtroEstado)
        return false;
      if (!q) return true;
      return (
        g.factura.toUpperCase().includes(q) ||
        g.empresa.toUpperCase().includes(q) ||
        (g.motivoGlosa || "").toUpperCase().includes(q) ||
        (g.notaCredito || "").toUpperCase().includes(q)
      );
    });
  }, [glosas, busqueda, filtroEstado]);

  const hermanas = useMemo(
    () => (fichaDe ? glosas.filter((g) => g.factura === fichaDe) : []),
    [glosas, fichaDe],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-10">
      {/* Listas de los desplegables. Van una sola vez y las usan todas las
          filas por id. Se arman con lo que Facturacion ya escribio, asi que
          no hay catalogo que mantener: lo nuevo entra solo. */}
      <datalist id="cat-empresas">
        {catalogos.empresas.map((x) => <option key={x} value={x} />)}
      </datalist>
      <datalist id="cat-motivos">
        {catalogos.motivos.map((x) => <option key={x} value={x} />)}
      </datalist>
      <datalist id="cat-responsables">
        {catalogos.responsables.map((x) => <option key={x} value={x} />)}
      </datalist>

      {/* ---------- encabezado ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eb-label text-[11px] text-[#64748B]">WorkCenter · Cartera</p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight text-[#0E245E]">
            Glosas y devoluciones
          </h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Se escribe en la celda y se guarda solo, con tu nombre y la fecha.
            {usuario.esAdmin ? " Entras como administrador." : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNuevaAbierta(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1747B0]"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva glosa
        </button>
      </div>

      {/* ---------- cifras ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titulo="Sin resolver" valor={String(cifras.sinResolver)} pie="esperan desenlace" />
        <Cifra
          titulo="Plata sin resolver"
          valor={pesos(cifras.valorSinResolver)}
          pie="de glosas pendientes"
          destacar
        />
        <Cifra titulo="Glosado en total" valor={pesos(cifras.glosado)} pie={`${glosas.length} registros`} />
        <Cifra
          titulo="Aceptado"
          valor={pesos(cifras.aceptado)}
          pie={
            cifras.glosado > 0
              ? `${Math.round((cifras.aceptado / cifras.glosado) * 100)}% de lo glosado`
              : "sin datos"
          }
        />
      </div>

      {fallo && (
        <div className="flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-semibold text-[#B91C1C]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No se pudieron traer los datos: {fallo}. La cuadricula esta vacia porque fallo la
            consulta, no porque no haya registros. Nada de lo que escribas se va a guardar mientras
            esto no se resuelva.
          </span>
        </div>
      )}

      {/* ---------- cuadricula ---------- */}
      <div className="rounded-[14px] border border-[#E2EBF8] bg-white p-4 shadow-[0_1px_6px_rgba(14,36,94,0.03)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Pestana activa={filtroEstado === "SIN_RESOLVER"} onClick={() => setFiltroEstado("SIN_RESOLVER")}>
              Sin resolver
            </Pestana>
            <Pestana activa={filtroEstado === "TODAS"} onClick={() => setFiltroEstado("TODAS")}>
              Todas
            </Pestana>
            {ESTADOS.filter((e) => e.id !== "PENDIENTE").map((e) => (
              <Pestana key={e.id} activa={filtroEstado === e.id} onClick={() => setFiltroEstado(e.id)}>
                {e.etiqueta}
              </Pestana>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <label htmlFor="cartera-buscar" className="sr-only">
              Buscar por factura, empresa, motivo o nota credito
            </label>
            <input
              id="cartera-buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Factura, empresa, motivo…"
              className="w-56 rounded-lg border border-[#DCE8FA] py-1.5 pl-8 pr-2 text-[12.5px] outline-none focus:border-[#1D58D8]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E2EBF8] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                <th className="py-2 pr-3">Factura</th>
                <th className="py-2 pr-3">Empresa</th>
                <th className="py-2 pr-3">Clase</th>
                <th className="py-2 pr-3 text-right">Radicado</th>
                <th className="py-2 pr-3 text-right">Glosado</th>
                <th className="py-2 pr-3">Motivo</th>
                <th className="py-2 pr-3">Desenlace</th>
                <th className="py-2 pr-3 text-right">Aceptado</th>
                <th className="py-2 pr-3">Nota crédito</th>
                <th className="py-2 pr-3">Observación</th>
                <th className="py-2 pr-3">Facturador</th>
                <th className="w-6 py-2" />
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-[#94A3B8]">
                    <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
                    Cargando…
                  </td>
                </tr>
              )}
              {!cargando && visibles.length === 0 && !fallo && (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-[#94A3B8]">
                    {glosas.length === 0
                      ? "Todavía no hay glosas en la base."
                      : "Nada coincide con el filtro."}
                  </td>
                </tr>
              )}
              {visibles.slice(0, 400).map((g) => (
                <FilaGlosa
                  key={g.id}
                  glosa={g}
                  guardando={guardando === g.id}
                  guardado={guardado === g.id}
                  onGuardar={guardar}
                  onFicha={() => setFichaDe(g.factura)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#64748B]">
          <span>
            {visibles.length > 400
              ? `Mostrando 400 de ${visibles.length} filas. Afina el filtro.`
              : `${visibles.length} de ${glosas.length} filas`}
          </span>
          <span>Doble clic sobre una fila para ver la factura completa.</span>
        </div>
      </div>

      {fichaDe && hermanas.length > 0 && (
        <FichaFactura factura={fichaDe} glosas={hermanas} onCerrar={() => setFichaDe(null)} />
      )}

      {nuevaAbierta && (
        <ModalNueva
          guardando={guardando === "nueva"}
          onCerrar={() => setNuevaAbierta(false)}
          onGuardar={async (fila) => {
            const ok = await guardar(fila, "CREAR");
            if (ok) setNuevaAbierta(false);
          }}
        />
      )}

      {aviso && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#0E245E] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_12px_28px_rgba(14,36,94,0.18)]">
          {aviso}
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */

function Pestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
        activa
          ? "bg-[#0E245E] text-white"
          : "border border-[#DCE8FA] bg-white text-[#47597A] hover:border-[#94A3B8]"
      }`}
    >
      {children}
    </button>
  );
}

function Cifra({
  titulo,
  valor,
  pie,
  destacar,
}: {
  titulo: string;
  valor: string;
  pie: string;
  destacar?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border bg-white px-4 py-3 shadow-[0_1px_6px_rgba(14,36,94,0.03)] ${
        destacar ? "border-[#BBD2F0]" : "border-[#E2EBF8]"
      }`}
    >
      <p className="eb-label text-[10.5px] text-[#64748B]">{titulo}</p>
      <p className="mt-1.5 font-cifra text-[22px] font-semibold leading-none text-[#0E245E]">
        {valor}
      </p>
      <p className="mt-1.5 text-[11.5px] text-[#94A3B8]">{pie}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------
   UNA FILA DE LA CUADRICULA

   El estado vive aqui y no arriba a proposito: mientras alguien escribe en
   una celda, la fila no se pisa con lo que llegue de la base. Al salir de
   la celda (onBlur) se compara con lo guardado y solo entonces se manda.
   --------------------------------------------------------------------- */
function FilaGlosa({
  glosa,
  guardando,
  guardado,
  onGuardar,
  onFicha,
}: {
  glosa: Glosa;
  guardando: boolean;
  guardado: boolean;
  onGuardar: (fila: Partial<Glosa>, accion: "CREAR" | "EDITAR") => Promise<boolean>;
  onFicha: () => void;
}) {
  const [estado, setEstado] = useState(glosa.estado);
  const [aceptado, setAceptado] = useState(
    glosa.valorAceptado === null || glosa.valorAceptado === undefined
      ? ""
      : String(Math.round(glosa.valorAceptado)),
  );
  const [nota, setNota] = useState(glosa.notaCredito || "");
  const [obs, setObs] = useState(glosa.observacionInterna || "");
  const [motivo, setMotivo] = useState(glosa.motivoGlosa || "");
  const [clase, setClase] = useState(claseDe(glosa));

  // Si la base cambia (otra persona, o el refresco tras guardar) la fila se
  // sincroniza. El ref evita mandar de nuevo lo que acaba de llegar.
  const ultimo = useRef({ aceptado: "", nota: "", obs: "", motivo: "" });
  useEffect(() => {
    const a =
      glosa.valorAceptado === null || glosa.valorAceptado === undefined
        ? ""
        : String(Math.round(glosa.valorAceptado));
    setEstado(glosa.estado);
    setAceptado(a);
    setNota(glosa.notaCredito || "");
    setObs(glosa.observacionInterna || "");
    setMotivo(glosa.motivoGlosa || "");
    setClase(claseDe(glosa));
    ultimo.current = {
      aceptado: a,
      nota: glosa.notaCredito || "",
      obs: glosa.observacionInterna || "",
      motivo: glosa.motivoGlosa || "",
    };
  }, [
    glosa.id,
    glosa.estado,
    glosa.valorAceptado,
    glosa.notaCredito,
    glosa.observacionInterna,
    glosa.motivoGlosa,
    glosa.tipoGlosa,
    glosa.alcance,
  ]);

  const enviar = (parcial: Partial<Glosa>) => {
    void onGuardar(
      {
        ...glosa,
        estado,
        notaCredito: nota,
        observacionInterna: obs,
        motivoGlosa: motivo,
        ...parcial,
      },
      "EDITAR",
    );
  };

  /** Al salir de una celda: si cambio, se guarda. Si no, no se molesta a la base. */
  const salir = () => {
    const u = ultimo.current;
    if (aceptado === u.aceptado && nota === u.nota && obs === u.obs && motivo === u.motivo) return;
    ultimo.current = { aceptado, nota, obs, motivo };
    enviar({
      valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado),
      notaCredito: nota,
      observacionInterna: obs,
      motivoGlosa: motivo,
    });
  };

  /** Glosa parcial, glosa total o devolucion: un solo desplegable, dos campos. */
  const cambiarClase = (id: string) => {
    const c = CLASES.find((x) => x.id === id) || CLASES[0];
    setClase(id);
    enviar({ tipoGlosa: c.tipo, alcance: c.alcance });
  };

  /* Al elegir desenlace se propone el valor aceptado, porque es lo que pasa
     el 99% de las veces. Queda editable: la aceptacion parcial se escribe
     encima. */
  const cambiarEstado = (nuevo: string) => {
    setEstado(nuevo);
    let propuesta = aceptado;
    if (nuevo === "ACEPTADA" && aceptado.trim() === "") propuesta = String(Math.round(glosa.valorGlosado));
    if (nuevo === "NO_ACEPTADA") propuesta = "0";
    if (nuevo === "PENDIENTE") propuesta = "";
    setAceptado(propuesta);
    ultimo.current = { aceptado: propuesta, nota, obs, motivo };
    enviar({
      estado: nuevo,
      valorAceptado: propuesta.trim() === "" ? null : soloNumero(propuesta),
    });
  };

  const vista: Glosa = {
    ...glosa,
    valorAceptado: aceptado.trim() === "" ? null : soloNumero(aceptado),
  };
  // Ojo: esto es si la ACEPTACION fue parcial o total, que es distinto de la
  // clase de la glosa (parcial/total/devolucion) que se elige arriba.
  const pago = clasePago(vista);
  const excedeAceptado =
    vista.valorAceptado !== null && glosa.valorGlosado > 0 && vista.valorAceptado > glosa.valorGlosado;

  const celdaInput =
    "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[12.5px] outline-none hover:border-[#DCE8FA] focus:border-[#1D58D8] focus:bg-white";

  return (
    <tr
      onDoubleClick={onFicha}
      className={`border-b border-[#F1F5F9] align-top transition ${
        guardando ? "bg-[#F6F9FE]" : "hover:bg-[#F8FAFC]"
      }`}
    >
      <td className="py-1.5 pr-3">
        <span className="font-cifra text-[12.5px] font-semibold text-[#0E245E]">{glosa.factura}</span>
      </td>
      <td className="py-1.5 pr-3 text-[#47597A]">{glosa.empresa || "—"}</td>
      <td className="py-1.5 pr-3">
        <label htmlFor={`cla-${glosa.id}`} className="sr-only">
          Clase de la glosa {glosa.factura}
        </label>
        <select
          id={`cla-${glosa.id}`}
          value={clase}
          onChange={(e) => cambiarClase(e.target.value)}
          className={`rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${
            clase === "" ? "border-[#E2EBF8] bg-white text-[#94A3B8]" : "border-[#DCE8FA] bg-[#F8FAFC] text-[#1A3174]"
          }`}
        >
          {CLASES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-3 text-right font-cifra text-[#47597A]">{pesos(glosa.valorRadicado)}</td>
      <td className="py-1.5 pr-3 text-right font-cifra font-semibold text-[#0E245E]">
        {pesos(glosa.valorGlosado)}
      </td>
      <td className="min-w-[220px] max-w-[300px] py-1.5 pr-3">
        <label htmlFor={`mot-${glosa.id}`} className="sr-only">
          Motivo de la glosa {glosa.factura}
        </label>
        <input
          id={`mot-${glosa.id}`}
          list="cat-motivos"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          onBlur={salir}
          placeholder="—"
          title={motivo}
          className={celdaInput}
        />
      </td>

      <td className="py-1.5 pr-3">
        <label htmlFor={`est-${glosa.id}`} className="sr-only">
          Desenlace de la glosa {glosa.factura}
        </label>
        <select
          id={`est-${glosa.id}`}
          value={estado}
          onChange={(e) => cambiarEstado(e.target.value)}
          className={`rounded-[6px] border px-1.5 py-1 text-[11.5px] font-semibold outline-none ${
            PASTILLA[estado] || PASTILLA.PENDIENTE
          }`}
        >
          {ESTADOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.etiqueta}
            </option>
          ))}
        </select>
      </td>

      <td className="py-1.5 pr-3 text-right">
        <label htmlFor={`ace-${glosa.id}`} className="sr-only">
          Valor aceptado de la glosa {glosa.factura}
        </label>
        <input
          id={`ace-${glosa.id}`}
          value={aceptado}
          onChange={(e) => setAceptado(e.target.value)}
          onBlur={salir}
          inputMode="numeric"
          placeholder="—"
          className={`${celdaInput} text-right font-cifra`}
        />
        {pago && (
          <span className={`block pr-1.5 text-[10px] font-semibold uppercase ${pago.clase}`}>
            {pago.texto}
          </span>
        )}
        {excedeAceptado && (
          <span className="block pr-1.5 text-[10px] font-semibold text-[#B45309]">
            ⚠ supera lo glosado
          </span>
        )}
      </td>

      <td className="py-1.5 pr-3">
        <label htmlFor={`nc-${glosa.id}`} className="sr-only">
          Nota crédito de la glosa {glosa.factura}
        </label>
        <input
          id={`nc-${glosa.id}`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={salir}
          placeholder="—"
          className={`${celdaInput} font-cifra`}
        />
      </td>

      <td className="min-w-[200px] py-1.5 pr-3">
        <label htmlFor={`ob-${glosa.id}`} className="sr-only">
          Observación de la glosa {glosa.factura}
        </label>
        <input
          id={`ob-${glosa.id}`}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          onBlur={salir}
          placeholder="—"
          className={celdaInput}
        />
      </td>

      <td className="py-1.5 pr-3 text-[#64748B]">{glosa.facturador || "—"}</td>

      <td className="py-1.5 text-right">
        {guardando && <Loader2 className="inline h-3.5 w-3.5 animate-spin text-[#1D58D8]" />}
        {!guardando && guardado && <Check className="inline h-3.5 w-3.5 text-[#21814B]" />}
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------------
   LA FICHA (doble clic)

   Solo muestra. No se edita aqui para no tener dos caminos de guardado que
   despues se contradigan: se edita en la cuadricula, que es donde se
   trabaja. Esto responde la pregunta que la cuadricula no responde de un
   vistazo: cuanto suman todas las glosas de una misma factura.
   --------------------------------------------------------------------- */
function FichaFactura({
  factura,
  glosas,
  onCerrar,
}: {
  factura: string;
  glosas: Glosa[];
  onCerrar: () => void;
}) {
  const base = glosas[0];
  const totalGlosado = glosas.reduce((a, g) => a + (g.valorGlosado || 0), 0);
  const totalAceptado = glosas.reduce((a, g) => a + (g.valorAceptado ?? 0), 0);
  const sinResolver = glosas.filter((g) => g.estado === "PENDIENTE");
  const excede = base.valorRadicado > 0 && totalGlosado > base.valorRadicado;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4"
      role="dialog"
      aria-label={`Factura ${factura}`}
    >
      <div className="max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#E2EBF8] px-5 py-4">
          <div className="min-w-0">
            <p className="eb-label text-[10.5px] text-[#64748B]">
              {base.empresa}
              {base.facturador ? ` · ${base.facturador}` : ""}
            </p>
            <p className="mt-1 font-cifra text-[24px] font-bold leading-none text-[#0E245E]">
              {factura}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg border border-[#DCE8FA] p-1.5 text-[#47597A] transition hover:bg-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-[#E2EBF8] px-5 py-4 sm:grid-cols-4">
          <Dato etiqueta="Radicado" valor={pesos(base.valorRadicado)} />
          <Dato etiqueta="Glosado" valor={pesos(totalGlosado)} alerta={excede} />
          <Dato etiqueta="Aceptado" valor={pesos(totalAceptado)} />
          <Dato etiqueta="Glosas" valor={`${glosas.length} · ${sinResolver.length} sin resolver`} />
        </div>

        {excede && (
          <div className="flex items-start gap-2 border-b border-[#E2EBF8] bg-[#FFFBEB] px-5 py-2.5 text-[12px] font-semibold text-[#B45309]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lo glosado supera el valor radicado de la factura. Verifícalo antes de cerrar.
          </div>
        )}

        <div className="px-5 py-4">
          <p className="eb-label mb-2 text-[10.5px] text-[#64748B]">Glosas de esta factura</p>
          <div className="divide-y divide-[#F1F5F9]">
            {glosas.map((g) => {
              const c = clasePago(g);
              return (
                <div key={g.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                  <span
                    className={`rounded-[6px] border px-1.5 py-0.5 text-[10.5px] font-semibold ${
                      PASTILLA[g.estado] || PASTILLA.PENDIENTE
                    }`}
                  >
                    {ETIQUETA[g.estado] || g.estado}
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] text-[#47597A]">
                    {g.motivoGlosa || "Sin motivo registrado"}
                  </span>
                  <span className="font-cifra text-[13px] font-semibold text-[#0E245E]">
                    {pesos(g.valorGlosado)}
                  </span>
                  {c && (
                    <span className={`text-[10.5px] font-semibold uppercase ${c.clase}`}>
                      {c.texto} {g.valorAceptado ? pesos(g.valorAceptado) : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] text-[#64748B]">
            Para cambiar un desenlace, ciérrala y edítalo en la cuadrícula.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="eb-label text-[10px] text-[#94A3B8]">{etiqueta}</p>
      <p
        className={`mt-0.5 font-cifra text-[14px] font-semibold ${
          alerta ? "text-[#B91C1C]" : "text-[#0E245E]"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

/* ====================================================================== */

function ModalNueva({
  guardando,
  onCerrar,
  onGuardar,
}: {
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (fila: Partial<Glosa>) => void;
}) {
  const [f, setF] = useState({
    factura: "",
    empresa: "",
    clase: "",
    motivoGlosa: "",
    valorGlosado: "",
    observacionInterna: "",
    notaCredito: "",
    estado: "PENDIENTE",
  });
  const completo = f.factura.trim() !== "" && f.motivoGlosa.trim() !== "";

  const campo =
    "w-full rounded-lg border border-[#DCE8FA] px-2.5 py-2 text-[12.5px] outline-none focus:border-[#1D58D8]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E245E]/40 p-4"
      role="dialog"
      aria-label="Registrar glosa"
    >
      <div className="w-full max-w-[560px] rounded-[14px] border border-[#E2EBF8] bg-white shadow-[0_24px_60px_rgba(14,36,94,0.18)]">
        <div className="flex items-center justify-between border-b border-[#E2EBF8] px-5 py-3.5">
          <p className="text-[15px] font-bold text-[#0E245E]">Registrar glosa</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#47597A] transition hover:bg-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 px-5 py-4 sm:grid-cols-2">
          <Campo id="nf" etiqueta="Número de factura">
            <input
              id="nf"
              value={f.factura}
              onChange={(e) => setF({ ...f, factura: e.target.value.toUpperCase() })}
              placeholder="FCOE00000"
              className={`${campo} font-cifra`}
            />
          </Campo>
          <Campo id="emp" etiqueta="Empresa">
            <input
              id="emp"
              list="cat-empresas"
              value={f.empresa}
              onChange={(e) => setF({ ...f, empresa: e.target.value.toUpperCase() })}
              placeholder="Elige una o escribe la nueva"
              className={campo}
            />
          </Campo>
          <Campo id="clase" etiqueta="Clase">
            <select
              id="clase"
              value={f.clase}
              onChange={(e) => setF({ ...f, clase: e.target.value })}
              className={campo}
            >
              {CLASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="val" etiqueta="Valor glosado">
            <input
              id="val"
              value={f.valorGlosado}
              onChange={(e) => setF({ ...f, valorGlosado: e.target.value })}
              inputMode="numeric"
              placeholder="0"
              className={`${campo} font-cifra`}
            />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="mot" etiqueta="Motivo">
              <input
                id="mot"
                list="cat-motivos"
                value={f.motivoGlosa}
                onChange={(e) => setF({ ...f, motivoGlosa: e.target.value })}
                placeholder="Elige uno de los que ya se usan o escribe uno nuevo"
                className={campo}
              />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <Campo id="obs2" etiqueta="Observación interna">
              <input
                id="obs2"
                value={f.observacionInterna}
                onChange={(e) => setF({ ...f, observacionInterna: e.target.value })}
                className={campo}
              />
            </Campo>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#E2EBF8] px-5 py-3.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-[#DCE8FA] px-3.5 py-2 text-[12.5px] font-semibold text-[#47597A] transition hover:bg-[#F8FAFC]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!completo || guardando}
            onClick={() => {
              const c = CLASES.find((x) => x.id === f.clase) || CLASES[0];
              onGuardar({
                ...f,
                tipoGlosa: c.tipo,
                alcance: c.alcance,
                valorGlosado: soloNumero(f.valorGlosado),
                valorAceptado: null,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D58D8] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#1747B0] disabled:cursor-not-allowed disabled:bg-[#C7CDE0]"
          >
            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  children,
}: {
  id: string;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="eb-label mb-1 block text-[10px] text-[#94A3B8]">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
