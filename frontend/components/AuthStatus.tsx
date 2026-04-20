"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function initialsFor(username?: string | null) {
  const source = (username || "").trim();
  if (!source) return "";

  return source.slice(0, 2).toUpperCase();
}

export function AuthStatus() {
  const pathname = usePathname();
  const { user, profile, authLoading, profileLoading } = useAuth();

  const loginHref = `/auth/login?next=${encodeURIComponent(pathname || "/")}`;

  const initials = useMemo(() => {
    const profileInitials = initialsFor(profile?.username);

    if (profileInitials) {
      return profileInitials;
    }

    const emailPrefix = user?.email?.split("@")[0]?.trim() || "";
    return emailPrefix ? emailPrefix.slice(0, 2).toUpperCase() : "R";
  }, [profile?.username, user?.email]);

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)
          `,
          backgroundSize: "18px 18px",
        }}
      />

      <div
        aria-hidden="true"
        className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-emerald-400/80"
      />

      <div className="relative flex items-center justify-between pl-3">
        <div className="leading-tight">
          <p className="font-brand text-lg font-semibold uppercase text-emerald-300">
            RIDE RECON
          </p>
          <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Real-time decisions
          </p>
        </div>

        {authLoading || (user && profileLoading) ? (
          <div className="h-10 w-10 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950/80" />
        ) : user ? (
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-100 transition active:scale-95"
            aria-label="Profile"
            title="Profile"
          >
            {initials}
          </Link>
        ) : (
          <Link href={loginHref} className="btn-primary">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}