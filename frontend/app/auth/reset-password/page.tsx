import { Suspense } from "react";
import ResetPasswordPageClient from "./ResetPasswordPageClient";

function ResetPasswordFallback() {
  return (
    <main className="mx-auto max-w-md space-y-3 pb-28">
      <section className="card p-6">
        <p className="text-helper text-zinc-400">Loading reset flow...</p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordPageClient />
    </Suspense>
  );
}