"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Compact cyan radial progress, matching the ScoreCard ring style. Used for
// project metrics (average match score) across the projects dashboard/detail.
export function ScoreRing({
  score,
  size = 72,
  stroke = 7,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate from 0 once mounted for a subtle, layout-stable reveal.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const shown = mounted ? score : 0;
  const offset = circumference * (1 - shown / 100);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="text-zinc-800"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          className="text-cyan-400 transition-[stroke-dashoffset] duration-1000 ease-out"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={cn("absolute text-sm font-semibold tabular-nums text-cyan-300")}>
        {score}
      </span>
    </div>
  );
}
