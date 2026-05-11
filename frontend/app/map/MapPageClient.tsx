"use client";

import { useMemo, useState } from "react";
import { QuickReportModal } from "@/components/QuickReportModal";
import { AlertTriangle, Bike, LifeBuoy } from "lucide-react";
import { TrailMapPlaceholder, type MapFilter } from "@/components/TrailMapPlaceholder";
import type { Trail } from "@/lib/types";

const filters: {
  key: MapFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "rideable", label: "Rideable", icon: Bike },
  { key: "assist", label: "Assist", icon: LifeBuoy },
  { key: "hazards", label: "Hazards", icon: AlertTriangle },
];

export function MapPageClient({ trails }: { trails: Trail[] }) {
  const [reportOpen, setReportOpen] = useState(false);

  const nearestTrail = useMemo(() => {
    if (!trails.length) return null;
    return trails[0]; // temporary (we'll upgrade later)
  }, [trails]);

  const [mapFilter, setMapFilter] = useState<MapFilter>("rideable");

  return (
    <main className="space-y-3 pb-28">
      <section className="card p-1.5">
        <div className="relative grid grid-cols-3 gap-2">
          <div
            className={`pointer-events-none absolute bottom-0 top-0 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40 transition-all duration-300 ease-out ${
              mapFilter === "rideable"
                ? "left-0 w-[calc(33.333%-0.34rem)]"
                : mapFilter === "assist"
                  ? "left-[calc(33.333%+0.16rem)] w-[calc(33.333%-0.32rem)]"
                  : "left-[calc(66.666%+0.32rem)] w-[calc(33.333%-0.34rem)]"
            }`}
          />

          {filters.map((filter) => {
            const Icon = filter.icon;
            const active = mapFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setMapFilter(filter.key)}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "text-emerald-300"
                    : "text-zinc-400 active:scale-[0.98]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </section>
      <button
        onClick={() => setReportOpen(true)}
        className="fixed bottom-24 right-5 z-[1500] h-14 w-14 rounded-full bg-emerald-500 text-black text-2xl shadow-lg active:scale-95"
      >
        +
      </button>
      <TrailMapPlaceholder trails={trails} mapFilter={mapFilter} />
      {reportOpen && nearestTrail ? (
        <QuickReportModal
          trail={nearestTrail}
          onClose={() => setReportOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      ) : null}
    </main>
  );
}