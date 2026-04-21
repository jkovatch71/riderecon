"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveLoginIdentifier } from "@/lib/api";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const email = identifier.trim().toLowerCase();
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
        const email = await resolveLoginIdentifier(identifier);

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
      const msg =
        err instanceof Error ? err.message : "Invalid username/email or password.";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setMessage(null);

    const email = identifier.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("Enter your email address first to reset your password.");
      return;
    }

    setSendingReset(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/login`,
      });

      if (error) throw error;

      setMessage(
        "If that email is eligible for password reset, check your inbox for the reset link."
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to send reset email.";
      setMessage(msg);
    } finally {
      setSendingReset(false);
    }
  }

  function handleModeToggle() {
    setMode(mode === "signin" ? "signup" : "signin");
    setIdentifier("");
    setPassword("");
    setMessage(null);
    setAccountCreated(false);
    setShowPassword(false);
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
            <label className="label">
              {mode === "signin" ? "Username or Email" : "Email"}
            </label>
            <input
              className="input"
              type={mode === "signin" ? "text" : "email"}
              placeholder={
                mode === "signin" ? "username or you@example.com" : "you@example.com"
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative mt-2">
              <input
                className="input pr-14"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 transition hover:text-zinc-200"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {mode === "signin" ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                  className="text-xs text-zinc-500 transition hover:text-emerald-300"
                >
                  {sendingReset ? "Sending reset..." : "Forgot password?"}
                </button>
              </div>
            ) : null}
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

          {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
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