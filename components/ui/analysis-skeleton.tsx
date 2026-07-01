// Loading placeholder shown while analysis runs. Mirrors the AnalysisResult
// layout (score card + three insight sections) so the transition feels stable.
export function AnalysisSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {/* Score card placeholder */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-lg shadow-black/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="h-16 w-28 animate-pulse rounded-xl bg-zinc-800" />
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="h-20 animate-pulse rounded-xl bg-zinc-800/70" />
          <div className="h-20 animate-pulse rounded-xl bg-zinc-800/70" />
        </div>
      </div>

      {/* Strengths / Gaps / Interview Questions placeholders */}
      {["strengths", "gaps", "questions"].map((key) => (
        <SkeletonSection key={key} />
      ))}
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg shadow-black/30">
      <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="mt-5 flex flex-col gap-3">
        <div className="h-3 w-full animate-pulse rounded bg-zinc-800/70" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-800/70" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-800/70" />
      </div>
    </div>
  );
}
