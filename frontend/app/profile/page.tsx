"use client";

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

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, authLoading, profileLoading, refreshProfile } = useAuth();

  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [garageBay1, setGarageBay1] = useState("");
  const [garageBay2, setGarageBay2] = useState("");
  const [garageBay3, setGarageBay3] = useState("");

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

  async function handleSave(e: React.FormEvent) {
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

    setSaving(true);

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
      setSaving(false);
    }
  }

  const avatarInitials = useMemo(() => {
    return initialsFor(username || profile?.username);
  }, [username, profile]);

  const profileName = username.trim() || profile?.username || "rider";

  if (authLoading || profileLoading) {
    return (
      <main className="space-y-6">
        <section className="card p-6">
          <p className="text-sm text-zinc-400">Loading profile...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="space-y-6">
        <section className="card p-6">
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="mt-2 text-sm text-zinc-400">You are not signed in.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {successMessage ? (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-zinc-950 px-4 py-3 text-sm text-emerald-300 shadow-lg">
          {successMessage}
        </div>
      ) : null}

      <section className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500 text-xl font-bold text-zinc-950">
            {avatarInitials}
          </div>

          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage your rider identity and garage.
            </p>
            <p className="mt-2 text-sm text-zinc-300">@{profileName}</p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder="Your rider username"
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
            />
            <p className="mt-2 text-xs text-zinc-500">
              Lowercase letters, numbers, and underscores only.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Email</p>
            <p className="mt-2 min-h-[42px] break-all rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-base text-zinc-100">
              {user.email || "Not available"}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Private. This is never shown on your public rider profile.
            </p>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Garage</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500">
                  Bay 1
                </label>
                <input
                  type="text"
                  value={garageBay1}
                  onChange={(e) => setGarageBay1(e.target.value)}
                  placeholder="2021 Norco Fluid FS-3"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
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
                  placeholder="Optional"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
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
                  placeholder="Optional"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {successMessage ? (
            <p className="text-sm text-emerald-300">{successMessage}</p>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-red-300">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button type="button" onClick={signOut} className="btn-secondary">
              Sign out
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}