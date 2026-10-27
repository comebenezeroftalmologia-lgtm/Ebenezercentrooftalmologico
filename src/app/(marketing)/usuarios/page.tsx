import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { getMisModulos, puedeAdministrarA, requireGestorUsuarios, rolesAsignables } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";
import { getEstadoAccesoPorUsuario, listAppUsers, listModuloAccesosPorUsuario, listSolicitudesEliminacionPendientes } from "@/lib/procesos/queries";
import type { EstadoAcceso } from "@/lib/procesos/types";
import { InvitarUsuarioForm } from "./InvitarUsuarioForm";
import { SolicitudesEliminacion } from "./SolicitudesEliminacion";
import { UsuarioCard } from "./UsuarioCard";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const yo = await requireGestorUsuarios();
  const [todos, accesos, estados, misModulos, solicitudes] = await Promise.all([
    listAppUsers(),
    listModuloAccesosPorUsuario(),
    // Si Auth no responde, la página sigue funcionando sin el detalle de ingreso.
    getEstadoAccesoPorUsuario().catch((): Record<string, EstadoAcceso> => ({})),
    getMisModulos(yo.id, yo.isAdmin),
    listSolicitudesEliminacionPendientes(yo),
  ]);

  // Un líder solo ve (y administra) a las personas de su equipo.
  const usuarios = yo.rol === "lider" ? todos.filter((u) => u.liderId === yo.id) : todos;
  const lideres = todos.filter((u) => u.rol === "lider" && u.activo).map((u) => ({ id: u.id, nombre: u.nombreCompleto }));
  const nombrePorId = Object.fromEntries(todos.map((u) => [u.id, u.nombreCompleto]));
  const rolesDisponibles = rolesAsignables(yo);
  const modulosDisponibles = Array.from(new Set(MODULOS.map((m) => m.slug))).filter((slug) => misModulos.has(slug));

  const desactivados = usuarios.filter((u) => !u.activo).length;
  const pendientes = usuarios.filter((u) => u.activo && estados[u.id] && !estados[u.id].ultimoIngreso).length;
  const activos = usuarios.filter((u) => u.activo && (!estados[u.id] || estados[u.id].ultimoIngreso)).length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Usuarios</h1>
      <p className="mb-6 text-sm text-ink-3">
        {yo.rol === "lider"
          ? "Invita a las personas de tu equipo y dales acceso a los módulos que tú tienes. Tú autorizas sus solicitudes de eliminación."
          : "Invita a cada persona por correo, elige su rol (Desarrollador, Administrador, Líder o Usuario Básico) y dale acceso a los módulos que necesita. Cada Usuario Básico tiene un líder que autoriza sus eliminaciones."}
      </p>

      <SolicitudesEliminacion solicitudes={solicitudes} />

      <div className="mb-8 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
        <h2 className="mb-4 text-base font-semibold text-navy">Invitar usuario</h2>
        <InvitarUsuarioForm roles={rolesDisponibles} lideres={lideres} yoEsLider={yo.rol === "lider"} modulosDisponibles={modulosDisponibles} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-pill bg-green-10 px-2.5 py-1 font-medium text-green">
          {activos} {activos === 1 ? "activo" : "activos"}
        </span>
        <span className="rounded-pill bg-[#FEF3E2] px-2.5 py-1 font-medium text-[#B54708]">
          {pendientes} {pendientes === 1 ? "invitación pendiente" : "invitaciones pendientes"}
        </span>
        {desactivados > 0 && (
          <span className="rounded-pill bg-line-2 px-2.5 py-1 font-medium text-ink-3">
            {desactivados} {desactivados === 1 ? "desactivado" : "desactivados"}
          </span>
        )}
        <span className="text-ink-3">«Activo» = ya ingresó al menos una vez. «Invitación pendiente» = recibió el correo pero aún no entra.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {usuarios.map((u) => (
          <UsuarioCard
            key={u.id}
            acceso={estados[u.id]}
            usuario={u}
            modulos={accesos[u.id] ?? []}
            esMiPropiaCuenta={u.id === yo.id}
            puedeEditar={puedeAdministrarA(yo, u)}
            puedeEliminar={yo.isAdmin && puedeAdministrarA(yo, u)}
            rolesDisponibles={rolesDisponibles}
            lideres={lideres}
            liderNombre={u.liderId ? nombrePorId[u.liderId] ?? null : null}
            yoEsLider={yo.rol === "lider"}
            modulosDisponibles={modulosDisponibles}
          />
        ))}
      </div>
    </div>
  );
}
