"use client";

import { useState, useTransition } from "react";
import { clearAutomationAction } from "@/lib/actions";

// "Automated decision" badge (Phase 20) with an Owner/Recruiter override.
export function AutomationBadge({
  analysisId,
  decision,
  canWrite,
}: {
  analysisId: string;
  decision: string | null;
  canWrite: boolean;
}) {
  const [current, setCurrent] = useState<string | null>(decision);
  const [isPending, startTransition] = useTransition();

  if (!current) return null;

  const lower = current.toLowerCase();
  const color = lower.includes("reject")
    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
    : lower.includes("flag")
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : "border-sky-500/40 bg-sky-500/10 text-sky-300";

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${color}`}>
        Automated: {current}
      </span>
      {canWrite && (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await clearAutomationAction(analysisId);
              if (result) setCurrent(result.automationDecision);
            })
          }
          className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
        >
          Undo
        </button>
      )}
    </div>
  );
}
