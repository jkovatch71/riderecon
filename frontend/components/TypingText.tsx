"use client";

import { useEffect, useRef, useState } from "react";

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

  const hasCompletedRef = useRef(false);

  // Reset when text changes
  useEffect(() => {
    setDisplayed("");
    setStarted(false);
    hasCompletedRef.current = false;

    const delayTimer = window.setTimeout(() => {
      setStarted(true);
    }, startDelay);

    return () => window.clearTimeout(delayTimer);
  }, [text, startDelay]);

  // Typing effect
  useEffect(() => {
    if (!started) return;

    let i = 0;

    const interval = window.setInterval(() => {
      i += 1;
      const next = text.slice(0, i);
      setDisplayed(next);

      if (i >= text.length) {
        window.clearInterval(interval);

        // Ensure onComplete only fires once
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [started, text, speed, onComplete]);

  return (
    <span>
      {displayed}
      {showCursor && (
        <span className="ml-0.5 inline-block animate-pulse">_</span>
      )}
    </span>
  );
}