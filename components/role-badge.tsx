import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Compact, toggleable role chip for multi-role / matrix modes.
export function RoleBadge({
  title,
  selected,
  onToggle,
  disabled,
}: {
  title: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50",
        selected
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700",
      )}
    >
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-[4px] border",
          selected ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-600",
        )}
      >
        {selected && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      <span className="truncate">{title}</span>
    </button>
  );
}
