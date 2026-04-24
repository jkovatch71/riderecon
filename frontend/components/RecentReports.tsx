"use client";

import Link from "next/link";
import { useState } from "react";
import type { TrailReport } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const HAZARD_META: Record<string, { icon: string; label: string }> = {
  obstruction: { icon: "🌳", label: "Obstruction" },
  obstructed: { icon: "🌳", label: "Obstruction" },
  bees: { icon: "🐝", label: "Bees" },
  wildlife: { icon: "🐾", label: "Wildlife" },
  other: { icon: "⚠️", label: "Other" },
};

function normalizeHazard(tag: string) {
  const key = tag.trim().toLowerCase();
  return HAZARD_META[key] ?? { icon: "⚠️", label: tag };
}

export function RecentReports({
  reports,
  expanded,
  onExpandedChange,
}: {
  reports: TrailReport[];
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isControlled = typeof expanded === "boolean";
  const isExpanded = isControlled ? expanded : internalExpanded;

  function toggleExpanded() {
    const nextValue = !isExpanded;

    if (isControlled) {
      onExpandedChange?.(nextValue);
      return;
    }

    setInternalExpanded(nextValue);
  }

  return (
    <section className="card p-5">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={isExpanded}
      >
        <div>
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            {reports.length} Recent Report{reports.length === 1 ? "" : "s"}
          </h2>
          <p className="text-helper mt-1 text-zinc-400">
            Tap to {isExpanded ? "hide" : "view"} notes and confirmations
          </p>
        </div>

        <span className="text-sm text-zinc-400">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded ? (
        <>
          <div className="my-4 h-px bg-zinc-800" />

          <div className="space-y-4">
            {reports.length === 0 ? (
              <p className="text-sm text-zinc-400">No rider reports yet.</p>
            ) : (
              reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-zinc-800 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {report.username ? (
                        <Link
                          href={`/riders/${report.username.toLowerCase()}`}
                          className="font-medium text-zinc-100 transition hover:text-emerald-300"
                        >
                          {report.username}
                        </Link>
                      ) : (
                        <p className="font-medium text-zinc-100">
                          Unknown rider
                        </p>
                      )}

                      <p className="text-sm text-zinc-400">
                        {report.primary_condition}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm text-zinc-500">
                      {timeAgo(report.updated_at || report.created_at)}
                    </p>
                  </div>

                  {report.note ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-200">
                      {report.note}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm italic text-zinc-500">
                      No additional notes
                    </p>
                  )}

                  {(report.hazard_tags?.length ?? 0) > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.hazard_tags?.map((tag) => {
                        const meta = normalizeHazard(tag);

                        return (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-amber-300"
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-emerald-300"
                    >
                      <span aria-hidden="true">🤘</span>
                      <span>0</span>
                    </button>

                    <button
                      type="button"
                      className="text-zinc-400 transition hover:text-zinc-200"
                    >
                      Confirm Report
                    </button>

                    {report.is_edited ? (
                      <span className="ml-auto text-xs text-zinc-500">
                        Edited
                      </span>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}