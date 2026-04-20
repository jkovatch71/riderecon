"use client";

import { useEffect, useMemo, useState } from "react";

type TypewriterBriefingProps = {
  text: string;
  initLabel?: string;
  initBlinkCount?: number;
  typingSpeedMs?: number;
  className?: string;
};

export function TypewriterBriefing({
  text,
  initLabel = "Initializing...",
  initBlinkCount = 4,
  typingSpeedMs = 22,
  className = "",
}: TypewriterBriefingProps) {
  const [phase, setPhase] = useState<"init" | "typing" | "done">("init");
  const [typed, setTyped] = useState("");

  const initDuration = useMemo(() => initBlinkCount * 500, [initBlinkCount]);

  useEffect(() => {
    setPhase("init");
    setTyped("");

    const initTimer = window.setTimeout(() => {
      setPhase("typing");
    }, initDuration);

    return () => window.clearTimeout(initTimer);
  }, [text, initDuration]);

  useEffect(() => {
    if (phase !== "typing") return;

    if (typed.length >= text.length) {
      setPhase("done");
      return;
    }

    const timer = window.setTimeout(() => {
      setTyped(text.slice(0, typed.length + 1));
    }, typingSpeedMs);

    return () => window.clearTimeout(timer);
  }, [phase, typed, text, typingSpeedMs]);

  const displayText = phase === "init" ? initLabel : typed;

  return (
    <div className={`flex items-start ${className}`}>
      <span>{displayText}</span>
      <span
        className={`ml-1 inline-block h-[1em] w-[0.55ch] rounded-sm bg-emerald-300 align-middle ${
          phase === "typing" || phase === "done" ? "animate-pulse" : "animate-pulse"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}