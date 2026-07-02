import { listAnalyses, listCandidates, listProjects } from "@/lib/db/repository";
import type { AnalysisRow } from "@/lib/db/schema";
import type { RubricScores } from "@/lib/evaluation-rubric";

// Portfolio-wide, deterministic, zero-AI analytics computed from the existing
// projects / candidates / analyses data. No new tables or queries.

export interface PortfolioStats {
  totalProjects: number;
  totalCandidates: number;
  totalAnalyses: number;
  averageFinalScore: number;
}

export interface TopCandidate {
  candidateId: string;
  name: string;
  averageScore: number;
  analysisCount: number;
  bestProject: { id: string; title: string; score: number };
}

export interface ProjectDifficulty {
  projectId: string;
  title: string;
  averageScore: number;
  analysisCount: number;
  difficulty: number; // 0–100, higher = harder (lower average score)
}

export interface ReusableCandidate {
  candidateId: string;
  name: string;
  averageScore: number;
  variance: number;
  projects: Array<{ projectId: string; title: string; score: number }>;
}

export interface SkillTrend {
  key: keyof RubricScores;
  label: string;
  value: number; // 0–1, two-decimal precision
}

export interface ScoreVarianceItem {
  name: string;
  aiScore: number;
  humanScore: number;
  diff: number; // human − AI
}

export interface ScoreVariance {
  items: ScoreVarianceItem[];
  approvedPct: number; // % of reviewed analyses approved without adjustment
  reviewedCount: number;
}

export interface AutomationSummary {
  shortlisted: Array<{ name: string; projectTitle: string; score: number }>;
  flagged: Array<{ name: string; projectTitle: string; decision: string }>;
}

const RUBRIC_LABELS: Record<keyof RubricScores, string> = {
  coreSkills: "Core Skills",
  experience: "Experience",
  impact: "Impact",
  roleRequirements: "Role Requirements",
  communication: "Communication",
  redFlagsPenalty: "Red Flags Penalty",
};

const RUBRIC_KEYS = Object.keys(RUBRIC_LABELS) as (keyof RubricScores)[];

// Section A — headline counts and the mean match score across all analyses.
export async function getPortfolioStats(workspaceId: string): Promise<PortfolioStats> {
  const [projects, candidates, analyses] = await Promise.all([
    listProjects(workspaceId),
    listCandidates(workspaceId),
    listAnalyses(workspaceId),
  ]);

  return {
    totalProjects: projects.length,
    totalCandidates: candidates.length,
    totalAnalyses: analyses.length,
    averageFinalScore: analyses.length
      ? round(mean(analyses.map((a) => a.finalScore)), 1)
      : 0,
  };
}

// Section B — candidates evaluated across 2+ projects, ranked by mean score.
export async function getTopCandidates(
  workspaceId: string,
  limit = 10,
): Promise<TopCandidate[]> {
  const [analyses, candidates, projects] = await Promise.all([
    listAnalyses(workspaceId),
    listCandidates(workspaceId),
    listProjects(workspaceId),
  ]);
  const nameById = new Map(candidates.map((c) => [c.id, c.name]));
  const titleById = new Map(projects.map((p) => [p.id, p.title]));

  const top: TopCandidate[] = [];
  for (const [candidateId, rows] of groupByCandidate(analyses)) {
    const distinctProjects = new Set(rows.map((r) => r.projectId)).size;
    if (distinctProjects < 2) continue;

    const best = rows.reduce((leader, row) =>
      row.finalScore > leader.finalScore ? row : leader,
    );
    top.push({
      candidateId,
      name: nameById.get(candidateId) ?? "Unknown",
      averageScore: Math.round(mean(rows.map((r) => r.finalScore))),
      analysisCount: rows.length,
      bestProject: {
        id: best.projectId,
        title: titleById.get(best.projectId) ?? "Unknown project",
        score: best.finalScore,
      },
    });
  }

  return top.sort((a, b) => b.averageScore - a.averageScore).slice(0, limit);
}

// Section C — projects ranked hardest-first (lowest average match score).
export async function getProjectDifficultyRanking(
  workspaceId: string,
): Promise<ProjectDifficulty[]> {
  const [analyses, projects] = await Promise.all([
    listAnalyses(workspaceId),
    listProjects(workspaceId),
  ]);
  const byProject = groupBy(analyses, (a) => a.projectId);

  return projects
    .map((project) => {
      const rows = byProject.get(project.id) ?? [];
      const averageScore = rows.length ? Math.round(mean(rows.map((r) => r.finalScore))) : 0;
      return {
        projectId: project.id,
        title: project.title,
        averageScore,
        analysisCount: rows.length,
        difficulty: clamp(100 - averageScore),
      };
    })
    .sort((a, b) => a.averageScore - b.averageScore);
}

