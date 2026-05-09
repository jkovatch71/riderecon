"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CloudSun, MapPinned, ShieldCheck } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

function AdminCard({
  href,
  icon: Icon,
  title,
  eyebrow,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  eyebrow: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="card block p-5 transition hover:border-emerald-500/30"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            {title}
          </h2>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {eyebrow}
          </p>
        </div>
      </div>

      <div className="my-3 h-px bg-zinc-800" />

      <p className="text-helper text-zinc-400">{description}</p>
    </Link>
  );
}

export default function AdminPage() {
  const { user, session, authLoading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  const accessToken = session?.access_token;

  async function call(endpoint: string) {
    if (!API || !accessToken) return;

    setStatus("Working...");

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 403) {
        setStatus("Admin access required.");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus(data?.detail || "Request failed.");
        return;
      }

      setStatus(data?.message || "Success.");
    } catch {
      setStatus("Unable to reach admin service.");
    }
  }

  // 🔒 Loading
  if (authLoading) {
    return (
      <main className="space-y-3 pb-4">
        <section className="card p-6">
          <p className="text-helper text-zinc-400">
            Checking admin access...
          </p>
        </section>
      </main>
    );
  }

  // 🔒 Not signed in
  if (!user) {
    return (
      <main className="space-y-3 pb-4">
        <section className="card p-6">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Admin
          </h1>

          <div className="my-4 h-px bg-zinc-800" />

          <p className="text-helper text-zinc-400">
            Sign in to access admin tools.
          </p>

          <Link
            href="/auth/login?next=/admin"
            className="btn-primary mt-4 inline-block"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-3 pb-28">
      {/* Header */}
      <section className="card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
              Admin
            </h1>

            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Control Panel
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <AdminCard
        href="/admin/trail-suggestions"
        icon={MapPinned}
        eyebrow="Review Queue"
        title="Trail Suggestions"
        description="Approve, reject, or fix rider-submitted trails."
      />

      {/* Weather Tools */}
      <section className="card p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
            <CloudSun className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
              Weather Control
            </h2>

            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Cache Tools
            </p>
          </div>
        </div>

        <div className="my-3 h-px bg-zinc-800" />

        <div className="space-y-3">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => call("/admin/weather/clear")}
          >
            Clear Weather Cache
          </button>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => call("/admin/weather/refresh")}
          >
            Refresh Weather
          </button>
        </div>

        {status ? (
          <p className="text-helper mt-4 text-zinc-400">{status}</p>
        ) : null}
      </section>
    </main>
  );
}