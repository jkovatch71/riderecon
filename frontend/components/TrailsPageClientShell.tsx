"use client";

import { TrailsPageClient } from "@/components/TrailsPageClient";
import { useTrails } from "@/hooks/useTrails";

function TrailsLoadingState() {
  return (
    <div className="space-y-3">
      <div className="card p-1.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 rounded-lg bg-zinc-900/70" />
          <div className="h-10 rounded-lg bg-zinc-900/70" />
          <div className="h-10 rounded-lg bg-zinc-900/70" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card h-36 animate-pulse p-4" />
        <div className="card h-36 animate-pulse p-4" />
      </div>
    </div>
  );
}

export function TrailsPageClientShell() {
  const { trails, loading, error, reload } = useTrails();

  if (loading) {
    return <TrailsLoadingState />;
  }

  if (error) {
    return (
      <div className="card p-6">
        <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
          Trail feed unavailable
        </p>
        <p className="text-helper mt-2 text-zinc-400">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  return <TrailsPageClient trails={trails} />;
}