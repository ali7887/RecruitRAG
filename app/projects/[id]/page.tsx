import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreRing } from "@/components/score-ring";
import { SearchBar } from "@/components/search-bar";
import { analyzeCandidateAction } from "@/lib/actions";
import { getProjectDetails } from "@/lib/db/repository";
import { scoreColorClass } from "@/lib/multi";

export const dynamic = "force-dynamic";

// Split the free-text requirements field into individual keyword chips.
function parseKeywords(requirements: string): string[] {
  return requirements
    .split(/[,\n]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getProjectDetails(id);
  if (!details) notFound();

  const { project, analyses, candidateCount, averageScore } = details;
  const roleLabel = project.title.split("—")[0].trim() || project.title;
  const keywords = parseKeywords(project.requirements);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link href="/projects" className="text-xs text-zinc-500 hover:text-zinc-300">
              ← Projects
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{project.title}</h1>
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-300">{candidateCount}</span> candidate
              {candidateCount === 1 ? "" : "s"} evaluated
            </p>
          </div>
          {analyses.length > 0 && <ScoreRing score={averageScore} size={80} />}
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Left column: project metadata + add candidate */}
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
                Role
              </h2>
              {project.description ? (
                <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                  {project.description}
                </p>
              ) : (
                <p className="text-sm text-zinc-600">No description.</p>
              )}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs text-cyan-300"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <form
              action={analyzeCandidateAction}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
                Add candidate
              </h2>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="role" value={roleLabel} />
              <input type="hidden" name="jobDescription" value={project.description} />
              <input
                type="file"
                name="file"
                accept="application/pdf"
                required
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-200"
              />
              <button
                type="submit"
                className="h-10 self-start rounded-xl bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
              >
                Analyze &amp; add
              </button>
            </form>
          </div>

          {/* Right column: candidate board (ranked by match) + scoped search */}
          <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
              Candidates
            </h2>
            <SearchBar projectId={project.id} placeholder="Search candidates in this project…" />
            {analyses.length === 0 ? (
              <p className="text-sm text-zinc-600">No candidates yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {analyses.map((analysis) => (
                  <li
                    key={analysis.analysisId}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                  >
                    <Link
                      href={`/candidates/${analysis.candidateId}`}
                      className="min-w-0 flex-1 truncate text-sm text-zinc-300 hover:text-zinc-100"
                    >
                      {analysis.name}
                      <span className="ml-2 text-xs text-zinc-600">{analysis.role}</span>
                    </Link>
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
      </div>
    </main>
  );
}
