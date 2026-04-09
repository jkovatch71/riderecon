"use client";

import { useEffect, useState } from "react";

type TextSize = "compact" | "standard" | "large";

export function TextSizeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [textSize, setTextSize] = useState<TextSize>("standard");

  useEffect(() => {
    const saved = window.localStorage.getItem("app-text-size") as TextSize | null;
    if (saved === "compact" || saved === "standard" || saved === "large") {
      setTextSize(saved);
    }
  }, []);

  const className =
    textSize === "compact"
      ? "app-text-compact"
      : textSize === "large"
      ? "app-text-large"
      : "app-text-standard";

  return <div className={className}>{children}</div>;
}