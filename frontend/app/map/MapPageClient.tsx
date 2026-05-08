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
      <section className="card p-1">
        <div className="relative grid grid-cols-3 gap-1">
            {/* Sliding highlight */}
            <div
            className={`absolute top-1 bottom-1 w-[calc(33.333%-4px)] rounded-xl bg-emerald-500/20 transition-all duration-300 ease-out
                ${mapFilter === "rideable" ? "left-1" : ""}
                ${mapFilter === "assist" ? "left-[calc(33.333%+2px)]" : ""}
                ${mapFilter === "hazards" ? "left-[calc(66.666%+3px)]" : ""}
            `}
            />

            {filters.map((filter) => {
            const Icon = filter.icon;
            const active = mapFilter === filter.key;

            return (
                <button
                key={filter.key}
                type="button"
                onClick={() => setMapFilter(filter.key)}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors
                    ${
                    active
                        ? "text-emerald-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                <Icon className="h-4 w-4" />
                <span>{filter.label}</span>
                </button>
            );
            })}
            </div>
        </section>

      <TrailMapPlaceholder trails={trails} mapFilter={mapFilter} />
    </main>
  );
}