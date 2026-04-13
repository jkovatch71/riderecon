"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function HomeHeroActions() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="h-10 w-36 rounded-xl border border-zinc-800 bg-zinc-900/70" />
        <div className="h-10 w-32 rounded-xl border border-zinc-800 bg-zinc-900/70" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/favorites" className="btn-primary">
          Manage Favorites
        </Link>
        <Link href="/profile" className="btn-secondary">
          View Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Link href="/auth/login?next=/" className="btn-primary">
        Sign In
      </Link>
      <Link href="/favorites" className="btn-secondary">
        Browse Favorites
      </Link>
    </div>
  );
}