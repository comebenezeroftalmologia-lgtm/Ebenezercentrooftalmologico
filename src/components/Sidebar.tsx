"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  FolderKanban,
  Home,
  KanbanSquare,
  LayoutGrid,
  LineChart,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
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
    case "venta_del_dia":
      return <CalendarClock className={className} strokeWidth={1.75} />;
    case "frecuencias":
      return <LineChart className={className} strokeWidth={1.75} />;
    case "leads":
      return <Target className={className} strokeWidth={1.75} />;
    case "quirurgicos":
      return <Wallet className={className} strokeWidth={1.75} />;
    case "no_quirurgicos":
      return <LineChart className={className} strokeWidth={1.75} />;
    case "redes_sociales":
      return <Target className={className} strokeWidth={1.75} />;
    default:
      return <LayoutGrid className={className} strokeWidth={1.75} />;
  }
}

/**
 * Columna 1 estilo Clientify: Riel global oscuro siempre visible a la izquierda
 * en toda la plataforma (Inicio, Analytics, Procesos, Proyectos, Usuarios, Perfil).
 */
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
  const enAnalytics =
    pathname === "/analytics" || analyticsAllowed.some((m) => pathname === m.href);

  const itemClass = (activo: boolean) =>
    `group relative flex w-[62px] flex-col items-center justify-center gap-1 rounded-[10px] py-2 transition-colors duration-150 ease-eb-out ${
      activo
        ? "bg-aqua/15 text-aqua font-semibold"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="z-20 flex w-[76px] shrink-0 select-none flex-col items-center bg-navy py-4 text-white">
      <Link
        href="/"
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
        title="Centro Oftalmológico Ebenezer"
      >
        <Image
          src="/brand/logo/logo-claro.png"
          alt="Ebenezer"
          width={44}
          height={44}
          className="h-10 w-10 object-contain"
          priority
        />
      </Link>

      <div className="mb-3 h-px w-8 bg-white/12" />

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        <Link href="/" className={itemClass(enInicio)} title="Inicio">
          {enInicio && (
            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-aqua" />
          )}
          <Home className="h-[19px] w-[19px]" strokeWidth={1.75} />
          <span className="text-[10px] leading-none tracking-tight">Inicio</span>
        </Link>

        {(analyticsAllowed.length > 0 || isAdmin) && (
          <Link
            href="/analytics"
            onClick={(e) => {
              if (enAnalytics && onToggleBandeja) {
                e.preventDefault();
                onToggleBandeja();
              }
            }}
            className={itemClass(enAnalytics)}
            title="Analytics y Tableros"
          >
            {enAnalytics && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-aqua" />
            )}
            <LayoutGrid className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-[10px] leading-none tracking-tight">Analytics</span>
          </Link>
        )}

        {procesosPermitido && (
          <Link href="/procesos" className={itemClass(enProcesos)} title="Procesos y Áreas">
            {enProcesos && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-aqua" />
            )}
            <FolderKanban className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-[10px] leading-none tracking-tight">Procesos</span>
          </Link>
        )}

        {proyectosPermitido && (
          <Link href="/proyectos" className={itemClass(enProyectos)} title="Proyectos">
            {enProyectos && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-aqua" />
            )}
            <KanbanSquare className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-[10px] leading-none tracking-tight">Proyectos</span>
          </Link>
        )}
      </nav>

      <div className="mt-2 flex flex-col items-center gap-1.5 border-t border-white/10 pt-3">
        {isAdmin && (
          <Link href="/usuarios" className={itemClass(enUsuarios)} title="Usuarios y Permisos">
            {enUsuarios && (
              <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-aqua" />
            )}
            <Users className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-[10px] leading-none tracking-tight">Usuarios</span>
          </Link>
        )}

        <Link href="/perfil" className={itemClass(enPerfil)} title="Mi perfil">
          {enPerfil && (
            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-aqua" />
          )}
          <UserCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <span className="text-[10px] leading-none tracking-tight">Perfil</span>
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex w-[62px] flex-col items-center justify-center gap-1 rounded-[10px] py-2 text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-[10px] leading-none tracking-tight">Salir</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

/**
 * Navegación acoplada de 2 columnas:
 * - Columna 1: RielGlobal fijo en azul oscuro (Inicio, Analytics, Procesos, Proyectos).
 * - Columna 2: Bandeja lateral contextual de Analytics (sin repetir Inicio, Procesos ni Proyectos,
 *   eliminando el scroll vertical innecesario).
 */
export function Sidebar({ modulos, isAdmin }: { modulos: Modulo[]; isAdmin: boolean }) {
  const allowed = new Set(modulos);
  const analyticsAllowed = ANALYTICS_ITEMS.filter((m) => allowed.has(m.slug) || isAdmin);

  const pathname = usePathname();
  const [abierto, setAbierto] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem("eb_bandeja_abierta");
      if (guardado === "0") setAbierto(false);
    } catch {
      /* sin acceso a localStorage */
    }
  }, []);

  const alternar = () => {
    setAbierto((prev) => {
      const sig = !prev;
      try {
        window.localStorage.setItem("eb_bandeja_abierta", sig ? "1" : "0");
      } catch {
        /* ignorar */
      }
      return sig;
    });
  };

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

  return (
    <div className="relative flex h-full shrink-0">
      <RielGlobal modulos={modulos} isAdmin={isAdmin} onToggleBandeja={alternar} />

      {/* Columna 2: Bandeja lateral acoplada para Tableros y Vistas */}
      <aside
        className={`hidden h-full shrink-0 flex-col border-r border-[#E7E9F2] bg-[#F8FAFC] transition-all duration-200 ease-eb-out md:flex ${
          abierto ? "w-[224px]" : "w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-[#E7E9F2] bg-white px-3.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-navy">
              Tableros y Vistas
            </p>
          </div>
          <button
            type="button"
            onClick={alternar}
            title="Contraer bandeja lateral"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#E7E9F2] bg-white text-ink-3 transition hover:border-navy-20 hover:text-navy"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="border-b border-[#E7E9F2] bg-white px-3 py-2.5">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar tablero..."
            className="w-full rounded-[8px] border border-[#E1E4EC] bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 transition focus:border-blue focus:bg-white focus:outline-none"
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {!q && (
            <div className="mb-3.5">
              <div className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
                Vista General
              </div>
              <Link
                href="/analytics"
                className={`group relative flex items-center justify-between overflow-hidden rounded-[10px] px-2.5 py-2 text-[12.5px] transition ${
                  pathname === "/analytics"
                    ? "border border-[#DDE3F4] bg-white font-semibold text-navy shadow-eb-1"
                    : "text-ink-2 hover:bg-white/80 hover:text-navy"
                }`}
              >
                {pathname === "/analytics" && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue" />
                )}
                <span className="flex items-center gap-2.5 truncate">
                  <LayoutGrid
                    className={`h-4 w-4 shrink-0 ${
                      pathname === "/analytics" ? "text-blue" : "text-ink-3 group-hover:text-navy"
                    }`}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">Resumen Analytics</span>
                </span>
              </Link>
            </div>
          )}

          {operacion.length > 0 && (
            <div className="mb-3.5">
              <div className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
                Operación Clínica
              </div>
              <div className="flex flex-col gap-1">
                {operacion.map((item) => {
                  const activo = pathname === item.href;
                  return (
                    <Link
                      key={item.slug}
                      href={item.href}
                      className={`group relative flex items-center gap-2.5 overflow-hidden rounded-[10px] px-2.5 py-2 transition ${
                        activo
                          ? "border border-[#DDE3F4] bg-white font-semibold text-navy shadow-eb-1"
                          : "text-ink-2 hover:bg-white/80 hover:text-navy"
                      }`}
                    >
                      {activo && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue" />
                      )}
                      <IconoModulo
                        slug={item.slug}
                        className={`h-4 w-4 shrink-0 ${
                          activo ? "text-blue" : "text-ink-3 group-hover:text-navy"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] leading-tight">
                          {NOMBRE_CORTO[item.slug] ?? item.label}
                        </p>
                        {SUBTITULO_MODULO[item.slug] && (
                          <p className="truncate text-[10.5px] font-normal text-ink-3">
                            {SUBTITULO_MODULO[item.slug]}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {comercial.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#949BB4]">
                Embudo Comercial
              </div>
              <div className="flex flex-col gap-1">
                {comercial.map((item) => {
                  const activo = pathname === item.href;
                  return (
                    <Link
                      key={item.slug}
                      href={item.href}
                      className={`group relative flex items-center gap-2.5 overflow-hidden rounded-[10px] px-2.5 py-2 transition ${
                        activo
                          ? "border border-[#DDE3F4] bg-white font-semibold text-navy shadow-eb-1"
                          : "text-ink-2 hover:bg-white/80 hover:text-navy"
                      }`}
                    >
                      {activo && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue" />
                      )}
                      <IconoModulo
                        slug={item.slug}
                        className={`h-4 w-4 shrink-0 ${
                          activo ? "text-blue" : "text-ink-3 group-hover:text-navy"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] leading-tight">
                          {NOMBRE_CORTO[item.slug] ?? item.label}
                        </p>
                        {SUBTITULO_MODULO[item.slug] && (
                          <p className="truncate text-[10.5px] font-normal text-ink-3">
                            {SUBTITULO_MODULO[item.slug]}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Botón flotante discreto para volver a desplegar la bandeja cuando está contraída */}
      {!abierto && (
        <button
          type="button"
          onClick={alternar}
          title="Mostrar bandeja lateral"
          className="hidden md:flex absolute left-[84px] top-3 z-20 items-center gap-1.5 rounded-[8px] border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-navy shadow-sm transition hover:border-navy-20 hover:bg-[#F8FAFC]"
        >
          <PanelLeftOpen className="h-3.5 w-3.5 text-blue" strokeWidth={1.75} />
          <span>Menú</span>
        </button>
      )}
    </div>
  );
}