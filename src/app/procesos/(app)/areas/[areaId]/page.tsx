import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getCurrentAppUser } from "@/lib/auth";
import {
  getArea,
  listAppUsers,
  listAsignacionesPorArea,
  listProcesosPorArea,
} from "@/lib/procesos/queries";
import { AsignarLiderForm } from "./AsignarLiderForm";
import { AsignarColaboradorForm } from "./AsignarColaboradorForm";
import { QuitarAsignacionButton } from "./QuitarAsignacionButton";
import { CrearProcesoForm } from "./CrearProcesoForm";

export const dynamic = "force-dynamic";

export default async function AreaDetailPage({ params }: { params: { areaId: string } }) {
  const [user, area, asignaciones, todosLosUsuarios, procesos] = await Promise.all([
    getCurrentAppUser(),
    getArea(params.areaId),
    listAsignacionesPorArea(params.areaId),
    listAppUsers(),
    listProcesosPorArea(params.areaId),
  ]);

  if (!area || !user) notFound();

  const lideres = asignaciones.filter((a) => a.rol === "lider");
  const colaboradores = asignaciones.filter((a) => a.rol === "colaborador");
  const esLiderDeEstaArea = lideres.some((l) => l.userId === user.id);
  const puedeGestionarColaboradores = user.isAdmin || esLiderDeEstaArea;

  const asignadosIds = new Set(asignaciones.map((a) => a.userId));
  const candidatosLider = todosLosUsuarios.filter((u) => u.activo && !lideres.some((l) => l.userId === u.id));
  const candidatosColaborador = todosLosUsuarios.filter((u) => u.activo && !asignadosIds.has(u.id));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-navy">{area.nombre}</h1>
      <p className="mb-6 text-sm text-ink-3">
        {lideres.length > 0
          ? `Líder: ${lideres.map((l) => l.usuario.nombreCompleto).join(", ")}`
          : "Sin líder asignado todavía."}
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-navy">Líder</h2>
          <ul className="mb-4 flex flex-col gap-2">
            {lideres.map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm text-ink-2">
                {l.usuario.nombreCompleto}
                {user.isAdmin && <QuitarAsignacionButton asignacionId={l.id} areaId={area.id} />}
              </li>
            ))}
            {lideres.length === 0 && <li className="text-sm text-ink-3">Sin asignar.</li>}
          </ul>
          {user.isAdmin && <AsignarLiderForm areaId={area.id} candidatos={candidatosLider} />}
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-navy">
            Colaboradores ({colaboradores.length})
          </h2>
          <ul className="mb-4 flex flex-col gap-2">
            {colaboradores.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm text-ink-2">
                {c.usuario.nombreCompleto}
                {puedeGestionarColaboradores && (
                  <QuitarAsignacionButton asignacionId={c.id} areaId={area.id} />
                )}
              </li>
            ))}
            {colaboradores.length === 0 && <li className="text-sm text-ink-3">Sin colaboradores todavía.</li>}
          </ul>
          {puedeGestionarColaboradores && (
            <AsignarColaboradorForm areaId={area.id} candidatos={candidatosColaborador} />
          )}
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-navy">Procesos</h2>
      <div className="mb-6 rounded-xl border border-line bg-white shadow-sm">
        {procesos.map((p, i) => (
          <Link
            key={p.id}
            href={`/procesos/procesos/${p.id}`}
            className={`flex items-center gap-3 px-5 py-4 text-sm transition-colors duration-150 ease-eb-out hover:bg-line-2 ${
              i !== procesos.length - 1 ? "border-b border-line-2" : ""
            }`}
          >
            <FileText className="h-4 w-4 shrink-0 text-blue" strokeWidth={1.75} />
            <div>
              <p className="font-medium text-ink-2">{p.nombre}</p>
              {p.descripcion && <p className="text-xs text-ink-3">{p.descripcion}</p>}
            </div>
          </Link>
        ))}
        {procesos.length === 0 && (
          <p className="px-5 py-4 text-sm text-ink-3">Sin procesos creados todavía.</p>
        )}
      </div>

      {puedeGestionarColaboradores && (
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-navy">Crear proceso</h3>
          <CrearProcesoForm areaId={area.id} />
        </div>
      )}
    </div>
  );
}
