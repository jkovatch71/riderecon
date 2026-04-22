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

function SettingButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "btn-primary" : "btn-secondary"}
    >
      {label}
    </button>
  );
}

export default function PreferencesPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [savedMessage, setSavedMessage] = useState("");

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

  useEffect(() => {
    if (!savedMessage) return;

    const timer = window.setTimeout(() => {
      setSavedMessage("");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  function saveSetting<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (key === "textSize") {
      window.localStorage.setItem("app-text-size", value);
      setSavedMessage("Text size saved. Refreshing layout...");
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
      return;
    }

    const storageKey =
      key === "briefingTone"
        ? "briefing-tone"
        : key === "briefingDetail"
        ? "briefing-detail"
        : "trail-sensitivity";

    window.localStorage.setItem(storageKey, value);
    setSavedMessage("Ride settings saved.");
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
    <main className="space-y-6">
      {savedMessage ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {savedMessage}
        </div>
      ) : null}

      <section className="card p-6">
        <h1 className="text-page-title font-bold">Ride Settings</h1>
        <p className="text-helper mt-2 text-zinc-400">
          Control how Ride Recon reads conditions and presents your briefing.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-section-title font-semibold">Display</h2>
        <p className="text-helper mt-2 text-zinc-400">
          Choose a reading size that feels comfortable without changing the layout too much.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <SettingButton
            active={settings.textSize === "compact"}
            label="Compact"
            onClick={() => saveSetting("textSize", "compact")}
          />
          <SettingButton
            active={settings.textSize === "standard"}
            label="Standard"
            onClick={() => saveSetting("textSize", "standard")}
          />
          <SettingButton
            active={settings.textSize === "large"}
            label="Large"
            onClick={() => saveSetting("textSize", "large")}
          />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-section-title font-semibold">Briefing Style</h2>
        <p className="text-helper mt-2 text-zinc-400">
          Choose how your home briefing sounds and how much detail it gives you.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-body font-medium text-zinc-200">Tone</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <SettingButton
                active={settings.briefingTone === "rider"}
                label="Rider"
                onClick={() => saveSetting("briefingTone", "rider")}
              />
              <SettingButton
                active={settings.briefingTone === "neutral"}
                label="Neutral"
                onClick={() => saveSetting("briefingTone", "neutral")}
              />
            </div>
          </div>

          <div>
            <p className="text-body font-medium text-zinc-200">Detail Level</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <SettingButton
                active={settings.briefingDetail === "quick"}
                label="Quick"
                onClick={() => saveSetting("briefingDetail", "quick")}
              />
              <SettingButton
                active={settings.briefingDetail === "standard"}
                label="Standard"
                onClick={() => saveSetting("briefingDetail", "standard")}
              />
              <SettingButton
                active={settings.briefingDetail === "detailed"}
                label="Detailed"
                onClick={() => saveSetting("briefingDetail", "detailed")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-section-title font-semibold">Trail Sensitivity</h2>
        <p className="text-helper mt-2 text-zinc-400">
          Set how cautious Ride Recon should be when weather and recovery conditions are close.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <SettingButton
            active={settings.trailSensitivity === "conservative"}
            label="Conservative"
            onClick={() => saveSetting("trailSensitivity", "conservative")}
          />
          <SettingButton
            active={settings.trailSensitivity === "balanced"}
            label="Balanced"
            onClick={() => saveSetting("trailSensitivity", "balanced")}
          />
          <SettingButton
            active={settings.trailSensitivity === "aggressive"}
            label="Aggressive"
            onClick={() => saveSetting("trailSensitivity", "aggressive")}
          />
        </div>

        <p className="text-helper mt-4 text-zinc-400">{sensitivityDescription}</p>
      </section>

      <section className="card p-6">
        <h2 className="text-section-title font-semibold">Ride Alerts</h2>
        <p className="text-helper mt-2 text-zinc-400">
          Morning briefings, favorite trail rideability alerts, and post-rain updates are planned next.
        </p>
      </section>
    </main>
  );
}