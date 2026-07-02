import Link from "next/link";
import {
  getPortfolioStats,
  getProjectDifficultyRanking,
  getReusableCandidates,
  getSkillTrends,
  getTopCandidates,
} from "@/lib/portfolio-analytics";
import { matchQualityLabel, scoreColorClass } from "@/lib/multi";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [stats, topCandidates, difficulty, skillTrends, reusable] = await Promise.all([
    getPortfolioStats(),
    getTopCandidates(10),
    getProjectDifficultyRanking(),
    getSkillTrends(),
    getReusableCandidates(),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Portfolio Insights</h1>
          <p className="text-sm text-zinc-500">
            Cross-project recruiting intelligence across every project and candidate.
          </p>
        </header>

        {/* A — Portfolio Summary */}
        <Card title="Portfolio Summary">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Projects" value={stats.totalProjects} />
            <Metric label="Candidates" value={stats.totalCandidates} />
            <Metric label="Analyses" value={stats.totalAnalyses} />
            <Metric label="Average Match" value={stats.averageFinalScore} />
          </div>
        </Card>

        {/* B — Top Candidates Overall */}
        <Card title="Top Candidates Overall">
          {topCandidates.length === 0 ? (
            <Empty>No candidates evaluated across multiple projects yet.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-800/70">
              {topCandidates.map((candidate) => (
                <li
                  key={candidate.candidateId}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`/candidates/${candidate.candidateId}`}
                    className="min-w-0 flex-1 truncate text-sm text-zinc-200 hover:text-white"
                  >
                    {candidate.name}
                    <span className="ml-2 text-xs text-zinc-600">
                      best: {candidate.bestProject.title} · {candidate.analysisCount} analyses
                    </span>
                  </Link>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {matchQualityLabel(candidate.averageScore)}
                  </span>
                  <span
                    className={`w-8 shrink-0 text-right text-sm font-semibold tabular-nums ${scoreColorClass(candidate.averageScore)}`}
                  >
                    {candidate.averageScore}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* C — Project Competitiveness */}
        <Card title="Project Competitiveness">
          {difficulty.length === 0 ? (
            <Empty>No projects yet.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {difficulty.map((project) => (
                <li
                  key={project.projectId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/projects/${project.projectId}`}
                    className="min-w-0 flex-1 truncate text-zinc-200 hover:text-white"
                  >
                    {project.title}
                  </Link>
                  <span className="shrink-0 text-xs text-zinc-500">
                    Avg {project.averageScore} · {project.analysisCount} analyses
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs font-medium text-cyan-300 tabular-nums">
                    Difficulty {project.difficulty}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* D — Skill Trends (Portfolio-level) */}
        <Card title="Skill Trends (Portfolio-level)">
          <div className="flex flex-col gap-2.5">
            {skillTrends.map((trend) => (
              <div key={trend.key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-zinc-400">{trend.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-400/80"
                    style={{ width: `${Math.round(trend.value * 100)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-zinc-300 tabular-nums">
                  {trend.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* E — Reusable Talent */}
        <Card title="Reusable Talent">
          {reusable.length === 0 ? (
            <Empty>No multi-project candidates with consistent strong scores yet.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {reusable.map((candidate) => (
                <li
                  key={candidate.candidateId}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/candidates/${candidate.candidateId}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200 hover:text-white"
                    >
                      {candidate.name}
                    </Link>
                    <span className="shrink-0 rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                      Reusable Talent
                    </span>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${scoreColorClass(candidate.averageScore)}`}
                    >
                      {candidate.averageScore}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.projects.map((project) => (
                      <span
                        key={project.projectId}
                        className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        {project.title} · {project.score}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-medium uppercase tracking-widest text-cyan-400/90">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-zinc-100">{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-600">{children}</p>;
}
