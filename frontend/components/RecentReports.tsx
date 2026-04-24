"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TrailReport } from "@/lib/types";
import { confirmReport } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const HAZARD_META: Record<string, { icon: string; label: string }> = {
  obstruction: { icon: "🌳", label: "Obstruction" },
  obstructed: { icon: "🌳", label: "Obstruction" },
  bees: { icon: "🐝", label: "Bees" },
  wildlife: { icon: "🐾", label: "Wildlife" },
  other: { icon: "⚠️", label: "Other" },
};

type LocalConfirmationState = Record<
  string,
  {
    confirmation_count: number;
    confirmed_by_current_user: boolean;
  }
>;

function normalizeHazard(tag: string) {
  const key = tag.trim().toLowerCase();
  return HAZARD_META[key] ?? { icon: "⚠️", label: tag };
}

function getInitialConfirmationCount(report: TrailReport) {
  return report.confirmation_count ?? 0;
}

function getInitialConfirmedByUser(report: TrailReport) {
  return report.confirmed_by_current_user ?? false;
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
  const { user, session } = useAuth();

  const [internalExpanded, setInternalExpanded] = useState(false);
  const [savingReportId, setSavingReportId] = useState<string | null>(null);
  const [localConfirmations, setLocalConfirmations] =
    useState<LocalConfirmationState>({});

  const accessToken = session?.access_token;

  const isControlled = typeof expanded === "boolean";
  const isExpanded = isControlled ? expanded : internalExpanded;

  const reportCountText = useMemo(() => {
    if (!reports.length) return "No recent reports yet";
    return `${reports.length} recent report${reports.length === 1 ? "" : "s"}`;
  }, [reports.length]);

  function toggleExpanded() {
    const nextValue = !isExpanded;

    if (isControlled) {
      onExpandedChange?.(nextValue);
      return;
    }

    setInternalExpanded(nextValue);
  }

  async function handleConfirm(report: TrailReport) {
    if (!user || !accessToken || savingReportId) return;

    setSavingReportId(report.id);

    try {
      const result = await confirmReport(report.id, accessToken);

      setLocalConfirmations((prev) => ({
        ...prev,
        [report.id]: {
          confirmation_count: result.confirmation_count,
          confirmed_by_current_user: result.confirmed_by_current_user,
        },
      }));
    } finally {
      setSavingReportId(null);
    }
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
            Reports
          </h2>
          <p className="text-helper mt-1 text-zinc-400">{reportCountText}</p>
        </div>

        <span className="text-sm text-zinc-400">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded ? (
        <>
          <div className="my-4 h-px bg-zinc-800" />

          <div className="space-y-4">
            {reports.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No reports in the current freshness window.
              </p>
            ) : (
              reports.map((report) => {
                const localState = localConfirmations[report.id];
                const confirmationCount =
                  localState?.confirmation_count ??
                  getInitialConfirmationCount(report);
                const confirmedByCurrentUser =
                  localState?.confirmed_by_current_user ??
                  getInitialConfirmedByUser(report);
                const isSaving = savingReportId === report.id;

                return (
                  <article key={report.id} className="py-1">
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
                      <div className="inline-flex items-center gap-1 text-zinc-400">
                        <span aria-hidden="true">🤘</span>
                        <span>{confirmationCount}</span>
                      </div>

                      {user ? (
                        <button
                          type="button"
                          disabled={confirmedByCurrentUser || isSaving}
                          onClick={() => handleConfirm(report)}
                          className={`transition ${
                            confirmedByCurrentUser
                              ? "cursor-default text-emerald-300"
                              : "text-zinc-400 hover:text-zinc-200"
                          } ${isSaving ? "opacity-60" : ""}`}
                        >
                          {isSaving
                            ? "Confirming..."
                            : confirmedByCurrentUser
                              ? "Confirmed"
                              : "Confirm Report"}
                        </button>
                      ) : (
                        <span className="text-zinc-500">
                          Sign in to confirm
                        </span>
                      )}

                      {report.is_edited ? (
                        <span className="ml-auto text-xs text-zinc-500">
                          Edited
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}