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

        setMessage("Account created. Check your email to verify your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user.id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.username) {
          router.push(nextPath);
        } else {
          router.push(`/auth/complete-profile?next=${encodeURIComponent(nextPath)}`);
        }

        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
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

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-emerald-300"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          <Link href={nextPath} className="text-zinc-400">
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}