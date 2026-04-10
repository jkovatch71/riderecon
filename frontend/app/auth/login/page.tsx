import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

function LoginPageFallback() {
  return (
    <main className="mx-auto max-w-md space-y-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">Loading...</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}