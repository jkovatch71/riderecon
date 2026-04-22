"use client";

import { useEffect } from "react";

type TextSize = "compact" | "standard" | "large";

function getStoredTextSize(): TextSize {
  if (typeof window === "undefined") return "standard";

  const saved = window.localStorage.getItem("app-text-size");
  if (saved === "compact" || saved === "standard" || saved === "large") {
    return saved;
  }

  return "standard";
}

function applyTextSizeClass(value: TextSize) {
  if (typeof document === "undefined") return;

  const classes = ["app-text-compact", "app-text-standard", "app-text-large"];

  document.documentElement.classList.remove(...classes);
  document.body.classList.remove(...classes);

  const className =
    value === "compact"
      ? "app-text-compact"
      : value === "large"
        ? "app-text-large"
        : "app-text-standard";

  document.documentElement.classList.add(className);
  document.body.classList.add(className);
}

export function TextSizeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyTextSizeClass(getStoredTextSize());

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "app-text-size") return;
      applyTextSizeClass(getStoredTextSize());
    };

    const handleLocalUpdate = () => {
      applyTextSizeClass(getStoredTextSize());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("app-text-size-change", handleLocalUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("app-text-size-change", handleLocalUpdate);
    };
  }, []);

  return <>{children}</>;
}