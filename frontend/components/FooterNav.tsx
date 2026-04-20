"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Map,
  Settings,
  NotebookPen,
} from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/trails", label: "Trails", icon: Map },
  { href: "/preferences", label: "Preferences", icon: Settings },
  { href: "/blog", label: "Blog", icon: NotebookPen },
];

export function FooterNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-4">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center px-2 py-2 text-xs transition ${
                active
                  ? "text-emerald-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={active ? "mt-1 font-semibold" : "mt-1"}>
                {item.label}
              </span>
              <div
                className={`mt-1 h-1 w-6 rounded-xl transition ${
                  active ? "bg-emerald-300" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}