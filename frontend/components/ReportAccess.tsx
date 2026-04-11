"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ReportForm } from "@/components/ReportForm";

export function ReportAccess({
  trailId,
  trailName,
}: {
  trailId: string;
  trailName: string;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <section className="card p-5">
        <div>
          <h3 className="text-xl font-semibold">Report Trail Conditions</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Nearest trail confirmed as {trailName}
          </p>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        <p className="text-sm text-zinc-400">Checking sign-in status...</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="card p-5">
        <div>
          <h3 className="text-xl font-semibold">Report Trail Conditions</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Nearest trail confirmed as {trailName}
          </p>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Guests can browse trail conditions, but only signed-in riders can
            submit reports.
          </p>

          <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-300">
            Sign in to report or confirm current conditions for{" "}
            <span className="font-medium text-zinc-100">{trailName}</span>.
          </div>

          <Link
            href={`/auth/login?next=/trails/${trailId}`}
            className="btn-primary block text-center"
          >
            Sign in to report
          </Link>
        </div>
      </section>
    );
  }

  return <ReportForm trailId={trailId} trailName={trailName} />;
}