"use client";

import { useState, useTransition } from "react";
import { Lock, Globe } from "lucide-react";
import { Modal, BotonPrimario, BotonSecundario, useAviso } from "@/components/proyectos/ui";
import { COLORES_ESPACIO, type Espacio } from "@/lib/proyectos/types";
import { actualizarEspacioAction, crearEspacioAction } from "@/lib/proyectos/actions";

/** Crea un espacio nuevo, o edita uno existente si se pasa `espacio`. */
export function EspacioModal({
  espacio,
  onCerrar,
  onCreado,
}: {
  espacio?: Espacio;
  onCerrar: () => void;
  onCreado?: (id: string) => void;
}) {
  const aviso = useAviso();
  const [nombre, setNombre] = useState(espacio?.nombre ?? "");
  const [color, setColor] = useState(espacio?.color ?? COLORES_ESPACIO[0]);
  const [privado, setPrivado] = useState(espacio?.privado ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  function guardar() {
    setError(null);
    start(async () => {
      if (espacio) {
        const r = await actualizarEspacioAction(espacio.id, { nombre, color, privado });
        if (!r.ok) return setError(r.error);
        onCerrar();
      } else {
        const r = await crearEspacioAction({ nombre, color, privado });
        if (!r.ok) return setError(r.error);
        aviso("Espacio creado", "ok");
        onCerrar();
        onCreado?.(r.id);
      }
    });
  }

  return (
    <Modal
      titulo={espacio ? "Editar espacio" : "Crear un espacio"}
      onCerrar={onCerrar}
      pie={
        <>
          <BotonSecundario onClick={onCerrar}>Cancelar</BotonSecundario>
          <BotonPrimario onClick={guardar} disabled={pendiente || nombre.trim().length === 0}>
            {espacio ? "Guardar" : "Crear espacio"}
          </BotonPrimario>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-3">
        Un espacio agrupa carpetas, listas y documentos de un área (por ejemplo, Mercadeo o Operaciones).
      </p>

      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-overline text-ink-3">Nombre</label>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-base font-bold text-white"
          style={{ background: color }}
        >
          {(nombre.trim()[0] ?? "E").toUpperCase()}
        </span>
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && nombre.trim() && guardar()}
          maxLength={80}
          placeholder="Ej. Mercadeo, Operaciones, Clínica"
          className="w-full rounded-sm border border-line px-3 py-2 text-sm outline-none focus:border-blue focus:shadow-eb-focus"
        />
      </div>

      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-overline text-ink-3">Color</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {COLORES_ESPACIO.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-pill transition-transform ${color === c ? "scale-110 ring-2 ring-offset-2 ring-ink" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>

      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-overline text-ink-3">Quién puede verlo</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPrivado(false)}
          className={`flex items-start gap-2 rounded-md border p-3 text-left ${!privado ? "border-blue bg-blue-10" : "border-line hover:bg-line-2"}`}
        >
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
          <span>
            <span className="block text-sm font-semibold text-ink">Abierto</span>
            <span className="block text-xs text-ink-3">Todos con acceso al módulo lo ven (solo lectura).</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPrivado(true)}
          className={`flex items-start gap-2 rounded-md border p-3 text-left ${privado ? "border-blue bg-blue-10" : "border-line hover:bg-line-2"}`}
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
          <span>
            <span className="block text-sm font-semibold text-ink">Privado</span>
            <span className="block text-xs text-ink-3">Solo los miembros que invites.</span>
          </span>
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-[#B42318]">{error}</p>}
    </Modal>
  );
}
