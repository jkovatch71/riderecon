"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ReportForm } from "@/components/ReportForm";

export function ReportAccess({
  trailId,
  trailName,
}: {
  trailId: string;
  trailName: string;
}) {
  const { user, profile, authLoading, profileLoading } = useAuth();

  if (authLoading || (user && profileLoading)) {
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

  if (!user) {
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

  if (!profile?.username) {
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
            Finish setting up your rider profile before submitting reports.
          </p>

          <Link
            href={`/auth/complete-profile?next=${encodeURIComponent(`/trails/${trailId}`)}`}
            className="btn-primary block text-center"
          >
            Complete profile
          </Link>
        </div>
      </section>
    );
  }

  return <ReportForm trailId={trailId} trailName={trailName} />;
}