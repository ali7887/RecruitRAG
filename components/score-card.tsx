"use client";

import { useEffect, useState } from "react";
import { RUBRIC_POSITIVE, type EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { scoreColorClass } from "@/lib/multi";
import { cn } from "@/lib/utils";

const SIZE = 112;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function rubricLine(result: EvaluatedAnalysis): string {
  if (!result.rubricScores) {
    return `Sim ${result.similarityScore} · LLM ${result.llmScore}`;
  }
  return RUBRIC_POSITIVE.map((d) => `${d.short} ${result.rubricScores![d.key]}`).join(" · ");
}

// Circular score ring + metric bars (full), or a slim row (compact, multi mode).
export function ScoreCard({
  result,
  compact = false,
  label,
}: {
  result: EvaluatedAnalysis;
  compact?: boolean;
  label?: string;
}) {
  // Animate the ring from 0 once mounted (full mode only, but hooks run always).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const color = scoreColorClass(result.finalScore);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
        <span className={cn("w-9 shrink-0 text-right text-2xl font-semibold tabular-nums", color)}>
          {result.finalScore}
        </span>
        <div className="min-w-0 flex-1">
          {label && <p className="truncate text-sm text-zinc-200">{label}</p>}
          <p className="truncate text-xs text-zinc-500">{rubricLine(result)}</p>
        </div>
      </div>
    );
  }

  const shown = mounted ? result.finalScore : 0;
  const offset = CIRCUMFERENCE * (1 - shown / 100);

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg shadow-black/30 sm:flex-row sm:gap-6">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            className="text-zinc-800"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
          />
          <circle
            className={cn("transition-[stroke-dashoffset] duration-1000 ease-out", color)}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn("text-4xl font-semibold tracking-tight", color)}>
            {result.finalScore}
          </span>
          <span className="text-xs text-zinc-500">/ 100</span>
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col gap-5">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Match Score
        </span>
        <MetricBar label="Similarity" value={result.similarityScore} mounted={mounted} />
        <MetricBar label="LLM Score" value={result.llmScore} mounted={mounted} />

        {result.rubricScores && (
          <p className="text-xs text-zinc-500">
            {RUBRIC_POSITIVE.map(
              (dimension) => `${dimension.short} ${result.rubricScores![dimension.key]}`,
            ).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  mounted,
}: {
  label: string;
  value: number;
  mounted: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-200">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-400/80 transition-[width] duration-1000 ease-out"
          style={{ width: `${mounted ? value : 0}%` }}
        />
      </div>
    </div>
  );
}
