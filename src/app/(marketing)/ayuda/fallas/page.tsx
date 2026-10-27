import { requireAppUser } from "@/lib/auth";
import { listMisFallas, listTodasFallas } from "@/lib/ayuda/queries";
import { MODULOS } from "@/lib/modulos";
import { BandejaFallas } from "./BandejaFallas";
import { FormularioFalla } from "./FormularioFalla";
import { ListaFallas } from "./ListaFallas";

export const dynamic = "force-dynamic";

export default async function FallasPage() {
  const user = await requireAppUser();
  const esDev = user.rol === "desarrollador";
  const [mias, todas] = await Promise.all([listMisFallas(user.id), esDev ? listTodasFallas() : Promise.resolve([])]);
  const modulos = Array.from(new Set(MODULOS.map((m) => m.label)));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold text-navy">Reporte de Fallas</h1>
      <p className="mb-6 text-sm text-ink-3">
        ¿Algo no funciona o salió mal? Cuéntanos qué hacías y qué pasó. El equipo de desarrollo lo revisa.
      </p>

      <div className="mb-8 rounded-[16px] border border-[#E6EEF8] bg-white p-6 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
        <FormularioFalla modulos={[...modulos, "Ayuda", "Inicio / Otro"]} />
      </div>

      {esDev && (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-navy">Bandeja de fallas (Desarrollador)</h2>
          <BandejaFallas fallas={todas} />
        </div>
      )}

      <h2 className="mb-3 text-base font-semibold text-navy">Mis reportes</h2>
      <ListaFallas fallas={mias} />
    </div>
  );
}
