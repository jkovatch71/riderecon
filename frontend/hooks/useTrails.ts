"use client";

import { useEffect, useState } from "react";
import { getTrails } from "@/lib/api";
import type { Trail } from "@/lib/types";

type UseTrailsResult = {
  trails: Trail[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useTrails(): UseTrailsResult {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextTrails = await getTrails();

        if (!cancelled) {
          setTrails(nextTrails);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load trail conditions right now.");
          setTrails([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return {
    trails,
    loading,
    error,
    reload: () => setReloadKey((current) => current + 1),
  };
}