"use client";

import { useMemo, useState } from "react";

export function AccountDeletionRequest() {
  const [confirmed, setConfirmed] = useState(false);

  const mailtoHref = useMemo(() => {
    const subject = "Ride Recon Account Deletion Request";
    const body = [
      "Please delete my Ride Recon account and associated app data.",
      "",
      "Account email:",
      "Username, if known:",
      "",
      "I understand this request may permanently delete my Ride Recon account, profile, favorites, garage information, and associated app data.",
    ].join("\n");

    return `mailto:privacy@riderecon.app?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }, []);

  return (
    <div className="mt-4 space-y-4">
      <label className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-helper leading-6 text-zinc-300">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-emerald-400"
        />

        <span>
          I understand this request is to delete my Ride Recon account and
          associated app data.
        </span>
      </label>

      <a
        href={confirmed ? mailtoHref : undefined}
        aria-disabled={!confirmed}
        className={`inline-flex rounded-xl px-4 py-3 text-sm font-semibold transition ${
          confirmed
            ? "bg-emerald-500 text-zinc-950 active:scale-95"
            : "pointer-events-none bg-zinc-800 text-zinc-500"
        }`}
      >
        Request account deletion
      </a>
    </div>
  );
}