"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { AppUser } from "@/lib/procesos/types";
import type { Modulo } from "@/lib/modulos";
import { MODULOS, moduloLabel } from "@/lib/modulos";
import { actualizarAccesoUsuarioAction, eliminarUsuarioAction } from "@/lib/procesos/actions";
import { RestablecerPasswordButton } from "./RestablecerPasswordButton";
import { ToggleActivoButton } from "./ToggleActivoButton";

export function UsuarioCard({
  usuario,
  modulos,
  esMiPropiaCuenta,
}: {
  usuario: AppUser;
  modulos: Modulo[];
  esMiPropiaCuenta: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [isAdmin, setIsAdmin] = useState(usuario.isAdmin);
  const [seleccion, setSeleccion] = useState<Set<Modulo>>(new Set(modulos));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleModulo(slug: Modulo) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarAccesoUsuarioAction(usuario.id, isAdmin, Array.from(seleccion));
        setEditando(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido.");
      }
    });
  }

  function cancelar() {
    setEditando(false);
    setIsAdmin(usuario.isAdmin);
    setSeleccion(new Set(modulos));
    setError(null);
  }

  function eliminar() {
    if (
      !confirm(`¿Eliminar a ${usuario.nombreCompleto}? Esta acción no se puede deshacer.`)
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await eliminarUsuarioAction(usuario.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">{usuario.nombreCompleto}</p>
          <p className="text-xs text-ink-3">{usuario.email}</p>
        </div>
        <span
          className={`rounded-pill px-2 py-0.5 text-xs font-medium ${
            usuario.activo ? "bg-green-10 text-green" : "bg-line-2 text-ink-3"
          }`}
        >
          {usuario.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      {usuario.isAdmin && <p className="mb-2 text-xs font-medium text-blue">Administrador</p>}

      {!editando ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {usuario.isAdmin
            ? MODULOS.map((m) => (
                <span key={m.slug} className="rounded-pill bg-aqua-20 px-2 py-0.5 text-xs text-navy">
                  {m.label}
                </span>
              ))
            : modulos.length > 0
            ? modulos.map((slug) => (
                <span key={slug} className="rounded-pill bg-aqua-20 px-2 py-0.5 text-xs text-navy">
                  {moduloLabel(slug)}
                </span>
              ))
            : <span className="text-xs text-ink-3">Sin módulos asignados.</span>}
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-line-2 bg-paper p-3">
          <label className="mb-2 flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-line"
            />
            Administrador (acceso a todos los módulos)
          </label>
          {!isAdmin && (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {MODULOS.map((m) => (
                <label key={m.slug} className="flex items-center gap-2 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    checked={seleccion.has(m.slug)}
                    onChange={() => toggleModulo(m.slug)}
                    className="h-4 w-4 rounded border-line"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-3 text-xs text-[#B3261E]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {editando ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={guardar}
              className="rounded-md bg-blue px-2.5 py-1 text-xs font-medium text-white transition-colors duration-150 ease-eb-out hover:bg-navy-90 disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 ease-eb-out hover:border-navy-20"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 ease-eb-out hover:border-navy-20"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
            Editar acceso
          </button>
        )}

        <RestablecerPasswordButton userId={usuario.id} />
        <ToggleActivoButton userId={usuario.id} activo={usuario.activo} />

        {!esMiPropiaCuenta && (
          <button
            type="button"
            disabled={pending}
            onClick={eliminar}
            className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-[#B3261E] transition-colors duration-150 ease-eb-out hover:border-[#B3261E] disabled:opacity-60"
          >
            <Trash2 className="h-3 w-3" strokeWidth={1.75} />
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
