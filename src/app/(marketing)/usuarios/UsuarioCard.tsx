"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Mail, Pencil, Trash2 } from "lucide-react";
import {
  ROLES_PLATAFORMA,
  rolLabel,
  type AppUser,
  type EstadoAcceso,
  type RolPlataforma,
} from "@/lib/procesos/types";
import type { Modulo } from "@/lib/modulos";
import { MODULOS, modulosPorGrupo, moduloLabel } from "@/lib/modulos";
import {
  actualizarAccesoUsuarioAction,
  eliminarUsuarioAction,
  reenviarInvitacionOLinkAction,
} from "@/lib/procesos/actions";
import { GestorConocimientoToggle } from "./GestorConocimientoToggle";
import { RestablecerPasswordButton } from "./RestablecerPasswordButton";
import { ToggleActivoButton } from "./ToggleActivoButton";

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function UsuarioCard({
  usuario,
  acceso,
  modulos,
  esMiPropiaCuenta,
  puedeEditar,
  puedeEliminar,
  rolesDisponibles,
  lideres,
  liderNombre,
  yoEsLider,
  modulosDisponibles,
  puedeAsignarGestor,
}: {
  usuario: AppUser;
  acceso?: EstadoAcceso;
  modulos: Modulo[];
  esMiPropiaCuenta: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  rolesDisponibles: RolPlataforma[];
  lideres: { id: string; nombre: string }[];
  liderNombre: string | null;
  yoEsLider: boolean;
  modulosDisponibles: Modulo[];
  puedeAsignarGestor: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [rol, setRol] = useState<RolPlataforma>(usuario.rol);
  const [liderId, setLiderId] = useState<string>(usuario.liderId ?? "");
  const isAdmin = rol === "desarrollador" || rol === "administrador";
  const disponiblesSet = new Set(modulosDisponibles);
  const gruposDisponibles = modulosPorGrupo(MODULOS.filter((m) => disponiblesSet.has(m.slug)));
  const [seleccion, setSeleccion] = useState<Set<Modulo>>(new Set(modulos));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [avisoLink, setAvisoLink] = useState<string | null>(null);
  const [linkGenerado, setLinkGenerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Mantener estado sincronizado cuando el servidor revalida las tarjetas
  useEffect(() => {
    if (!editando) {
      setRol(usuario.rol);
      setLiderId(usuario.liderId ?? "");
      setSeleccion(new Set(modulos));
    }
  }, [usuario.rol, usuario.liderId, modulos, editando]);

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
        await actualizarAccesoUsuarioAction(
          usuario.id,
          rol,
          rol === "usuario_basico" ? liderId || null : null,
          Array.from(seleccion)
        );
        setEditando(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido.");
      }
    });
  }

  function cancelar() {
    setEditando(false);
    setRol(usuario.rol);
    setLiderId(usuario.liderId ?? "");
    setSeleccion(new Set(modulos));
    setError(null);
  }

  function eliminar() {
    if (!confirm(`¿Eliminar a ${usuario.nombreCompleto}? Esta acción no se puede deshacer.`)) {
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

  function gestionarLink(accion: "correo" | "link") {
    setError(null);
    setAvisoLink(null);
    startTransition(async () => {
      const res = await reenviarInvitacionOLinkAction(usuario.id, accion);
      if (!res.ok) {
        setError(res.error ?? "No se pudo procesar la invitación.");
        return;
      }
      if (res.link) {
        setLinkGenerado(res.link);
        try {
          await navigator.clipboard.writeText(res.link);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 3000);
          setAvisoLink(res.mensaje ?? "Enlace de activación copiado al portapapeles.");
        } catch {
          setAvisoLink(res.mensaje ?? "Copia manualmente el enlace de activación abajo:");
        }
      } else if (res.mensaje) {
        setAvisoLink(res.mensaje);
      }
    });
  }

  const yaIngreso = Boolean(acceso?.ultimoIngreso);
  const tieneClaveDirecta = Boolean(acceso?.claveAsignada) && !yaIngreso;
  const pendienteIngreso = Boolean(acceso) && !yaIngreso && !tieneClaveDirecta;

  const insignia = !usuario.activo
    ? { texto: "Desactivado", clase: "bg-line-2 text-ink-3" }
    : pendienteIngreso
    ? { texto: "Invitación pendiente", clase: "bg-[#FEF3E2] text-[#B54708]" }
    : tieneClaveDirecta
    ? { texto: "Clave activa", clase: "bg-[#EBF3FE] text-[#1D4ED8]" }
    : { texto: "Activo", clase: "bg-green-10 text-green" };

  const detalleAcceso = !acceso
    ? null
    : !usuario.activo
    ? "Cuenta bloqueada · no puede iniciar sesión"
    : yaIngreso
    ? `Último ingreso: ${fechaCorta(acceso.ultimoIngreso!)}`
    : tieneClaveDirecta
    ? "Contraseña asignada · listo para entrar en /login"
    : acceso.invitadoAt
    ? `Invitado el ${fechaCorta(acceso.invitadoAt)} · aún no ha ingresado`
    : "Aún no ha ingresado";

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">{usuario.nombreCompleto}</p>
          <p className="truncate text-xs text-ink-3">{usuario.email}</p>
        </div>
        <span className={`shrink-0 rounded-pill px-2 py-0.5 text-xs font-medium ${insignia.clase}`}>
          {insignia.texto}
        </span>
      </div>
      {detalleAcceso && <p className="-mt-2 mb-3 text-[11px] text-ink-3">{detalleAcceso}</p>}

      <p className="mb-2 text-xs font-medium text-blue">
        {rolLabel(usuario.rol)}
        {usuario.rol === "usuario_basico" && (
          <span className="font-normal text-ink-3">
            {" "}
            · Líder: {liderNombre ?? "Administración"}
          </span>
        )}
      </p>

      {!editando ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {usuario.isAdmin || usuario.rol === "desarrollador" || usuario.rol === "administrador" ? (
            <span className="rounded-pill bg-[#EBF3FE] px-2.5 py-0.5 text-xs font-medium text-[#1E3A8A]">
              Acceso total a todos los módulos ({MODULOS.length})
            </span>
          ) : modulos.length > 0 ? (
            modulos.map((slug) => (
              <span
                key={slug}
                className="rounded-pill bg-aqua-20 px-2 py-0.5 text-xs text-navy"
              >
                {moduloLabel(slug)}
              </span>
            ))
          ) : (
            <span className="text-xs text-ink-3">Sin módulos asignados.</span>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-line-2 bg-paper p-3">
          <label className="eb-label mb-1 block text-[11px] text-ink-3">Rol</label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolPlataforma)}
            className="mb-2 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink"
          >
            {ROLES_PLATAFORMA.filter(
              (r) => rolesDisponibles.includes(r.valor) || r.valor === usuario.rol
            ).map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.label}
              </option>
            ))}
          </select>
          {rol === "usuario_basico" && !yoEsLider && (
            <>
              <label className="eb-label mb-1 block text-[11px] text-ink-3">
                Líder (autoriza eliminaciones)
              </label>
              <select
                value={liderId}
                onChange={(e) => setLiderId(e.target.value)}
                className="mb-2 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink"
              >
                <option value="">Sin líder específico (autoriza Administración)</option>
                {lideres.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </>
          )}
          {isAdmin && (
            <p className="text-xs text-ink-3">Este rol ve todos los módulos automáticamente.</p>
          )}
          {!isAdmin && (
            <div className="flex flex-col gap-3">
              {(Object.keys(gruposDisponibles) as (keyof typeof gruposDisponibles)[]).map(
                (grupo) => (
                  <div key={grupo}>
                    <p className="mb-1 text-[11px] font-semibold text-ink-3">{grupo}</p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {gruposDisponibles[grupo].map((m) => (
                        <label
                          key={m.slug}
                          className="flex cursor-pointer items-center gap-2 text-sm text-ink-2"
                        >
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
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {puedeAsignarGestor && !usuario.isAdmin && (
        <GestorConocimientoToggle userId={usuario.id} inicial={usuario.esGestorConocimiento} />
      )}

      {error && <p className="mb-3 text-xs text-[#B3261E]">{error}</p>}
      {avisoLink && <p className="mb-2 text-xs text-green">{avisoLink}</p>}
      {linkGenerado && (
        <div className="mb-3 flex items-center gap-1.5">
          <input
            type="text"
            readOnly
            value={linkGenerado}
            className="min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 text-[11px] text-ink"
          />
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(linkGenerado);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2500);
              } catch {}
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-line bg-white px-2 py-1 text-[11px] font-medium text-navy hover:border-navy-20"
          >
            {copiado ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3" />}
            {copiado ? "Listo" : "Copiar"}
          </button>
        </div>
      )}

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
        ) : puedeEditar ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 ease-eb-out hover:border-navy-20"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
            Editar acceso
          </button>
        ) : null}

        {puedeEditar && <RestablecerPasswordButton userId={usuario.id} />}

        {puedeEditar && usuario.activo && pendienteIngreso && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => gestionarLink("link")}
              title="Generar y copiar enlace directo de activación"
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 ease-eb-out hover:border-navy-20 disabled:opacity-60"
            >
              <Copy className="h-3 w-3" strokeWidth={1.75} />
              Copiar link
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => gestionarLink("correo")}
              title="Reenviar invitación por correo"
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors duration-150 ease-eb-out hover:border-navy-20 disabled:opacity-60"
            >
              <Mail className="h-3 w-3" strokeWidth={1.75} />
              Reenviar
            </button>
          </>
        )}

        {puedeEditar && !esMiPropiaCuenta && (
          <ToggleActivoButton userId={usuario.id} activo={usuario.activo} />
        )}

        {puedeEliminar && !esMiPropiaCuenta && (
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
