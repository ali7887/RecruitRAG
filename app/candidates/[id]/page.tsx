import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefingPanel } from "@/components/briefing-panel";
import { DeleteCandidateButton } from "@/components/delete-candidate-button";
import { ScoreRing } from "@/components/score-ring";
import { getCandidateProjectHistory } from "@/lib/candidate-insights";
import { getCandidate } from "@/lib/db/repository";
import { matchQualityLabel, scoreColorClass, statusColorClass } from "@/lib/multi";
import { canWrite, getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId, role } = await getWorkspaceContext();
  const candidate = await getCandidate(id, workspaceId);
  if (!candidate) notFound();

  const writable = canWrite(role);
  const history = await getCandidateProjectHistory(id, workspaceId);
  const summary = candidate.resumeText.trim().slice(0, 600);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link href="/candidates" className="text-xs text-zinc-500 hover:text-zinc-300">
              ← Candidates
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{candidate.name}</h1>
            {candidate.email && <p className="text-sm text-zinc-400">{candidate.email}</p>}
          </div>
          {writable && <DeleteCandidateButton candidateId={candidate.id} />}
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">Profile</h2>
          {candidate.parsedHeadline || (candidate.parsedSkills?.length ?? 0) > 0 ? (
            <>
              {candidate.parsedHeadline && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-200">{candidate.parsedHeadline}</p>
                  {typeof candidate.parsedExperienceYears === "number" && (
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">
                      {candidate.parsedExperienceYears} yrs experience
                    </span>
                  )}
                </div>
              )}
              {candidate.parsedSkills && candidate.parsedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.parsedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                {candidate.parsedWorkSummary ?? summary}
              </p>
            </>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
              {summary ? `${summary}${candidate.resumeText.length > 600 ? "…" : ""}` : "No resume text stored."}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Project history
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-600">No analyses yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((fit, index) => (
                <li
                  key={fit.analysisId}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${fit.projectId}`}
                          className="truncate text-sm font-medium text-zinc-200 hover:text-white"
                        >
                          {fit.projectTitle}
                        </Link>
                        {index === 0 && history.length > 1 && (
                          <span className="shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
                            Best fit
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-zinc-600">{fit.role}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 capitalize ${statusColorClass(fit.status)}`}
                        >
                          {fit.status}
                        </span>
                        <span
                          className={`rounded-full border border-zinc-700 px-2 py-0.5 ${scoreColorClass(fit.finalScore)}`}
                        >
                          {matchQualityLabel(fit.finalScore)}
                        </span>
                        <span className="text-zinc-600">{dateFormat.format(fit.createdAt)}</span>
                      </div>
                      {fit.hiringRecommendation && (
                        <p className="text-xs leading-relaxed text-zinc-500">
                          {fit.hiringRecommendation}
                        </p>
                      )}
                    </div>
                    <ScoreRing score={fit.finalScore} size={56} stroke={6} />
                  </div>
                  <BriefingPanel
                    analysisId={fit.analysisId}
                    briefing={fit.briefing}
                    canWrite={writable}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
