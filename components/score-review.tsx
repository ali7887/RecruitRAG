"use client";

import { useState, useTransition } from "react";
import { reviewAnalysisAction } from "@/lib/actions";
import type { ReviewStatus } from "@/lib/constants";
import { reviewColorClass } from "@/lib/multi";

// Human-in-the-loop score review (Phase 18): approve, reject, or adjust the AI
// score. Adjust opens a small modal for a new score + reviewer notes.
export function ScoreReview({
  analysisId,
  aiScore,
  reviewStatus,
  adjustedFinalScore,
  reviewerNotes,
  canWrite,
}: {
  analysisId: string;
  aiScore: number;
  reviewStatus: ReviewStatus;
  adjustedFinalScore: number | null;
  reviewerNotes: string | null;
  canWrite: boolean;
}) {
  const [status, setStatus] = useState<ReviewStatus>(reviewStatus);
  const [adjusted, setAdjusted] = useState<number | null>(adjustedFinalScore);
  const [notes, setNotes] = useState<string | null>(reviewerNotes);
  const [modalOpen, setModalOpen] = useState(false);
  const [scoreInput, setScoreInput] = useState(String(adjustedFinalScore ?? aiScore));
  const [notesInput, setNotesInput] = useState(reviewerNotes ?? "");
  const [isPending, startTransition] = useTransition();

  function submit(next: ReviewStatus, score: number | null, reviewerNote: string | null) {
    startTransition(async () => {
      const result = await reviewAnalysisAction(analysisId, next, score, reviewerNote);
      if (result) {
        setStatus(result.reviewStatus as ReviewStatus);
        setAdjusted(result.adjustedFinalScore);
        setNotes(result.reviewerNotes);
        setModalOpen(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-widest text-zinc-500">Score review</h4>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${reviewColorClass(status)}`}
        >
          {status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-500">AI score</span>
        <span className="font-semibold tabular-nums text-zinc-200">{aiScore}</span>
        {status === "adjusted" && adjusted != null && (
          <>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-500">Adjusted</span>
            <span className="font-semibold tabular-nums text-amber-300">{adjusted}</span>
          </>
        )}
      </div>

      {notes && (
        <p className="text-xs text-zinc-500">
          <span className="text-zinc-600">Reviewer:</span> {notes}
        </p>
      )}

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={isPending}
            onClick={() => submit("approved", null, notes)}
            className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={isPending}
            onClick={() => submit("rejected", null, notes)}
            className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            disabled={isPending}
            onClick={() => {
              setScoreInput(String(adjusted ?? aiScore));
              setNotesInput(notes ?? "");
              setModalOpen(true);
            }}
            className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
          >
            Adjust
          </button>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-zinc-100">Adjust score</h3>
            <label className="text-xs text-zinc-500">New score (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoreInput}
              onChange={(event) => setScoreInput(event.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500/40"
            />
            <label className="text-xs text-zinc-500">Reviewer notes</label>
            <textarea
              value={notesInput}
              onChange={(event) => setNotesInput(event.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500/40"
            />
            <div className="flex gap-2">
              <button
                disabled={isPending}
                onClick={() => {
                  const parsed = Number(scoreInput);
                  submit("adjusted", Number.isFinite(parsed) ? parsed : aiScore, notesInput.trim() || null);
                }}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
