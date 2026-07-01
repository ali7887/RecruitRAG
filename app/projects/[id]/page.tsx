import Link from "next/link";
import { notFound } from "next/navigation";
import { MultiAnalysisTable } from "@/components/multi-analysis-table";
import { analyzeCandidateAction } from "@/lib/actions";
import { analysisRowToEvaluated } from "@/lib/db/adapters";
import { getProject, listAnalysesByProject, listCandidates } from "@/lib/db/repository";
import type { EvaluatedAnalysis } from "@/lib/evaluation-rubric";
import { cellKey, scoreColorClass, type Candidate, type Role } from "@/lib/multi";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [analyses, candidates] = await Promise.all([
    listAnalysesByProject(id),
    listCandidates(),
  ]);
  const nameById = new Map(candidates.map((candidate) => [candidate.id, candidate.name]));
  const roleLabel = project.title.split("—")[0].trim() || project.title;

  // Build the candidates × roles matrix from stored analyses.
  const candidateIds = [...new Set(analyses.map((analysis) => analysis.candidateId))];
  const roleNames = [...new Set(analyses.map((analysis) => analysis.role))];
  const matrixCandidates: Candidate[] = candidateIds.map((cid) => ({
    id: cid,
    name: nameById.get(cid) ?? "Unknown",
    file: null,
  }));
  const matrixRoles: Role[] = roleNames.map((name) => ({
    id: name,
    title: name,
    short: name,
    text: "",
  }));
  const results: Record<string, EvaluatedAnalysis> = {};
  for (const analysis of analyses) {
    results[cellKey(analysis.candidateId, analysis.role)] = analysisRowToEvaluated(analysis);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <Link href="/projects" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Projects
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{project.title}</h1>
          {project.description && (
            <p className="max-w-2xl whitespace-pre-wrap text-sm text-zinc-400">
              {project.description}
            </p>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add candidate */}
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
              className="h-10 self-start rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Analyze &amp; add
            </button>
          </form>

          {/* Analyses list */}
          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
              Analyses
            </h2>
            {analyses.length === 0 ? (
              <p className="text-sm text-zinc-600">No analyses yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {analyses.map((analysis) => (
                  <li
                    key={analysis.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                  >
                    <Link
                      href={`/candidates/${analysis.candidateId}`}
                      className="min-w-0 flex-1 truncate text-sm text-zinc-300 hover:text-zinc-100"
                    >
                      {nameById.get(analysis.candidateId) ?? "Unknown"}
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
          </div>
        </div>

        {/* Matrix */}
        {matrixCandidates.length > 0 && matrixRoles.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
              Candidate × role matrix
            </h2>
            <MultiAnalysisTable
              candidates={matrixCandidates}
              roles={matrixRoles}
              results={results}
            />
          </div>
        )}
      </div>
    </main>
  );
}
