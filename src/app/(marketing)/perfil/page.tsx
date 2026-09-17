import { requireAppUser } from "@/lib/auth";
import { CambiarPasswordForm } from "./CambiarPasswordForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireAppUser();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">Mi perfil</h1>
      <p className="mb-6 text-sm text-ink-3">Tu información y acceso a la plataforma.</p>

      <div className="mb-8 max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
        <p className="mb-1 text-xs text-ink-3">Nombre</p>
        <p className="mb-4 text-sm font-medium text-navy">{user.nombreCompleto}</p>
        <p className="mb-1 text-xs text-ink-3">Correo</p>
        <p className="mb-4 text-sm font-medium text-navy">{user.email}</p>
        <p className="mb-1 text-xs text-ink-3">Rol</p>
        <p className="text-sm font-medium text-navy">
          {user.isAdmin ? "Administrador" : "Usuario"}
        </p>
      </div>

      <div className="max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-navy">Cambiar contraseña</h2>
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
