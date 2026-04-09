import { StatusColor } from "@/lib/types";
import clsx from "clsx";

const classes: Record<StatusColor, string> = {
  green: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
  yellow: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  red: "bg-rose-600/20 text-rose-300 border-rose-600/30"
};

export function StatusPill({ color, label }: { color: StatusColor; label: string }) {
  return (
    <span className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", classes[color])}>
      {label}
    </span>
  );
}
