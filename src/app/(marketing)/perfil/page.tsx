import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { requireAppUser } from "@/lib/auth";
import { CambiarPasswordForm } from "./CambiarPasswordForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireAppUser();

  return (
    <div>
      <ExecutiveHeader overline="MI CUENTA · CONFIGURACIÓN PERSONAL" title="Mi Perfil" subtitle="Información de tu cuenta y actualización de contraseña." variant="inicio" />

      <div className="mb-8 max-w-sm rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
        <p className="mb-1 text-xs text-ink-3">Nombre</p>
        <p className="mb-4 text-sm font-medium text-navy">{user.nombreCompleto}</p>
        <p className="mb-1 text-xs text-ink-3">Correo</p>
        <p className="mb-4 text-sm font-medium text-navy">{user.email}</p>
        <p className="mb-1 text-xs text-ink-3">Rol</p>
        <p className="text-sm font-medium text-navy">
          {user.isAdmin ? "Administrador" : "Usuario"}
        </p>
      </div>

      <div className="max-w-sm rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
        <h2 className="mb-4 text-base font-semibold text-navy">Cambiar contraseña</h2>
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
