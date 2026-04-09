"use client";

import { useEffect, useState } from "react";

type TextSize = "compact" | "standard" | "large";

export default function PreferencesPage() {
  const [textSize, setTextSize] = useState<TextSize>("standard");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("app-text-size") as TextSize | null;
    if (saved === "compact" || saved === "standard" || saved === "large") {
      setTextSize(saved);
    }
  }, []);

  useEffect(() => {
    if (!savedMessage) return;

    const timer = window.setTimeout(() => {
      setSavedMessage("");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  function handleTextSizeChange(value: TextSize) {
    setTextSize(value);
    window.localStorage.setItem("app-text-size", value);
    window.location.reload();
  }

  return (
    <main className="space-y-6">
      {savedMessage ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {savedMessage}
        </div>
      ) : null}

      <section className="card p-6">
        <h1 className="text-page-title font-bold">Preferences</h1>
        <p className="text-helper mt-2 text-zinc-400">
          Customize your trail experience.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-section-title font-semibold">Text Size</h2>
        <p className="text-helper mt-2 text-zinc-400">
          Choose a reading size that feels comfortable without changing the app layout too much.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {(["compact", "standard", "large"] as TextSize[]).map((option) => {
            const active = textSize === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleTextSizeChange(option)}
                className={active ? "btn-primary" : "btn-secondary"}
              >
                {option === "compact"
                  ? "Compact"
                  : option === "standard"
                  ? "Standard"
                  : "Large"}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-section-title font-semibold">Briefing Preferences</h2>
        <p className="text-helper mt-2 text-zinc-400">
          Custom briefing options are coming soon.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-section-title font-semibold">Weather Preferences</h2>
        <p className="text-helper mt-2 text-zinc-400">
          Weather sensitivity and trail caution settings are coming soon.
        </p>
      </section>
    </main>
  );
}