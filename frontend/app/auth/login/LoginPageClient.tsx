"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${baseUrl}/auth/login`,
          },
        });

        if (error) throw error;

        setAccountCreated(true);
        setMessage(
          "If that account can receive a verification email, check your inbox and then sign in."
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const userId = data.user?.id;

        if (!userId) {
          throw new Error("Unable to load your account.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profile?.username) {
          router.replace(
            `/auth/complete-profile?next=${encodeURIComponent(nextPath)}`
          );
          router.refresh();
          return;
        }

        router.replace(nextPath);
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleModeToggle() {
    setMode(mode === "signin" ? "signup" : "signin");
    setMessage(null);
    setAccountCreated(false);
  }

  return (
    <main className="mx-auto max-w-md space-y-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Guests can browse. Signed-in riders can submit reports and interact later as we expand features.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className={`w-full ${
              accountCreated
                ? "cursor-not-allowed rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-400"
                : "btn-primary"
            }`}
            disabled={submitting || accountCreated}
          >
            {accountCreated
              ? "Account created"
              : submitting
              ? "Working..."
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>

          {message ? (
            <p className="text-sm text-zinc-400">{message}</p>
          ) : null}
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-zinc-400"
            onClick={handleModeToggle}
          >
            {mode === "signin" ? (
              <span>
                Need an account? <span className="text-emerald-300">Sign up</span>
              </span>
            ) : (
              <span>
                Already have an account? <span className="text-emerald-300">Sign in</span>
              </span>
            )}
          </button>

          <Link href={nextPath} className="text-zinc-400">
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}