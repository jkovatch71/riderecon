"use client";

import { useEffect, useMemo, useState } from "react";

type TextSize = "compact" | "standard" | "large";
type BriefingTone = "rider" | "neutral";
type BriefingDetail = "quick" | "standard" | "detailed";
type TrailSensitivity = "conservative" | "balanced" | "aggressive";

type SettingsState = {
  textSize: TextSize;
  briefingTone: BriefingTone;
  briefingDetail: BriefingDetail;
  trailSensitivity: TrailSensitivity;
};

const DEFAULT_SETTINGS: SettingsState = {
  textSize: "standard",
  briefingTone: "rider",
  briefingDetail: "standard",
  trailSensitivity: "balanced",
};

function readStoredSetting<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  if (typeof window === "undefined") return fallback;

  const value = window.localStorage.getItem(key);
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

function SectionDivider() {
  return <div className="border-t border-zinc-800" />;
}

function SegmentGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-1.5 shadow-inner shadow-black/40">
      <div className="grid auto-cols-fr grid-flow-col gap-1">
        {options.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl px-3 py-2.5 text-button font-medium uppercase tracking-[0.08em] transition-all duration-150 ${
                active
                  ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(16,185,129,0.08)]"
                  : "border border-transparent bg-zinc-900/70 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ControlBlock({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-helper font-medium uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </p>
        {helper ? (
          <p className="text-helper mt-2 max-w-2xl text-zinc-400">{helper}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function PreferencesPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loaded: SettingsState = {
      textSize: readStoredSetting(
        "app-text-size",
        ["compact", "standard", "large"] as const,
        "standard"
      ),
      briefingTone: readStoredSetting(
        "briefing-tone",
        ["rider", "neutral"] as const,
        "rider"
      ),
      briefingDetail: readStoredSetting(
        "briefing-detail",
        ["quick", "standard", "detailed"] as const,
        "standard"
      ),
      trailSensitivity: readStoredSetting(
        "trail-sensitivity",
        ["conservative", "balanced", "aggressive"] as const,
        "balanced"
      ),
    };

    setSettings(loaded);
  }, []);

  function saveSetting<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (key === "textSize") {
      window.localStorage.setItem("app-text-size", value);
      window.dispatchEvent(new Event("app-text-size-change"));
      return;
    }

    const storageKey =
      key === "briefingTone"
        ? "briefing-tone"
        : key === "briefingDetail"
          ? "briefing-detail"
          : "trail-sensitivity";

    window.localStorage.setItem(storageKey, value);
  }

  const sensitivityDescription = useMemo(() => {
    switch (settings.trailSensitivity) {
      case "conservative":
        return "Leans cautious and gives trails more recovery time.";
      case "aggressive":
        return "More willing to call conditions rideable sooner.";
      default:
        return "A middle-ground read between caution and optimism.";
    }
  }, [settings.trailSensitivity]);

  return (
    <main className="space-y-3 pb-4">
      <section className="card p-6">
        <div className="space-y-2">
          <p className="text-helper font-medium uppercase tracking-[0.18em] text-zinc-500">
            System Controls
          </p>
          <h1 className="font-brand text-page-title font-semibold uppercase text-zinc-100">
            Command Central
          </h1>
          <p className="text-helper max-w-2xl text-zinc-400">
            Tune how Ride Recon reads conditions, delivers your briefing, and
            helps you make ride-day decisions.
          </p>
        </div>
      </section>

      <section className="card p-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
          <div className="space-y-6">
            <div>
              <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
                Display
              </p>
              <p className="text-helper mt-2 text-zinc-400">
                Choose a reading size that feels comfortable across the app.
              </p>
            </div>

            <ControlBlock label="Text Size">
              <SegmentGroup
                value={settings.textSize}
                onChange={(value) => saveSetting("textSize", value as TextSize)}
                options={[
                  { value: "compact", label: "Compact" },
                  { value: "standard", label: "Standard" },
                  { value: "large", label: "Large" },
                ]}
              />
            </ControlBlock>

            <SectionDivider />

            <div>
              <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
                Briefing Style
              </p>
              <p className="text-helper mt-2 text-zinc-400">
                Choose how your home briefing sounds and how much detail it
                gives you.
              </p>
            </div>

            <ControlBlock label="Tone">
              <SegmentGroup
                value={settings.briefingTone}
                onChange={(value) =>
                  saveSetting("briefingTone", value as BriefingTone)
                }
                options={[
                  { value: "rider", label: "Rider" },
                  { value: "neutral", label: "Neutral" },
                ]}
              />
            </ControlBlock>

            <ControlBlock label="Detail Level">
              <SegmentGroup
                value={settings.briefingDetail}
                onChange={(value) =>
                  saveSetting("briefingDetail", value as BriefingDetail)
                }
                options={[
                  { value: "quick", label: "Quick" },
                  { value: "standard", label: "Standard" },
                  { value: "detailed", label: "Detailed" },
                ]}
              />
            </ControlBlock>

            <SectionDivider />

            <div>
              <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
                Trail Sensitivity
              </p>
              <p className="text-helper mt-2 text-zinc-400">
                Set how cautious Ride Recon should be when weather and recovery
                conditions are close.
              </p>
            </div>

            <ControlBlock
              label="Decision Bias"
              helper={sensitivityDescription}
            >
              <SegmentGroup
                value={settings.trailSensitivity}
                onChange={(value) =>
                  saveSetting(
                    "trailSensitivity",
                    value as TrailSensitivity
                  )
                }
                options={[
                  { value: "conservative", label: "Conservative" },
                  { value: "balanced", label: "Balanced" },
                  { value: "aggressive", label: "Aggressive" },
                ]}
              />
            </ControlBlock>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <p className="text-helper font-medium uppercase tracking-[0.18em] text-zinc-500">
          Next Up
        </p>
        <p className="font-brand text-section-title mt-2 font-semibold uppercase text-zinc-100">
          Ride Alerts
        </p>
        <p className="text-helper mt-2 text-zinc-400">
          Morning briefings, favorite trail rideability alerts, and post-rain
          updates are planned next.
        </p>
      </section>
    </main>
  );
}