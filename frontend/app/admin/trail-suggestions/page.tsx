import { Suspense } from "react";
import { TrailSuggestionsAdminClient } from "./TrailSuggestionsAdminClient";

function Fallback() {
  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <p className="text-helper text-zinc-400">Loading trail suggestions...</p>
      </section>
    </main>
  );
}

export default function TrailSuggestionsAdminPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <TrailSuggestionsAdminClient />
    </Suspense>
  );
}