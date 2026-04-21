"use client";

import Link from "next/link";
import { useState } from "react";
import type { TrailReport } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function RecentReports({ reports }: { reports: TrailReport[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="card p-5">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={expanded}
      >
        <div>
          <h2 className="text-xl font-semibold">
            {reports.length} Recent Rider Report{reports.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Tap to {expanded ? "hide" : "view"} rider notes and confirmations
          </p>
        </div>

        <span className="text-sm text-zinc-400">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded ? (
        <>
          <div className="my-4 h-px bg-zinc-800" />

          <div className="space-y-4">
            {reports.length === 0 ? (
              <p className="text-sm text-zinc-400">No rider reports yet.</p>
            ) : (
              reports.map((report) => (
                <article key={report.id} className="rounded-xl border border-zinc-800 p-4">
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
                        <p className="font-medium text-zinc-100">Unknown rider</p>
                      )}

                      <p className="text-sm text-zinc-400">{report.primary_condition}</p>
                    </div>

                    <p className="shrink-0 text-sm text-zinc-500">
                      {timeAgo(report.updated_at || report.created_at)}
                    </p>
                  </div>

                  {report.note ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-200">{report.note}</p>
                  ) : (
                    <p className="mt-3 text-sm italic text-zinc-500">No additional notes</p>
                  )}

                  {(report.hazard_tags?.length ?? 0) > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.hazard_tags?.map((tag) => (
                        <span
                          key={tag}
                          className="status-pill bg-amber-500/10 text-amber-300"
                        >
                          {tag}
                        </span>
                      ))}
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
                      <span className="ml-auto text-xs text-zinc-500">Edited</span>
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