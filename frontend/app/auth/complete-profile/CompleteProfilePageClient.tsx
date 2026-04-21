"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createProfileForUser } from "@/lib/profiles";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export default function CompleteProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const { user, profile, authLoading, profileLoading, refreshProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [garageBay1, setGarageBay1] = useState("");
  const [garageBay2, setGarageBay2] = useState("");
  const [garageBay3, setGarageBay3] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      router.replace(
        `/auth/login?next=${encodeURIComponent(
          `/auth/complete-profile?next=${encodeURIComponent(nextPath)}`
        )}`
      );
      return;
    }

    if (profile?.username) {
      router.replace(nextPath);
      router.refresh();
    }
  }, [authLoading, profileLoading, user, profile, nextPath, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !user.email) return;

    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      setMessage("Username is required.");
      return;
    }

    if (normalizedUsername.length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-z0-9][a-z0-9_]{2,19}$/.test(normalizedUsername)) {
      setMessage(
        "Username must be 3-20 characters and use only lowercase letters, numbers, or underscores."
      );
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await createProfileForUser(user.id, {
        username: normalizedUsername,
        garage_bay_1: garageBay1,
        garage_bay_2: garageBay2,
        garage_bay_3: garageBay3,
      });

      await refreshProfile();
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save profile.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || profileLoading) {
    return (
      <main className="mx-auto max-w-md py-10">
        <div className="card p-5">
          <p className="text-sm text-zinc-400">Checking profile...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;
  if (profile?.username) return null;

  return (
    <main className="mx-auto max-w-md py-10">
      <div className="card p-5">
        <h1 className="text-2xl font-bold">Complete your profile</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose your username and set up your garage. Your username will appear on trail reports.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Username</label>
            <input
              className="input placeholder:text-zinc-600"
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder="example: mac_dirt_rider"
              required
              minLength={3}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Lowercase letters, numbers, and underscores only.
            </p>
          </div>

          <div>
            <p className="label">Email</p>
            <p className="input min-h-[42px] break-all text-zinc-300">
              {user.email}
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">
              Your email stays private and is never shown on your public profile.
            </p>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-3">
            <div>
              <label className="label">Garage · Bay 1</label>
              <input
                className="input placeholder:text-zinc-600"
                value={garageBay1}
                onChange={(e) => setGarageBay1(e.target.value)}
                placeholder="Your main ride here (optional)"
              />
            </div>

            <div>
              <label className="label">Garage · Bay 2</label>
              <input
                className="input placeholder:text-zinc-600"
                value={garageBay2}
                onChange={(e) => setGarageBay2(e.target.value)}
                placeholder="You know you want another bike."
              />
            </div>

            <div>
              <label className="label">Garage · Bay 3</label>
              <input
                className="input placeholder:text-zinc-600"
                value={garageBay3}
                onChange={(e) => setGarageBay3(e.target.value)}
                placeholder="Is it New Bike Day, yet?!"
              />
            </div>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>

          {message ? <p className="text-sm text-rose-300">{message}</p> : null}
        </form>
      </div>
    </main>
  );
}