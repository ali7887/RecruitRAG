import { X } from "lucide-react";
import { scoreColorClass } from "@/lib/multi";
import { cn } from "@/lib/utils";

// Compact candidate row for the left column: name, optional mini-score, remove.
export function CandidateBadge({
  name,
  score,
  onRemove,
  disabled,
}: {
  name: string;
  score?: number;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-1.5">
      <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{name}</span>
      {typeof score === "number" && (
        <span className={cn("shrink-0 text-xs font-semibold tabular-nums", scoreColorClass(score))}>
          {score}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${name}`}
          className="shrink-0 rounded p-0.5 text-zinc-600 transition-colors hover:text-zinc-300 disabled:opacity-50"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
