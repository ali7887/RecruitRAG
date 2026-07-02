"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCandidateAction } from "@/lib/actions";

// Delete a candidate (Owner/Recruiter). Two-step confirm, no dialog.
export function DeleteCandidateButton({ candidateId }: { candidateId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    startTransition(async () => {
      const result = await deleteCandidateAction(candidateId);
      if (result.success) {
        router.push("/candidates");
      } else {
        setError(result.error ?? "Failed to delete");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={remove}
          disabled={isPending}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
        >
          {isPending ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}
