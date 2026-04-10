import { Suspense } from "react";
import CompleteProfilePageClient from "./CompleteProfilePageClient";

function CompleteProfileFallback() {
  return (
    <main className="mx-auto max-w-md py-10">
      <div className="card p-6">
        <p className="text-sm text-zinc-400">Loading profile setup...</p>
      </div>
    </main>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<CompleteProfileFallback />}>
      <CompleteProfilePageClient />
    </Suspense>
  );
}