"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/hotspots", label: "Hotspot Map" },
  { href: "/forecast", label: "AQI Forecast" },
  { href: "/sources", label: "Source Attribution" },
  { href: "/actions", label: "Action Center" },
  { href: "/advisory", label: "Citizen Advisory" },
  { href: "/reports", label: "Reports" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
            UA
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">UrbanAir IQ</span>
        </Link>
        <nav className="min-w-0 flex-1 overflow-x-auto" aria-label="Primary navigation">
          <ul className="flex min-w-max items-center gap-1">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
