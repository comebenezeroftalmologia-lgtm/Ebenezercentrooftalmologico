"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Home,
  Target,
  Stethoscope,
  Scissors,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  {
    href: "/leads",
    label: "Generación de Clientes Potenciales",
    icon: Target,
  },
  {
    href: "/no-quirurgicos",
    label: "Ordenamientos No Quirúrgicos",
    icon: Stethoscope,
  },
  {
    href: "/quirurgicos",
    label: "Ordenamientos Quirúrgicos",
    icon: Scissors,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={panelRef} className="relative flex shrink-0">
      {/* Riel de íconos, siempre visible */}
      <aside className="flex w-[72px] shrink-0 flex-col items-center bg-navy py-4">
        <Link href="/" className="mb-4 flex h-10 w-10 items-center justify-center">
          <Image
            src="/brand/logo/logo-claro.png"
            alt="Ebenezer"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Ver módulos"
          className={`mb-3 flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
            open ? "bg-aqua text-navy" : "text-aqua hover:bg-navy-90"
          }`}
        >
          <LayoutGrid className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="mb-2 h-px w-8 bg-white/10" />

        <nav className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className={`flex h-11 w-11 items-center justify-center rounded-pill transition-colors duration-150 ease-eb-out ${
                  active
                    ? "bg-aqua text-navy"
                    : "text-white/80 hover:bg-navy-90 hover:text-aqua"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Panel flotante de módulos */}
      {open && (
        <div className="absolute left-[72px] top-4 z-30 w-80 rounded-xl border border-line bg-white p-3 shadow-eb-4">
          <p className="eb-label px-3 pb-2 pt-1 text-[12px] text-blue">
            Módulos
          </p>
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ease-eb-out ${
                    active
                      ? "bg-aqua-50 font-semibold text-navy"
                      : "text-ink-2 hover:bg-aqua-20"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ${
                      active ? "bg-aqua text-navy" : "bg-aqua-20 text-navy"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
