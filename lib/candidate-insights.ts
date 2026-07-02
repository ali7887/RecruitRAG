import type { Briefing } from "@/lib/briefing";
import type { CandidateStatus } from "@/lib/constants";
import { listAnalysesByCandidate, listProjects } from "@/lib/db/repository";
import type { AnalysisRow } from "@/lib/db/schema";

// One candidate's fit for a single project, flattened for cross-project views.
export interface CandidateProjectFit {
  analysisId: string;
  projectId: string;
  projectTitle: string;
  role: string;
  finalScore: number;
  similarityScore: number;
  llmScore: number;
  status: CandidateStatus;
  hiringRecommendation: string | null;
  briefing: Briefing | null;
  createdAt: Date;
}

// Reassemble a stored AI briefing from an analysis row, or null when absent.
function briefingFromRow(row: AnalysisRow): Briefing | null {
  if (!row.aiSummary) return null;
  return {
    aiSummary: row.aiSummary,
    technicalSummary: row.technicalSummary ?? "",
    hiringRecommendation: row.hiringRecommendation ?? "",
    interviewFocus: row.interviewFocus ?? [],
  };
}

// Every project a candidate has been analyzed against, best match first.
// Two queries (candidate's analyses + all project titles), joined in memory.
export async function getCandidateProjectHistory(
  candidateId: string,
): Promise<CandidateProjectFit[]> {
  const [rows, allProjects] = await Promise.all([
    listAnalysesByCandidate(candidateId),
    listProjects(),
  ]);
  const titleById = new Map(allProjects.map((project) => [project.id, project.title]));

  return rows
    .map((row) => ({
      analysisId: row.id,
      projectId: row.projectId,
      projectTitle: titleById.get(row.projectId) ?? "Unknown project",
      role: row.role,
      finalScore: row.finalScore,
      similarityScore: row.similarityScore,
      llmScore: row.llmScore,
      status: row.status as CandidateStatus,
      hiringRecommendation: row.hiringRecommendation,
      briefing: briefingFromRow(row),
      createdAt: row.createdAt,
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}

// The candidate's strongest project alignment, or null if never analyzed.
export async function getBestProjectFit(
  candidateId: string,
): Promise<CandidateProjectFit | null> {
  const history = await getCandidateProjectHistory(candidateId);
  return history[0] ?? null;
}
