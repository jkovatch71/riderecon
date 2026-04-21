"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { updateProfileForUser } from "@/lib/profiles";

function initialsFor(username?: string | null) {
  const source = (username || "").trim();
  if (!source) return "R";
  return source.slice(0, 2).toUpperCase();
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function DividerTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-zinc-800" />
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </p>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, authLoading, profileLoading, refreshProfile } = useAuth();

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [garageBay1, setGarageBay1] = useState("");
  const [garageBay2, setGarageBay2] = useState("");
  const [garageBay3, setGarageBay3] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    setUsername(profile?.username || "");
    setGarageBay1(profile?.garage_bay_1 || "");
    setGarageBay2(profile?.garage_bay_2 || "");
    setGarageBay3(profile?.garage_bay_3 || "");
  }, [profile]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!user?.id || !user.email) {
      setErrorMessage("You must be signed in.");
      return;
    }

    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      setErrorMessage("Username is required.");
      return;
    }

    if (normalizedUsername.length < 3) {
      setErrorMessage("Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-z0-9][a-z0-9_]{2,19}$/.test(normalizedUsername)) {
      setErrorMessage(
        "Username must be 3-20 characters and use only lowercase letters, numbers, or underscores."
      );
      return;
    }

    setSavingProfile(true);

    try {
      await updateProfileForUser(user.id, {
        username: normalizedUsername,
        garage_bay_1: garageBay1,
        garage_bay_2: garageBay2,
        garage_bay_3: garageBay3,
      });

      await refreshProfile();
      setSuccessMessage("Profile updated.");
      router.refresh();
    } catch (error: any) {
      const message = error?.message || "Unable to update profile right now.";
      setErrorMessage(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("New password must be different from your current password.");
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const message = error?.message || "Unable to update password.";
      setErrorMessage(message);
    } finally {
      setSavingPassword(false);
    }
  }

  const avatarInitials = useMemo(() => {
    return initialsFor(username || profile?.username);
  }, [username, profile?.username]);

  const profileName = username.trim() || profile?.username || "rider";

  if (authLoading || profileLoading) {
    return (
      <main className="space-y-4">
        <section className="card p-5">
          <p className="text-sm text-zinc-400">Loading profile...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="space-y-4">
        <section className="card p-5">
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="mt-2 text-sm text-zinc-400">You are not signed in.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      {successMessage ? (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-zinc-950 px-4 py-3 text-sm text-emerald-300 shadow-lg">
          {successMessage}
        </div>
      ) : null}

      <section className="card p-4">
        <DividerTitle title="Manage Your Profile" />

        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500 text-xl font-bold text-zinc-950">
            {avatarInitials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-brand text-xl font-semibold uppercase leading-tight text-zinc-100">
              {profileName}
            </p>

            {profileName && profileName !== "rider" ? (
              <div className="mt-3">
                <Link
                  href={`/riders/${profileName}`}
                  className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 transition active:scale-95 hover:bg-emerald-500/20"
                >
                  View Public Profile
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <DividerTitle title="Account Details" />

          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder="Your username"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Shown on reports and public profiles.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Email</p>
            <p className="mt-1.5 min-h-[42px] break-all rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-base text-zinc-100">
              {user.email || "Not available"}
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">
              Private. This is never shown on your public profile.
            </p>
          </div>

          <div className="pt-0.5">
            <DividerTitle title="Garage" />

            <div className="mt-2.5 space-y-2.5">
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500">
                  Bay 1
                </label>
                <input
                  type="text"
                  value={garageBay1}
                  onChange={(e) => setGarageBay1(e.target.value)}
                  placeholder="Your main ride here (optional)"
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500">
                  Bay 2
                </label>
                <input
                  type="text"
                  value={garageBay2}
                  onChange={(e) => setGarageBay2(e.target.value)}
                  placeholder="You know you want another bike."
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500">
                  Bay 3
                </label>
                <input
                  type="text"
                  value={garageBay3}
                  onChange={(e) => setGarageBay3(e.target.value)}
                  placeholder="Is it New Bike Day, yet?!"
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-300">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" disabled={savingProfile} className="btn-primary">
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>

            <button type="button" onClick={signOut} className="btn-secondary">
              Sign out
            </button>
          </div>
        </form>
      </section>

      <section className="card p-5">
        <form onSubmit={handlePasswordChange} className="space-y-3.5">
          <DividerTitle title="Change Password" />

          <div className="space-y-2.5">
            <div className="relative">
              <label className="text-xs uppercase tracking-wide text-zinc-500">
                Current password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 pr-16 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="absolute right-3 top-[34px] text-xs text-zinc-400 transition hover:text-zinc-200"
              >
                {showPasswords ? "Hide" : "Show"}
              </button>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-500">
                New password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-500">
                Confirm new password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Use at least 6 characters. Longer is better.
          </p>

          {errorMessage ? (
            <p className="text-sm text-red-300">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" disabled={savingPassword} className="btn-secondary">
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}