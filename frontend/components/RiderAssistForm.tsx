"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  CircleDot,
  Cross,
  Droplets,
  Flame,
  HelpCircle,
  LocateFixed,
  Phone,
  Settings,
  ShieldAlert,
  Smartphone,
  UserX,
  Waves,
  Wrench,
} from "lucide-react";
import {
  createRiderAssistRequest,
  type RiderAssistDetail,
  type RiderAssistType,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type AssistCategory = {
  type: RiderAssistType;
  label: string;
  icon: React.ElementType;
  helper: string;
};

type AssistDetailOption = {
  detail: RiderAssistDetail;
  label: string;
  icon: React.ElementType;
  helper: string;
};

const categories: AssistCategory[] = [
  {
    type: "tire",
    label: "Tire",
    icon: CircleDot,
    helper: "Flat, low tire, tubeless issue, tube, plug, pump, or CO₂.",
  },
  {
    type: "mechanical",
    label: "Mechanical",
    icon: Wrench,
    helper: "Brake, chain, shifting, wheel, cockpit, or tool issue.",
  },
  {
    type: "crash",
    label: "Crash",
    icon: Cross,
    helper: "Crash, injury, or rider needs urgent help.",
  },
  {
    type: "other",
    label: "Other",
    icon: HelpCircle,
    helper: "Water, phone issue, lost rider, animal, heat, or something else.",
  },
];

const detailsByType: Record<RiderAssistType, AssistDetailOption[]> = {
  tire: [
    {
      detail: "need_air",
      label: "Need Air",
      icon: Waves,
      helper: "Need pump, CO₂, or help reseating/inflating tire.",
    },
    {
      detail: "tube_patch",
      label: "Tube / Patch",
      icon: CircleDot,
      helper: "Need a tube, patch kit, or help with a tube setup.",
    },
    {
      detail: "plug_sealant",
      label: "Plug / Sealant",
      icon: Droplets,
      helper: "Tubeless leak, thorn, plug, or sealant issue.",
    },
    {
      detail: "tire_off_bead",
      label: "Off Bead",
      icon: LocateFixed,
      helper: "Tire bead came unseated or will not hold air.",
    },
    {
      detail: "not_sure",
      label: "Not Sure",
      icon: HelpCircle,
      helper: "Tire issue, but not sure what is needed.",
    },
  ],
  mechanical: [
    {
      detail: "brakes",
      label: "Brakes",
      icon: ShieldAlert,
      helper: "Brake lever, cable, pads, caliper, or rotor issue.",
    },
    {
      detail: "chain",
      label: "Chain",
      icon: Settings,
      helper: "Dropped, stuck, broken, or jammed chain.",
    },
    {
      detail: "shifting",
      label: "Shifting",
      icon: Bike,
      helper: "Derailleur, cable, hanger, or shifting problem.",
    },
    {
      detail: "wheel_rotor",
      label: "Wheel / Rotor",
      icon: CircleDot,
      helper: "Bent rotor, wheel issue, rim damage, or rubbing.",
    },
    {
      detail: "cockpit",
      label: "Cockpit",
      icon: Wrench,
      helper: "Loose bars, stem, saddle, lever, or controls.",
    },
    {
      detail: "not_sure",
      label: "Not Sure",
      icon: HelpCircle,
      helper: "Mechanical issue, but not sure what is wrong.",
    },
  ],
  crash: [
    {
      detail: "im_ok",
      label: "I'm OK",
      icon: Cross,
      helper: "Crash happened, but mostly need a check-in or bike help.",
    },
    {
      detail: "need_help",
      label: "Need Help",
      icon: AlertTriangle,
      helper: "Need another rider to come assist.",
    },
    {
      detail: "injury",
      label: "Injury",
      icon: ShieldAlert,
      helper: "Possible injury. Riders nearby should use caution and help.",
    },
    {
      detail: "call_911",
      label: "Call 911",
      icon: Phone,
      helper: "Emergency situation. Call 911 directly; Ride Recon does not contact emergency services.",
    },
  ],
  other: [
    {
      detail: "water",
      label: "Water",
      icon: Droplets,
      helper: "Need water or hydration help.",
    },
    {
      detail: "phone",
      label: "Phone",
      icon: Smartphone,
      helper: "Phone, battery, signal, or contact issue.",
    },
    {
      detail: "lost_rider",
      label: "Lost Rider",
      icon: UserX,
      helper: "Separated from group or rider may be lost.",
    },
    {
      detail: "animal",
      label: "Animal",
      icon: AlertTriangle,
      helper: "Animal encounter or wildlife concern.",
    },
    {
      detail: "heat_issue",
      label: "Heat",
      icon: Flame,
      helper: "Heat, fatigue, cramps, or overheating concern.",
    },
    {
      detail: "other",
      label: "Other",
      icon: HelpCircle,
      helper: "Something else. Add a short note if possible.",
    },
  ],
};

type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function getCurrentLocation(): Promise<LocationPayload | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );
  });
}

