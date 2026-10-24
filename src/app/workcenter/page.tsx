import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calculator,
  CheckCircle2,
  Cloud,
  ShieldCheck,
} from "lucide-react";
import { ExecutiveHeader } from "@/components/ExecutiveHeader";
import { requireModuloAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkCenterPage() {
  const user = await requireModuloAccess("proyectos");
  const nombre = user.nombreCompleto.split(" ")[0] ?? user.nombreCompleto;

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC]">
      <div className="mx-auto max-w-[1360px] space-y-6 px-6 pb-24 pt-6">
        <ExecutiveHeader
          overline="WORKCENTER · APLICATIVOS Y ARCHIVOS OPERATIVOS"
          title={`WorkCenter — Hola, ${nombre}`}
          subtitle="Centro unificado de aplicativos interactivos, liquidadores médicos y herramientas operativas conectadas en tiempo real."
          variant="proyectos"
        />

        {/* KPIs de WorkCenter */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Herramientas Activas
              </p>
              <p className="mt-2 font-display text-[30px] font-bold leading-none text-[#0F172A]">
                1
              </p>
              <span className="mt-2.5 inline-flex items-center rounded-md bg-[#EBF3FE] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                Liquidador de Honorarios
              </span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#2563EB]">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Autenticación SSO
              </p>
              <p className="mt-2 font-display text-[22px] font-bold leading-none text-[#0F172A]">
                Ingreso Directo
              </p>
              <span className="mt-2.5 inline-flex items-center rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                Sesión activa: {user.nombreCompleto}
              </span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-start justify-between rounded-[16px] border border-[#E6EEF8] bg-white p-5 shadow-[0_2px_12px_rgba(14,36,94,0.04)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Sincronización en Nube
              </p>
              <p className="mt-2 font-display text-[22px] font-bold leading-none text-[#0F172A]">
                100 % Conectado
              </p>
              <span className="mt-2.5 inline-flex items-center rounded-md bg-[#F5F3FF] px-2 py-0.5 text-[11px] font-semibold text-[#6D28D9]">
                Tarifarios 2026 y actas en vivo
              </span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#7C3AED]">
              <Cloud className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Catálogo de Herramientas Activas */}
        <section aria-label="Herramientas Activas" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6EEF8] pb-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EBF3FE] text-[12px] font-extrabold text-[#1D4ED8]">
                01
              </span>
              <div>
                <h2 className="font-display text-[17px] font-bold tracking-tight text-[#0F172A]">
                  Herramientas Activas en WorkCenter
                </h2>
                <p className="text-[12px] text-[#64748B]">
                  Haz clic en la herramienta para abrirla y trabajar directamente sin volver a iniciar sesión
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#C9DDFB] bg-[#EBF3FE] px-3 py-1 text-[11px] font-semibold text-[#1D4ED8]">
              1 aplicativo activo
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <Calculator className="h-5 w-5" />
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
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ingreso directo
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#EBF3FE] px-2.5 py-1 font-semibold text-[#1D4ED8]">
                    7 Aseguradoras 2026
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F3FF] px-2 py-1 font-semibold text-[#6D28D9]">
                  Nube conectada
                </span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
