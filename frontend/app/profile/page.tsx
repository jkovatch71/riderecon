"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMyProfile, updateMyProfile } from "@/lib/profiles";

type Profile = {
  username?: string | null;
  display_name?: string | null;
};

type UserState = {
  email?: string | null;
};

function initialsFor(displayName?: string | null, username?: string | null) {
  const source = (displayName || username || "").trim();
  if (!source) return "R";

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

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
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser({
        email: session.user.email,
      });

      try {
        const nextProfile = await getMyProfile();
        setProfile(nextProfile);
        setUsername(nextProfile?.username || "");
        setDisplayName(nextProfile?.display_name || "");
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedUsername) {
      setErrorMessage("Username is required.");
      return;
    }

    if (trimmedUsername.length < 3) {
      setErrorMessage("Username must be at least 3 characters.");
      return;
    }

    setSaving(true);

    try {
      const updated = await updateMyProfile({
        username: trimmedUsername,
        display_name: trimmedDisplayName,
      });

      setProfile(updated);
      setUsername(updated?.username || "");
      setDisplayName(updated?.display_name || "");
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
    return initialsFor(displayName || profile?.display_name, username || profile?.username);
  }, [displayName, username, profile]);

  const profileName = displayName.trim() || profile?.display_name || username.trim() || profile?.username || "Rider";

  return (
    <main className="space-y-6">
      {successMessage ? (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-zinc-950 px-4 py-3 text-sm text-emerald-300 shadow-lg">
          {successMessage}
        </div>
      ) : null}
      <section className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-zinc-950">
            {avatarInitials}
          </div>

          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Update your rider profile and account info.
            </p>
            <p className="mt-2 text-sm text-zinc-300">{profileName}</p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading profile...</p>
        ) : !user ? (
          <p className="text-sm text-zinc-400">You are not signed in.</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-xl border border-zinc-800 p-4">
              <label className="text-xs uppercase tracking-wide text-zinc-500">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How your name appears in the app"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="rounded-xl border border-zinc-800 p-4">
              <label className="text-xs uppercase tracking-wide text-zinc-500">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your rider username"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="rounded-xl border border-zinc-800 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Email
              </p>
              <p className="mt-1 break-all text-base text-zinc-100">
                {user.email || "Not available"}
              </p>
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
        )}
      </section>
    </main>
  );
}