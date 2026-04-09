"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function HomeHeroActions({
  view,
  setView,
}: {
  view: "list" | "map";
  setView: (view: "list" | "map") => void;
}) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSignedIn(!!data.session?.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setView("list")}
        className={view === "list" ? "btn-primary" : "btn-secondary"}
      >
        List view
      </button>

      <button
        type="button"
        onClick={() => setView("map")}
        className={view === "map" ? "btn-primary" : "btn-secondary"}
      >
        Map view
      </button>

      {!signedIn ? (
        <Link href="/auth/login" className="btn-secondary">
          Sign in
        </Link>
      ) : null}
    </div>
  );
}