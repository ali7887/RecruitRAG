import type { AnalysisResult } from "@/lib/types";
import { ScoreCard } from "@/components/score-card";

// Full analysis view: score card plus the three insight sections.
export function AnalysisResultView({ result }: { result: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-6">
      <ScoreCard result={result} />
      <Section title="Strengths" items={result.strengths} />
      <Section title="Gaps" items={result.gaps} />
      <Section title="Interview Questions" items={result.interviewQuestions} />
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg shadow-black/30">
      <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
