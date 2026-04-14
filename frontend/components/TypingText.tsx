"use client";

import { useEffect, useState } from "react";

export function TypingText({
  text,
  speed = 20,
  startDelay = 0,
  showCursor = false,
  onComplete,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  onComplete?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setStarted(false);

    const delayTimer = window.setTimeout(() => {
      setStarted(true);
    }, startDelay);

    return () => window.clearTimeout(delayTimer);
  }, [text, startDelay]);

  useEffect(() => {
    if (!started) return;

    let i = 0;

    const interval = window.setInterval(() => {
      const next = text.slice(0, i + 1);
      setDisplayed(next);
      i += 1;

      if (i >= text.length) {
        window.clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [started, text, speed, onComplete]);

  return (
    <span>
      {displayed}
      {showCursor ? (
        <span className="ml-0.5 inline-block animate-pulse">_</span>
      ) : null}
    </span>
  );
}