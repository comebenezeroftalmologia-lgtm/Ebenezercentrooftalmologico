import { getMisModulos, puedeAdministrarA, requireGestorUsuarios, rolesAsignables } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";
import {
  getEstadoAccesoPorUsuario,
  listAppUsers,
  listModuloAccesosPorUsuario,
  listSolicitudesEliminacionPendientes,
} from "@/lib/procesos/queries";
import { rolLabel, type EstadoAcceso } from "@/lib/procesos/types";
import { InvitarUsuarioForm } from "./InvitarUsuarioForm";
import { SolicitudesEliminacion } from "./SolicitudesEliminacion";
import { UsuarioCard } from "./UsuarioCard";

export const dynamic = "force-dynamic";

const ORDEN_LIDER: Record<string, number> = {
  lider: 0,
  administrador: 1,
  desarrollador: 2,
};

export default async function UsuariosPage() {
  const yo = await requireGestorUsuarios();
  const [todos, accesos, estados, misModulos, solicitudes] = await Promise.all([
    listAppUsers(),
    listModuloAccesosPorUsuario(),
    getEstadoAccesoPorUsuario().catch((): Record<string, EstadoAcceso> => ({})),
    getMisModulos(yo.id, yo.isAdmin),
    listSolicitudesEliminacionPendientes(yo),
  ]);

  // Un líder solo ve y administra a las personas de su propio equipo.
  const usuarios = yo.rol === "lider" ? todos.filter((u) => u.liderId === yo.id) : todos;

  // Autorizadores disponibles para Usuarios Básicos: Líderes, Administradores y Desarrolladores activos.
  const lideres = todos
    .filter(
      (u) =>
        u.activo &&
        (u.rol === "lider" || u.rol === "administrador" || u.rol === "desarrollador")
    )
    .sort(
      (a, b) =>
        (ORDEN_LIDER[a.rol] ?? 9) - (ORDEN_LIDER[b.rol] ?? 9) ||
        a.nombreCompleto.localeCompare(b.nombreCompleto, "es")
    )
    .map((u) => ({
      id: u.id,
      nombre: u.rol === "lider" ? u.nombreCompleto : `${u.nombreCompleto} (${rolLabel(u.rol)})`,
    }));

  const nombrePorId = Object.fromEntries(todos.map((u) => [u.id, u.nombreCompleto]));
  const rolesDisponibles = rolesAsignables(yo);
  const modulosDisponibles = MODULOS.map((m) => m.slug).filter((slug) => misModulos.has(slug));

  const desactivados = usuarios.filter((u) => !u.activo).length;
  const pendientes = usuarios.filter(
    (u) => u.activo && estados[u.id] && !estados[u.id].ultimoIngreso && !estados[u.id].claveAsignada
  ).length;
  const activos = usuarios.filter(
    (u) => u.activo && (!estados[u.id] || estados[u.id].ultimoIngreso || estados[u.id].claveAsignada)
  ).length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Usuarios</h1>
      <p className="mb-6 text-sm text-ink-3">
        {yo.rol === "lider"
          ? "Incluye a las personas de tu equipo, asígnales contraseña directa o invitación por correo y marca exactamente los módulos que deben ver."
          : "Incluye a cada persona con su rol (Desarrollador, Administrador, Líder o Usuario Básico), marca únicamente las casillas que debe ver y elige si entra de inmediato con contraseña inicial o por invitación al correo."}
      </p>

      <SolicitudesEliminacion solicitudes={solicitudes} />

      <div className="mb-8 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
        <h2 className="mb-4 text-base font-semibold text-navy">Invitar o crear usuario</h2>
        <InvitarUsuarioForm
          roles={rolesDisponibles}
          lideres={lideres}
          yoEsLider={yo.rol === "lider"}
          modulosDisponibles={modulosDisponibles}
        />
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
        <span className="text-ink-3">
          «Activo» = ya ingresó o ya tiene contraseña activa. «Invitación pendiente» = aún no ha activado su enlace.
        </span>
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
            puedeAsignarGestor={yo.isAdmin}
          />
        ))}
      </div>
    </div>
  );
}
