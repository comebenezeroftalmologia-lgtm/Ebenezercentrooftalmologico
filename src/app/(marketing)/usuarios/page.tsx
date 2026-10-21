import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { requireAdmin } from "@/lib/auth";
import { getEstadoAccesoPorUsuario, listAppUsers, listModuloAccesosPorUsuario } from "@/lib/procesos/queries";
import type { EstadoAcceso } from "@/lib/procesos/types";
import { InvitarUsuarioForm } from "./InvitarUsuarioForm";
import { UsuarioCard } from "./UsuarioCard";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const yo = await requireAdmin();
  const [usuarios, accesos, estados] = await Promise.all([
    listAppUsers(),
    listModuloAccesosPorUsuario(),
    // Si Auth no responde, la página sigue funcionando sin el detalle de ingreso.
    getEstadoAccesoPorUsuario().catch((): Record<string, EstadoAcceso> => ({})),
  ]);

  const desactivados = usuarios.filter((u) => !u.activo).length;
  const pendientes = usuarios.filter((u) => u.activo && estados[u.id] && !estados[u.id].ultimoIngreso).length;
  const activos = usuarios.filter((u) => u.activo && (!estados[u.id] || estados[u.id].ultimoIngreso)).length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Usuarios</h1>
      <p className="mb-6 text-sm text-ink-3">
        Invita a cada persona por correo y dale acceso a los módulos que necesita. Después, en
        cada área asignas quién es líder — el líder asigna a sus colaboradores.
      </p>

      <div className="mb-8 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
        <h2 className="mb-4 text-base font-semibold text-navy">Invitar usuario</h2>
        <InvitarUsuarioForm />
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
          />
        ))}
      </div>
    </div>
  );
}
