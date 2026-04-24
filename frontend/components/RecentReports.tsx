"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TrailReport } from "@/lib/types";
import { confirmReport, getReportConfirmation } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const HAZARD_META: Record<string, { icon: string; label: string }> = {
  obstruction: { icon: "🌳", label: "Obstruction" },
  obstructed: { icon: "🌳", label: "Obstruction" },
  bees: { icon: "🐝", label: "Bees" },
  wildlife: { icon: "🐾", label: "Wildlife" },
  other: { icon: "⚠️", label: "Other" },
};

type ReportWithConfirmations = TrailReport & {
  confirmation_count?: number;
  confirmed_by_current_user?: boolean;
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

function getInitialConfirmationCount(report: ReportWithConfirmations) {
  return report.confirmation_count ?? 0;
}

function getInitialConfirmedByUser(report: ReportWithConfirmations) {
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

  useEffect(() => {
    if (!user || !accessToken || !reports.length) return;

    const token = accessToken;

    let cancelled = false;

    async function loadConfirmationStates() {
      const entries = await Promise.all(
        reports.map(async (report) => {
          try {
            const state = await getReportConfirmation(report.id, token);

            return [
              report.id,
              {
                confirmation_count: state.confirmation_count,
                confirmed_by_current_user: state.confirmed_by_current_user,
              },
            ] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const nextState: LocalConfirmationState = {};

      for (const entry of entries) {
        if (!entry) continue;

        const [reportId, state] = entry;
        nextState[reportId] = state;
      }

      setLocalConfirmations(nextState);
    }

    void loadConfirmationStates();

    return () => {
      cancelled = true;
    };
  }, [reports, user, accessToken]);

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
                const typedReport = report as ReportWithConfirmations;
                const localState = localConfirmations[report.id];

                const confirmationCount =
                  localState?.confirmation_count ??
                  getInitialConfirmationCount(typedReport);

                const confirmedByCurrentUser =
                  localState?.confirmed_by_current_user ??
                  getInitialConfirmedByUser(typedReport);

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

                    <div className="mt-4 flex items-center gap-3 text-sm">
                      <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                        <span aria-hidden="true">🤘</span>
                        <span>{confirmationCount}</span>
                      </div>

                      {user ? (
                        <button
                          type="button"
                          disabled={confirmedByCurrentUser || isSaving}
                          onClick={() => handleConfirm(report)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                            confirmedByCurrentUser
                              ? "cursor-default border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300"
                          } ${isSaving ? "cursor-wait opacity-60" : ""}`}
                        >
                          {isSaving
                            ? "Confirming..."
                            : confirmedByCurrentUser
                              ? "Confirmed"
                              : "Confirm"}
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