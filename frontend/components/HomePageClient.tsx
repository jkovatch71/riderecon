"use client";

import { HomeBriefing } from "@/components/HomeBriefing";
import { YourTrailsPreview } from "@/components/YourTrailsPreview";
import { useTrails } from "@/hooks/useTrails";

function HomeLoadingState() {
  return (
    <main className="space-y-3">
      <section className="card p-6">
        <div className="min-h-[240px] animate-pulse rounded-2xl bg-zinc-900/40" />
      </section>

      <section className="card p-5">
        <div className="h-7 w-44 animate-pulse rounded bg-zinc-900/70" />
        <div className="mt-2 h-3 w-28 animate-pulse rounded bg-zinc-900/70" />
      </section>
    </main>
  );
}

export function HomePageClient() {
  const { trails, loading, error, reload } = useTrails();

  if (loading) {
    return <HomeLoadingState />;
  }

  if (error) {
    return (
      <main className="space-y-3">
        <section className="card p-6">
          <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            Trail feed unavailable
          </p>
          <p className="text-helper mt-2 text-zinc-400">{error}</p>
          <button type="button" className="btn-primary mt-4" onClick={reload}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-3">
      <section className="card p-6">
        <HomeBriefing trails={trails} />
      </section>

      <YourTrailsPreview trails={trails} />
    </main>
  );
}