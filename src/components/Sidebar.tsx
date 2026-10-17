"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  CalendarClock,
  Folder,
  Home,
  LayoutGrid,
  LineChart,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Target,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import { MODULOS, type Modulo } from "@/lib/modulos";
import { logoutAction } from "@/lib/procesos/actions";

const ANALYTICS_ITEMS = MODULOS.filter((m) => m.grupo === "Analytics");
const OPERACION_ORDER: Modulo[] = ["frecuencias", "venta_del_dia"];
const OPERACION_SLUGS = new Set<Modulo>(OPERACION_ORDER);

const NOMBRE_CORTO: Partial<Record<Modulo, string>> = {
  frecuencias: "Frecuencias",
  venta_del_dia: "Venta del Día",
  leads: "Clientes Potenciales",
  no_quirurgicos: "Ord. No Quirúrgicos",
  quirurgicos: "Ord. Quirúrgicos",
  redes_sociales: "Redes Sociales",
};

const SUBTITULO_MODULO: Partial<Record<Modulo, string>> = {
  frecuencias: "Producción y facturación",
  venta_del_dia: "Atención diaria y espera",
  leads: "Embudo general CRM",
  no_quirurgicos: "Exámenes y procedimientos",
  quirurgicos: "Conversión a cirugía",
  redes_sociales: "Pauta y alcance digital",
};

function IconoModulo({ slug, className }: { slug: Modulo; className?: string }) {
  switch (slug) {
    case "venta_del_dia": return <CalendarClock className={className} strokeWidth={1.75} />;
    case "frecuencias": return <LineChart className={className} strokeWidth={1.75} />;
    case "leads": return <Target className={className} strokeWidth={1.75} />;
    case "quirurgicos": return <Wallet className={className} strokeWidth={1.75} />;
    case "no_quirurgicos": return <Wallet className={className} strokeWidth={1.75} />;
    case "redes_sociales": return <Target className={className} strokeWidth={1.75} />;
    default: return <LayoutGrid className={className} strokeWidth={1.75} />;
  }
}

