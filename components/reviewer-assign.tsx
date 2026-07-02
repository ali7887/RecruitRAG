"use client";

import { useState, useTransition } from "react";
import { assignReviewerAction } from "@/lib/actions";

// Reviewer assignment (Phase 19). Only Owner/Recruiter are assignable; Viewer
// is not. Shows an initials badge for the current assignee.
const REVIEWERS = ["Owner", "Recruiter"];

export function ReviewerAssign({
  candidateId,
  assignedReviewerId,
  canWrite,
}: {
  candidateId: string;
  assignedReviewerId: string | null;
  canWrite: boolean;
}) {
  const [assigned, setAssigned] = useState<string | null>(assignedReviewerId);
  const [isPending, startTransition] = useTransition();

  function change(value: string) {
    const next = value === "" ? null : value;
    startTransition(async () => {
      const result = await assignReviewerAction(candidateId, next);
      if (result.success) setAssigned(next);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {assigned && (
        <span className="flex size-6 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-[10px] font-semibold text-cyan-300">
          {assigned.slice(0, 2).toUpperCase()}
        </span>
      )}
      {canWrite ? (
        <select
          value={assigned ?? ""}
          disabled={isPending}
          onChange={(event) => change(event.target.value)}
          aria-label="Assign reviewer"
          className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-cyan-500/40 disabled:opacity-50"
        >
          <option value="">Assign reviewer…</option>
          {REVIEWERS.map((reviewer) => (
            <option key={reviewer} value={reviewer}>
              {reviewer}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-zinc-500">{assigned ?? "Unassigned"}</span>
      )}
    </div>
  );
}
