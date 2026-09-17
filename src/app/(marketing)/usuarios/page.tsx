import { requireAdmin } from "@/lib/auth";
import { listAppUsers, listModuloAccesosPorUsuario } from "@/lib/procesos/queries";
import { InvitarUsuarioForm } from "./InvitarUsuarioForm";
import { UsuarioCard } from "./UsuarioCard";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const yo = await requireAdmin();
  const [usuarios, accesos] = await Promise.all([
    listAppUsers(),
    listModuloAccesosPorUsuario(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Usuarios</h1>
      <p className="mb-6 text-sm text-ink-3">
        Invita a cada persona por correo y dale acceso a los módulos que necesita. Después, en
        cada área asignas quién es líder — el líder asigna a sus colaboradores.
      </p>

      <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-navy">Invitar usuario</h2>
        <InvitarUsuarioForm />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {usuarios.map((u) => (
          <UsuarioCard
            key={u.id}
            usuario={u}
            modulos={accesos[u.id] ?? []}
            esMiPropiaCuenta={u.id === yo.id}
          />
        ))}
      </div>
    </div>
  );
}
