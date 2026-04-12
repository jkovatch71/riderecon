import { StatusColor } from "@/lib/types";
import clsx from "clsx";

const classes: Record<StatusColor, string> = {
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  yellow: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  red: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function StatusPill({
  color,
  label,
}: {
  color: StatusColor;
  label: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        classes[color]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}