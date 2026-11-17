import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Cloud,
  FileSpreadsheet,
  Lock,
  Users,
} from "lucide-react";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { getMisModulos, requireAnyModuloAccess } from "@/lib/auth";
import { MODULOS_WORKCENTER } from "@/lib/modulos";

export const dynamic = "force-dynamic";

export default async function WorkCenterPage() {
  const user = await requireAnyModuloAccess(MODULOS_WORKCENTER);
  const modulos = await getMisModulos(user.id, user.isAdmin);
  const nombre = user.nombreCompleto.split(" ")[0] ?? user.nombreCompleto;

  const verLiquidador = user.isAdmin || modulos.has("proyectos");
  const verCartera = user.isAdmin || modulos.has("cartera");
  const verTalento = user.isAdmin || modulos.has("talento_humano");
  const totalActivos = [verLiquidador, verCartera, verTalento].filter(Boolean).length;

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC]">
      <div className="mx-auto max-w-[1360px] space-y-6 px-6 pb-24 pt-6">
        <ExecutiveHeader
          overline="WORKCENTER · ARCHIVOS Y APLICATIVOS DE TRABAJO"
          title={`WorkCenter — Hola, ${nombre}`}
          subtitle="Espacio exclusivo para archivos operativos interactivos. Cada persona ve únicamente los aplicativos asignados a su cuenta."
          variant="proyectos"
        />

        {/* KPIs de WorkCenter */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Archivos Habilitados
              </p>
              <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">
                {totalActivos}
              </p>
              <span className="mt-2.5 inline-flex items-center rounded-md bg-[#EBF3FE] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                Asignados a tu usuario
              </span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Control de Acceso y Vista
              </p>
              <p className="mt-2 font-display text-[22px] font-bold leading-none text-[#0F172A]">
                Por Permiso Individual
              </p>
              <span className="mt-2.5 inline-flex items-center rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                Cada usuario ve solo su perfil
              </span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
              <Lock className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Sincronización en Nube
              </p>
              <p className="mt-2 font-display text-[22px] font-bold leading-none text-[#0F172A]">
                100 % Original
              </p>
              <span className="mt-2.5 inline-flex items-center rounded-md bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#6D28D9]">
                Base centralizada en vivo
              </span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#7C3AED]">
              <Cloud className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Catálogo de Archivos de Trabajo */}
        <section aria-label="Archivos de Trabajo" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6EEF8] pb-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EBF3FE] text-[12px] font-extrabold text-[#1D4ED8]">
                01
              </span>
              <div>
                <h2 className="font-display text-[17px] font-bold tracking-tight text-[#0F172A]">
                  Archivos de Trabajo Activos
                </h2>
                <p className="text-[12px] text-[#64748B]">
                  Haz clic en el aplicativo autorizado para abrir tu mesa de trabajo
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#C9DDFB] bg-[#EBF3FE] px-3 py-1 text-[11px] font-semibold text-[#1D4ED8]">
              {totalActivos} {totalActivos === 1 ? "archivo activo" : "archivos activos"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verLiquidador && (
              <Link
                href="/workcenter/liquidador"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: "#2563EB",
                }}
                className="group flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_10px_28px_rgba(37,99,235,0.10)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#2563EB] text-white shadow-sm">
                        <FileSpreadsheet className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[15.5px] font-bold text-[#0F172A] group-hover:text-[#1D4ED8]">
                          Liquidador de Honorarios Médicos
                        </h3>
                        <p className="truncate text-[12px] text-[#64748B]">
                          Liquidación médica, actas, tarifarios 2026 y Excel/PDF
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-[#2563EB] opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                      Abrir <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3.5 text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] px-2.5 py-1 font-semibold text-[#047857]">
                      <Lock className="h-3.5 w-3.5" />
                      Acceso con clave
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EBF3FE] px-2.5 py-1 font-semibold text-[#1D4ED8]">
                      Vista por usuario
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F3FF] px-2 py-1 font-semibold text-[#6D28D9]">
                    Nube conectada
                  </span>
                </div>
              </Link>
            )}

            {verCartera && (
              <Link
                href="/workcenter/cartera"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: "#0E4C7E",
                }}
                className="group flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_10px_28px_rgba(14,76,126,0.10)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#0E4C7E] text-white shadow-sm">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[15.5px] font-bold text-[#0F172A] group-hover:text-[#0B3D66]">
                          Cartera — Mesa de trabajo
                        </h3>
                        <p className="truncate text-[12px] text-[#64748B]">
                          Glosas, devoluciones y anulaciones, con historial
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-[#0E4C7E] opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                      Abrir <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3.5 text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] px-2.5 py-1 font-semibold text-[#047857]">
                      <Lock className="h-3.5 w-3.5" />
                      Permiso propio
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EBF3FE] px-2.5 py-1 font-semibold text-[#1D4ED8]">
                      Guarda en base
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F3FF] px-2 py-1 font-semibold text-[#6D28D9]">
                    Con historial
                  </span>
                </div>
              </Link>
            )}

            {verTalento && (
              <Link
                href="/workcenter/talento-humano"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: "#047857",
                }}
                className="group flex flex-col justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A7F3D0] hover:shadow-[0_10px_28px_rgba(4,120,87,0.10)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#047857] text-white shadow-sm">
                        <Users className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[15.5px] font-bold text-[#0F172A] group-hover:text-[#065F46]">
                          Talento Humano — Base de datos
                        </h3>
                        <p className="truncate text-[12px] text-[#64748B]">
                          Planta, ausentismos, cursos y capacitaciones
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-[#047857] opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                      Abrir <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3.5 text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] px-2.5 py-1 font-semibold text-[#047857]">
                      <Lock className="h-3.5 w-3.5" />
                      Permiso propio
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EBF3FE] px-2.5 py-1 font-semibold text-[#1D4ED8]">
                      Guarda en base
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F3FF] px-2 py-1 font-semibold text-[#6D28D9]">
                    Datos protegidos
                  </span>
                </div>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
