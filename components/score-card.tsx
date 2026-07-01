import type { AnalysisResult } from "@/lib/types";

// Headline match score with the two component scores beneath it.
export function ScoreCard({ result }: { result: AnalysisResult }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-lg shadow-black/30">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Match Score
        </span>
        <span className="text-7xl font-semibold tracking-tight text-emerald-400">
          {result.finalScore}
        </span>
        <span className="text-sm text-zinc-500">out of 100</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <Metric label="Similarity" value={result.similarityScore} />
        <Metric label="LLM Score" value={result.llmScore} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-center">
      <div className="text-2xl font-semibold text-zinc-100">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}
