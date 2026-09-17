"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardCheck, Home, Users, LogOut, UserCircle } from "lucide-react";
import type { AppUser } from "@/lib/procesos/types";
import { logoutAction } from "@/lib/procesos/actions";

export function ProcesosNav({ user }: { user: AppUser }) {
  const pathname = usePathname();

  const items = [
    { href: "/procesos", label: "Inicio", icon: Home },
    { href: "/procesos/areas", label: "Áreas", icon: Building2 },
    { href: "/procesos/mis-tareas", label: "Mis Tareas", icon: ClipboardCheck },
    ...(user.isAdmin ? [{ href: "/procesos/usuarios", label: "Usuarios", icon: Users }] : []),
  ];

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-navy p-5 text-white">
      <div className="mb-6 flex items-center gap-3">
        <Image
          src="/brand/logo/logo-claro.png"
          alt="Ebenezer"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <div>
          <p className="text-sm font-semibold">Procesos</p>
          <p className="text-[11px] text-white/60">Ebenezer</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ease-eb-out ${
                active ? "bg-aqua text-navy font-semibold" : "text-white/80 hover:bg-navy-90"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="truncate text-xs font-medium text-white/90">{user.nombreCompleto}</p>
        <p className="text-[11px] text-white/50">{user.isAdmin ? "Administrador" : "Usuario"}</p>
        <Link
          href="/perfil"
          className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-white/70 transition-colors duration-150 ease-eb-out hover:bg-navy-90 hover:text-white"
        >
          <UserCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
          Mi perfil
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-white/70 transition-colors duration-150 ease-eb-out hover:bg-navy-90 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
