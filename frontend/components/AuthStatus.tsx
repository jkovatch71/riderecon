"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getMyProfile } from "@/lib/profiles";

type Profile = {
  username?: string | null;
  display_name?: string | null;
};

function initialsFor(displayName?: string | null, username?: string | null) {
  const source = (displayName || username || "").trim();
  if (!source) return "R";

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AuthStatus() {
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const nextSession = data.session ?? null;
      setSession(nextSession);

      if (nextSession?.user) {
        try {
          const nextProfile = await getMyProfile();
          if (mounted) {
            setProfile(nextProfile);
          }
        } catch {
          if (mounted) {
            setProfile(null);
          }
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession ?? null);

      if (nextSession?.user) {
        try {
          const nextProfile = await getMyProfile();
          if (mounted) {
            setProfile(nextProfile);
          }
        } catch {
          if (mounted) {
            setProfile(null);
          }
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginHref = `/auth/login?next=${encodeURIComponent(pathname || "/")}`;

  const initials = useMemo(() => {
    return initialsFor(profile?.display_name, profile?.username);
  }, [profile]);

  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
          RIDE RECON_
        </p>
      </div>

      {loading ? null : session ? (
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-100 transition hover:border-emerald-500"
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
  );
}