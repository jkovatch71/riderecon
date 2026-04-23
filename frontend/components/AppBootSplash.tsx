"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppBoot } from "@/components/AppBootProvider";

const MIN_SPLASH_MS = 850;
const FADE_DURATION_MS = 450;

export function AppBootSplash() {
  const pathname = usePathname();
  const { appReady } = useAppBoot();

  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(true);

  const shouldWaitForReadySignal = useMemo(() => pathname === "/", [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumElapsed(true);
    }, MIN_SPLASH_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const readyToDismiss = shouldWaitForReadySignal
      ? minimumElapsed && appReady
      : minimumElapsed;

    if (!readyToDismiss || fadeOut) return;

    setFadeOut(true);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, FADE_DURATION_MS);

    return () => window.clearTimeout(removeTimer);
  }, [appReady, fadeOut, minimumElapsed, shouldWaitForReadySignal]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0b1f14] transition-opacity duration-[450ms] ${
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