import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAppUser } from "@/lib/auth/permissions";
import {
  getKpisPorTodasLasAreas,
  getMisAsignaciones,
  listAreas,
} from "@/lib/procesos/queries";
import { KpisPanel } from "@/components/procesos/KpisPanel";
import { RutaProceso } from "@/components/procesos/RutaProceso";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import type { KpisTareas } from "@/lib/procesos/types";

export default async function DashboardProcesosPage() {
  const user = await requireAppUser();
  const asignaciones = await getMisAsignaciones(user.id);
  const misAreasLider = asignaciones
    .filter((a) => a.rol === "lider")
    .map((a) => a.areaId);

  if (!user.isAdmin && misAreasLider.length === 0) {
    redirect("/procesos");
  }

  const [todasAreas, kpisPorArea] = await Promise.all([
    listAreas(),
    getKpisPorTodasLasAreas(),
  ]);

  const areasVisibles = user.isAdmin
    ? todasAreas
    : todasAreas.filter((a) => misAreasLider.includes(a.id));

  const global: KpisTareas = {
    total: 0,
    pendientes: 0,
    enCurso: 0,
    bloqueadas: 0,
    completadas: 0,
    vencidas: 0,
    porcentajeCumplimiento: 0,
  };

  for (const area of areasVisibles) {
    const k = kpisPorArea[area.id];
    if (!k) continue;
    global.total += k.total;
    global.pendientes += k.pendientes;
    global.enCurso += k.enCurso;
    global.bloqueadas += k.bloqueadas;
    global.completadas += k.completadas;
    global.vencidas += k.vencidas;
  }
  global.porcentajeCumplimiento =
    global.total > 0 ? Math.round((global.completadas / global.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <ExecutiveHeader
        title="Dashboard General"
        subtitle=" Indicadores consolidados por área · Centro Oftalmológico Ebenezer"
        variant="procesos"
      />

      <KpisPanel kpis={global} />

      <div className="rounded-[16px] border border-[#E6EBF2] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
        <h2 className="mb-3 text-[15px] font-bold text-[#0F172A]">
          Flujo operativo general
        </h2>
        <RutaProceso
          etapas={[
            { codigo: "1", nombre: "Planeación", descripcion: "Estrategia y metas", estado: "completado" },
            { codigo: "2", nombre: "Captación", descripcion: "Atracción y agendamiento", estado: "completado" },
            { codigo: "3", nombre: "Admisión", descripcion: "Recepción y facturación", estado: "activo" },
            { codigo: "4", nombre: "Atención Médica", descripcion: "Consulta y cirugía", estado: "pendiente" },
            { codigo: "5", nombre: "Soporte y Control", descripcion: "Calidad y seguimiento", estado: "pendiente" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-[16px] border border-[#E6EBF2] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
        <div className="border-b border-[#F1F5F9] px-5 py-4">
          <h2 className="text-[15px] font-bold text-[#0F172A]">
            Cumplimiento por área
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th className="px-5 py-3">Área</th>
                <th className="px-4 py-3 text-right">Procesos</th>
                <th className="px-4 py-3 text-right">Tareas</th>
                <th className="px-4 py-3 text-right">En curso</th>
                <th className="px-4 py-3 text-right">Completadas</th>
                <th className="px-5 py-3 text-right">% Cumpl.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {areasVisibles.map((area) => {
                const k = kpisPorArea[area.id] ?? {
                  total: 0,
                  enCurso: 0,
                  completadas: 0,
                  porcentajeCumplimiento: 0,
                };
                return (
                  <tr key={area.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 font-semibold text-[#0F172A]">
                      <Link href={`/procesos/areas/${area.id}`} className="hover:text-[#1D58D8]">
                        {area.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-[#475569]">{area.totalProcesos ?? 0}</td>
                    <td className="px-4 py-3 text-right text-[#475569]">{k.total}</td>
                    <td className="px-4 py-3 text-right text-[#1D58D8] font-medium">{k.enCurso}</td>
                    <td className="px-4 py-3 text-right text-[#10B981] font-medium">{k.completadas}</td>
                    <td className="px-5 py-3 text-right font-bold text-[#0F172A]">
                      {k.porcentajeCumplimiento}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}