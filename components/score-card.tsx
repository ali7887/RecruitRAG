"use client";

import { useEffect, useState } from "react";
import { RUBRIC_POSITIVE, type EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { cn } from "@/lib/utils";

const SIZE = 112;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Score thresholds → accent color (used for both ring stroke and number).
function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-cyan-400";
  if (score >= 55) return "text-amber-400";
  return "text-red-400";
}

// Circular score ring (left) with horizontal metric bars (right).
export function ScoreCard({ result }: { result: EvaluatedAnalysis }) {
  // Animate from 0 to the real values once mounted on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const shown = mounted ? result.finalScore : 0;
  const offset = CIRCUMFERENCE * (1 - shown / 100);
  const color = scoreColor(result.finalScore);

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
