"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Gauge,
  LifeBuoy,
  MessageSquareText,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";

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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-1">
      <div className="grid auto-cols-fr grid-flow-col gap-1">
        {options.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] transition-all ${
                active
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/40"
                  : "text-zinc-400 hover:bg-zinc-900/90 hover:text-zinc-200"
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

function PreferenceCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            {title}
          </h2>

          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="my-3 h-px bg-zinc-800" />

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Control({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      {children}
      {helper ? <p className="text-[12px] text-zinc-400">{helper}</p> : null}
    </div>
  );
}

export default function PreferencesPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings({
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
    });
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
        return "Calls conditions rideable sooner.";
      default:
        return "Balanced between caution and optimism.";
    }
  }, [settings.trailSensitivity]);

  return (
    <main className="space-y-3 pb-28">
      <PreferenceCard icon={Gauge} title="Display" subtitle="Text Size">
        <Control label="Text Size">
          <SegmentGroup
            value={settings.textSize}
            onChange={(value) => saveSetting("textSize", value as TextSize)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "standard", label: "Standard" },
              { value: "large", label: "Large" },
            ]}
          />
        </Control>
      </PreferenceCard>

      <PreferenceCard
        icon={MessageSquareText}
        title="Briefing Style"
        subtitle="Voice, Tone & Detail"
      >
        <Control label="Tone">
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
        </Control>

        <Control label="Detail Level">
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
        </Control>
      </PreferenceCard>

      <PreferenceCard
        icon={SlidersHorizontal}
        title="Trail Sensitivity"
        subtitle="Decision Bias"
      >
        <Control label="Bias" helper={sensitivityDescription}>
          <SegmentGroup
            value={settings.trailSensitivity}
            onChange={(value) =>
              saveSetting("trailSensitivity", value as TrailSensitivity)
            }
            options={[
              { value: "conservative", label: "Conservative" },
              { value: "balanced", label: "Balanced" },
              { value: "aggressive", label: "Aggressive" },
            ]}
          />
        </Control>
      </PreferenceCard>
        <PreferenceCard
        icon={LifeBuoy}
        title="Legal & Support"
        subtitle="Privacy, Help & Safety"
      >
        <div className="grid grid-cols-2 gap-2">
          <Link href="/privacy" className="btn-secondary text-center">
            Privacy
          </Link>

          <Link href="/support" className="btn-secondary text-center">
            Support
          </Link>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-helper text-zinc-400">
              Ride Recon is not an emergency service. If you need urgent help,
              call 911 or local emergency services directly.
            </p>
          </div>
        </div>
      </PreferenceCard>
    </main>
  );
}