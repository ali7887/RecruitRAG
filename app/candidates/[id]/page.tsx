import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate, listAnalysesByCandidate } from "@/lib/db/repository";
import { scoreColorClass } from "@/lib/multi";

export const dynamic = "force-dynamic";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const analyses = await listAnalysesByCandidate(id);
  const summary = candidate.resumeText.trim().slice(0, 600);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <Link href="/candidates" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Candidates
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{candidate.name}</h1>
          {candidate.email && <p className="text-sm text-zinc-400">{candidate.email}</p>}
        </header>

        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Resume summary
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
            {summary ? `${summary}${candidate.resumeText.length > 600 ? "…" : ""}` : "No resume text stored."}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Scores across roles
          </h2>
          {analyses.length === 0 ? (
            <p className="text-sm text-zinc-600">No analyses yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {analyses.map((analysis) => (
                <li
                  key={analysis.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                    {analysis.role}
                    <span className="ml-2 text-xs text-zinc-600">
                      Sim {analysis.similarityScore} · LLM {analysis.llmScore}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${scoreColorClass(analysis.finalScore)}`}
                  >
                    {analysis.finalScore}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