export function RielGlobal({
  modulos,
  isAdmin,
  onToggleBandeja,
}: {
  modulos: Modulo[];
  isAdmin: boolean;
  onToggleBandeja?: () => void;
}) {
  const allowed = new Set(modulos);
  const analyticsAllowed = ANALYTICS_ITEMS.filter((m) => allowed.has(m.slug));
  const procesosPermitido = allowed.has("procesos") || isAdmin;
  const proyectosPermitido = allowed.has("proyectos") || isAdmin;

  const pathname = usePathname();
  const enInicio = pathname === "/";
  const enProcesos = pathname === "/procesos" || pathname.startsWith("/procesos/");
  const enProyectos = pathname === "/proyectos" || pathname.startsWith("/proyectos/");
  const enUsuarios = pathname === "/usuarios" || pathname.startsWith("/usuarios/");
  const enPerfil = pathname === "/perfil" || pathname.startsWith("/perfil/");
  const enAnalytics = pathname === "/analytics" || analyticsAllowed.some((m) => pathname === m.href);

  const itemClass = (activo: boolean) =>
    `group relative flex w-[64px] flex-col items-center justify-center gap-1.5 rounded-[12px] py-2.5 transition-colors duration-150 ${
      activo ? "bg-gradient-to-b from-[#1E4282]/85 to-[#153163]/90 text-white font-medium border border-[#4B83E8]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_8px_rgba(14,36,94,0.25)]" : "text-white/75 hover:bg-white/[0.08] hover:text-white"
    }`;

  return (
    <aside style={{ backgroundImage: "linear-gradient(155deg, #091E42 0%, #091E42 36%, #102C60 54%, #081B3B 72%, #06132C 100%)" }} className="z-20 flex w-[78px] shrink-0 select-none flex-col items-center border-r border-white/10 bg-[#091E42] py-3.5 text-white shadow-[2px_0_12px_rgba(6,19,44,0.18)]">
      <Link href="/" className="mb-3 flex flex-col items-center justify-center px-1 text-center transition opacity-95 hover:opacity-100" title="Centro Oftalmológico Ebenezer">
        <Image src="/brand/logo/logo-claro.png" alt="Ebenezer" width={48} height={48} className="h-11 w-11 object-contain" priority />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        <Link href="/" className={itemClass(enInicio)} title="Inicio">
          {enInicio && <span className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-[#38BDF8]" />}
          <Home className="h-[19px] w-[19px]" strokeWidth={1.75} />
          <span className="text-[10.5px] leading-none tracking-tight">Inicio</span>
        </Link>

        {(analyticsAllowed.length > 0 || isAdmin) && (
          <Link
            href="/analytics"
            onClick={(e) => { if (enAnalytics && onToggleBandeja) { e.preventDefault(); onToggleBandeja(); } }}
            className={itemClass(enAnalytics)}
            title="Analytics"
          >
            {enAnalytics && <span className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-[#38BDF8]" />}
            <BarChart2 className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-[10.5px] leading-none tracking-tight">Analytics</span>
          </Link>
        )}

        {procesosPermitido && (
          <Link href="/procesos" className={itemClass(enProcesos)} title="Procesos">
            {enProcesos && <span className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-[#38BDF8]" />}
            <Settings className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-[10.5px] leading-none tracking-tight">Procesos</span>
          </Link>
        )}

        {proyectosPermitido && (
          <Link href="/proyectos" className={itemClass(enProyectos)} title="Proyectos">
            {enProyectos && <span className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-[#38BDF8]" />}
            <Folder className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-[10.5px] leading-none tracking-tight">Proyectos</span>
          </Link>
        )}

        <div className="my-1.5 h-px w-9 bg-white/12" />

        {isAdmin && (
          <Link href="/usuarios" className={itemClass(enUsuarios)} title="Usuarios">
            {enUsuarios && <span className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-[#38BDF8]" />}
            <Users className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-[10.5px] leading-none tracking-tight">Usuarios</span>
          </Link>
        )}

        <Link href="/perfil" className={itemClass(enPerfil)} title="Perfil">
          {enPerfil && <span className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-[#38BDF8]" />}
          <UserCircle className="h-[19px] w-[19px]" strokeWidth={1.75} />
          <span className="text-[10.5px] leading-none tracking-tight">Perfil</span>
        </Link>
      </nav>

      <div className="mt-auto pt-2">
        <form action={logoutAction}>
          <button type="submit" title="Cerrar sesión" className="flex w-[64px] flex-col items-center justify-center gap-1.5 rounded-[12px] py-2 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-[10.5px] leading-none tracking-tight">Salir</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

export function Sidebar({ modulos, isAdmin }: { modulos: Modulo[]; isAdmin: boolean }) {
  const allowed = new Set(modulos);
  const analyticsAllowed = ANALYTICS_ITEMS.filter((m) => allowed.has(m.slug) || isAdmin);
  const procesosPermitido = allowed.has("procesos") || isAdmin;
  const proyectosPermitido = allowed.has("proyectos") || isAdmin;

  const pathname = usePathname();
  const [abierto, setAbierto] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    try {
      if (window.localStorage.getItem("eb_bandeja_abierta") === "0") setAbierto(false);
    } catch {}
  }, []);

  const alternar = () => {
    setAbierto((prev) => {
      const sig = !prev;
      try { window.localStorage.setItem("eb_bandeja_abierta", sig ? "1" : "0"); } catch {}
      return sig;
    });
  };

  const enInicio = pathname === "/";
  const enUsuarios = pathname === "/usuarios" || pathname.startsWith("/usuarios/");
  const enPerfil = pathname === "/perfil" || pathname.startsWith("/perfil/");

  const tituloBandeja = enInicio
    ? "Inicio · Ebenezer"
    : enUsuarios
      ? "Usuarios y Accesos"
      : enPerfil
        ? "Mi Perfil"
        : "Tableros y Vistas";

  const placeholderBusqueda = enInicio
    ? "Buscar módulo o vista..."
    : enUsuarios || enPerfil
      ? "Filtrar opción..."
      : "Filtrar tablero...";

  const q = busqueda.trim().toLowerCase();
  const filtrados = analyticsAllowed.filter((m) => {
    if (!q) return true;
    const corto = (NOMBRE_CORTO[m.slug] ?? m.label).toLowerCase();
    const sub = (SUBTITULO_MODULO[m.slug] ?? "").toLowerCase();
    return m.label.toLowerCase().includes(q) || corto.includes(q) || sub.includes(q);
  });

  const operacion = OPERACION_ORDER.map((slug) => filtrados.find((m) => m.slug === slug)).filter(
    (m): m is NonNullable<typeof m> => Boolean(m)
  );
  const comercial = filtrados.filter((m) => !OPERACION_SLUGS.has(m.slug));
  const pill = (activo: boolean) =>
    `group flex items-center gap-2.5 rounded-[10px] px-3 py-2 transition ${
      activo ? "border-l-[3px] border-l-[#2563EB] bg-[#E6F0FD] font-semibold text-[#0E245E] shadow-[0_1px_3px_rgba(37,99,235,0.06)]" : "border-l-[3px] border-l-transparent text-[#334155] hover:bg-[#F3F7FD] hover:text-[#0E245E] hover:translate-x-0.5"
    }`;
  const iconCls = (activo: boolean) =>
    `h-4 w-4 shrink-0 ${activo ? "text-[#1D58D8]" : "text-[#64748B] group-hover:text-[#0E245E]"}`;

  return (
    <div className="relative flex h-full shrink-0">
      <RielGlobal modulos={modulos} isAdmin={isAdmin} onToggleBandeja={alternar} />

      <aside className={`hidden h-full shrink-0 flex-col border-r border-[#E6ECF5] bg-gradient-to-b from-[#F3F8FE] via-white to-white shadow-[4px_0_16px_rgba(14,36,94,0.03)] transition-all duration-200 ease-eb-out md:flex ${abierto ? "w-[236px]" : "w-0 overflow-hidden border-r-0"}`}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
          <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#0E245E]">{tituloBandeja}</p>
          <button type="button" onClick={alternar} title="Contraer bandeja lateral" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#DCE4F0] bg-white text-[#475569] transition hover:border-[#94A3B8] hover:text-[#0E245E]">
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-3.5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" strokeWidth={2} />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={placeholderBusqueda} className="w-full rounded-[9px] border border-[#E6ECF5] bg-[#F7F9FC] py-1.5 pl-8 pr-3 text-[12px] text-[#0E245E] placeholder:text-[#94A3B8] transition focus:border-[#2563EB] focus:bg-white focus:outline-none" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {enInicio ? (
            <>
              <div className="mb-4">
                <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Portada Principal</div>
                <Link href="/" className={pill(true)}>
                  <Home className={iconCls(true)} strokeWidth={1.85} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight">Portada de Inicio</p>
                    <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Resumen general del centro</p>
                  </div>
                </Link>
              </div>
              <div className="mb-4">
                <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Módulos de Plataforma</div>
                <div className="flex flex-col gap-1">
                  <Link href="/analytics" className={pill(false)}>
                    <BarChart2 className={iconCls(false)} strokeWidth={1.85} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] leading-tight">Resumen Analytics</p>
                      <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">6 tableros e indicadores</p>
                    </div>
                  </Link>
                  {procesosPermitido && (
                    <Link href="/procesos" className={pill(false)}>
                      <Settings className={iconCls(false)} strokeWidth={1.85} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] leading-tight">Procesos y Áreas</p>
                        <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">13 áreas y cadena de valor</p>
                      </div>
                    </Link>
                  )}
                  {proyectosPermitido && (
                    <Link href="/proyectos" className={pill(false)}>
                      <Folder className={iconCls(false)} strokeWidth={1.85} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] leading-tight">Proyectos</p>
                        <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Espacios, listas y Kanban</p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
              {operacion.length > 0 && (
                <div>
                  <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Accesos Directos</div>
                  <div className="flex flex-col gap-1">
                    {operacion.map((item) => (
                      <Link key={item.slug} href={item.href} className={pill(false)}>
                        <IconoModulo slug={item.slug} className={iconCls(false)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] leading-tight">{NOMBRE_CORTO[item.slug] ?? item.label}</p>
                          <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">{SUBTITULO_MODULO[item.slug]}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : enUsuarios ? (
            <>
              <div className="mb-4">
                <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Administración</div>
                <div className="flex flex-col gap-1">
                  <Link href="/usuarios" className={pill(true)}>
                    <Users className={iconCls(true)} strokeWidth={1.85} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] leading-tight">Directorio de Usuarios</p>
                      <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Miembros, roles y permisos</p>
                    </div>
                  </Link>
                  <Link href="/perfil" className={pill(false)}>
                    <UserCircle className={iconCls(false)} strokeWidth={1.85} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] leading-tight">Mi Perfil</p>
                      <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Datos de cuenta y clave</p>
                    </div>
                  </Link>
                </div>
              </div>
            </>
          ) : enPerfil ? (
            <>
              <div className="mb-4">
                <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Configuración Personal</div>
                <div className="flex flex-col gap-1">
                  <Link href="/perfil" className={pill(true)}>
                    <UserCircle className={iconCls(true)} strokeWidth={1.85} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] leading-tight">Datos y Seguridad</p>
                      <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Tu cuenta y contraseña</p>
                    </div>
                  </Link>
                  {isAdmin && (
                    <Link href="/usuarios" className={pill(false)}>
                      <ShieldCheck className={iconCls(false)} strokeWidth={1.85} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] leading-tight">Usuarios y Accesos</p>
                        <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Gestión de permisos</p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {!q && (
                <div className="mb-4">
                  <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Vista General</div>
                  <Link href="/analytics" className={pill(pathname === "/analytics")}>
                    <LayoutGrid className={iconCls(pathname === "/analytics")} strokeWidth={1.85} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] leading-tight">Resumen Analytics</p>
                      <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">Consolidado de indicadores</p>
                    </div>
                  </Link>
                </div>
              )}
              {operacion.length > 0 && (
                <div className="mb-4">
                  <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Operación Clínica</div>
                  <div className="flex flex-col gap-1">
                    {operacion.map((item) => {
                      const activo = pathname === item.href;
                      return (
                        <Link key={item.slug} href={item.href} className={pill(activo)}>
                          <IconoModulo slug={item.slug} className={iconCls(activo)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] leading-tight">{NOMBRE_CORTO[item.slug] ?? item.label}</p>
                            {SUBTITULO_MODULO[item.slug] && <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">{SUBTITULO_MODULO[item.slug]}</p>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {comercial.length > 0 && (
                <div>
                  <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8E9BB0]">Embudo Comercial</div>
                  <div className="flex flex-col gap-1">
                    {comercial.map((item) => {
                      const activo = pathname === item.href;
                      return (
                        <Link key={item.slug} href={item.href} className={pill(activo)}>
                          <IconoModulo slug={item.slug} className={iconCls(activo)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] leading-tight">{NOMBRE_CORTO[item.slug] ?? item.label}</p>
                            {SUBTITULO_MODULO[item.slug] && <p className="mt-0.5 truncate text-[11px] font-normal text-[#64748B]">{SUBTITULO_MODULO[item.slug]}</p>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </nav>
      </aside>

      {!abierto && (
        <button type="button" onClick={alternar} title="Mostrar bandeja lateral" className="hidden md:flex absolute left-[86px] top-3.5 z-20 items-center gap-1.5 rounded-[8px] border border-[#DCE4F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0E245E] shadow-sm transition hover:bg-[#F8FAFC]">
          <PanelLeftOpen className="h-3.5 w-3.5 text-[#1D58D8]" strokeWidth={1.75} />
          <span>Menú</span>
        </button>
      )}
    </div>
  );
}