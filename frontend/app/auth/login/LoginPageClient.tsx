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
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const canSubmit =
    identifier.trim().length > 0 && password.trim().length >= 6 && !submitting;

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setIdentifier("");
    setPassword("");
    setMessage(null);
    setSignupSuccess(false);
    setShowPassword(false);
  }

  function handleModeToggle() {
    switchMode(mode === "signin" ? "signup" : "signin");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submitting || signupSuccess) return;

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

        setSignupSuccess(true);
        setMessage(null);
        return;
      }

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
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid username/email or password.";
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
        redirectTo: `${baseUrl}/auth/reset-password`,
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

  const identifierPlaceholder =
    mode === "signin" ? "Username or email" : "Email address";

  return (
    <main className="mx-auto -mt-0 max-w-md space-y-3 pb-28">
      <div className="card p-6">
        <div className="space-y-1">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Reports | Favorites | Rider Tools
          </p>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        <p className="text-helper text-zinc-400">
          Guests can browse trail conditions. Signed-in riders can submit
          reports, favorite trails, and use rider tools.
        </p>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <input
            aria-label={mode === "signin" ? "Username or email" : "Email"}
            className="input"
            type={mode === "signin" ? "text" : "email"}
            placeholder={identifierPlaceholder}
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (signupSuccess) setSignupSuccess(false);
            }}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={signupSuccess}
          />

          <div className="relative">
            <input
              aria-label="Password"
              className="input pr-14"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (signupSuccess) setSignupSuccess(false);
              }}
              required
              minLength={6}
              disabled={signupSuccess}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 transition hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={signupSuccess}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {mode === "signin" ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={sendingReset}
                className="text-xs text-zinc-500 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingReset ? "Sending reset..." : "Forgot password?"}
              </button>
            </div>
          ) : null}

          {signupSuccess ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="font-medium text-emerald-300">
                  Check your email
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">
                  If this email can receive Ride Recon mail, we sent a
                  verification link. Already registered? Sign in instead.
                </p>
              </div>

              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="btn-primary w-full"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className={`btn-primary w-full transition ${
                !canSubmit ? "cursor-not-allowed opacity-60 saturate-50" : ""
              }`}
              disabled={!canSubmit}
            >
              {submitting
                ? "Working..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          )}

          {message ? (
            <p className="text-sm leading-6 text-zinc-400">{message}</p>
          ) : null}
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-zinc-400 transition hover:text-zinc-200"
            onClick={handleModeToggle}
          >
            {mode === "signin" ? (
              <span>
                Need an account?{" "}
                <span className="font-medium text-emerald-300">Sign up</span>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <span className="font-medium text-emerald-300">Sign in</span>
              </span>
            )}
          </button>

          <Link
            href={nextPath}
            className="text-zinc-400 transition hover:text-zinc-200"
          >
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}