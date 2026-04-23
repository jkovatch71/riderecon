"use client";

import { useEffect, useState } from "react";

export function AppBootSplash() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setFadeOut(true);
    }, 900);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, 1450);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0b1f14] transition-opacity duration-500 ${
        fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <img
        src="/splash/splash-1440x3120.png"
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}