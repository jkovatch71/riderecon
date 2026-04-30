"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const API = process.env.NEXT_PUBLIC_API_URL;

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

      if (!res.ok) {
        setStatus("Request failed.");
        return;
      }

      const data = await res.json();
      setStatus(data.message || "Success.");
    } catch {
      setStatus("Unable to reach admin service.");
    }
  }

  if (authLoading) {
    return (
      <main className="space-y-3 pb-4">
        <section className="card p-6">
          <p className="text-helper text-zinc-400">Checking admin access...</p>
        </section>
      </main>
    );
  }

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

          <Link href="/auth/login?next=/admin" className="btn-primary mt-4 inline-block">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <div className="space-y-1">
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Admin
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Debug tools
          </p>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

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