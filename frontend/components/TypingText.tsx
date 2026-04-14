"use client";

import { useEffect, useRef, useState } from "react";

function playTypingClick(audioContextRef: React.MutableRefObject<AudioContext | null>) {
  try {
    const AudioCtx =
      window.AudioContext ||
      // @ts-expect-error webkit fallback
      window.webkitAudioContext;

    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.012, ctx.currentTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.025);
  } catch {
    // stay silent if audio cannot play
  }
}

export function TypingText({
  text,
  speed = 40,
  startDelay = 0,
  showCursor = false,
  onComplete,
  enableSound = true,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  onComplete?: () => void;
  enableSound?: boolean;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayed("");
    setStarted(false);
    hasCompletedRef.current = false;

    const delayTimer = window.setTimeout(() => {
      setStarted(true);
    }, startDelay);

    return () => window.clearTimeout(delayTimer);
  }, [text, startDelay]);

  useEffect(() => {
    if (!started) return;

    let i = 0;

    const interval = window.setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));

      const nextChar = text[i - 1];
      const shouldClick =
        enableSound &&
        nextChar &&
        nextChar.trim() !== "" &&
        document.visibilityState === "visible";

      if (shouldClick) {
        playTypingClick(audioContextRef);
      }

      if (i >= text.length) {
        window.clearInterval(interval);

        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [started, text, speed, enableSound]);

  return (
    <span>
      {displayed}
      {showCursor && (
        <span className="ml-0.5 inline-block text-emerald-300 animate-pulse">▌</span>
        )}
    </span>
  );
}