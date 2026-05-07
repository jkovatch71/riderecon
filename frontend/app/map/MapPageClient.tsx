"use client";

import { useState } from "react";
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
  const [mapFilter, setMapFilter] = useState<MapFilter>("rideable");

  return (
    <main className="space-y-3 pb-28">
      <section className="card p-2">
        <div className="grid grid-cols-3 gap-1">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const active = mapFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setMapFilter(filter.key)}
                className={`rounded-xl px-2 py-2 text-center transition ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                <Icon className="mx-auto h-4 w-4" />
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {filter.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <TrailMapPlaceholder trails={trails} mapFilter={mapFilter} />
    </main>
  );
}