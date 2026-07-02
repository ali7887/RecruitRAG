"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CANDIDATE_STATUSES, type CandidateStatus } from "@/lib/constants";
import { updateAnalysisNotesAction, updateAnalysisStatusAction } from "@/lib/actions";
import type { ProjectAnalysis } from "@/lib/db/repository";
import { scoreColorClass, statusColorClass } from "@/lib/multi";

type Filter = CandidateStatus | "all";

// Project candidate board: ranked rows with an inline status dropdown, an
// expandable notes editor, and a status filter toolbar. Interactive, so it
// owns the client-side filter state and calls the analysis Server Actions.
export function CandidateBoard({
  analyses,
  canWrite,
}: {
  analyses: ProjectAnalysis[];
  canWrite: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? analyses : analyses.filter((a) => a.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {CANDIDATE_STATUSES.map((status) => (
          <FilterChip key={status} active={filter === status} onClick={() => setFilter(status)}>
            {status}
          </FilterChip>
        ))}
        {filter !== "all" && (
          <button
            onClick={() => setFilter("all")}
            className="ml-auto text-xs text-zinc-600 hover:text-zinc-300"
          >
            Reset
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {filter === "all" ? "No candidates yet." : "No candidates in this stage."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((analysis) => (
            <BoardRow key={analysis.analysisId} analysis={analysis} canWrite={canWrite} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors ${
        active
          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
          : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function BoardRow({ analysis, canWrite }: { analysis: ProjectAnalysis; canWrite: boolean }) {
  const [status, setStatus] = useState<CandidateStatus>(analysis.status);
  const [notes, setNotes] = useState(analysis.notes);
  const [draft, setDraft] = useState(analysis.notes);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function changeStatus(next: CandidateStatus) {
    setStatus(next);
    startTransition(() => {
      void updateAnalysisStatusAction(analysis.analysisId, next);
    });
  }

  function saveNotes() {
    const value = draft.trim();
    setNotes(value);
    setEditing(false);
    startTransition(() => {
      void updateAnalysisNotesAction(analysis.analysisId, value);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
      <div className="flex items-center gap-3">
        <Link
          href={`/candidates/${analysis.candidateId}`}
          className="min-w-0 flex-1 truncate text-sm text-zinc-300 hover:text-zinc-100"
        >
          {analysis.name}
          <span className="ml-2 text-xs text-zinc-600">{analysis.role}</span>
        </Link>
        <select
          value={status}
          onChange={(event) => changeStatus(event.target.value as CandidateStatus)}
          disabled={isPending || !canWrite}
          aria-label="Pipeline status"
          className={`shrink-0 rounded-md border bg-zinc-900 px-2 py-1 text-xs capitalize outline-none disabled:opacity-60 ${statusColorClass(status)}`}
        >
          {CANDIDATE_STATUSES.map((option) => (
            <option key={option} value={option} className="bg-zinc-900 capitalize text-zinc-200">
              {option}
            </option>
          ))}
        </select>
        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${scoreColorClass(analysis.finalScore)}`}
        >
          {analysis.finalScore}
        </span>
      </div>

      {editing ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            autoFocus
            placeholder="Add a note…"
            className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500/40"
          />
          <div className="flex gap-2">
            <button
              onClick={saveNotes}
              disabled={isPending}
              className="rounded-md bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setDraft(notes);
                setEditing(false);
              }}
              className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : notes ? (
        canWrite ? (
          <button
            onClick={() => setEditing(true)}
            className="text-left text-xs text-zinc-500 hover:text-zinc-300"
          >
            <span className="text-zinc-600">Note:</span> {notes}
          </button>
        ) : (
          <p className="text-xs text-zinc-500">
            <span className="text-zinc-600">Note:</span> {notes}
          </p>
        )
      ) : canWrite ? (
        <button
          onClick={() => setEditing(true)}
          className="self-start text-xs text-zinc-600 hover:text-cyan-300"
        >
          + Add note
        </button>
      ) : null}
    </li>
  );
}
