"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createMyProfile, getMyProfile } from "@/lib/profiles";

const avatarColors = ["emerald", "blue", "purple", "orange", "pink", "zinc"];

export default function CompleteProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState("emerald");
  const [stravaUrl, setStravaUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push(`/auth/login?next=${encodeURIComponent("/auth/complete-profile")}`);
          return;
        }

        const profile = await getMyProfile();

        if (profile?.username) {
          router.push(nextPath);
          router.refresh();
          return;
        }

        setChecking(false);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setChecking(false);
      }
    }

    load();
  }, [router, nextPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await createMyProfile({
        username: username.trim(),
        display_name: displayName.trim(),
        avatar_color: avatarColor,
        strava_url: stravaUrl.trim(),
      });

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save profile.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="mx-auto max-w-md py-10">
        <div className="card p-6">
          <p className="text-sm text-zinc-400">Checking profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Complete your profile</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose a rider username. This will appear on trail reports.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="example: MacDirtRider"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="label">Display name (optional)</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John"
            />
          </div>

          <div>
            <label className="label">Avatar color</label>
            <select
              className="input"
              value={avatarColor}
              onChange={(e) => setAvatarColor(e.target.value)}
            >
              {avatarColors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Strava URL (optional)</label>
            <input
              className="input"
              value={stravaUrl}
              onChange={(e) => setStravaUrl(e.target.value)}
              placeholder="https://www.strava.com/athletes/..."
            />
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