// Section E — strong, consistent candidates reusable across multiple projects.
export async function getReusableCandidates(
  workspaceId: string,
): Promise<ReusableCandidate[]> {
  const [analyses, candidates, projects] = await Promise.all([
    listAnalyses(workspaceId),
    listCandidates(workspaceId),
    listProjects(workspaceId),
  ]);
  const nameById = new Map(candidates.map((c) => [c.id, c.name]));
  const titleById = new Map(projects.map((p) => [p.id, p.title]));

  const reusable: ReusableCandidate[] = [];
  for (const [candidateId, rows] of groupByCandidate(analyses)) {
    if (rows.length < 2) continue;
    const scores = rows.map((r) => r.finalScore);
    const averageScore = mean(scores);
    if (averageScore < 60) continue;
    const scoreVariance = variance(scores);
    if (scoreVariance > 20) continue;

    reusable.push({
      candidateId,
      name: nameById.get(candidateId) ?? "Unknown",
      averageScore: Math.round(averageScore),
      variance: Math.round(scoreVariance),
      projects: rows.map((r) => ({
        projectId: r.projectId,
        title: titleById.get(r.projectId) ?? "Unknown project",
        score: r.finalScore,
      })),
    });
  }

  return reusable.sort((a, b) => b.averageScore - a.averageScore);
}

// Section D — mean of each rubric dimension across all analyses, normalized 0–1.
export async function getSkillTrends(workspaceId: string): Promise<SkillTrend[]> {
  const analyses = await listAnalyses(workspaceId);
  const rubrics = analyses
    .map((a) => a.rubricScores)
    .filter((r): r is RubricScores => r != null);

  return RUBRIC_KEYS.map((key) => ({
    key,
    label: RUBRIC_LABELS[key],
    value: rubrics.length ? round(mean(rubrics.map((r) => r[key])) / 100, 2) : 0,
  }));
}

// AI vs human score variance (Phase 18). Lists adjusted analyses with their
// AI→human delta, plus the share of reviewed analyses approved as-is.
export async function getScoreVariance(workspaceId: string): Promise<ScoreVariance> {
  const [analyses, candidates] = await Promise.all([
    listAnalyses(workspaceId),
    listCandidates(workspaceId),
  ]);
  const nameById = new Map(candidates.map((c) => [c.id, c.name]));

  const reviewed = analyses.filter((a) => a.reviewStatus !== "pending");
  const items = analyses
    .filter((a) => a.reviewStatus === "adjusted" && a.adjustedFinalScore != null)
    .map((a) => {
      const humanScore = a.adjustedFinalScore as number;
      return {
        name: nameById.get(a.candidateId) ?? "Unknown",
        aiScore: a.finalScore,
        humanScore,
        diff: humanScore - a.finalScore,
      };
    })
    .filter((item) => item.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const approved = reviewed.filter((a) => a.reviewStatus === "approved").length;
  const approvedPct = reviewed.length ? Math.round((approved / reviewed.length) * 100) : 0;
  return { items, approvedPct, reviewedCount: reviewed.length };
}

// Automation recommendations (Phase 20): shortlisted and flagged candidates.
export async function getAutomationSummary(workspaceId: string): Promise<AutomationSummary> {
  const [analyses, candidates, projects] = await Promise.all([
    listAnalyses(workspaceId),
    listCandidates(workspaceId),
    listProjects(workspaceId),
  ]);
  const nameById = new Map(candidates.map((c) => [c.id, c.name]));
  const titleById = new Map(projects.map((p) => [p.id, p.title]));

  const shortlisted = analyses
    .filter((a) => a.automationDecision?.toLowerCase().includes("shortlist"))
    .map((a) => ({
      name: nameById.get(a.candidateId) ?? "Unknown",
      projectTitle: titleById.get(a.projectId) ?? "Unknown project",
      score: a.finalScore,
    }))
    .sort((a, b) => b.score - a.score);

  const flagged = analyses
    .filter((a) => a.automationDecision?.toLowerCase().includes("flag"))
    .map((a) => ({
      name: nameById.get(a.candidateId) ?? "Unknown",
      projectTitle: titleById.get(a.projectId) ?? "Unknown project",
      decision: a.automationDecision ?? "Flagged",
    }));

  return { shortlisted, flagged };
}

function groupByCandidate(analyses: AnalysisRow[]): Map<string, AnalysisRow[]> {
  return groupBy(analyses, (a) => a.candidateId);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const bucket = map.get(key(item));
    if (bucket) bucket.push(item);
    else map.set(key(item), [item]);
  }
  return map;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return mean(values.map((v) => (v - m) ** 2));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
