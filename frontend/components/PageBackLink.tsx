"use client";

import { useRouter } from "next/navigation";

export function PageBackLink({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 transition hover:text-zinc-200 active:scale-95"
      aria-label="Go back"
    >
      <span aria-hidden="true" className="text-sm leading-none">
        ←
      </span>
      Back
    </button>
  );
}