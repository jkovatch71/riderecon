import { Suspense } from "react";
import { getTrails } from "@/lib/api";
import { TrailsPageClient } from "@/components/TrailsPageClient";

export const dynamic = "force-dynamic";

function TrailsPageFallback() {
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

export default async function TrailsPage() {
  const trails = await getTrails();

  return (
    <Suspense fallback={<TrailsPageFallback />}>
      <TrailsPageClient trails={trails} />
    </Suspense>
  );
}