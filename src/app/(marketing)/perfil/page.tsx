import { Lock } from "lucide-react";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { getMisAsignaciones, getMisModulos, requireAppUser } from "@/lib/auth";
import { CambiarPasswordForm } from "./CambiarPasswordForm";
import { EditarPerfilForm } from "./EditarPerfilForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireAppUser();
  const [modulos, asignaciones] = await Promise.all([
    getMisModulos(user.id, user.isAdmin),
    getMisAsignaciones(user.id),
  ]);

  const partes = user.nombreCompleto.trim().split(/\s+/);
  const iniciales =
    ((partes[0]?.[0] ?? "U") + (partes[1]?.[0] ?? "")).toUpperCase();
  const cargoDefault =
    asignaciones.length > 0
      ? asignaciones.map((a) => a.areaNombre).join(" / ")
      : user.isAdmin
      ? "Dirección General / Administración"
      : "Equipo Ebenezer";

  return (
    <div className="mx-auto max-w-[1360px] pb-14">
      <ExecutiveHeader
        overline="MI CUENTA · CONFIGURACIÓN PERSONAL"
        title="Mi Perfil"
        subtitle="Información de tu cuenta y actualización de contraseña."
        variant="inicio"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna Izquierda: Información Personal y Cuenta */}
        <div className="rounded-[18px] border border-[#E6EEF8] bg-white p-7 shadow-[0_2px_14px_rgba(14,36,94,0.04)]">
          <h2 className="font-display text-[19px] font-bold tracking-tight text-[#0F172A]">
            Información Personal y Cuenta
          </h2>

          <div className="my-5 flex flex-col items-center justify-center">
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#E2E8F0] font-display text-[26px] font-bold text-[#0F172A] shadow-inner">
              {iniciales}
            </div>
            <span className="mt-2.5 inline-flex items-center rounded-full bg-[#DBEAFE] px-3.5 py-1 text-[12px] font-semibold text-[#1E3A8A]">
              {user.isAdmin ? "Administrador" : "Usuario"}
            </span>
          </div>

          <EditarPerfilForm
            nombreCompleto={user.nombreCompleto}
            email={user.email}
            cargoDefault={cargoDefault}
          />
        </div>

        {/* Columna Derecha: Seguridad y Contraseña */}
        <div className="flex flex-col justify-between rounded-[18px] border border-[#E6EEF8] bg-white p-7 shadow-[0_2px_14px_rgba(14,36,94,0.04)]">
          <div>
            <h2 className="font-display text-[19px] font-bold tracking-tight text-[#0F172A]">
              Seguridad y Contraseña
            </h2>

            <div className="my-5 flex justify-center">
              <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-[#2563EB] bg-[#EBF3FE] text-[#2563EB] shadow-sm">
                <Lock className="h-8 w-8" strokeWidth={2} />
              </div>
            </div>

            <CambiarPasswordForm />

            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[#F1F5F9] pt-4">
              <span className="inline-flex items-center rounded-full bg-[#E2E8F0]/80 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1E293B]">
                Sesión activa
              </span>
              <span className="inline-flex items-center rounded-full bg-[#E2E8F0]/80 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1E293B]">
                Acceso total a {modulos.size} módulos
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}