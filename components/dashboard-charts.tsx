"use client";

import { useEffect, useState } from "react";
import type { DashboardData, ScoreBucket, SkillCount } from "@/lib/analytics";

const RING_SIZE = 104;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Insights dashboard visuals. All data is pre-computed server-side; this layer
// only renders. Deep charcoal surfaces, cyan/teal data accents.
export function DashboardCharts({ data }: { data: DashboardData }) {
  // Trigger enter animations for rings and bars once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { stats, skills, distribution } = data;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Average score ring */}
      <Panel title="Average Match">
        <div className="flex flex-1 items-center justify-center py-2">
          <RadialStat value={stats.averageScore} mounted={mounted} caption="avg score" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Similarity" value={`${stats.averageSimilarity}%`} />
          <MiniStat label="LLM" value={`${stats.averageLlm}%`} />
        </div>
      </Panel>

      {/* Totals */}
      <Panel title="Pipeline">
        <div className="flex flex-1 flex-col justify-center gap-3">
          <BigStat label="Candidates" value={stats.totalCandidates} />
          <BigStat label="Analyses" value={stats.totalAnalyses} />
        </div>
      </Panel>

      {/* Score distribution histogram */}
      <Panel title="Score Distribution">
        <ScoreHistogram buckets={distribution} mounted={mounted} />
      </Panel>

      {/* Skill distribution spans full width below */}
      <div className="lg:col-span-3">
        <Panel title="Top Matched Skills">
          <SkillBars skills={skills} mounted={mounted} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function RadialStat({
  value,
  mounted,
  caption,
}: {
  value: number;
  mounted: boolean;
  caption: string;
}) {
  const shown = mounted ? value : 0;
  const offset = RING_CIRCUMFERENCE * (1 - shown / 100);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          className="text-zinc-800"
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
        />
        <circle
          className="text-cyan-400 transition-[stroke-dashoffset] duration-1000 ease-out"
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tracking-tight text-cyan-300">{value}</span>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">{caption}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-zinc-100">{value}</span>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-800/70 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-3xl font-semibold tabular-nums text-cyan-300">{value}</span>
    </div>
  );
}

function ScoreHistogram({ buckets, mounted }: { buckets: ScoreBucket[]; mounted: boolean }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <div className="flex flex-1 items-end gap-1.5">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-24 w-full items-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-cyan-500/30 to-cyan-400 transition-[height] duration-700 ease-out"
              style={{ height: `${mounted ? (bucket.count / max) * 100 : 0}%` }}
              title={`${bucket.count}`}
            />
          </div>
          <span className="text-[9px] tabular-nums text-zinc-600">{bucket.label}</span>
        </div>
      ))}
    </div>
  );
}

function SkillBars({ skills, mounted }: { skills: SkillCount[]; mounted: boolean }) {
  if (skills.length === 0) {
    return <p className="text-sm text-zinc-600">No skill data yet.</p>;
  }
  const max = Math.max(1, ...skills.map((skill) => skill.count));

  return (
    <ul className="flex flex-col gap-2.5">
      {skills.map((skill) => (
        <li key={skill.skill} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-zinc-300">{skill.skill}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-[width] duration-700 ease-out"
              style={{ width: `${mounted ? (skill.count / max) * 100 : 0}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs tabular-nums text-zinc-500">
            {skill.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
