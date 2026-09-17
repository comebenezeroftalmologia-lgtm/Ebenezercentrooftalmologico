import { requireAdmin } from "@/lib/procesos/auth";
import { listAppUsers } from "@/lib/procesos/queries";
import { emailToUsuario } from "@/lib/procesos/auth";
import { CrearUsuarioForm } from "./CrearUsuarioForm";
import { ToggleActivoButton } from "./ToggleActivoButton";
import { RestablecerPasswordButton } from "./RestablecerPasswordButton";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await requireAdmin();
  const usuarios = await listAppUsers();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Usuarios</h1>
      <p className="mb-6 text-sm text-ink-3">
        Crea el acceso de cada persona. Después, en cada área asignas quién es líder — el líder
        asigna a sus colaboradores.
      </p>

      <div className="mb-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-navy">Crear usuario</h2>
        <CrearUsuarioForm />
      </div>

      <div className="rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-line-2 last:border-0">
                <td className="px-4 py-3 text-ink-2">{u.nombreCompleto}</td>
                <td className="px-4 py-3 text-ink-3">{emailToUsuario(u.email)}</td>
                <td className="px-4 py-3 text-ink-3">{u.isAdmin ? "Administrador" : "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-pill px-2 py-0.5 text-xs font-medium ${
                      u.activo ? "bg-green-10 text-green" : "bg-line-2 text-ink-3"
                    }`}
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <RestablecerPasswordButton userId={u.id} />
                    <ToggleActivoButton userId={u.id} activo={u.activo} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
