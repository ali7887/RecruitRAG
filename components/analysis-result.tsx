import type { Evidence, EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { ScoreCard } from "@/components/score-card";

// Full analysis view: score card, optional evidence chips, and insight sections.
export function AnalysisResultView({ result }: { result: EvaluatedAnalysis }) {
  return (
    <div className="flex flex-col gap-4">
      <ScoreCard result={result} />
      {result.evidence && <EvidenceRow evidence={result.evidence} />}
      <Section title="Strengths" items={result.strengths} />
      <Section title="Gaps" items={result.gaps} />
      <Section title="Interview Questions" items={result.interviewQuestions} />
    </div>
  );
}

// Ranked list of compact score cards for multi-candidate / multi-role modes.
export function MultiResultList({
  items,
}: {
  items: { key: string; label: string; result: EvaluatedAnalysis }[];
}) {
  const ranked = [...items].sort((a, b) => b.result.finalScore - a.result.finalScore);

  return (
    <div className="flex flex-col gap-2">
      {ranked.map((item, index) => (
        <ScoreCard
          key={item.key}
          result={item.result}
          compact
          label={`${index + 1}. ${item.label}`}
        />
      ))}
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: Evidence }) {
  const matched = evidence.matchedSkills.slice(0, 5);
  const missing = evidence.missingSkills.slice(0, 5);
  if (matched.length === 0 && missing.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg shadow-black/30">
      <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        Evidence
      </h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {matched.map((skill) => (
          <span
            key={`m-${skill}`}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
          >
            {skill}
          </span>
        ))}
        {missing.map((skill) => (
          <span
            key={`x-${skill}`}
            className="rounded-full border border-zinc-700 bg-zinc-800/40 px-2 py-0.5 text-xs text-zinc-500"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg shadow-black/30">
      <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5">
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
