"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, List, Map, LifeBuoy, Settings } from "lucide-react";
import clsx from "clsx";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    match: "home",
  },
  {
    href: "/trails?view=list",
    label: "Trails",
    icon: List,
    match: "trails",
  },
  {
    href: "/trails?view=map",
    label: "Map",
    icon: Map,
    match: "map",
  },
  {
    href: "/help",
    label: "Help",
    icon: LifeBuoy,
    match: "help",
  },
  {
    href: "/preferences",
    label: "Preferences",
    icon: Settings,
    match: "preferences",
  },
] as const;

function FooterNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trailView = searchParams.get("view");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.match === "home"
              ? pathname === "/"
              : item.match === "trails"
                ? pathname === "/trails" && trailView !== "map"
                : item.match === "map"
                  ? pathname === "/trails" && trailView === "map"
                  : pathname.startsWith(`/${item.match}`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium transition",
                isActive
                  ? "text-emerald-300"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={clsx(
                  "h-5 w-5 transition",
                  isActive ? "scale-110" : "scale-100"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function FooterNav() {
  return (
    <Suspense
      fallback={
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      }
    >
      <FooterNavContent />
    </Suspense>
  );
}