export function RiderAssistForm() {
  const { user, session } = useAuth();

  const [assistType, setAssistType] = useState<RiderAssistType | null>(null);
  const [assistDetail, setAssistDetail] =
    useState<RiderAssistDetail | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestPosted, setRequestPosted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const accessToken = session?.access_token;

  const selectedCategory = useMemo(
    () => categories.find((category) => category.type === assistType),
    [assistType]
  );

  const detailOptions = assistType ? detailsByType[assistType] : [];

  const selectedDetail = useMemo(
    () => detailOptions.find((option) => option.detail === assistDetail),
    [assistDetail, detailOptions]
  );

  function chooseCategory(type: RiderAssistType) {
    setAssistType(type);
    setAssistDetail(null);
    setMessage(null);
  }

  function resetForAnotherRequest() {
    setRequestPosted(false);
    setAssistType(null);
    setAssistDetail(null);
    setMessage(null);
    setNote("");
  }

  async function submitAssistRequest() {
    if (!user || !accessToken || submitting || !assistType || !assistDetail) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const location = await getCurrentLocation();

      await createRiderAssistRequest(
        {
          assist_type: assistType,
          assist_detail: assistDetail,
          note,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          location_accuracy_meters: location?.accuracy ?? null,
        },
        accessToken
      );

      setRequestPosted(true);
      setMessage(null);
    } catch {
      setMessage("Unable to post assist request right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <section className="card p-5">
        <div className="space-y-1">
          <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
            Rider Assist
          </h2>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Sign in required
          </p>
        </div>

        <div className="my-3 h-px bg-zinc-800" />

        <p className="text-helper text-zinc-400">
          Sign in to request help for a tire issue, mechanical problem, crash,
          or other trail-side problem.
        </p>

        <Link href="/auth/login?next=/help" className="btn-primary mt-4 inline-block">
          Sign in
        </Link>
      </section>
    );
  }

  if (requestPosted) {
    return (
      <section className="card p-5">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="font-brand text-section-title font-semibold uppercase text-emerald-300">
            Assist Request Posted
          </p>

          <p className="text-helper mt-2 text-zinc-300">
            Your help pin is now active on the map.
          </p>

          <p className="text-helper mt-2 text-zinc-500">
            Keep your phone handy. Another rider may use your pin and note to
            find you.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/trails?view=map" className="btn-primary text-center">
            View Map
          </Link>

          <button
            type="button"
            onClick={resetForAnotherRequest}
            className="btn-secondary"
          >
            Post Another
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="space-y-1">
        <h2 className="font-brand text-section-title font-semibold uppercase text-zinc-100">
          Rider Assist
        </h2>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Drop a help pin
        </p>
      </div>

      <div className="my-3 h-px bg-zinc-800" />

      {!assistType ? (
        <>
          <p className="text-helper text-zinc-400">
            What happened? Pick the closest option.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  key={category.type}
                  type="button"
                  onClick={() => chooseCategory(category.type)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-center text-zinc-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 active:scale-[0.98]"
                >
                  <Icon className="mx-auto h-7 w-7" />
                  <span className="mt-2 block text-xs font-semibold uppercase tracking-wide">
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-helper text-zinc-500">Step 1</p>
              <p className="font-brand text-section-title font-semibold uppercase text-zinc-100">
                {selectedCategory?.label}
              </p>
              <p className="text-helper mt-1 text-zinc-500">
                {selectedCategory?.helper}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAssistType(null);
                setAssistDetail(null);
                setMessage(null);
              }}
              className="text-helper text-zinc-500 transition hover:text-zinc-300"
            >
              Change
            </button>
          </div>

          <div className="my-3 h-px bg-zinc-800" />

          <p className="text-helper text-zinc-400">
            What do you need? Tap the closest match.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {detailOptions.map((option) => {
              const Icon = option.icon;
              const active = assistDetail === option.detail;

              return (
                <button
                  key={option.detail}
                  type="button"
                  onClick={() => {
                    setAssistDetail(option.detail);
                    setMessage(null);
                  }}
                  aria-pressed={active}
                  className={`rounded-2xl border p-3 text-center transition active:scale-[0.98] ${
                    active
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="mx-auto h-6 w-6" />
                  <span className="mt-2 block text-xs font-semibold uppercase tracking-wide">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDetail ? (
            <p className="text-helper mt-3 text-zinc-500">
              {selectedDetail.helper}
            </p>
          ) : null}

          <div className="mt-4">
            <label className="label">Note</label>
            <textarea
              className="input mt-2 min-h-24"
              maxLength={255}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional: add a short note or landmark"
            />
          </div>

          <button
            type="button"
            onClick={submitAssistRequest}
            disabled={submitting || !assistDetail}
            className={`btn-primary mt-4 w-full ${
              submitting || !assistDetail
                ? "cursor-not-allowed opacity-60 saturate-50"
                : ""
            }`}
          >
            {submitting ? "Dropping pin..." : "Request Assist"}
          </button>

          {assistDetail === "call_911" ? (
            <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              Ride Recon does not contact emergency services. Call 911 directly
              if there is an emergency.
            </p>
          ) : null}

          {message ? (
            <p className="mt-3 text-sm text-rose-300">{message}</p>
          ) : null}
        </>
      )}
    </section>
  );
}