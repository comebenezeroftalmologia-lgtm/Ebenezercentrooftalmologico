"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/leads", label: "Generación de Clientes Potenciales" },
  { href: "/no-quirurgicos", label: "Ordenamientos No Quirúrgicos" },
  { href: "/quirurgicos", label: "Ordenamientos Quirúrgicos" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 bg-navy-deep text-white">
      <div className="border-b border-white/10 p-6">
        <p className="font-heading text-lg font-semibold">Ebenezer</p>
        <p className="text-sm text-mint-cyan">Tableros comerciales</p>
      </div>
      <nav className="p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-3 text-sm transition-colors ${
                active
                  ? "bg-blue-electric text-white"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
