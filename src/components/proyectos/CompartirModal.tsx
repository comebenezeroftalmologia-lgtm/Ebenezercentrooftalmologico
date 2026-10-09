"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Avatar, BotonPrimario, Modal, useAviso } from "@/components/proyectos/ui";
import { ROLES, type Espacio, type Miembro, type RolEspacio } from "@/lib/proyectos/types";
import {
  agregarMiembroAction,
  cambiarRolMiembroAction,
  listarCandidatosAction,
  listarMiembrosAction,
  quitarMiembroAction,
  type Candidato,
} from "@/lib/proyectos/actions";

export function CompartirModal({
  espacio,
  onCerrar,
  yoId,
}: {
  espacio: Espacio;
  onCerrar: () => void;
  yoId: string;
}) {
  const aviso = useAviso();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [sel, setSel] = useState("");
  const [rol, setRol] = useState<RolEspacio>("editor");
  const [pendiente, start] = useTransition();
  const esProp = espacio.rol === "propietario";

  useEffect(() => {
    listarMiembrosAction(espacio.id).then((r) => {
      if (r.ok) setMiembros(r.miembros);
      else aviso(r.error);
      setCargando(false);
    });
  }, [espacio.id, aviso]);

  useEffect(() => {
    if (!esProp) return;
    listarCandidatosAction(espacio.id).then((r) => {
      if (r.ok) setCandidatos(r.candidatos);
      else aviso(r.error);
    });
  }, [esProp, espacio.id, aviso]);

  const disponibles = (candidatos ?? []).filter((c) => !miembros.some((m) => m.userId === c.id));

  function agregar() {
    const c = disponibles.find((d) => d.id === sel);
    if (!c) return;
    start(async () => {
      const r = await agregarMiembroAction(espacio.id, c.id, rol);
      if (!r.ok) return aviso(r.error);
      setMiembros((m) => [...m, { userId: c.id, nombre: c.nombre, rol }]);
      setSel("");
    });
  }

  function cambiarRol(m: Miembro, nuevo: RolEspacio) {
    start(async () => {
      const r = await cambiarRolMiembroAction(espacio.id, m.userId, nuevo);
      if (!r.ok) return aviso(r.error);
      setMiembros((l) => l.map((x) => (x.userId === m.userId ? { ...x, rol: nuevo } : x)));
    });
  }

  function quitar(m: Miembro) {
    start(async () => {
      const r = await quitarMiembroAction(espacio.id, m.userId);
      if (!r.ok) return aviso(r.error);
      setMiembros((l) => l.filter((x) => x.userId !== m.userId));
    });
  }

  return (
    <Modal titulo={`Compartir «${espacio.nombre}»`} onCerrar={onCerrar} ancho={520}>
      <p className="mb-4 text-sm text-ink-3">
        {espacio.privado
          ? "Este espacio es privado: solo lo ven los miembros de la lista."
          : "Este espacio es abierto: todos con acceso al módulo lo ven como lectores. Agrega miembros para que puedan editar."}
      </p>

      {esProp && (
        <div className="mb-4 flex gap-2">
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="min-w-0 flex-1 rounded-sm border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-blue"
            aria-label="Persona"
          >
            <option value="">{candidatos === null ? "Cargando…" : disponibles.length ? "Elegir persona…" : "No hay más personas con acceso"}</option>
            {disponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.email})
              </option>
            ))}
          </select>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolEspacio)}
            className="rounded-sm border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-blue"
            aria-label="Rol"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <BotonPrimario onClick={agregar} disabled={!sel || pendiente}>
            <UserPlus className="h-4 w-4" /> Agregar
          </BotonPrimario>
        </div>
      )}

      <ul className="divide-y divide-line-2 rounded-md border border-line">
        {cargando && <li className="px-3 py-3 text-sm text-ink-3">Cargando…</li>}
        {!cargando && miembros.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">Aún no hay miembros.</li>}
        {miembros.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar id={m.userId} nombre={m.nombre} size={28} />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {m.nombre}
              {m.userId === yoId && <span className="ml-1 text-xs text-ink-3">(tú)</span>}
            </span>
            {esProp ? (
              <>
                <select
                  value={m.rol}
                  onChange={(e) => cambiarRol(m, e.target.value as RolEspacio)}
                  className="rounded-sm border border-line bg-white px-2 py-1 text-xs outline-none focus:border-blue"
                  aria-label={`Rol de ${m.nombre}`}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => quitar(m)}
                  aria-label={`Quitar a ${m.nombre}`}
                  className="rounded-sm p-1 text-ink-3 hover:bg-line-2 hover:text-[#B42318]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <span className="text-xs text-ink-3">{ROLES.find((r) => r.value === m.rol)?.label}</span>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
