"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPageClient() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSubmit =
    password.trim().length >= 6 &&
    confirmPassword.trim().length >= 6 &&
    password === confirmPassword &&
    !saving &&
    !saved;

  useEffect(() => {
    let mounted = true;

    async function initializeRecovery() {
      setMessage(null);

      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const queryParams = url.searchParams;

      const hashError =
        hashParams.get("error_description") || hashParams.get("error");
      const queryError =
        queryParams.get("error_description") || queryParams.get("error");

      if (hashError || queryError) {
        if (!mounted) return;

        setHasRecoverySession(false);
        setMessage(
          "This reset link is expired or has already been used. Request a new password reset link."
        );
        setReady(true);
        return;
      }

      const code = queryParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!mounted) return;

        if (error) {
          setHasRecoverySession(false);
          setMessage(
            "This reset link could not be verified. Request a new password reset link."
          );
          setReady(true);
          return;
        }

        setHasRecoverySession(true);
        setReady(true);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (accessToken && refreshToken && type === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (error) {
          setHasRecoverySession(false);
          setMessage(
            "This reset link could not be verified. Request a new password reset link."
          );
          setReady(true);
          return;
        }

        window.history.replaceState(null, "", "/auth/reset-password");

        setHasRecoverySession(true);
        setReady(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setHasRecoverySession(Boolean(session));
      setReady(true);
    }

    void initializeRecovery();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canSubmit) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSaved(true);
      setMessage("Password updated. You can sign in with your new password.");

      window.setTimeout(() => {
        router.replace("/auth/login");
        router.refresh();
      }, 900);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to update password.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-md space-y-3 pb-28">
        <section className="card p-6">
          <p className="text-helper text-zinc-400">Checking reset link...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-3 pb-28">
      <section className="card p-6">
        <div className="space-y-1">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Reset Password
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Account Recovery
          </p>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        {!hasRecoverySession ? (
          <div className="space-y-4">
            <p className="text-helper text-zinc-400">
              {message ||
                "This reset link is missing or expired. Request a new password reset link."}
            </p>

            <Link href="/auth/login" className="btn-primary block text-center">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <p className="text-helper text-zinc-400">
              Enter a new password for your Ride Recon account.
            </p>

            <div className="relative">
              <input
                aria-label="New password"
                className="input pr-14"
                type={showPasswords ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />

              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 transition hover:text-zinc-200"
              >
                {showPasswords ? "Hide" : "Show"}
              </button>
            </div>

            <input
              aria-label="Confirm new password"
              className="input"
              type={showPasswords ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className={`btn-primary w-full transition ${
                !canSubmit ? "cursor-not-allowed opacity-60 saturate-50" : ""
              }`}
            >
              {saving ? "Updating..." : "Update Password"}
            </button>

            {message ? (
              <p
                className={`text-sm leading-6 ${
                  saved ? "text-emerald-300" : "text-zinc-400"
                }`}
              >
                {message}
              </p>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}