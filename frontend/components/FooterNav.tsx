"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, LifeBuoy, Settings, BookOpen } from "lucide-react";
import clsx from "clsx";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/trails",
    label: "Trails",
    icon: Map,
  },
  {
    href: "/help",
    label: "Help",
    icon: LifeBuoy,
  },
  {
    href: "/preferences",
    label: "Preferences",
    icon: Settings,
  },

  // 🚧 Future feature (keep for later)
  /*
  {
    href: "/blog",
    label: "Blog",
    icon: BookOpen,
  },
  */
];

export function FooterNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

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